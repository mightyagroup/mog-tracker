import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createFolder, uploadFile, EntitySlug, DriveAuth, ServiceAccountJson } from '@/lib/google-drive-client'

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

    // Identify current user
    const userClient = await createServerSupabaseClient()
    const { data: { user } } = await userClient.auth.getUser()

    // Pull both per-user and entity configs in parallel; user fields override entity ones
    let userCfg: Bag = null
    if (user) {
      const r = await supa.from('user_drive_configs').select('*').eq('user_id', user.id).eq('entity', entity).maybeSingle()
      userCfg = r.data
    }
    const r2 = await supa.from('entity_drive_configs').select('*').eq('entity', entity).maybeSingle()
    const entityCfg: Bag = r2.data

    // Resolve folder ID: user-first, then entity
    const rootFolderId: string | null = userCfg?.root_folder_id || entityCfg?.root_folder_id || null
    if (!rootFolderId) {
      return NextResponse.json({ error: 'No Drive folder configured for ' + entity + ' for your user. Ask the admin to set your folder ID, or connect your own at /settings/drive.' }, { status: 400 })
    }

    // Resolve OAuth token: user-first, then entity (admin-shared)
    const refreshToken: string | null =
      userCfg?.user_oauth_refresh_token ||
      entityCfg?.user_oauth_refresh_token || null
    const sa: ServiceAccountJson | null =
      userCfg?.service_account_json ||
      entityCfg?.service_account_json || null

    let auth: DriveAuth | null = null
    if (refreshToken) {
      auth = { kind: 'oauth', refresh_token: refreshToken, entity: entity as EntitySlug }
    } else if (sa) {
      auth = { kind: 'service_account', sa }
    }
    if (!auth) {
      return NextResponse.json({ error: 'No Drive auth configured for ' + entity + '. The admin needs to connect their Google account at /settings/drive.' }, { status: 400 })
    }

    let targetFolderId = rootFolderId
    let bidFolderWebLink: string | null = null

    if (proposalId) {
      const { data: prop } = await supa.from('proposals').select('id, drive_folder_id, drive_folder_url, gov_leads(title, solicitation_number)').eq('id', proposalId).maybeSingle()
      if (!prop) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })
      const p = prop as Bag
      if (p.drive_folder_id) {
        targetFolderId = p.drive_folder_id
        bidFolderWebLink = p.drive_folder_url
      } else {
        const fname = folderNameOverride ||
          (p.gov_leads?.solicitation_number ? p.gov_leads.solicitation_number + ' - ' : '') +
          (p.gov_leads?.title?.slice(0, 60) || ('Proposal ' + proposalId.slice(0, 8)))
        const created = await createFolder(auth, rootFolderId, fname)
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
      folder_source: userCfg?.root_folder_id ? 'user' : 'entity',
      auth_source: userCfg?.user_oauth_refresh_token ? 'user' : 'entity',
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
