// /api/leads/[id]/drive-files
//
// GET    — list files in the lead's Drive folder (including immediate
//          subfolder contents). Returns DriveFileDetailed[].
// POST   — multipart/form-data; uploads one or more files to the folder
//          (or to a named subfolder if subfolder_name is provided).
//          Auto-creates the Drive folder if the lead doesn't have one yet.
// DELETE — query param fileId; permanently deletes the file from Drive.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  listFilesDetailed,
  uploadBuffer,
  deleteDriveFile,
  createBidPackageFolder,
  findSubfolder,
  createFolder,
} from '@/lib/google-drive'

export const runtime = 'nodejs'
export const maxDuration = 120

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getLeadOrError(leadId: string) {
  const s = svc()
  const { data: lead, error } = await s.from('gov_leads').select('*').eq('id', leadId).single()
  if (error || !lead) return { error: 'lead_not_found' as const, status: 404 }
  return { lead, supabase: s }
}

function extractFolderId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/folders\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

async function ensureFolder(lead: Record<string, unknown>, supabase: ReturnType<typeof svc>): Promise<{ folderId: string; folderUrl: string } | { error: string; detail?: string }> {
  let folderId = (lead.drive_folder_id as string | null) || extractFolderId(lead.drive_folder_url as string | null)
  let folderUrl = (lead.drive_folder_url as string | null) || ''
  if (folderId && folderUrl) return { folderId, folderUrl }

  // Auto-create
  try {
    const r = await createBidPackageFolder({
      entity: lead.entity as string,
      title: (lead.title as string) || 'Untitled Bid',
      agency: (lead.agency as string) || null,
      solicitationNumber: (lead.solicitation_number as string) || null,
      naicsCode: (lead.naics_code as string) || null,
      setAside: (lead.set_aside as string) || null,
      estimatedValue: (lead.estimated_value as number) || null,
      responseDeadline: (lead.response_deadline as string) || null,
    })
    folderId = r.folderId
    folderUrl = r.folderUrl
    await supabase.from('gov_leads').update({
      drive_folder_id: folderId,
      drive_folder_url: folderUrl,
    }).eq('id', lead.id)
    return { folderId, folderUrl }
  } catch (e) {
    return { error: 'drive_folder_create_failed', detail: (e as Error).message }
  }
}

function mimeTypeFromName(name: string, fallback: string): string {
  const lc = name.toLowerCase()
  if (lc.endsWith('.pdf')) return 'application/pdf'
  if (lc.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lc.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lc.endsWith('.png')) return 'image/png'
  if (lc.match(/\.jpe?g$/)) return 'image/jpeg'
  if (lc.endsWith('.csv')) return 'text/csv'
  if (lc.endsWith('.txt')) return 'text/plain'
  return fallback || 'application/octet-stream'
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const r = await getLeadOrError(params.id)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  const { lead } = r

  const folderId = (lead.drive_folder_id as string | null) || extractFolderId(lead.drive_folder_url as string | null)
  if (!folderId) {
    return NextResponse.json({
      ok: true,
      folder_id: null,
      folder_url: null,
      files: [],
      hint: 'Lead has no Drive folder yet. Upload a file to auto-create one.',
    })
  }

  try {
    const files = await listFilesDetailed(folderId, { includeSubfolderFiles: true })
    return NextResponse.json({
      ok: true,
      folder_id: folderId,
      folder_url: lead.drive_folder_url,
      files,
    })
  } catch (e) {
    return NextResponse.json({ error: 'drive_list_failed', detail: (e as Error).message }, { status: 500 })
  }
}

// ─── POST (upload) ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const r = await getLeadOrError(params.id)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  const { lead, supabase } = r

  let form: FormData
  try {
    form = await req.formData()
  } catch (e) {
    return NextResponse.json({ error: 'invalid_form_data', detail: (e as Error).message }, { status: 400 })
  }

  const subfolderName = (form.get('subfolder') as string) || '01_Solicitation_Docs'

  const files: File[] = []
  for (const v of form.getAll('files')) {
    if (typeof v === 'object' && v !== null && 'arrayBuffer' in v) files.push(v as File)
  }
  if (files.length === 0) return NextResponse.json({ error: 'no_files_provided' }, { status: 400 })

  const folder = await ensureFolder(lead as Record<string, unknown>, supabase)
  if ('error' in folder) return NextResponse.json(folder, { status: 500 })

  // Resolve target subfolder (or fall back to root if none of that name exists)
  let targetId = folder.folderId
  if (subfolderName) {
    const sub = await findSubfolder(subfolderName, folder.folderId).catch(() => null)
    if (sub?.id) targetId = sub.id
    else {
      // create the subfolder
      try {
        const created = await createFolder(subfolderName, folder.folderId, { entity: lead.entity as string, skipShare: true })
        targetId = created.id
      } catch {
        // fall back to root
      }
    }
  }

  const results: Array<{ name: string; ok: boolean; drive_file_id?: string; drive_url?: string; error?: string; bytes?: number }> = []
  for (const f of files) {
    try {
      const buf = Buffer.from(await f.arrayBuffer())
      const uploaded = await uploadBuffer(buf, f.name, targetId, mimeTypeFromName(f.name, f.type))
      if (uploaded?.id) {
        results.push({ name: f.name, ok: true, drive_file_id: uploaded.id, drive_url: uploaded.webViewLink, bytes: buf.length })
      } else {
        results.push({ name: f.name, ok: false, error: 'upload_returned_null' })
      }
    } catch (e) {
      results.push({ name: f.name, ok: false, error: (e as Error).message })
    }
  }

  return NextResponse.json({
    ok: true,
    folder_id: folder.folderId,
    folder_url: folder.folderUrl,
    target_subfolder: subfolderName,
    target_id: targetId,
    uploaded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    files: results,
  })
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const fileId = url.searchParams.get('fileId')
  if (!fileId) return NextResponse.json({ error: 'fileId query param required' }, { status: 400 })

  // Sanity check: confirm the lead exists before letting the user touch Drive
  const r = await getLeadOrError(params.id)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })

  const result = await deleteDriveFile(fileId)
  if (!result.ok) return NextResponse.json({ error: 'drive_delete_failed', detail: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, file_id: fileId })
}
