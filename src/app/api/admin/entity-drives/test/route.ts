import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listFilesInFolder, authFromConfig } from '@/lib/google-drive-client'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entity = body.entity as string
    if (!entity || !['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
      return NextResponse.json({ error: 'entity is required' }, { status: 400 })
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { data: cfg, error } = await supa.from('entity_drive_configs').select('*').eq('entity', entity).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!cfg) return NextResponse.json({ error: 'No config for ' + entity }, { status: 404 })

    const auth = authFromConfig(cfg)
    if (!auth) return NextResponse.json({ error: 'No auth saved (connect Drive via OAuth or paste a service account JSON)' }, { status: 400 })
    if (!cfg.root_folder_id) return NextResponse.json({ error: 'No root folder ID saved' }, { status: 400 })

    try {
      const res = await listFilesInFolder(auth, cfg.root_folder_id as string)
      await supa.from('entity_drive_configs').update({
        test_connection_ok: true,
        test_connection_at: new Date().toISOString(),
        test_connection_error: null,
      }).eq('entity', entity)
      return NextResponse.json({ ok: true, file_count: res.count, sample_files: res.files.slice(0, 5), auth_kind: auth.kind })
    } catch (e: unknown) {
      const msg = (e as Error).message || 'unknown'
      await supa.from('entity_drive_configs').update({
        test_connection_ok: false,
        test_connection_at: new Date().toISOString(),
        test_connection_error: msg,
      }).eq('entity', entity)
      return NextResponse.json({ ok: false, error: msg })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
