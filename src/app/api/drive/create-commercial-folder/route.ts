import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCommercialProposalFolder } from '@/lib/google-drive'

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

    return NextResponse.json({
      folderUrl: result.folderUrl,
      folderId: result.folderId,
      message: 'Commercial proposal folder created',
      alreadyExists: false,
    })
  } catch (err) {
    console.error('Error creating commercial folder:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create commercial folder' },
      { status: 500 },
    )
  }
}
