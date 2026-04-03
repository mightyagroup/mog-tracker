import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCommercialProposalFolder, findSubfolder, uploadBuffer } from '@/lib/google-drive'
import { generateCommercialProposalPackage } from '@/lib/proposals/generate-commercial-proposal'
import { generateCapabilityStatement } from '@/lib/proposals/generate-proposal'

/**
 * POST /api/drive/create-commercial-folder
 *
 * Creates a Google Drive proposal folder for a commercial lead.
 * Structure: MOG Bids > VitalX_Commercial > [Category] > [OrgName]
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

    // Skip if folder already exists
    if (lead.drive_folder_url) {
      return NextResponse.json({
        folderUrl: lead.drive_folder_url,
        message: 'Folder already exists',
        alreadyExists: true,
      })
    }

    const result = await createCommercialProposalFolder({
      organizationName: lead.organization_name,
      serviceCategory: lead.service_category,
      contactName: lead.contact_name,
      estimatedValue: lead.estimated_annual_value,
    })

    // Update the lead with the folder URL
    const { error: updateError } = await supabase
      .from('commercial_leads')
      .update({ drive_folder_url: result.folderUrl })
      .eq('id', leadId)

    if (updateError) {
      console.error('Failed to update commercial lead with folder URL:', updateError)
    }

    // Auto-generate commercial proposal templates and upload to subfolders
    const proposalResult = { generated: 0, uploaded: 0 }
    try {
      const COMMERCIAL_DOC_MAP: Record<string, string> = {
        Proposal: '03_Proposal',
        SLA: '05_Contract',
        Pricing: '04_Pricing',
        Capability_Statement: '03_Proposal',
      }

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

      proposalResult.generated = docs.length

      const subfolderCache: Record<string, string> = {}

      for (const doc of docs) {
        let targetFolder = '03_Proposal'
        for (const [pattern, folder] of Object.entries(COMMERCIAL_DOC_MAP)) {
          if (doc.fileName.includes(pattern)) {
            targetFolder = folder
            break
          }
        }

        let targetFolderId = subfolderCache[targetFolder]
        if (!targetFolderId) {
          const subfolder = await findSubfolder(targetFolder, result.folderId)
          if (subfolder) {
            targetFolderId = subfolder.id
            subfolderCache[targetFolder] = targetFolderId
          } else {
            targetFolderId = result.folderId
          }
        }

        const uploaded = await uploadBuffer(doc.buffer, doc.fileName, targetFolderId)
        if (uploaded) proposalResult.uploaded++
      }
    } catch (proposalErr) {
      console.error('Commercial proposal doc generation failed (non-blocking):', proposalErr)
    }

    return NextResponse.json({
      folderUrl: result.folderUrl,
      folderId: result.folderId,
      message: 'Commercial proposal folder created',
      alreadyExists: false,
      proposalDocs: {
        generated: proposalResult.generated,
        uploaded: proposalResult.uploaded,
      },
    })
  } catch (err) {
    console.error('Error creating commercial folder:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create commercial folder' },
      { status: 500 },
    )
  }
}
