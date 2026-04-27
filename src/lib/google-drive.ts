/**
 * Google Drive integration for MOG Tracker.
 * Uses service account JWT auth + Google Drive REST API v3.
 * Server-side only — never import this from client components.
 */

import crypto from 'crypto'

// --- Types ---

interface ServiceAccountKey {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

interface FolderStructure {
  name: string
  children?: FolderStructure[]
}

// --- Auth (using Node.js crypto, no external deps) ---

let cachedToken: { token: string; expiresAt: number } | null = null

function getServiceAccountKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  return JSON.parse(raw)
}

function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!id) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID not set')
  return id
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createJwt(serviceAccount: ServiceAccountKey): string {
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(serviceAccount.private_key)
  const signatureB64 = base64url(signature)

  return `${signingInput}.${signatureB64}`
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  const sa = getServiceAccountKey()
  const jwt = createJwt(sa)

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Google auth failed: ${resp.status} ${err}`)
  }

  const data = await resp.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
  return cachedToken.token
}

// --- Drive API helpers ---

async function driveRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken()
  const baseUrl = 'https://www.googleapis.com'

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

/**
 * Create a folder in Google Drive AND auto-share with every active team member.
 *
 * Per Ella's directive (2026-04-26): nobody on the MOG team should ever hit
 * Google's "Request access" wall when clicking a Drive Folder link. The
 * service account creates the folder; this helper immediately grants Editor
 * (or whatever role is configured) to every email in `team_drive_members`
 * whose `entities` array is empty (all entities) or includes the supplied
 * entity. Failures to share are logged but do not abort folder creation.
 */
export async function createFolder(
  name: string,
  parentId: string,
  options?: { entity?: string; skipShare?: boolean },
): Promise<DriveFile> {
  const resp = await driveRequest('/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Failed to create folder "${name}": ${resp.status} ${err}`)
  }

  const folder: DriveFile = await resp.json()

  if (!options?.skipShare) {
    try {
      await shareFolderWithTeam(folder.id, { entity: options?.entity })
    } catch (e) {
      console.error('[google-drive] share-with-team failed for', folder.id, ':', (e as Error).message)
    }
  }

  return folder
}

/**
 * Grant a role on a Drive folder to a single email. Returns the Drive
 * permission record. Idempotent: if the email already has access, the API
 * returns the existing permission.
 */
export async function shareDriveFolder(
  folderId: string,
  email: string,
  role: 'editor' | 'commenter' | 'reader' = 'editor',
  options?: { sendNotificationEmail?: boolean }
): Promise<{ id: string }> {
  const sendNotif = options?.sendNotificationEmail ?? false
  const resp = await driveRequest(
    `/drive/v3/files/${folderId}/permissions?sendNotificationEmail=${sendNotif}&fields=id,emailAddress,role`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'user',
        role: role === 'editor' ? 'writer' : role,
        emailAddress: email,
      }),
    }
  )

  if (!resp.ok) {
    const err = await resp.text()
    // 400 with "already exists" is fine — treat as success.
    if (resp.status === 400 && err.includes('already exists')) {
      return { id: '(existing)' }
    }
    throw new Error(`shareDriveFolder ${folderId} -> ${email}: ${resp.status} ${err.slice(0, 200)}`)
  }
  return resp.json()
}

/**
 * Share a folder with every active team_drive_members row whose entities
 * filter matches. Logs per-share to drive_folder_shares so future runs
 * skip already-granted permissions.
 */
