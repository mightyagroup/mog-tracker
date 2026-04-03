import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createBidPackageFolder, findSubfolder, uploadBuffer } from '@/lib/google-drive'
import { downloadSamDocsToFolder } from '@/lib/sam-documents'
import { generateProposalPackage, generateCapabilityStatement } from '@/lib/proposals/generate-proposal'

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the lead details
    const { data: lead, error: leadError } = await supabase
      .from('gov_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Don't create if folder already exists
    if (lead.drive_folder_url) {
      return NextResponse.json({
        folderUrl: lead.drive_folder_url,
        message: 'Folder already exists',
        alreadyExists: true,
      })
    }

    // Create the bid package folder in Google Drive
    const result = await createBidPackageFolder({
      entity: lead.entity,
      title: lead.title,
      agency: lead.agency,
      solicitationNumber: lead.solicitation_number,
      naicsCode: lead.naics_code,
      setAside: lead.set_aside,
      estimatedValue: lead.estimated_value,
      responseDeadline: lead.response_deadline,
    })

    // Update the lead with the folder URL
    const { error: updateError } = await supabase
      .from('gov_leads')
      .update({ drive_folder_url: result.folderUrl })
      .eq('id', leadId)

    if (updateError) {
      console.error('Failed to update lead with folder URL:', updateError)
    }

    // Download SAM.gov solicitation documents into 01_Solicitation_Docs
    // This runs async -- folder is created even if doc download fails
    let docResult = { totalFound: 0, totalUploaded: 0, documents: [] as { fileName: string; success: boolean }[] }
    if (lead.source === 'sam_gov' && lead.notice_id) {
      try {
        docResult = await downloadSamDocsToFolder({
          noticeId: lead.notice_id,
          solicitationNumber: lead.solicitation_number,
          bidFolderId: result.folderId,
          samGovUrl: lead.sam_gov_url,
        })
      } catch (docErr) {
        console.error('SAM.gov doc download failed (non-blocking):', docErr)
      }
    }

    // Auto-generate proposal template documents and upload to subfolders
    const proposalResult = { generated: 0, uploaded: 0 }
    try {
      const DOC_FOLDER_MAP: Record<string, string> = {
        Cover_Letter: '08_Final_Submission',
        Technical_Proposal: '04_Technical_Proposal',
        Past_Performance: '05_Past_Performance',
        Compliance_Certifications: '07_Compliance',
        Quality_Control_Plan: '07_Compliance',
        Pricing_Worksheet: '03_Pricing',
        Capability_Statement: '08_Final_Submission',
      }

      const docs = await generateProposalPackage({
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

      // Also generate capability statement
      const capStatement = await generateCapabilityStatement(lead.entity)
      docs.push(capStatement)

      proposalResult.generated = docs.length

      // Cache subfolder lookups
      const subfolderCache: Record<string, string> = {}

      for (const doc of docs) {
        // Determine target subfolder
        let targetFolder = '04_Technical_Proposal'
        for (const [pattern, folder] of Object.entries(DOC_FOLDER_MAP)) {
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
      console.error('Proposal doc generation failed (non-blocking):', proposalErr)
    }

    return NextResponse.json({
      folderUrl: result.folderUrl,
      folderId: result.folderId,
      message: 'Bid package folder created',
      alreadyExists: false,
      samDocs: {
        found: docResult.totalFound,
        uploaded: docResult.totalUploaded,
      },
      proposalDocs: {
        generated: proposalResult.generated,
        uploaded: proposalResult.uploaded,
      },
    })
  } catch (err) {
    console.error('Error creating bid folder:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create bid folder' },
      { status: 500 }
    )
  }
}
