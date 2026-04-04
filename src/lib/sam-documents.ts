/**
 * SAM.gov Document Fetching
 *
 * Fetches solicitation documents (attachments, amendments) from SAM.gov
 * opportunities API and uploads them to Google Drive.
 *
 * Server-side only -- never import from client components.
 */

import { uploadFileFromUrl, findSubfolder, uploadTextFile } from './google-drive'
import type { FieldChange } from './lead-tracking'

// --- Types ---

interface SamResource {
  resourceId?: string
  name?: string
  description?: string
  type?: string
  uri?: string
  link?: string
  size?: number
  addedDate?: string
  packageAccessLevel?: string
  explicitAccess?: number
}

interface SamAttachment {
  name: string
  url: string
  type: string
  size?: number
  addedDate?: string
}

export interface DocumentUploadResult {
  fileName: string
  driveFileId: string | null
  success: boolean
  error?: string
}

// --- Date stamp for versioned filenames ---
function dateStamp(): string {
  return new Date().toISOString().slice(0, 10) // e.g. 2026-04-03
}

// --- SAM.gov API helpers ---

/**
 * Fetch opportunity details including resource links from SAM.gov.
 * Uses the opportunities v2 API to get the full record with attachments.
 */
async function fetchOpportunityResources(
  noticeId: string,
  apiKey: string,
): Promise<SamAttachment[]> {
  if (!noticeId || !apiKey) return []

  // SAM.gov v2 search by noticeId to get full details
  const params = new URLSearchParams({
    api_key: apiKey,
    noticeId: noticeId,
    limit: '1',
  })

  try {
    const resp = await fetch(
      `https://api.sam.gov/prod/opportunities/v2/search?${params.toString()}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(15_000) : undefined,
      }
    )

    if (!resp.ok) {
      console.error(`SAM.gov resources fetch failed: ${resp.status}`)
      return []
    }

    const data = await resp.json()
    const opps = data.opportunitiesData ?? data._embedded?.results ?? []
    if (opps.length === 0) return []

    const opp = opps[0]
    return extractAttachments(opp)
  } catch (err) {
    console.error('Error fetching SAM.gov opportunity resources:', err)
    return []
  }
}

/**
 * Try the SAM.gov resources endpoint directly.
 * This is a separate API that returns file download links for an opportunity.
 */
async function fetchResourcesEndpoint(
  noticeId: string,
  apiKey: string,
): Promise<SamAttachment[]> {
  if (!noticeId || !apiKey) return []

  try {
    // The resources endpoint returns downloadable file links
    const resp = await fetch(
      `https://api.sam.gov/prod/opportunities/v1/resources?noticeId=${noticeId}&api_key=${apiKey}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(15_000) : undefined,
      }
    )

    if (!resp.ok) {
      // This endpoint may not be available for all opportunities
      console.log(`SAM.gov resources endpoint returned ${resp.status} for ${noticeId}`)
      return []
    }

    const data = await resp.json()
    const resources: SamResource[] = Array.isArray(data) ? data : (data.resources ?? data._embedded?.resources ?? [])

    return resources
      .filter(r => r.uri || r.link)
      .map(r => ({
        name: r.name || r.description || 'document',
        url: r.uri || r.link || '',
        type: guessFileType(r.name || r.uri || ''),
        size: r.size,
        addedDate: r.addedDate,
      }))
  } catch (err) {
    console.error('Error fetching SAM.gov resources endpoint:', err)
    return []
  }
}

/**
 * Extract attachment URLs from a SAM.gov opportunity record.
 * SAM.gov stores attachments in various fields depending on the notice type.
 */
function extractAttachments(opp: Record<string, unknown>): SamAttachment[] {
  const attachments: SamAttachment[] = []

  // Check resourceLinks field
  if (Array.isArray(opp.resourceLinks)) {
    for (const link of opp.resourceLinks) {
      if (typeof link === 'string' && link.startsWith('http')) {
        attachments.push({
          name: extractFileName(link),
          url: link,
          type: guessFileType(link),
        })
      } else if (typeof link === 'object' && link !== null) {
        const rl = link as Record<string, unknown>
        const url = (rl.uri ?? rl.url ?? rl.link) as string | undefined
        if (url) {
          attachments.push({
            name: (rl.name as string) || extractFileName(url),
            url,
            type: guessFileType((rl.name as string) || url),
          })
        }
      }
    }
  }

  // Check links / documents / attachments fields
  for (const field of ['links', 'documents', 'attachments', 'additionalReporting']) {
    const items = opp[field]
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (typeof item === 'string' && item.startsWith('http')) {
        attachments.push({ name: extractFileName(item), url: item, type: guessFileType(item) })
      } else if (typeof item === 'object' && item !== null) {
        const doc = item as Record<string, unknown>
        const url = (doc.uri ?? doc.url ?? doc.link ?? doc.href) as string | undefined
        if (url) {
          attachments.push({
            name: (doc.name as string) || (doc.title as string) || extractFileName(url),
            url,
            type: guessFileType((doc.name as string) || url),
          })
        }
      }
    }
  }

  // Check description for embedded URLs (common in SAM.gov)
  if (typeof opp.description === 'string') {
    const urlPattern = /https?:\/\/[^\s"'<>]+\.(pdf|docx?|xlsx?|zip|csv)/gi
    let match
    while ((match = urlPattern.exec(opp.description)) !== null) {
      const url = match[0]
      if (!attachments.some(a => a.url === url)) {
        attachments.push({
          name: extractFileName(url),
          url,
          type: guessFileType(url),
        })
      }
    }
  }

  return attachments
}