export async function shareFolderWithTeam(
  folderId: string,
  opts?: { entity?: string }
): Promise<{ shared: string[]; skipped: string[]; errors: Array<{ email: string; error: string }> }> {
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { shared: [], skipped: [], errors: [{ email: '', error: 'Supabase env missing' }] }
  }
  const sb = createClient(url, key)

  // Pull active team members.
  const { data: members, error: mErr } = await sb
    .from('team_drive_members')
    .select('email, role, entities, active')
    .eq('active', true)
  if (mErr || !members) {
    return { shared: [], skipped: [], errors: [{ email: '', error: 'team_drive_members lookup: ' + (mErr?.message || 'empty') }] }
  }

  // Pull existing shares for this folder so we don't double-grant.
  const { data: existingShares } = await sb
    .from('drive_folder_shares')
    .select('email')
    .eq('folder_id', folderId)
  const existing = new Set((existingShares || []).map(r => r.email.toLowerCase()))

  const shared: string[] = []
  const skipped: string[] = []
  const errors: Array<{ email: string; error: string }> = []

  // Parallelize share calls within a folder. Drive's per-user QPS limit is
  // generous; 7 parallel calls per folder is well within budget.
  const targets = members.filter(m => {
    const memberEntities = (m.entities || []) as string[]
    if (memberEntities.length > 0 && opts?.entity && !memberEntities.includes(opts.entity)) {
      skipped.push(m.email)
      return false
    }
    if (existing.has(m.email.toLowerCase())) {
      skipped.push(m.email)
      return false
    }
    return true
  })

  await Promise.all(targets.map(async (m) => {
    try {
      const perm = await shareDriveFolder(folderId, m.email, (m.role || 'editor') as 'editor' | 'commenter' | 'reader')
      await sb.from('drive_folder_shares').insert({
        folder_id: folderId,
        email: m.email,
        permission_id: perm.id,
        role: m.role || 'editor',
      })
      shared.push(m.email)
    } catch (e) {
      errors.push({ email: m.email, error: (e as Error).message })
    }
  }))

  return { shared, skipped, errors }
}

/**
 * Create a nested folder structure under a parent.
 * Returns the top-level folder's ID and webViewLink.
 *
 * Children skip the auto-share step — Drive permissions inherit from
 * parent so sharing the top-level folder once is enough. This keeps us
 * well under the Drive Permissions API rate limit per bid.
 */
export async function createFolderStructure(
  structure: FolderStructure,
  parentId: string,
  options?: { entity?: string; isChild?: boolean },
): Promise<{ id: string; webViewLink: string }> {
  const topFolder = await createFolder(structure.name, parentId, {
    entity: options?.entity,
    skipShare: options?.isChild === true,
  })

  if (structure.children) {
    for (const child of structure.children) {
      await createFolderStructure(child, topFolder.id, { entity: options?.entity, isChild: true })
    }
  }

  return {
    id: topFolder.id,
    webViewLink: topFolder.webViewLink || `https://drive.google.com/drive/folders/${topFolder.id}`,
  }
}

/**
 * Upload a file to Google Drive from a URL (e.g., SAM.gov document).
 * Downloads the file first, then uploads to Drive.
 */
export async function uploadFileFromUrl(
  fileUrl: string,
  fileName: string,
  parentId: string,
  mimeType: string = 'application/pdf',
): Promise<DriveFile | null> {
  try {
    // Download the file
    const downloadResp = await fetch(fileUrl)
    if (!downloadResp.ok) {
      console.error(`Failed to download ${fileUrl}: ${downloadResp.status}`)
      return null
    }
    const fileBuffer = await downloadResp.arrayBuffer()

    // Upload to Drive using multipart upload
    const token = await getAccessToken()
    const metadata = JSON.stringify({
      name: fileName,
      parents: [parentId],
    })

    const boundary = '===MOG_BOUNDARY==='
    const encoder = new TextEncoder()
    const metadataPart = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
    )
    const filePart = encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`)
    const endPart = encoder.encode(`\r\n--${boundary}--`)

    const body = new Uint8Array(metadataPart.length + filePart.length + fileBuffer.byteLength + endPart.length)
    body.set(metadataPart, 0)
    body.set(filePart, metadataPart.length)
    body.set(new Uint8Array(fileBuffer), metadataPart.length + filePart.length)
    body.set(endPart, metadataPart.length + filePart.length + fileBuffer.byteLength)

    const resp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    )

    if (!resp.ok) {
      const err = await resp.text()
      console.error(`Failed to upload ${fileName}: ${resp.status} ${err}`)
      return null
    }

    return resp.json()
  } catch (err) {
    console.error(`Error uploading file from URL: ${err}`)
    return null
  }
}

/**
 * Upload plain text content as a file to Google Drive.
 */
export async function uploadTextFile(
  content: string,
  fileName: string,
  parentId: string,
  mimeType: string = 'text/plain',
): Promise<DriveFile | null> {
  try {
    const token = await getAccessToken()
    const metadata = JSON.stringify({
      name: fileName,
      parents: [parentId],
    })

    const boundary = '===MOG_TEXT_BOUNDARY==='
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n` +
      `--${boundary}--`

    const resp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    )

    if (!resp.ok) {
      console.error(`Failed to upload text file ${fileName}: ${resp.status}`)
      return null
    }

    return resp.json()
  } catch (err) {
    console.error(`Error uploading text file: ${err}`)
    return null
  }
}

