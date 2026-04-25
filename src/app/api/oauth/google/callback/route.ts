import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOAuthCredsForEntity, EntitySlug } from '@/lib/google-drive-client'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bag = any

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code') || ''
  const stateFromUrl = url.searchParams.get('state') || ''
  const error = url.searchParams.get('error')
  const cookieValue = req.cookies.get('oauth_state')?.value || ''

  const adminUrl = req.nextUrl.origin + '/settings/drive'

  if (error) {
    return NextResponse.redirect(adminUrl + '?oauth_error=' + encodeURIComponent(error))
  }
  if (!code) {
    return NextResponse.redirect(adminUrl + '?oauth_error=missing_code')
  }
  if (!cookieValue) {
    return NextResponse.redirect(adminUrl + '?oauth_error=missing_state_cookie_try_again')
  }

  // Cookie format: entity:nonce:user_id  (state from URL is just entity:nonce)
  const cookieParts = cookieValue.split(':')
  if (cookieParts.length < 3) {
    return NextResponse.redirect(adminUrl + '?oauth_error=invalid_state_cookie')
  }
  const stateFromCookie = cookieParts.slice(0, 2).join(':')
  const userId = cookieParts.slice(2).join(':')

  if (stateFromUrl !== stateFromCookie) {
    return NextResponse.redirect(adminUrl + '?oauth_error=state_mismatch')
  }

  const entity = stateFromCookie.split(':')[0]
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.redirect(adminUrl + '?oauth_error=invalid_entity')
  }

  const { clientId, clientSecret } = getOAuthCredsForEntity(entity as EntitySlug)
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(adminUrl + '?oauth_error=oauth_not_configured_for_' + entity)
  }

  // Exchange auth code for tokens (uses Vercel env, no session needed)
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

  // Lookup which Google account just authorized
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + tokens.access_token },
  })
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}

  // Persist via service role (no Supabase session required)
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()

  await supa.from('user_drive_configs').upsert({
    user_id: userId,
    entity,
    user_oauth_refresh_token: tokens.refresh_token,
    user_oauth_access_token: tokens.access_token,
    user_oauth_expires_at: expiresAt,
    user_oauth_email: userInfo.email || null,
    test_connection_ok: null,
    test_connection_at: null,
    test_connection_error: null,
  }, { onConflict: 'user_id,entity' })

  // Auto-promote admin tokens to entity-shared pool
  const { data: lookedUp } = await supa.auth.admin.getUserById(userId)
  const roles = ((lookedUp?.user?.app_metadata as Bag)?.roles || (lookedUp?.user?.user_metadata as Bag)?.roles || []) as string[]
  const isAdmin = Array.isArray(roles) && roles.includes('admin')
  if (isAdmin) {
    await supa.from('entity_drive_configs').update({
      user_oauth_refresh_token: tokens.refresh_token,
      user_oauth_access_token: tokens.access_token,
      user_oauth_expires_at: expiresAt,
      service_account_email: userInfo.email || null,
    }).eq('entity', entity)
  }

  const res = NextResponse.redirect(adminUrl + '?connected=' + entity)
  res.cookies.delete('oauth_state')
  return res
}
