import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getOAuthCredsForEntity, EntitySlug } from '@/lib/google-drive-client'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const entity = url.searchParams.get('entity') || ''
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
  }

  const { clientId } = getOAuthCredsForEntity(entity as EntitySlug)
  if (!clientId) {
    return NextResponse.json({
      error: 'No OAuth client configured for ' + entity + '. Set GOOGLE_OAUTH_CLIENT_ID_' + entity.toUpperCase() + ' (preferred) or GOOGLE_OAUTH_CLIENT_ID (fallback) in Vercel.'
    }, { status: 500 })
  }

  const redirectUri = req.nextUrl.origin + '/api/oauth/google/callback'
  const state = entity + ':' + crypto.randomBytes(16).toString('hex')

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
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
