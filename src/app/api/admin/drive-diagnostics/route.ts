// GET /api/admin/drive-diagnostics
//
// Returns a yes/no health report for every Drive credential the upload
// pipeline depends on. Ella can hit this to see exactly which env vars and
// DB rows are present vs missing without sharing secrets with anyone.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const roles = (user.app_metadata?.roles as string[] | undefined) || []
  if (!roles.includes('admin')) return NextResponse.json({ error: 'admin_only' }, { status: 403 })

  const env = {
    GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    GOOGLE_DRIVE_ROOT_FOLDER_ID: !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    GOOGLE_OAUTH_CLIENT_ID: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_CLIENT_ID_EXOUSIA: !!process.env.GOOGLE_OAUTH_CLIENT_ID_EXOUSIA,
    GOOGLE_OAUTH_CLIENT_SECRET_EXOUSIA: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET_EXOUSIA,
    GOOGLE_OAUTH_CLIENT_ID_VITALX: !!process.env.GOOGLE_OAUTH_CLIENT_ID_VITALX,
    GOOGLE_OAUTH_CLIENT_SECRET_VITALX: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET_VITALX,
    GOOGLE_OAUTH_CLIENT_ID_IRONHOUSE: !!process.env.GOOGLE_OAUTH_CLIENT_ID_IRONHOUSE,
    GOOGLE_OAUTH_CLIENT_SECRET_IRONHOUSE: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET_IRONHOUSE,
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: cfgs } = await svc
    .from('entity_drive_configs')
    .select('entity, root_folder_id, user_oauth_refresh_token, service_account_json, test_connection_ok, test_connection_at, test_connection_error')
    .order('entity')

  const entityHealth = (cfgs || []).map(c => ({
    entity: c.entity,
    has_root_folder_id_in_db: !!c.root_folder_id,
    has_user_oauth_refresh_token: !!c.user_oauth_refresh_token,
    has_service_account_json: !!c.service_account_json,
    last_test_ok: c.test_connection_ok,
    last_test_at: c.test_connection_at,
    last_test_error: c.test_connection_error,
    has_per_entity_oauth_client_creds:
      !!process.env['GOOGLE_OAUTH_CLIENT_ID_' + (c.entity as string).toUpperCase()] &&
      !!process.env['GOOGLE_OAUTH_CLIENT_SECRET_' + (c.entity as string).toUpperCase()],
  }))

  // Decide overall upload-readiness per entity
  const verdicts = entityHealth.map(e => {
    const hasOAuthCreds = e.has_per_entity_oauth_client_creds || (env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET)
    const canUpload = e.has_user_oauth_refresh_token && hasOAuthCreds
    return {
      entity: e.entity,
      can_upload_via_oauth: canUpload,
      missing: !canUpload
        ? [
            !e.has_user_oauth_refresh_token ? 'user_oauth_refresh_token in entity_drive_configs (re-connect Drive in /admin/entity-drives)' : null,
            !hasOAuthCreds ? 'GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET env vars (or per-entity variants)' : null,
          ].filter(Boolean)
        : [],
    }
  })

  const root_folder_env = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null

  return NextResponse.json({
    env_vars: env,
    root_folder_env,
    entity_health: entityHealth,
    upload_readiness: verdicts,
    summary: {
      service_account_present: env.GOOGLE_SERVICE_ACCOUNT_KEY,
      shared_oauth_creds_present: env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET,
      entities_with_oauth_refresh_tokens: entityHealth.filter(e => e.has_user_oauth_refresh_token).length,
      entities_ready_to_upload: verdicts.filter(v => v.can_upload_via_oauth).length,
    },
  })
}
