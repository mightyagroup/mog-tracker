import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { findSubfolder, uploadBuffer } from '@/lib/google-drive'
import { generateProposalPackage, generateCapabilityStatement } from '@/lib/proposals/generate-proposal'

/**
 * Mapping from generated document types to bid folder subfolders.
 * The folder structure is:
 *   01_Solicitation_Docs
 *   02_Contract_Intel
 *   03_Pricing
 *   04_Technical_Proposal
 *   05_Past_Performance
 *   06_Subcontractors
 *   07_Compliance
 *   08_Final_Submission
 */
const DOC_FOLDER_MAP: Record<string, string> = {
  Cover_Letter: '08_Final_Submission',
  Technical_Proposal: '04_Technical_Proposal',
  Past_Performance: '05_Past_Performance',
  Compliance_Certifications: '07_Compliance',
  Quality_Control_Plan: '07_Compliance',
  Pricing_Worksheet: '03_Pricing',
  Capability_Statement: '08_Final_Submission',
}

/**
 * Determine which subfolder a document belongs in based on its filename.
 */
function getTargetSubfolder(fileName: string): string {
  for (const [pattern, folder] of Object.entries(DOC_FOLDER_MAP)) {
    if (fileName.includes(pattern)) {
      return folder
    }
  }
  return '04_Technical_Proposal' // default
}

/**
 * POST /api/drive/generate-proposal-docs
 *
 * Generates all proposal template documents for a government bid and
 * uploads them to the correct subfolders in the bid's Drive folder.
 *
 * Body: { leadId: string, includeCapStatement?: boolean }
 *
 * The lead must already have a drive_folder_url (i.e., the bid folder
 * must have been created first via /api/drive/create-bid-folder).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadId, includeCapStatement = true } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('gov_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.drive_folder_url) {
      return NextResponse.json(
        { error: 'Lead does not have a Drive folder yet. Create the bid folder first.' },
        { status: 400 }
      )
    }

    // Extract the folder ID from the Drive URL
    // URL format: https://drive.google.com/drive/folders/FOLDER_ID
    const folderIdMatch = lead.drive_folder_url.match(/folders\/([a-zA-Z0-9_-]+)/)
    if (!folderIdMatch) {
      return NextResponse.json(
        { error: 'Could not parse Drive folder ID from URL' },
        { status: 400 }
      )
    }
    const bidFolderId = folderIdMatch[1]

    // Generate proposal documents
    const proposalDocs = await generateProposalPackage({
      entity: lead.entity,
      title: lead.title,
      solicitationNumber: lead.solicitation_number,
      agency: lead.agency,
      subAgency: lead.sub_agency,
      naicsCode: lead.naics_code,
      setAside: lead.set_aside,
      estimatedValue: lead.estimated_value,
      responseDeadline: lead.response_deadline,
      placeOfPerformance: lead.place_of_performance,
      description: lead.description,
      samGovUrl: lead.sam_gov_url,
    })

    // Optionally generate capability statement
    if (includeCapStatement) {
      const capStatement = await generateCapabilityStatement(lead.entity)
      proposalDocs.push(capStatement)
    }

    // Upload each document to the correct subfolder
    const uploadResults: { fileName: string; subfolder: string; success: boolean; error?: string }[] = []

    // Cache found subfolder IDs to avoid repeated lookups
    const subfolderCache: Record<string, string> = {}

    for (const doc of proposalDocs) {
      const targetSubfolderName = getTargetSubfolder(doc.fileName)

      try {
        // Find the target subfolder within the bid folder
        let targetFolderId = subfolderCache[targetSubfolderName]
        if (!targetFolderId) {
          const subfolder = await findSubfolder(targetSubfolderName, bidFolderId)
          if (subfolder) {
            targetFolderId = subfolder.id
            subfolderCache[targetSubfolderName] = targetFolderId
          } else {
            // If subfolder not found, upload directly to bid folder
            targetFolderId = bidFolderId
          }
        }

        const result = await uploadBuffer(doc.buffer, doc.fileName, targetFolderId)
        uploadResults.push({
          fileName: doc.fileName,
          subfolder: targetSubfolderName,
          success: !!result,
        })
      } catch (err) {
        uploadResults.push({
          fileName: doc.fileName,
          subfolder: targetSubfolderName,
          success: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    }

    const successCount = uploadResults.filter(r => r.success).length
    const failCount = uploadResults.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Generated and uploaded ${successCount} proposal documents${failCount > 0 ? ` (${failCount} failed)` : ''}`,
      totalGenerated: proposalDocs.length,
      totalUploaded: successCount,
      totalFailed: failCount,
      documents: uploadResults,
    })
  } catch (err) {
    console.error('Error generating proposal docs:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate proposal documents' },
      { status: 500 }
    )
  }
}
