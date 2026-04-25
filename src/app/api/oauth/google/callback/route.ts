import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOAuthCredsForEntity, EntitySlug } from '@/lib/google-drive-client'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bag = any

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const error = url.searchParams.get('error')
  const cookieState = req.cookies.get('oauth_state')?.value || ''

  const adminUrl = req.nextUrl.origin + '/settings/drive'

  if (error) {
    return NextResponse.redirect(adminUrl + '?oauth_error=' + encodeURIComponent(error))
  }
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(adminUrl + '?oauth_error=invalid_state')
  }

  const entity = state.split(':')[0]
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.redirect(adminUrl + '?oauth_error=invalid_entity')
  }

  const { clientId, clientSecret } = getOAuthCredsForEntity(entity as EntitySlug)
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(adminUrl + '?oauth_error=oauth_not_configured_for_' + entity)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: req.nextUrl.origin + '/api/oauth/google/callback',
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok) {
    return NextResponse.redirect(adminUrl + '?oauth_error=' + encodeURIComponent('token_exchange:' + (tokens.error || tokenRes.status)))
  }
  if (!tokens.refresh_token) {
    return NextResponse.redirect(adminUrl + '?oauth_error=no_refresh_token_check_consent_screen_test_users')
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + tokens.access_token },
  })
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}

  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.redirect(req.nextUrl.origin + '/login?next=/settings/drive&oauth_error=session_expired_re_login')
  }

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  // Save to user_drive_configs
  const userPatch: Bag = {
    user_id: user.id,
    entity,
    user_oauth_refresh_token: tokens.refresh_token,
    user_oauth_access_token: tokens.access_token,
    user_oauth_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    user_oauth_email: userInfo.email || null,
    test_connection_ok: null,
    test_connection_at: null,
    test_connection_error: null,
  }
  await supa.from('user_drive_configs').upsert(userPatch, { onConflict: 'user_id,entity' })

  // If the connecting user is an admin, also save tokens to entity_drive_configs so the
  // team can share this OAuth token (e.g. VA uploads use admin's token to write to the
  // VA's configured folder). Determined via app_metadata.roles or user_metadata.roles.
  const roles = ((user.app_metadata as Bag)?.roles || (user.user_metadata as Bag)?.roles || []) as string[]
  const isAdmin = Array.isArray(roles) && roles.includes('admin')
  if (isAdmin) {
    const entityPatch: Bag = {
      user_oauth_refresh_token: tokens.refresh_token,
      user_oauth_access_token: tokens.access_token,
      user_oauth_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      service_account_email: userInfo.email || null, // reuse this column to record connecting admin
    }
    await supa.from('entity_drive_configs').update(entityPatch).eq('entity', entity)
  }

  const res = NextResponse.redirect(adminUrl + '?connected=' + entity)
  res.cookies.delete('oauth_state')
  return res
}