// --- Utility helpers ---

function extractFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/')
    const last = parts[parts.length - 1]
    if (last && last.includes('.')) return decodeURIComponent(last)
  } catch { /* not a valid URL */ }
  return url.split('/').pop() || 'document'
}

function guessFileType(nameOrUrl: string): string {
  const lower = nameOrUrl.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.zip')) return 'application/zip'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

// --- Main export ---

/**
 * Fetch SAM.gov solicitation documents and upload them to the bid folder's
 * 01_Solicitation_Docs subfolder in Google Drive.
 *
 * Returns results for each document attempted.
 */
export async function downloadSamDocsToFolder(params: {
  noticeId: string | null
  solicitationNumber: string | null
  bidFolderId: string
  samGovUrl: string | null
}): Promise<{
  documents: DocumentUploadResult[]
  totalFound: number
  totalUploaded: number
}> {
  const apiKey = process.env.SAMGOV_API_KEY
  if (!apiKey) {
    console.error('SAMGOV_API_KEY not set, skipping document download')
    return { documents: [], totalFound: 0, totalUploaded: 0 }
  }

  if (!params.noticeId) {
    return { documents: [], totalFound: 0, totalUploaded: 0 }
  }

  // Find the 01_Solicitation_Docs subfolder
  const solDocsFolder = await findSubfolder('01_Solicitation_Docs', params.bidFolderId)
  if (!solDocsFolder) {
    console.error('Could not find 01_Solicitation_Docs subfolder')
    return { documents: [], totalFound: 0, totalUploaded: 0 }
  }

  // Try both approaches to find documents
  let attachments: SamAttachment[] = []

  // Approach 1: Resources endpoint (direct download links)
  const resourceAttachments = await fetchResourcesEndpoint(params.noticeId, apiKey)
  attachments = attachments.concat(resourceAttachments)

  // Approach 2: Opportunity details (resourceLinks field)
  if (attachments.length === 0) {
    const oppAttachments = await fetchOpportunityResources(params.noticeId, apiKey)
    attachments = attachments.concat(oppAttachments)
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  attachments = attachments.filter(a => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })

  const results: DocumentUploadResult[] = []

  // Upload each document to Drive with date prefix to preserve versions
  const stamp = dateStamp()
  for (const attachment of attachments) {
    // Prefix filename with date so amendments don't overwrite originals
    // e.g. "2026-04-03_Solicitation.pdf" vs "2026-03-01_Solicitation.pdf"
    const versionedName = `${stamp}_${attachment.name}`
    try {
      const driveFile = await uploadFileFromUrl(
        attachment.url,
        versionedName,
        solDocsFolder.id,
        attachment.type,
      )

      results.push({
        fileName: versionedName,
        driveFileId: driveFile?.id || null,
        success: !!driveFile,
      })
    } catch (err) {
      results.push({
        fileName: versionedName,
        driveFileId: null,
        success: false,
        error: String(err),
      })
    }

    // Rate limit: 200ms between uploads
    await new Promise(r => setTimeout(r, 200))
  }

  // Create an index file listing the SAM.gov source and what was downloaded
  const indexContent = [
    `# Solicitation Documents`,
    ``,
    `**Source:** SAM.gov`,
    `**Notice ID:** ${params.noticeId}`,
    `**Solicitation Number:** ${params.solicitationNumber || 'N/A'}`,
    `**SAM.gov URL:** ${params.samGovUrl || 'N/A'}`,
    `**Downloaded:** ${new Date().toISOString().split('T')[0]}`,
    ``,
    `## Documents Found: ${attachments.length}`,
    ``,
    ...results.map(r =>
      `- ${r.success ? '[x]' : '[ ]'} ${r.fileName}${r.error ? ` (Error: ${r.error})` : ''}`
    ),
    ``,
    attachments.length === 0
      ? `No downloadable documents were found via the SAM.gov API. Check the solicitation page directly for attachments.`
      : ``,
    ``,
    `Auto-generated by MOG Tracker on ${new Date().toISOString().split('T')[0]}`,
  ].join('\n')

  await uploadTextFile(indexContent, '_DOCUMENT_INDEX.md', solDocsFolder.id, 'text/markdown')

  return {
    documents: results,
    totalFound: attachments.length,
    totalUploaded: results.filter(r => r.success).length,
  }
}

// ── Amendment Comparison Report ──────────────────────────────────────────────
// Generates a markdown report showing exactly what changed and uploads it to
// the bid folder's 01_Solicitation_Docs so it's right next to the amended files.

export async function uploadAmendmentReport(params: {
  bidFolderId: string
  amendmentNumber: number
  title: string
  solicitationNumber: string | null
  agency: string | null
  entity: string
  changes: FieldChange[]
  docSyncResults?: { totalFound: number; totalUploaded: number; documents: DocumentUploadResult[] }
}): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const solDocsFolder = await findSubfolder('01_Solicitation_Docs', params.bidFolderId)
    if (!solDocsFolder) {
      return { success: false, error: 'Could not find 01_Solicitation_Docs subfolder' }
    }

    const stamp = dateStamp()
    const lines: string[] = []

    lines.push(`# Amendment ${params.amendmentNumber} -- Comparison Report`)
    lines.push('')
    lines.push(`**Date Detected:** ${stamp}`)
    lines.push(`**Title:** ${params.title}`)
    lines.push(`**Solicitation:** ${params.solicitationNumber || 'N/A'}`)
    lines.push(`**Agency:** ${params.agency || 'N/A'}`)
    lines.push(`**Entity:** ${params.entity}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // High-significance changes first
    const highChanges = params.changes.filter(c => c.significance === 'high')
    const medChanges = params.changes.filter(c => c.significance === 'medium')
    const lowChanges = params.changes.filter(c => c.significance === 'low')

    if (highChanges.length > 0) {
      lines.push('## HIGH-PRIORITY CHANGES (review immediately)')
      lines.push('')
      for (const c of highChanges) {
        lines.push(`### ${c.label}`)
        lines.push(`- **Previous:** ${c.oldValue}`)
        lines.push(`- **Updated:** ${c.newValue}`)
        lines.push('')
      }
    }

    if (medChanges.length > 0) {
      lines.push('## MEDIUM-PRIORITY CHANGES')
      lines.push('')
      for (const c of medChanges) {
        lines.push(`### ${c.label}`)
        lines.push(`- **Previous:** ${c.oldValue}`)
        lines.push(`- **Updated:** ${c.newValue}`)
        lines.push('')
      }
    }

    if (lowChanges.length > 0) {
      lines.push('## LOW-PRIORITY CHANGES')
      lines.push('')
      for (const c of lowChanges) {
        lines.push(`- **${c.label}:** ${c.oldValue} --> ${c.newValue}`)
      }
      lines.push('')
    }

    // Document sync section
    if (params.docSyncResults) {
      lines.push('---')
      lines.push('')
      lines.push('## DOCUMENT SYNC')
      lines.push('')
      lines.push(`Found ${params.docSyncResults.totalFound} document(s) on SAM.gov, uploaded ${params.docSyncResults.totalUploaded} to bid folder.`)
      lines.push('')
      if (params.docSyncResults.documents.length > 0) {
        for (const doc of params.docSyncResults.documents) {
          lines.push(`- ${doc.success ? '[synced]' : '[FAILED]'} ${doc.fileName}${doc.error ? ` -- Error: ${doc.error}` : ''}`)
        }
      } else {
        lines.push('No downloadable documents found via SAM.gov API. Check the solicitation page manually for attachments.')
      }
      lines.push('')
    }

    lines.push('---')
    lines.push('')
    lines.push('## ACTION ITEMS')
    lines.push('')
    lines.push('- [ ] Review all high-priority changes above')
    if (highChanges.some(c => c.field === 'response_deadline')) {
      lines.push('- [ ] UPDATE INTERNAL DEADLINE -- the response deadline has changed')
    }
    if (highChanges.some(c => c.field === 'estimated_value')) {
      lines.push('- [ ] Re-evaluate pricing based on updated estimated value')
    }
    lines.push('- [ ] Compare new solicitation documents against previous versions')
    lines.push('- [ ] Update proposal draft to reflect changes')
    lines.push('- [ ] Notify proposal team of amendment')
    lines.push('')
    lines.push(`Auto-generated by MOG Tracker on ${stamp}`)

    const fileName = `AMENDMENT_${params.amendmentNumber}_${stamp}.md`
    const file = await uploadTextFile(lines.join('\n'), fileName, solDocsFolder.id, 'text/markdown')

    if (file) {
      return { success: true, fileId: file.id }
    }
    return { success: false, error: 'Upload returned null' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