/**
 * Upload a file to Google Drive from a Buffer (e.g., generated .docx documents).
 */
export async function uploadBuffer(
  buffer: Buffer,
  fileName: string,
  parentId: string,
  mimeType: string = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
): Promise<DriveFile | null> {
  const r = await uploadBufferDetailed(buffer, fileName, parentId, mimeType)
  return r.ok ? r.file : null
}

/**
 * Verbose variant — returns the actual Drive error so callers can surface
 * something useful in the UI instead of a silent "upload_returned_null".
 *
 * Implementation note: the multipart body is built using the resumable
 * 2-step upload protocol (POST metadata first to get an upload URL, then
 * PUT the binary). This avoids the multipart-boundary collision risk the
 * one-shot multipart upload has when binary file content happens to
 * include the boundary marker.
 */
export async function uploadBufferDetailed(
  buffer: Buffer,
  fileName: string,
  parentId: string,
  mimeType: string = 'application/octet-stream',
): Promise<{ ok: true; file: DriveFile } | { ok: false; status: number; error: string }> {
  try {
    const token = await getAccessToken()

    // Step 1: initiate resumable upload — POST metadata, receive upload URL
    const initResp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(buffer.length),
        },
        body: JSON.stringify({ name: fileName, parents: [parentId] }),
      }
    )

    if (!initResp.ok) {
      const txt = await initResp.text()
      return { ok: false, status: initResp.status, error: `init: ${initResp.status} ${txt.slice(0, 300)}` }
    }
    const uploadUrl = initResp.headers.get('Location')
    if (!uploadUrl) {
      return { ok: false, status: 0, error: 'init: no Location header in response' }
    }

    // Step 2: PUT the binary content. Wrap the Buffer in a Uint8Array
    // view of the same memory — fetch's BodyInit type accepts Uint8Array
    // but not the Node Buffer type alias.
    const bodyView = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    const putResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
      },
      body: bodyView,
    })

    if (!putResp.ok) {
      const txt = await putResp.text()
      return { ok: false, status: putResp.status, error: `put: ${putResp.status} ${txt.slice(0, 300)}` }
    }
    const file = await putResp.json()
    return { ok: true, file }
  } catch (err) {
    return { ok: false, status: 0, error: 'exception: ' + (err as Error).message }
  }
}

/**
 * Delete a file or folder from Drive by ID.
 * Returns true if the file was deleted (or already gone), false on error.
 */
export async function deleteDriveFile(fileId: string): Promise<{ ok: boolean; error?: string }> {
  const resp = await driveRequest('/drive/v3/files/' + fileId, { method: 'DELETE' })
  if (resp.status === 204 || resp.status === 200) return { ok: true }
  if (resp.status === 404) return { ok: true } // already gone
  const txt = await resp.text()
  return { ok: false, error: resp.status + ': ' + txt.slice(0, 200) }
}

/**
 * Download a Drive file by ID and return its raw bytes as a Buffer.
 * Works for any file type the service account has access to.
 */
