import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { findSubfolder, uploadBuffer } from '@/lib/google-drive'
import { generateCommercialProposalPackage } from '@/lib/proposals/generate-commercial-proposal'
import { generateCapabilityStatement } from '@/lib/proposals/generate-proposal'

/**
 * Mapping from commercial doc types to folder subfolders.
 * Commercial folder structure:
 *   01_Research
 *   02_Outreach
 *   03_Proposal
 *   04_Pricing
 *   05_Contract
 *   06_Operations
 */
const COMMERCIAL_DOC_FOLDER_MAP: Record<string, string> = {
  Proposal: '03_Proposal',
  SLA: '05_Contract',
  Pricing: '04_Pricing',
  Capability_Statement: '03_Proposal',
}

function getTargetSubfolder(fileName: string): string {
  for (const [pattern, folder] of Object.entries(COMMERCIAL_DOC_FOLDER_MAP)) {
    if (fileName.includes(pattern)) {
      return folder
    }
  }
  return '03_Proposal'
}

/**
 * POST /api/drive/generate-commercial-docs
 *
 * Generates commercial proposal documents for a VitalX prospect and
 * uploads them to the correct subfolders in the prospect's Drive folder.
 *
 * Body: { leadId: string }
 */
export async function POST(request: Request) {
  try {
    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lead, error: leadError } = await supabase
      .from('commercial_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.drive_folder_url) {
      return NextResponse.json(
        { error: 'Lead does not have a Drive folder. Create the folder first.' },
        { status: 400 }
      )
    }

    // Extract folder ID from URL
    const folderIdMatch = lead.drive_folder_url.match(/folders\/([a-zA-Z0-9_-]+)/)
    if (!folderIdMatch) {
      return NextResponse.json(
        { error: 'Could not parse Drive folder ID from URL' },
        { status: 400 }
      )
    }
    const prospectFolderId = folderIdMatch[1]

    // Generate commercial proposal docs
    const docs = await generateCommercialProposalPackage({
      organizationName: lead.organization_name,
      contactName: lead.contact_name,
      contactTitle: lead.contact_title,
      serviceCategory: lead.service_category,
      estimatedAnnualValue: lead.estimated_annual_value,
      notes: lead.notes,
    })

    // Also generate VitalX capability statement
    const capStatement = await generateCapabilityStatement('vitalx')
    docs.push(capStatement)

    // Upload each doc to the correct subfolder
    const uploadResults: { fileName: string; subfolder: string; success: boolean }[] = []
    const subfolderCache: Record<string, string> = {}

    for (const doc of docs) {
      const targetSubfolderName = getTargetSubfolder(doc.fileName)

      try {
        let targetFolderId = subfolderCache[targetSubfolderName]
        if (!targetFolderId) {
          const subfolder = await findSubfolder(targetSubfolderName, prospectFolderId)
          if (subfolder) {
            targetFolderId = subfolder.id
            subfolderCache[targetSubfolderName] = targetFolderId
          } else {
            targetFolderId = prospectFolderId
          }
        }

        const result = await uploadBuffer(doc.buffer, doc.fileName, targetFolderId)
        uploadResults.push({
          fileName: doc.fileName,
          subfolder: targetSubfolderName,
          success: !!result,
        })
      } catch {
        uploadResults.push({
          fileName: doc.fileName,
          subfolder: targetSubfolderName,
          success: false,
        })
      }
    }

    const successCount = uploadResults.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} commercial proposal documents`,
      totalGenerated: docs.length,
      totalUploaded: successCount,
      documents: uploadResults,
    })
  } catch (err) {
    console.error('Error generating commercial docs:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate commercial documents' },
      { status: 500 }
    )
  }
}
