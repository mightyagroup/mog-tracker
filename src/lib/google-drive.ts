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
 * Create a folder in Google Drive.
 */
export async function createFolder(
  name: string,
  parentId: string,
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

  return resp.json()
}

/**
 * Create a nested folder structure under a parent.
 * Returns the top-level folder's ID and webViewLink.
 */
export async function createFolderStructure(
  structure: FolderStructure,
  parentId: string,
): Promise<{ id: string; webViewLink: string }> {
  const topFolder = await createFolder(structure.name, parentId)

  if (structure.children) {
    for (const child of structure.children) {
      await createFolderStructure(child, topFolder.id)
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
  try {
    const token = await getAccessToken()
    const metadata = JSON.stringify({
      name: fileName,
      parents: [parentId],
    })

    const boundary = '===MOG_BUFFER_BOUNDARY==='
    const encoder = new TextEncoder()
    const metadataPart = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
    )
    const filePart = encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`)
    const endPart = encoder.encode(`\r\n--${boundary}--`)

    const body = new Uint8Array(metadataPart.length + filePart.length + buffer.length + endPart.length)
    body.set(metadataPart, 0)
    body.set(filePart, metadataPart.length)
    body.set(new Uint8Array(buffer), metadataPart.length + filePart.length)
    body.set(endPart, metadataPart.length + filePart.length + buffer.length)

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
      console.error(`Failed to upload buffer ${fileName}: ${resp.status} ${err}`)
      return null
    }

    return resp.json()
  } catch (err) {
    console.error(`Error uploading buffer: ${err}`)
    return null
  }
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
