// POST /api/leads/import-bulk  (multipart/form-data)
//
// Accepts a SET of files dropped from Mac Finder (multi-select OR a folder
// drag) and creates ONE gov_lead from the primary RFP-like file, attaching
// all other files to that lead's Drive folder as supporting docs.
//
// Form fields:
//   files[]  — one or more File objects (required)
//   entity   — 'exousia' | 'vitalx' | 'ironhouse' (required)
//   primary_filename — optional override, the file to treat as the primary RFP
//
// Response:
//   { lead_id, drive_folder_id, drive_folder_url, primary_file, attached_files,
//     parsed: ParsedSolicitation, errors }

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseSolicitation, type ParsedSolicitation } from '@/lib/solicitation-parser'
import { createBidPackageFolder, uploadBuffer } from '@/lib/google-drive'

export const runtime = 'nodejs'
export const maxDuration = 300

// Filename patterns for primary-RFP detection. Order = priority.
const PRIMARY_PATTERNS: Array<{ pat: RegExp; label: string }> = [
  { pat: /sf[\s_-]?1449/i,             label: 'SF-1449' },
  { pat: /\bsolicitation\b/i,          label: 'solicitation' },
  { pat: /\bcombined[\s_-]?synopsis\b/i, label: 'combined synopsis' },
  { pat: /\bRFP\b/i,                   label: 'RFP' },
  { pat: /\bRFQ\b/i,                   label: 'RFQ' },
  { pat: /\bIFB\b/i,                   label: 'IFB' },
  { pat: /\bPWS\b/i,                   label: 'PWS' },
  { pat: /\bSOW\b/i,                   label: 'SOW' },
]

function pickPrimaryFile(files: File[], override?: string | null): { primary: File; reason: string } | null {
  if (override) {
    const f = files.find(x => x.name === override)
    if (f) return { primary: f, reason: 'manual-override' }
  }
  for (const { pat, label } of PRIMARY_PATTERNS) {
    const hit = files.find(f => pat.test(f.name))
    if (hit) return { primary: hit, reason: 'matched ' + label }
  }
  // Fall back to largest PDF
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
  if (pdfs.length > 0) {
    let largest = pdfs[0]
    for (const p of pdfs) if (p.size > largest.size) largest = p
    return { primary: largest, reason: 'largest PDF' }
  }
  // Fall back to first docx
  const docx = files.find(f => f.name.toLowerCase().endsWith('.docx'))
  if (docx) return { primary: docx, reason: 'first DOCX' }
  // Otherwise the first file
  if (files.length > 0) return { primary: files[0], reason: 'first file' }
  return null
}

function mimeTypeFromName(name: string, fallback: string): string {
  const lc = name.toLowerCase()
  if (lc.endsWith('.pdf')) return 'application/pdf'
  if (lc.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lc.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lc.endsWith('.png')) return 'image/png'
  if (lc.match(/\.jpe?g$/)) return 'image/jpeg'
  return fallback || 'application/octet-stream'
}

