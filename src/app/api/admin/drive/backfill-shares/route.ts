// POST /api/admin/drive/backfill-shares
//
// Re-shares every existing Drive folder we created (gov_lead bid folders +
// commercial proposal folders + any folder ID we have on file) with the
// current `team_drive_members` list. Idempotent — uses drive_folder_shares
// to skip emails that already have access.
//
// Run this once after applying migration 041, then any time you add a new
// VA to team_drive_members.
//
// Body: { dryRun?: boolean }

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { shareFolderWithTeam } from '@/lib/google-drive'

export const maxDuration = 300

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admin role can backfill — Drive shares are sensitive.
  const roles = (user.app_metadata?.roles as string[] | undefined) || []
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { dryRun?: boolean }
  const dryRun = body.dryRun === true

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Collect every folder we have on file.
  const folders: Array<{ source: string; folder_id: string; entity?: string; label?: string }> = []

  // gov_leads: prefer drive_folder_id; fall back to extracting from drive_folder_url
  const { data: leads } = await svc
    .from('gov_leads')
    .select('id, entity, drive_folder_id, drive_folder_url, title, solicitation_number')
    .or('drive_folder_id.not.is.null,drive_folder_url.not.is.null')
  for (const l of leads || []) {
    let folderId = l.drive_folder_id as string | null
    if (!folderId && l.drive_folder_url) {
      const m = (l.drive_folder_url as string).match(/folders\/([A-Za-z0-9_-]+)/)
      if (m) folderId = m[1]
    }
    if (!folderId) continue
    folders.push({
      source: 'gov_lead',
      folder_id: folderId,
      entity: l.entity as string,
      label: (l.solicitation_number || l.title || l.id) as string,
    })
  }

  // commercial_leads: same fallback strategy
  const { data: comms } = await svc
    .from('commercial_leads')
    .select('id, drive_folder_id, drive_folder_url, organization_name')
    .or('drive_folder_id.not.is.null,drive_folder_url.not.is.null')
  for (const c of comms || []) {
    let folderId = (c as Record<string, unknown>).drive_folder_id as string | null
    if (!folderId && c.drive_folder_url) {
      const m = (c.drive_folder_url as string).match(/folders\/([A-Za-z0-9_-]+)/)
      if (m) folderId = m[1]
    }
    if (!folderId) continue
    folders.push({ source: 'commercial_lead', folder_id: folderId, label: c.organization_name as string })
  }

  // proposals (Phase 1 added bid_folder_url for the bid-starter folder)
  const { data: props } = await svc
    .from('proposals')
    .select('id, drive_folder_id, drive_folder_url, bid_folder_url, bid_folder_name')
    .or('drive_folder_id.not.is.null,drive_folder_url.not.is.null,bid_folder_url.not.is.null')
  for (const p of props || []) {
    const candidateUrls = [p.drive_folder_url, p.bid_folder_url].filter(Boolean) as string[]
    let folderId = p.drive_folder_id as string | null
    if (!folderId) {
      for (const u of candidateUrls) {
        const m = u.match(/folders\/([A-Za-z0-9_-]+)/)
        if (m) { folderId = m[1]; break }
      }
    }
    if (!folderId) continue
    folders.push({ source: 'proposal', folder_id: folderId, label: (p.bid_folder_name || p.id) as string })
  }

  // Entity drive root folders.
  const { data: entityCfgs } = await svc
    .from('entity_drive_configs')
    .select('entity, root_folder_id')
    .not('root_folder_id', 'is', null)
  for (const ec of entityCfgs || []) {
    folders.push({ source: 'entity_root', folder_id: ec.root_folder_id as string, entity: ec.entity as string, label: ec.entity })
  }

  if (dryRun) {
    return NextResponse.json({ dryRun: true, would_share_folders: folders.length, sample: folders.slice(0, 10) })
  }

  let totalShared = 0
  let totalSkipped = 0
  let totalErrors = 0
  const perFolder: Array<Record<string, unknown>> = []

  for (const f of folders) {
    try {
      const r = await shareFolderWithTeam(f.folder_id, { entity: f.entity })
      totalShared += r.shared.length
      totalSkipped += r.skipped.length
      totalErrors += r.errors.length
      perFolder.push({
        source: f.source,
        folder_id: f.folder_id,
        label: f.label,
        shared: r.shared,
        skipped_count: r.skipped.length,
        errors: r.errors,
      })
    } catch (e) {
      totalErrors++
      perFolder.push({ source: f.source, folder_id: f.folder_id, error: (e as Error).message })
    }
  }

  return NextResponse.json({
    ok: true,
    folders_processed: folders.length,
    total_emails_newly_shared: totalShared,
    total_emails_skipped_already_had_access: totalSkipped,
    total_errors: totalErrors,
    per_folder: perFolder,
  })
}
