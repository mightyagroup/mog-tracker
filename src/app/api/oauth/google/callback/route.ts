import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/oauth/google/callback?code=...&state=entity:nonce
// Google redirects here after the user clicks Allow on the consent screen.
// We exchange the code for a refresh token and persist it to entity_drive_configs.

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bag = any

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const error = url.searchParams.get('error')
  const cookieState = req.cookies.get('oauth_state')?.value || ''

  const adminUrl = req.nextUrl.origin + '/admin/entity-drives'

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

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(adminUrl + '?oauth_error=oauth_not_configured')
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

  // Identify the connected Google user
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + tokens.access_token },
  })
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  const patch: Bag = {
    user_oauth_refresh_token: tokens.refresh_token,
    user_oauth_access_token: tokens.access_token,
    user_oauth_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    service_account_email: userInfo.email || null,
    test_connection_ok: null,
    test_connection_at: null,
    test_connection_error: null,
  }
  await supa.from('entity_drive_configs').update(patch).eq('entity', entity)

  const res = NextResponse.redirect(adminUrl + '?connected=' + entity)
  res.cookies.delete('oauth_state')
  return res
}