export async function POST(req: NextRequest) {
  // Auth
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 503 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch (e) {
    return NextResponse.json({ error: 'invalid_form_data', detail: (e as Error).message }, { status: 400 })
  }

  const entity = (form.get('entity') as string || '').toLowerCase()
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.json({ error: 'entity required (exousia|vitalx|ironhouse)' }, { status: 400 })
  }
  const overridePrimary = (form.get('primary_filename') as string) || null

  const files: File[] = []
  for (const v of form.getAll('files')) {
    if (typeof v === 'object' && v !== null && 'arrayBuffer' in v) {
      files.push(v as File)
    }
  }
  if (files.length === 0) return NextResponse.json({ error: 'no_files_provided' }, { status: 400 })

  const pick = pickPrimaryFile(files, overridePrimary)
  if (!pick) return NextResponse.json({ error: 'no_primary_file_detected' }, { status: 400 })
  const { primary, reason: pickReason } = pick

  // Parse primary file via Claude
  let parsed: ParsedSolicitation
  try {
    const buf = Buffer.from(await primary.arrayBuffer())
    parsed = await parseSolicitation({
      buffer: buf,
      filename: primary.name,
      mimeType: mimeTypeFromName(primary.name, primary.type),
    })
  } catch (e) {
    return NextResponse.json({
      error: 'primary_parse_failed',
      detail: (e as Error).message,
      primary_file: primary.name,
      pick_reason: pickReason,
    }, { status: 500 })
  }

  // Create gov_lead from parsed fields
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const leadInsert = {
    entity,
    title: parsed.title || primary.name.replace(/\.[^.]+$/, ''),
    solicitation_number: parsed.solicitation_number || null,
    notice_id: parsed.notice_id || null,
    description: parsed.scope_summary || null,
    status: 'reviewing',
    naics_code: parsed.naics || null,
    set_aside: mapSetAside(parsed.set_aside),
    contract_type: mapContractType(parsed.contract_type),
    source: 'manual',
    agency: parsed.agency || null,
    sub_agency: parsed.sub_agency || null,
    place_of_performance: parsed.place_of_performance || null,
    response_deadline: parsed.response_deadline || null,
    estimated_value: parsed.estimated_value ?? null,
    sam_gov_url: parsed.sam_url || null,
    notes: 'Imported via bulk upload (' + files.length + ' files). Primary: ' + primary.name + ' (' + pickReason + ').',
  }

  const { data: lead, error: leadErr } = await svc
    .from('gov_leads')
    .insert(leadInsert)
    .select()
    .single()
  if (leadErr || !lead) {
    return NextResponse.json({ error: 'lead_insert_failed', detail: leadErr?.message, parsed }, { status: 500 })
  }

  // Create the entity bid Drive folder (auto-shared with team via createFolder)
  let folderId = ''
  let folderUrl = ''
  try {
    const r = await createBidPackageFolder({
      entity,
      title: lead.title,
      agency: lead.agency,
      solicitationNumber: lead.solicitation_number,
      naicsCode: lead.naics_code,
      setAside: lead.set_aside,
      estimatedValue: lead.estimated_value,
      responseDeadline: lead.response_deadline,
    })
    folderId = r.folderId
    folderUrl = r.folderUrl
  } catch (e) {
    // Lead is created but folder failed; surface clearly so Ella can retry.
    return NextResponse.json({
      error: 'drive_folder_failed',
      detail: (e as Error).message,
      lead_id: lead.id,
      hint: 'gov_lead created but Drive folder creation failed — fix Drive config and retry. Files were not uploaded.',
    }, { status: 500 })
  }

  // Upload all files to the bid folder's 01_Solicitation_Docs subfolder if it exists,
  // else directly into the bid folder root.
  const { findSubfolder } = await import('@/lib/google-drive')
  const solicitationSubfolder = await findSubfolder('01_Solicitation_Docs', folderId).catch(() => null)
  const uploadTargetId = solicitationSubfolder?.id || folderId

  const uploadResults: Array<{ name: string; ok: boolean; drive_file_id?: string; error?: string }> = []
  for (const f of files) {
    try {
      const buf = Buffer.from(await f.arrayBuffer())
      const uploaded = await uploadBuffer(buf, f.name, uploadTargetId, mimeTypeFromName(f.name, f.type))
      if (uploaded) {
        uploadResults.push({ name: f.name, ok: true, drive_file_id: uploaded.id })
      } else {
        uploadResults.push({ name: f.name, ok: false, error: 'uploadBuffer returned null' })
      }
    } catch (e) {
      uploadResults.push({ name: f.name, ok: false, error: (e as Error).message })
    }
  }

  // Update gov_lead with drive folder
  await svc.from('gov_leads').update({
    drive_folder_id: folderId,
    drive_folder_url: folderUrl,
  }).eq('id', lead.id)

  return NextResponse.json({
    ok: true,
    lead_id: lead.id,
    drive_folder_id: folderId,
    drive_folder_url: folderUrl,
    primary_file: { name: primary.name, pick_reason: pickReason },
    attached_files: uploadResults,
    parsed,
    summary: {
      total_files: files.length,
      uploaded: uploadResults.filter(r => r.ok).length,
      failed: uploadResults.filter(r => !r.ok).length,
    },
  })
}

function mapSetAside(s: string | null | undefined): string | null {
  if (!s) return null
  const lc = s.toLowerCase()
  if (lc.includes('wosb') && lc.includes('eco')) return 'edwosb'
  if (lc.includes('wosb')) return 'wosb'
  if (lc.includes('8(a)') || lc.includes('8a')) return '8a'
  if (lc.includes('hubzone')) return 'hubzone'
  if (lc.includes('sdvosb')) return 'sdvosb'
  if (lc.includes('total') && lc.includes('small')) return 'total_small_business'
  if (lc.includes('small business')) return 'small_business'
  if (lc.includes('full and open') || lc.includes('full & open')) return 'full_and_open'
  if (lc.includes('sole')) return 'sole_source'
  return 'none'
}

function mapContractType(s: string | null | undefined): string | null {
  if (!s) return null
  const lc = s.toLowerCase()
  if (lc.includes('ffp') || lc.includes('firm fixed')) return 'firm_fixed'
  if (lc.includes('t&m') || lc.includes('time') && lc.includes('material')) return 'time_materials'
  if (lc.includes('cost plus')) return 'cost_plus'
  if (lc.includes('idiq')) return 'idiq'
  if (lc.includes('bpa')) return 'bpa'
  if (lc.includes('purchase order') || lc.includes('po ')) return 'purchase_order'
  return null
}
