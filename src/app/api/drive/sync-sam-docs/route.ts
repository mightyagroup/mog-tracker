import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createBidPackageFolder } from '@/lib/google-drive'
import { downloadSamDocsToFolder } from '@/lib/sam-documents'

/**
 * POST /api/drive/sync-sam-docs
 *
 * On-demand solicitation document sync for a specific gov lead.
 * Downloads all available documents from SAM.gov and uploads them
 * to the lead's Drive folder (01_Solicitation_Docs).
 *
 * If no Drive folder exists, creates one first.
 * Creates an interaction note logging what was synced.
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

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('gov_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.notice_id && !lead.solicitation_number) {
      return NextResponse.json({
        error: 'This lead has no SAM.gov notice ID or solicitation number. Documents cannot be fetched.',
      }, { status: 400 })
    }

    // Check SAM.gov API key
    if (!process.env.SAMGOV_API_KEY) {
      return NextResponse.json({
        error: 'SAMGOV_API_KEY is not configured. Add it to environment variables.',
      }, { status: 500 })
    }

    // Ensure Drive folder exists
    let driveFolderUrl = lead.drive_folder_url as string | null
    let bidFolderId: string | null = null

    if (!driveFolderUrl) {
      // Create the bid folder first
      try {
        const folderResult = await createBidPackageFolder({
          entity: lead.entity,
          title: lead.title,
          agency: lead.agency,
          solicitationNumber: lead.solicitation_number,
          naicsCode: lead.naics_code,
          setAside: lead.set_aside,
          estimatedValue: lead.estimated_value,
          responseDeadline: lead.response_deadline,
        })
        bidFolderId = folderResult.folderId
        driveFolderUrl = folderResult.folderUrl

        await supabase
          .from('gov_leads')
          .update({ drive_folder_url: driveFolderUrl })
          .eq('id', leadId)
      } catch (folderErr) {
        return NextResponse.json({
          error: `Failed to create Drive folder: ${String(folderErr)}`,
        }, { status: 500 })
      }
    } else {
      // Extract folder ID from existing URL
      const folderMatch = driveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/)
      if (folderMatch) {
        bidFolderId = folderMatch[1]
      } else {
        return NextResponse.json({
          error: 'Could not extract folder ID from Drive URL.',
        }, { status: 400 })
      }
    }

    // Download documents from SAM.gov
    const docResult = await downloadSamDocsToFolder({
      noticeId: lead.notice_id,
      solicitationNumber: lead.solicitation_number,
      bidFolderId: bidFolderId!,
      samGovUrl: lead.sam_gov_url,
    })

    // Create interaction note logging the sync
    const noteLines: string[] = [
      `MANUAL DOCUMENT SYNC`,
      ``,
      `Triggered by ${user.email} on ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `SAM.gov Notice: ${lead.notice_id || 'N/A'}`,
      `Solicitation: ${lead.solicitation_number || 'N/A'}`,
      ``,
    ]

    if (docResult.totalFound > 0) {
      noteLines.push(`Found ${docResult.totalFound} document(s), uploaded ${docResult.totalUploaded} to Drive.`)
      noteLines.push(``)
      for (const doc of docResult.documents) {
        noteLines.push(`- ${doc.success ? '[synced]' : '[FAILED]'} ${doc.fileName}${doc.error ? ` (${doc.error})` : ''}`)
      }
      noteLines.push(``)
      noteLines.push(`Documents saved to: 01_Solicitation_Docs`)
    } else {
      noteLines.push(`No downloadable documents found via SAM.gov API.`)
      noteLines.push(`Check the solicitation page directly for attachments:`)
      noteLines.push(lead.sam_gov_url || `https://sam.gov/opp/${lead.notice_id}/view`)
    }

    try {
      await supabase.from('interactions').insert({
        entity: lead.entity,
        gov_lead_id: lead.id,
        interaction_date: new Date().toISOString().slice(0, 10),
        interaction_type: 'system_update',
        subject: `Document Sync -- ${docResult.totalUploaded} of ${docResult.totalFound} uploaded`,
        notes: noteLines.join('\n'),
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({
      success: true,
      folderUrl: driveFolderUrl,
      folderId: bidFolderId,
      folderCreated: !lead.drive_folder_url,
      documents: {
        found: docResult.totalFound,
        uploaded: docResult.totalUploaded,
        details: docResult.documents,
      },
    })
  } catch (err) {
    console.error('Error syncing SAM docs:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync documents' },
      { status: 500 }
    )
  }
}
