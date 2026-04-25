import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createFolder, uploadFile, authFromConfig, EntitySlug } from '@/lib/google-drive-client'

export const runtime = 'nodejs'
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bag = any

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const entity = (form.get('entity') as string) || ''
    const proposalId = (form.get('proposal_id') as string) || ''
    const folderNameOverride = (form.get('folder_name') as string) || ''

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
      return NextResponse.json({ error: 'entity required' }, { status: 400 })
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    // Resolve config: user-first, then entity default
    let cfg: Bag = null
    const userClient = await createServerSupabaseClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (user) {
      const r = await supa.from('user_drive_configs').select('*').eq('user_id', user.id).eq('entity', entity).maybeSingle()
      if (r.data) cfg = r.data
    }
    if (!cfg) {
      const r = await supa.from('entity_drive_configs').select('*').eq('entity', entity).maybeSingle()
      if (r.data) cfg = r.data
    }

    if (!cfg || !cfg.root_folder_id) {
      return NextResponse.json({ error: 'Drive not configured for ' + entity + '. Connect your Drive at /settings/drive.' }, { status: 400 })
    }
    const auth = authFromConfig(cfg, entity as EntitySlug)
    if (!auth) {
      return NextResponse.json({ error: 'No auth for ' + entity + '. Connect Drive via OAuth at /settings/drive.' }, { status: 400 })
    }

    let targetFolderId = cfg.root_folder_id as string
    let bidFolderWebLink: string | null = null

    if (proposalId) {
      // Per-user bid folder cache so two users uploading to the same proposal get separate folders in their own Drives
      const bidFolderColumn = user ? 'bid_folders_by_user' : null
      const { data: prop } = await supa.from('proposals').select('id, drive_folder_id, drive_folder_url, gov_leads(title, solicitation_number)').eq('id', proposalId).maybeSingle()
      if (!prop) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })
      const p = prop as Bag

      // For now, keep one bid folder per proposal (simpler). User-specific cache can be added later.
      void bidFolderColumn
      if (p.drive_folder_id) {
        targetFolderId = p.drive_folder_id
        bidFolderWebLink = p.drive_folder_url
      } else {
        const fname = folderNameOverride ||
          (p.gov_leads?.solicitation_number ? p.gov_leads.solicitation_number + ' - ' : '') +
          (p.gov_leads?.title?.slice(0, 60) || ('Proposal ' + proposalId.slice(0, 8)))
        const created = await createFolder(auth, cfg.root_folder_id as string, fname)
        targetFolderId = created.id
        bidFolderWebLink = created.webViewLink
        await supa.from('proposals').update({ drive_folder_id: created.id, drive_folder_url: created.webViewLink }).eq('id', proposalId)
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || 'upload'
    const mimeType = file.type || 'application/octet-stream'
    const uploaded = await uploadFile(auth, targetFolderId, filename, mimeType, buffer)

    return NextResponse.json({
      ok: true,
      file_id: uploaded.id,
      file_name: uploaded.name,
      web_view_link: uploaded.webViewLink,
      folder_web_link: bidFolderWebLink,
      entity,
      auth_kind: auth.kind,
      cfg_scope: cfg.user_id ? 'user' : 'entity',
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
