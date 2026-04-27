// POST /api/proposals/:id/generate-bid-starter
//
// Auto-generates the 14-document Phase 1 Bid Starter package for a proposal:
//   1. Parse the uploaded solicitation file
//   2. Run subcontractor search for candidate teaming partners
//   3. Build the per-bid Drive folder
//   4. Generate every template, upload the full set to Ella's Drive,
//      and mirror the VA-visible subset to the assigned VA's Drive
//   5. Move the gov_lead to status='active_bid', record drive_folder_url
//   6. Log every generation step to proposal_deliverables
//
// Body: { regenerate?: boolean }
// Returns: { folder_url, docs_generated, errors, sub_count, parsed_solicitation }

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseSolicitation, type ParsedSolicitation } from '@/lib/solicitation-parser'
import { searchSubcontractors, type EntityType, type RankedSub } from '@/lib/subcontractor-search'
import { generateBidDoc, type TokenMap } from '@/lib/bid-templates/generator'
import {
  buildBidStarterTokens,
  buildBidFolderName,
} from '@/lib/bid-templates/token-builder'
import {
  loadTemplate,
  PHASE_1_TEMPLATE_NAMES,
  isVaVisible,
  checkTemplatesAvailable,
} from '@/lib/bid-templates/template-loader'
import { getEntityData } from '@/lib/proposals/entity-data'
import {
  createFolder,
  uploadBuffer,
  getMogBidsRootId,
  findPrimarySolicitation,
  downloadDriveFile,
} from '@/lib/google-drive'

export const maxDuration = 300 // 5 minutes for full bid starter generation

type GenerateBody = {
  regenerate?: boolean
  key_service_location?: string  // optional override for folder naming
  agency_short?: string          // optional override
}

