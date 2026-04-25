import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listFilesInFolder, authFromConfig, EntitySlug } from '@/lib/google-drive-client'

export const runtime = 'nodejs'
export const maxDuration = 30

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bag = any

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entity = body.entity as string
    const scope = (body.scope as string) || 'auto' // 'user' | 'entity' | 'auto'
    if (!entity || !['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
      return NextResponse.json({ error: 'entity is required' }, { status: 400 })
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    // Determine which config to test: per-user (default for /settings/drive) or entity-level (admin page)
    let cfg: Bag = null
    let table = ''
    if (scope === 'user' || scope === 'auto') {
      const userClient = await createServerSupabaseClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        const r = await supa.from('user_drive_configs').select('*').eq('user_id', user.id).eq('entity', entity).maybeSingle()
        if (r.data) { cfg = r.data; table = 'user_drive_configs' }
      }
    }
    if (!cfg && (scope === 'entity' || scope === 'auto')) {
      const r = await supa.from('entity_drive_configs').select('*').eq('entity', entity).maybeSingle()
      if (r.data) { cfg = r.data; table = 'entity_drive_configs' }
    }

    if (!cfg) return NextResponse.json({ error: 'No Drive config saved for ' + entity + ' under scope=' + scope }, { status: 404 })

    const auth = authFromConfig(cfg, entity as EntitySlug)
    if (!auth) return NextResponse.json({ error: 'No auth saved (connect Drive via OAuth or paste a service account JSON)' }, { status: 400 })
    if (!cfg.root_folder_id) return NextResponse.json({ error: 'No root folder ID saved' }, { status: 400 })

    try {
      const res = await listFilesInFolder(auth, cfg.root_folder_id as string)
      await supa.from(table).update({
        test_connection_ok: true,
        test_connection_at: new Date().toISOString(),
        test_connection_error: null,
      }).eq('id', cfg.id)
      return NextResponse.json({ ok: true, file_count: res.count, sample_files: res.files.slice(0, 5), auth_kind: auth.kind, scope: table })
    } catch (e: unknown) {
      const msg = (e as Error).message || 'unknown'
      await supa.from(table).update({
        test_connection_ok: false,
        test_connection_at: new Date().toISOString(),
        test_connection_error: msg,
      }).eq('id', cfg.id)
      return NextResponse.json({ ok: false, error: msg })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