export async function downloadDriveFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  // Get metadata first so we can return name + MIME type
  const metaResp = await driveRequest('/drive/v3/files/' + fileId + '?fields=id,name,mimeType,size')
  if (!metaResp.ok) {
    throw new Error('downloadDriveFile metadata ' + fileId + ': ' + metaResp.status + ' ' + (await metaResp.text()).slice(0, 200))
  }
  const meta = await metaResp.json()

  const dataResp = await driveRequest('/drive/v3/files/' + fileId + '?alt=media')
  if (!dataResp.ok) {
    throw new Error('downloadDriveFile data ' + fileId + ': ' + dataResp.status + ' ' + (await dataResp.text()).slice(0, 200))
  }
  const arrayBuffer = await dataResp.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: meta.mimeType || 'application/octet-stream',
    name: meta.name || 'unknown',
  }
}

/**
 * Find the primary solicitation file inside a Drive folder. Heuristic:
 *   1. Filename match against SF1449|RFP|RFQ|SOLICITATION|combined synopsis
 *   2. If none, the largest .pdf in the folder
 *   3. If still none, the first .pdf or .docx in the folder
 *   4. Otherwise null
 *
 * Recursively scans children one level deep — many solicitations land in
 * a `01_Solicitation_Docs` subfolder.
 */
export async function findPrimarySolicitation(folderId: string): Promise<DriveFile | null> {
  // List files and subfolders in the folder
  const items = await listFiles(folderId)
  // Recurse one level into subfolders
  const all: DriveFile[] = []
  for (const item of items) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      const sub = await listFiles(item.id)
      for (const s of sub) all.push(s)
    } else {
      all.push(item)
    }
  }
  // Filter to docs
  const docs = all.filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
  if (docs.length === 0) return null

  const PRIMARY_PATTERNS = [
    /sf[\s_-]?1449/i,
    /\bsolicitation\b/i,
    /\bcombined[\s_-]?synopsis\b/i,
    /\bRFP\b/i,
    /\bRFQ\b/i,
    /\bIFB\b/i,
    /\bPWS\b/i,
    /\bSOW\b/i,
  ]

  // 1. Try each pattern in order
  for (const pat of PRIMARY_PATTERNS) {
    const hit = docs.find(f => pat.test(f.name))
    if (hit) return hit
  }

  // 2. Largest PDF
  const pdfs = docs.filter(f => f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
  if (pdfs.length > 0) {
    // Need size — re-fetch with size field
    let largest: DriveFile | null = null
    let largestSize = -1
    for (const p of pdfs) {
      const r = await driveRequest('/drive/v3/files/' + p.id + '?fields=id,name,mimeType,size')
      if (r.ok) {
        const j = await r.json()
        const size = parseInt(j.size || '0', 10)
        if (size > largestSize) { largest = p; largestSize = size }
      }
    }
    if (largest) return largest
  }

  // 3. First doc/pdf
  const docOrPdf = docs.find(f =>
    f.mimeType === 'application/pdf' ||
    f.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    f.name.toLowerCase().endsWith('.pdf') ||
    f.name.toLowerCase().endsWith('.docx')
  )
  return docOrPdf || null
}

/**
 * List files in a Drive folder.
 */
export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const resp = await driveRequest(
    `/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink)&orderBy=name`
  )
  if (!resp.ok) return []
  const data = await resp.json()
  return data.files || []
}

/** Extended file info including size + modified date for the tracker UI. */
export interface DriveFileDetailed {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  webViewLink?: string
  webContentLink?: string
  parents?: string[]
}

/**
 * List files in a Drive folder with detailed metadata. Used by the tracker
 * to render the Files-in-Drive section. Excludes trashed files. Returns
 * folders and files; the UI sorts/filters as needed.
 */
export async function listFilesDetailed(folderId: string, opts?: { includeSubfolderFiles?: boolean }): Promise<DriveFileDetailed[]> {
  const fields = 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents)'
  const resp = await driveRequest(
    `/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=${fields}&orderBy=folder,name&pageSize=100`
  )
  if (!resp.ok) return []
  const data = await resp.json()
  const direct: DriveFileDetailed[] = data.files || []

  if (!opts?.includeSubfolderFiles) return direct

  // Recurse one level: collect files from each direct child folder
  const subfolders = direct.filter(f => f.mimeType === 'application/vnd.google-apps.folder')
  const subFiles: DriveFileDetailed[] = []
  for (const sf of subfolders) {
    const r = await driveRequest(
      `/drive/v3/files?q='${sf.id}'+in+parents+and+trashed=false&fields=${fields}&orderBy=folder,name&pageSize=100`
    )
    if (r.ok) {
      const j = await r.json()
      for (const f of (j.files || [])) {
        subFiles.push({ ...f, parents: [sf.id] })
      }
    }
  }
  return [...direct, ...subFiles]
}