type DocResult = {
  template: string
  status: 'generated' | 'failed' | 'skipped'
  drive_file_id?: string
  drive_view_url?: string
  error?: string
  bytes?: number
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const proposalId = params.id

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as GenerateBody

  // ─── Pre-flight: are templates uploaded to Supabase Storage? ──────────────
  const missing = await checkTemplatesAvailable()
  if (missing.length > 0) {
    return NextResponse.json({
      error: 'templates_not_uploaded',
      missing,
      hint: 'Run scripts/templates/upload-to-storage.mjs to populate Supabase Storage with tokenized templates.',
    }, { status: 503 })
  }

  // ─── Fetch proposal + gov_lead ─────────────────────────────────────────────
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: proposal, error: pErr } = await svc
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single()
  if (pErr || !proposal) {
    return NextResponse.json({ error: 'proposal_not_found', detail: pErr?.message }, { status: 404 })
  }

  const govLeadId = proposal.gov_lead_id as string
  if (!govLeadId) {
    return NextResponse.json({ error: 'proposal has no gov_lead_id' }, { status: 400 })
  }

  const { data: lead, error: lErr } = await svc
    .from('gov_leads')
    .select('*')
    .eq('id', govLeadId)
    .single()
  if (lErr || !lead) {
    return NextResponse.json({ error: 'gov_lead_not_found', detail: lErr?.message }, { status: 404 })
  }

  const entityKey = lead.entity as EntityType
  const entityData = getEntityData(entityKey)

  // Skip if folder already exists and not asked to regenerate.
  if (lead.drive_folder_url && !body.regenerate) {
    return NextResponse.json({
      ok: false,
      error: 'already_generated',
      folder_url: lead.drive_folder_url,
      hint: 'Pass { regenerate: true } to regenerate.',
    }, { status: 409 })
  }

  // ─── Resolve the solicitation file ─────────────────────────────────────────
  // Source-of-truth order:
  //   1. gov_lead.drive_folder_id  -> findPrimarySolicitation in that folder
  //   2. proposal.solicitation_storage_path -> Supabase Storage (legacy)
  //
  // Per Ella's directive 2026-04-26: Drive is the source of truth. Files
  // attached at the lead/active-bid stage flow into proposal intake without
  // re-upload. The Supabase Storage path stays as a fallback for older
  // proposals that pre-date this change.

  let solicitationBuffer: Buffer
  let mimeType: string
  let solicitationSource: string

  if (lead.drive_folder_id) {
    const primary = await findPrimarySolicitation(lead.drive_folder_id as string).catch(() => null)
    if (!primary) {
      return NextResponse.json({
        error: 'no_solicitation_in_drive_folder',
        hint: 'Drive folder for this lead is empty or does not contain a recognizable solicitation file (SF1449, RFP, RFQ, PWS, SOW). Upload the solicitation to the Drive folder and try again.',
        drive_folder_id: lead.drive_folder_id,
      }, { status: 400 })
    }
    const dl = await downloadDriveFile(primary.id)
    solicitationBuffer = dl.buffer
    mimeType = dl.mimeType
    solicitationSource = 'drive:' + primary.id + ' (' + primary.name + ')'
  } else if (proposal.solicitation_storage_path) {
    const path = proposal.solicitation_storage_path as string
    const { data: fileBlob, error: dlErr } = await svc.storage
      .from('proposal-solicitations')
      .download(path)
    if (dlErr || !fileBlob) {
      return NextResponse.json({ error: 'solicitation_download_failed', detail: dlErr?.message }, { status: 500 })
    }
    solicitationBuffer = Buffer.from(await fileBlob.arrayBuffer())
    mimeType = path.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    solicitationSource = 'supabase:' + path
  } else {
    return NextResponse.json({
      error: 'no_solicitation_available',
      hint: 'This lead has no Drive folder and no Supabase-stored solicitation. Upload the solicitation file to the lead\'s Drive folder (preferred) or via the legacy intake upload.',
    }, { status: 400 })
  }

  // ─── Parse the solicitation ───────────────────────────────────────────────
  let parsed: ParsedSolicitation
  try {
    parsed = await parseSolicitation({
      buffer: solicitationBuffer,
      filename: solicitationSource,
      mimeType,
    })
  } catch (e) {
    return NextResponse.json({ error: 'solicitation_parse_failed', detail: (e as Error).message, source: solicitationSource }, { status: 500 })
  }

  // ─── Subcontractor search ──────────────────────────────────────────────────
  let subs: RankedSub[] = []
  try {
    subs = await searchSubcontractors(parsed, entityKey, { maxCandidates: 12 })
  } catch (e) {
    console.warn('[generate-bid-starter] sub search failed (continuing):', (e as Error).message)
  }

  // ─── Folder name + Drive folder ───────────────────────────────────────────
  const folderName = buildBidFolderName({
    bid: parsed,
    keyServiceLocation: body.key_service_location,
    agencyShort: body.agency_short,
  })

  let driveFolderId: string
  let driveFolderUrl: string
  try {
    const rootId = getMogBidsRootId()
    const folder = await createFolder(folderName, rootId)
    driveFolderId = folder.id
    driveFolderUrl = folder.webViewLink || ('https://drive.google.com/drive/folders/' + folder.id)
  } catch (e) {
    return NextResponse.json({ error: 'drive_folder_failed', detail: (e as Error).message }, { status: 500 })
  }

  // ─── Build tokens once, reuse for all 14 docs ─────────────────────────────
  const tokens: TokenMap = buildBidStarterTokens({
    bid: parsed,
    entity: entityData,
    subs,
    buildOptions: {
      now: new Date(),
      returnByDaysBeforeDeadline: 2,
    },
  })

  // ─── Generate + upload each template ──────────────────────────────────────
  const results: DocResult[] = []
  for (const templateName of PHASE_1_TEMPLATE_NAMES) {
    try {
      const { buffer: tBuf, contentType } = await loadTemplate(templateName)
      const filled = await generateBidDoc(tBuf, tokens)
      const uploaded = await uploadBuffer(filled, templateName, driveFolderId, contentType)
      if (!uploaded) {
        results.push({ template: templateName, status: 'failed', error: 'drive_upload_returned_null', bytes: filled.length })
      } else {
        results.push({
          template: templateName,
          status: 'generated',
          drive_file_id: uploaded.id,
          drive_view_url: uploaded.webViewLink,
          bytes: filled.length,
        })
        // Log to proposal_deliverables.
        await svc.from('proposal_deliverables').insert({
          proposal_id: proposalId,
          file_name: templateName,
          file_format: templateName.endsWith('.xlsx') ? 'xlsx' : 'docx',
          drive_file_id: uploaded.id,
          drive_url: uploaded.webViewLink,
          va_visible: isVaVisible(templateName),
          generated_by: 'bid_starter',
        }).select().maybeSingle()
      }
    } catch (e) {
      results.push({ template: templateName, status: 'failed', error: (e as Error).message })
    }
  }

  // ─── Update gov_lead status + folder URL ──────────────────────────────────
  await svc.from('gov_leads').update({
    drive_folder_id: driveFolderId,
    drive_folder_url: driveFolderUrl,
    status: 'active_bid',
  }).eq('id', govLeadId)

  // ─── Update proposal with parsed sol identifiers ──────────────────────────
  await svc.from('proposals').update({
    bid_folder_name: folderName,
    bid_folder_url: driveFolderUrl,
    intake_complete: true,
  }).eq('id', proposalId)

  return NextResponse.json({
    ok: true,
    folder_name: folderName,
    folder_url: driveFolderUrl,
    docs_generated: results.filter(r => r.status === 'generated').map(r => r.template),
    errors: results.filter(r => r.status === 'failed').map(r => ({ template: r.template, error: r.error })),
    sub_count: subs.length,
    parsed_solicitation: parsed,
    full_results: results,
  })
}
