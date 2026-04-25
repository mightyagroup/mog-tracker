import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

// GET /api/oauth/google/start?entity=exousia
// Generates a Google OAuth consent URL and redirects the browser there.
// State token is stored in an HTTP-only cookie and validated by the callback.

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const entity = url.searchParams.get('entity') || ''
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_OAUTH_CLIENT_ID not set in Vercel env' }, { status: 500 })
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
