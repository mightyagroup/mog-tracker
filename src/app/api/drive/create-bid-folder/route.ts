import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createBidPackageFolder } from '@/lib/google-drive'
import { downloadSamDocsToFolder } from '@/lib/sam-documents'

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

    return NextResponse.json({
      folderUrl: result.folderUrl,
      folderId: result.folderId,
      message: 'Bid package folder created',
      alreadyExists: false,
      samDocs: {
        found: docResult.totalFound,
        uploaded: docResult.totalUploaded,
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