/**
 * Get the root MOG Bids folder ID.
 */
export function getMogBidsRootId(): string {
  return getRootFolderId()
}

// --- Bid Package Folder Templates ---

const ENTITY_LABELS: Record<string, string> = {
  exousia: 'Exousia',
  vitalx: 'VitalX',
  ironhouse: 'IronHouse',
}

/**
 * Generate a standardized bid folder name.
 * Format: [ShortTitle]-[Agency]-[SolNumber]
 */
export function generateBidFolderName(
  title: string,
  agency: string | null,
  solicitationNumber: string | null,
): string {
  // Shorten title to first 40 chars, remove special chars
  const shortTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .substring(0, 40)
    .trim()
    .replace(/\s+/g, '_')

  const parts = [shortTitle]
  if (agency) {
    const shortAgency = agency.substring(0, 20).trim().replace(/\s+/g, '_')
    parts.push(shortAgency)
  }
  if (solicitationNumber) {
    parts.push(solicitationNumber)
  }

  return parts.join('-')
}

/**
 * Create the standardized bid package folder structure.
 * Returns the folder URL to store in the lead record.
 */
export async function createBidPackageFolder(params: {
  entity: string
  title: string
  agency: string | null
  solicitationNumber: string | null
  naicsCode: string | null
  setAside: string | null
  estimatedValue: number | null
  responseDeadline: string | null
}): Promise<{ folderId: string; folderUrl: string }> {
  const rootId = getRootFolderId()

  // Find or create the entity's Proposals/Active folder path
  // Structure: MOG Bids / MightyOakGroup / [Entity] / Proposals / Active / [BidFolder]
  // But for new bids going forward, we'll create directly under MOG Bids / [Entity] / Active_Bids
  const entityLabel = ENTITY_LABELS[params.entity] || params.entity

  // Create entity folder if needed (MOG Bids > [Entity]_Bids)
  const entityFolderName = `${entityLabel}_Active_Bids`
  let entityFolder = await findFolder(entityFolderName, rootId)
  if (!entityFolder) {
    entityFolder = await createFolder(entityFolderName, rootId)
  }

  // Create the bid folder with standardized name
  const bidFolderName = generateBidFolderName(
    params.title,
    params.agency,
    params.solicitationNumber,
  )

  const structure: FolderStructure = {
    name: bidFolderName,
    children: [
      { name: '01_Solicitation_Docs' },
      { name: '02_Contract_Intel' },
      { name: '03_Pricing' },
      { name: '04_Technical_Proposal' },
      { name: '05_Past_Performance' },
      { name: '06_Subcontractors' },
      { name: '07_Compliance' },
      { name: '08_Final_Submission' },
    ],
  }

  const result = await createFolderStructure(structure, entityFolder.id)

  // Create a README with bid details
  const readmeContent = [
    `# ${params.title}`,
    ``,
    `**Entity:** ${entityLabel}`,
    `**Solicitation:** ${params.solicitationNumber || 'N/A'}`,
    `**Agency:** ${params.agency || 'N/A'}`,
    `**NAICS:** ${params.naicsCode || 'N/A'}`,
    `**Set-Aside:** ${params.setAside || 'N/A'}`,
    `**Estimated Value:** ${params.estimatedValue ? `$${params.estimatedValue.toLocaleString()}` : 'N/A'}`,
    `**Response Deadline:** ${params.responseDeadline || 'N/A'}`,
    ``,
    `---`,
    ``,
    `## Folder Structure`,
    `- 01_Solicitation_Docs — Original solicitation, amendments, attachments`,
    `- 02_Contract_Intel — USASpending data, incumbent info, market research`,
    `- 03_Pricing — Price schedules, cost breakdowns, wage determinations`,
    `- 04_Technical_Proposal — Technical approach, management plan, staffing`,
    `- 05_Past_Performance — References, past performance writeups`,
    `- 06_Subcontractors — Teaming agreements, sub quotes, scope of work`,
    `- 07_Compliance — Certifications, representations, required forms`,
    `- 08_Final_Submission — Final assembled proposal package`,
    ``,
    `Auto-generated by MOG Tracker on ${new Date().toISOString().split('T')[0]}`,
  ].join('\n')

  await uploadTextFile(readmeContent, 'README.md', result.id, 'text/markdown')

  return {
    folderId: result.id,
    folderUrl: result.webViewLink,
  }
}

