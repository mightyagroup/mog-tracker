import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOAuthCredsForEntity, EntitySlug } from '@/lib/google-drive-client'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const entity = url.searchParams.get('entity') || ''
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
  }

  // Capture the currently-signed-in user so the callback doesnt depend on the
  // Supabase session surviving the round-trip to Google. The user_id is stored
  // in the HttpOnly state cookie alongside the nonce.
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.redirect(req.nextUrl.origin + '/login?next=/settings/drive')
  }

  const { clientId } = getOAuthCredsForEntity(entity as EntitySlug)
  if (!clientId) {
    return NextResponse.json({
      error: 'No OAuth client configured for ' + entity + '. Set GOOGLE_OAUTH_CLIENT_ID_' + entity.toUpperCase() + ' in Vercel.'
    }, { status: 500 })
  }

  const redirectUri = req.nextUrl.origin + '/api/oauth/google/callback'
  const nonce = crypto.randomBytes(16).toString('hex')
  // State sent to Google (visible in URL): entity:nonce — no PII or user IDs
  const state = entity + ':' + nonce
  // Cookie (HttpOnly, server-only): same state plus user_id so callback can match
  const cookieValue = state + ':' + user.id

  const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive',
    access_type: 'offline',
    prompt: 'consent',
    state,
    include_granted_scopes: 'true',
  }).toString()

  const res = NextResponse.redirect(oauthUrl)
  res.cookies.set('oauth_state', cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
