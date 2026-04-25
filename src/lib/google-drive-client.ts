// Google Drive client supporting BOTH service account JWT auth AND OAuth refresh
// tokens. OAuth is preferred for Workspace orgs that disable service account key
// creation. Service account is kept as a fallback for environments that allow it.

import crypto from 'node:crypto'

export type ServiceAccountJson = {
  client_email: string
  private_key: string
  token_uri?: string
  project_id?: string
}

export type OAuthCreds = {
  refresh_token: string
}

export type DriveAuth =
  | { kind: 'service_account', sa: ServiceAccountJson }
  | { kind: 'oauth', oauth: OAuthCreds }

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function getAccessTokenFromServiceAccount(sa: ServiceAccountJson): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const headerEncoded = b64url(Buffer.from(JSON.stringify(header)))
  const claimsEncoded = b64url(Buffer.from(JSON.stringify(claims)))
  const unsigned = headerEncoded + '.' + claimsEncoded
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(sa.private_key)
  const jwt = unsigned + '.' + b64url(signature)

  const r = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('SA token: ' + (j.error_description || j.error || r.status))
  return j.access_token as string
}

async function getAccessTokenFromOAuth(creds: OAuthCreds): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('GOOGLE_OAUTH_CLIENT_ID/SECRET not set')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('OAuth refresh: ' + (j.error_description || j.error || r.status))
  return j.access_token as string
}

async function getAccessToken(auth: DriveAuth): Promise<string> {
  if (auth.kind === 'oauth') return getAccessTokenFromOAuth(auth.oauth)
  return getAccessTokenFromServiceAccount(auth.sa)
}

/** Pick the right auth from a saved entity_drive_configs row. OAuth wins when present. */
export function authFromConfig(cfg: {
  service_account_json?: ServiceAccountJson | null
  user_oauth_refresh_token?: string | null
}): DriveAuth | null {
  if (cfg.user_oauth_refresh_token) {
    return { kind: 'oauth', oauth: { refresh_token: cfg.user_oauth_refresh_token } }
  }
  if (cfg.service_account_json) {
    return { kind: 'service_account', sa: cfg.service_account_json }
  }
  return null
}

/** List files in a folder to verify credentials work. */
export async function listFilesInFolder(auth: DriveAuth, folderId: string): Promise<{ files: Array<{ id: string; name: string; mimeType: string }>; count: number }> {
  const token = await getAccessToken(auth)
  const q = "'" + folderId + "' in parents and trashed = false"
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100'
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
  const j = await r.json()
  if (!r.ok) throw new Error('List: ' + (j.error?.message || r.status))
  return { files: j.files || [], count: (j.files || []).length }
}

/** Create a subfolder under a parent folder. */
export async function createFolder(auth: DriveAuth, parentId: string, name: string): Promise<{ id: string; name: string; webViewLink: string }> {
  const token = await getAccessToken(auth)
  const r = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('Create folder: ' + (j.error?.message || r.status))
  return { id: j.id, name: j.name, webViewLink: j.webViewLink || 'https://drive.google.com/drive/folders/' + j.id }
}

/** Upload a file to a Drive folder. Multipart upload. */
export async function uploadFile(auth: DriveAuth, folderId: string, filename: string, mimeType: string, content: Buffer): Promise<{ id: string; name: string; webViewLink: string }> {
  const token = await getAccessToken(auth)
  const boundary = '--------mog-tracker-' + Date.now()
  const metadata = JSON.stringify({ name: filename, parents: [folderId] })
  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + metadata + '\r\n--' + boundary + '\r\nContent-Type: ' + mimeType + '\r\n\r\n'),
    content,
    Buffer.from('\r\n--' + boundary + '--'),
  ])
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary=' + boundary,
    },
    body: body as unknown as BodyInit,
  })
  const j = await r.json()
  if (!r.ok) throw new Error('Upload: ' + (j.error?.message || r.status))
  return { id: j.id, name: j.name, webViewLink: j.webViewLink || 'https://drive.google.com/file/d/' + j.id }
}