/**
 * Create a commercial proposal folder for VitalX outreach.
 * Structure differs from government bids -- focused on sales materials.
 */
export async function createCommercialProposalFolder(params: {
  organizationName: string
  serviceCategory: string | null
  contactName: string | null
  estimatedValue: number | null
}): Promise<{ folderId: string; folderUrl: string }> {
  const rootId = getRootFolderId()

  // Create VitalX commercial folder path: MOG Bids > VitalX_Commercial
  const commercialFolderName = 'VitalX_Commercial'
  let commercialFolder = await findFolder(commercialFolderName, rootId)
  if (!commercialFolder) {
    commercialFolder = await createFolder(commercialFolderName, rootId)
  }

  // Create category subfolder if we have a category
  let parentFolder = commercialFolder
  if (params.serviceCategory) {
    const catFolderName = params.serviceCategory.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')
    let catFolder = await findFolder(catFolderName, commercialFolder.id)
    if (!catFolder) {
      catFolder = await createFolder(catFolderName, commercialFolder.id)
    }
    parentFolder = catFolder
  }

  // Create the prospect folder
  const orgFolderName = params.organizationName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .substring(0, 50)
    .trim()
    .replace(/\s+/g, '_')

  const structure: FolderStructure = {
    name: orgFolderName,
    children: [
      { name: '01_Research' },
      { name: '02_Outreach' },
      { name: '03_Proposal' },
      { name: '04_Pricing' },
      { name: '05_Contract' },
      { name: '06_Operations' },
    ],
  }

  const result = await createFolderStructure(structure, parentFolder.id)

  // Create a README
  const readmeContent = [
    `# ${params.organizationName}`,
    ``,
    `**Category:** ${params.serviceCategory || 'N/A'}`,
    `**Contact:** ${params.contactName || 'N/A'}`,
    `**Est. Annual Value:** ${params.estimatedValue ? `$${params.estimatedValue.toLocaleString()}` : 'N/A'}`,
    ``,
    `---`,
    ``,
    `## Folder Structure`,
    `- 01_Research — Facility info, contact research, NPI data, competitor analysis`,
    `- 02_Outreach — Email drafts, call scripts, meeting notes, LinkedIn messages`,
    `- 03_Proposal — Service proposals, capability statements, SLAs`,
    `- 04_Pricing — Rate sheets, volume pricing, cost models`,
    `- 05_Contract — Signed agreements, MSAs, amendments, insurance docs`,
    `- 06_Operations — Route plans, SOPs, delivery schedules, KPIs`,
    ``,
    `Auto-generated by MOG Tracker on ${new Date().toISOString().split('T')[0]}`,
  ].join('\n')

  await uploadTextFile(readmeContent, 'README.md', result.id, 'text/markdown')

  return {
    folderId: result.id,
    folderUrl: result.webViewLink,
  }
}

/**
 * Find a subfolder by name within a parent folder.
 * Exported for use by other modules (e.g., sam-documents).
 */
export async function findSubfolder(name: string, parentId: string): Promise<DriveFile | null> {
  return findFolder(name, parentId)
}

/**
 * Find a folder by name within a parent folder.
 */
async function findFolder(name: string, parentId: string): Promise<DriveFile | null> {
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const resp = await driveRequest(
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)`
  )
  if (!resp.ok) return null
  const data = await resp.json()
  return data.files?.[0] || null
}
