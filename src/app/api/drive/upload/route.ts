import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createFolder, uploadFile, ServiceAccountJson } from '@/lib/google-drive-client'

export const runtime = 'nodejs'
export const maxDuration = 60

type DriveCfg = {
  entity: string
  root_folder_id: string | null
  service_account_json: ServiceAccountJson | null
  default_proposal_subfolder: string | null
}

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

    const { data: cfg } = await supa.from('entity_drive_configs').select('*').eq('entity', entity).maybeSingle()
    const c = cfg as DriveCfg | null
    if (!c?.service_account_json || !c.root_folder_id) {
      return NextResponse.json({ error: 'Drive not configured for ' + entity + '. Go to /admin/entity-drives to set it up.' }, { status: 400 })
    }

    let targetFolderId = c.root_folder_id
    let bidFolderWebLink: string | null = null

    if (proposalId) {
      const { data: prop } = await supa.from('proposals').select('id, drive_folder_id, drive_folder_url, gov_leads(title, solicitation_number)').eq('id', proposalId).maybeSingle()
      if (!prop) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })
      const p = prop as unknown as { drive_folder_id: string | null; drive_folder_url: string | null; gov_leads?: { title?: string; solicitation_number?: string } }
      if (p.drive_folder_id) {
        targetFolderId = p.drive_folder_id
        bidFolderWebLink = p.drive_folder_url
      } else {
        const fname = folderNameOverride ||
          (p.gov_leads?.solicitation_number ? p.gov_leads.solicitation_number + ' - ' : '') +
          (p.gov_leads?.title?.slice(0, 60) || ('Proposal ' + proposalId.slice(0, 8)))
        const created = await createFolder(c.service_account_json, c.root_folder_id, fname)
        targetFolderId = created.id
        bidFolderWebLink = created.webViewLink
        await supa.from('proposals').update({ drive_folder_id: created.id, drive_folder_url: created.webViewLink }).eq('id', proposalId)
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || 'upload'
    const mimeType = file.type || 'application/octet-stream'
    const uploaded = await uploadFile(c.service_account_json, targetFolderId, filename, mimeType, buffer)

    return NextResponse.json({
      ok: true,
      file_id: uploaded.id,
      file_name: uploaded.name,
      web_view_link: uploaded.webViewLink,
      folder_web_link: bidFolderWebLink,
      entity,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
