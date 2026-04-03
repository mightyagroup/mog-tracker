import { NextRequest, NextResponse } from 'next/server'
import { createWebhookSupabaseClient, validateWebhookAuth, sanitizeInput, logWebhookCall, getSourceIp } from '@/lib/webhook-utils'
import { calculateFitScore } from '@/lib/utils'
import { EntityType, SetAsideType, SourceType, ContractType, LeadStatus, type GovLead } from '@/lib/types'

interface UpdateLeadRequest {
  entity: EntityType
  solicitation_number: string
  title?: string
  notice_id?: string
  description?: string
  agency?: string
  sub_agency?: string
  naics_code?: string
  set_aside?: SetAsideType
  contract_type?: ContractType
  source?: SourceType
  place_of_performance?: string
  posted_date?: string
  response_deadline?: string
  estimated_value?: number
  award_amount?: number
  proposal_lead?: string
  status?: LeadStatus
  sam_gov_url?: string
  notes?: string
  bid_decision_notes?: string
}

export async function POST(request: NextRequest) {
  const sourceIp = getSourceIp(request)
  const endpoint = '/api/webhooks/update-lead'

  try {
    // Validate bearer token
    if (!validateWebhookAuth(request)) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: 'Invalid or missing Authorization header',
        responseStatus: 401,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: 'Invalid JSON request body',
        responseStatus: 400,
      })
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate request body shape
    const payload = body as Partial<UpdateLeadRequest>
    if (!payload.entity || !payload.solicitation_number) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: 'Missing required fields: entity, solicitation_number',
        requestBody: payload,
        responseStatus: 400,
      })
      return NextResponse.json(
        { error: 'Missing required fields: entity and solicitation_number' },
        { status: 400 }
      )
    }

    // Validate entity type
    if (!['exousia', 'vitalx', 'ironhouse'].includes(payload.entity)) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: `Invalid entity: ${payload.entity}`,
        requestBody: payload,
        responseStatus: 400,
      })
      return NextResponse.json(
        { error: 'Invalid entity. Must be exousia, vitalx, or ironhouse' },
        { status: 400 }
      )
    }

    const supabase = createWebhookSupabaseClient()

    // Find existing lead
    const { data: existingLead, error: findError } = await supabase
      .from('gov_leads')
      .select('*')
      .eq('solicitation_number', payload.solicitation_number)
      .eq('entity', payload.entity)
      .single()

    if (findError || !existingLead) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: `Lead not found: ${payload.solicitation_number} (${payload.entity})`,
        requestBody: payload,
        responseStatus: 404,
      })
      return NextResponse.json(
        { error: 'Lead not found', solicitation: payload.solicitation_number },
        { status: 404 }
      )
    }

    // Build update object with sanitized inputs
    const updateData: Record<string, unknown> = {}

    if (payload.title !== undefined) {
      updateData.title = sanitizeInput(payload.title)
    }
    if (payload.notice_id !== undefined) {
      updateData.notice_id = payload.notice_id ? sanitizeInput(payload.notice_id) : null
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description ? sanitizeInput(payload.description) : null
    }
    if (payload.agency !== undefined) {
      updateData.agency = payload.agency ? sanitizeInput(payload.agency) : null
    }
    if (payload.sub_agency !== undefined) {
      updateData.sub_agency = payload.sub_agency ? sanitizeInput(payload.sub_agency) : null
    }
    if (payload.naics_code !== undefined) {
      updateData.naics_code = payload.naics_code ? sanitizeInput(payload.naics_code) : null
    }
    if (payload.set_aside !== undefined) {
      updateData.set_aside = payload.set_aside
    }
    if (payload.contract_type !== undefined) {
      updateData.contract_type = payload.contract_type || null
    }
    if (payload.source !== undefined) {
      updateData.source = payload.source
    }
    if (payload.place_of_performance !== undefined) {
      updateData.place_of_performance = payload.place_of_performance ? sanitizeInput(payload.place_of_performance) : null
    }
    if (payload.posted_date !== undefined) {
      updateData.posted_date = payload.posted_date || null
    }
    if (payload.response_deadline !== undefined) {
      updateData.response_deadline = payload.response_deadline || null
    }
    if (payload.estimated_value !== undefined) {
      updateData.estimated_value = payload.estimated_value || null
    }
    if (payload.award_amount !== undefined) {
      updateData.award_amount = payload.award_amount || null
    }
    if (payload.proposal_lead !== undefined) {
      updateData.proposal_lead = payload.proposal_lead ? sanitizeInput(payload.proposal_lead) : null
    }
    if (payload.status !== undefined) {
      updateData.status = payload.status
    }
    if (payload.sam_gov_url !== undefined) {
      updateData.sam_gov_url = payload.sam_gov_url ? sanitizeInput(payload.sam_gov_url) : null
    }
    if (payload.notes !== undefined) {
      updateData.notes = payload.notes ? sanitizeInput(payload.notes) : null
    }
    if (payload.bid_decision_notes !== undefined) {
      updateData.bid_decision_notes = payload.bid_decision_notes ? sanitizeInput(payload.bid_decision_notes) : null
    }

    // Recalculate fit score if relevant fields changed
    if (
      payload.naics_code !== undefined ||
      payload.set_aside !== undefined ||
      payload.place_of_performance !== undefined ||
      payload.estimated_value !== undefined ||
      payload.response_deadline !== undefined ||
      payload.source !== undefined
    ) {
      const fitScore = calculateFitScore(
        { ...existingLead, ...updateData } as Partial<GovLead>,
        payload.entity
      )
      updateData.fit_score = fitScore
    }

    // Perform update
    const { data: updatedLead, error: updateError } = await supabase
      .from('gov_leads')
      .update(updateData)
      .eq('id', existingLead.id)
      .select()
      .single()

    if (updateError || !updatedLead) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: updateError?.message || 'Failed to update lead',
        requestBody: payload,
        responseStatus: 500,
      })
      return NextResponse.json(
        { error: 'Failed to update lead', details: updateError?.message },
        { status: 500 }
      )
    }

    // Log successful webhook call
    await logWebhookCall({
      endpoint,
      method: 'POST',
      sourceIp,
      success: true,
      requestBody: payload,
      responseStatus: 200,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Lead updated successfully',
        leadId: updatedLead.id,
        lead: updatedLead,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logWebhookCall({
      endpoint,
      method: 'POST',
      sourceIp,
      success: false,
      errorMessage,
      responseStatus: 500,
    })

    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
