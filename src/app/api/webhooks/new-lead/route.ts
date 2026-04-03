import { NextRequest, NextResponse } from 'next/server'
import { createWebhookSupabaseClient, validateWebhookAuth, sanitizeInput, logWebhookCall, getSourceIp } from '@/lib/webhook-utils'
import { calculateFitScore } from '@/lib/utils'
import { EntityType, SetAsideType, SourceType, ContractType } from '@/lib/types'

interface NewLeadRequest {
  entity: EntityType
  title: string
  solicitation_number?: string
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
  proposal_lead?: string
  sam_gov_url?: string
  notes?: string
}

export async function POST(request: NextRequest) {
  const sourceIp = getSourceIp(request)
  const endpoint = '/api/webhooks/new-lead'

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
    const payload = body as Partial<NewLeadRequest>
    if (!payload.entity || !payload.title) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: 'Missing required fields: entity, title',
        requestBody: payload,
        responseStatus: 400,
      })
      return NextResponse.json(
        { error: 'Missing required fields: entity and title' },
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

    // Sanitize inputs
    const sanitizedPayload: NewLeadRequest = {
      entity: payload.entity,
      title: sanitizeInput(payload.title),
      solicitation_number: payload.solicitation_number ? sanitizeInput(payload.solicitation_number) : undefined,
      notice_id: payload.notice_id ? sanitizeInput(payload.notice_id) : undefined,
      description: payload.description ? sanitizeInput(payload.description) : undefined,
      agency: payload.agency ? sanitizeInput(payload.agency) : undefined,
      sub_agency: payload.sub_agency ? sanitizeInput(payload.sub_agency) : undefined,
      naics_code: payload.naics_code ? sanitizeInput(payload.naics_code) : undefined,
      set_aside: payload.set_aside || 'none',
      contract_type: payload.contract_type,
      source: payload.source || 'manual',
      place_of_performance: payload.place_of_performance ? sanitizeInput(payload.place_of_performance) : undefined,
      posted_date: payload.posted_date,
      response_deadline: payload.response_deadline,
      estimated_value: payload.estimated_value,
      proposal_lead: payload.proposal_lead ? sanitizeInput(payload.proposal_lead) : undefined,
      sam_gov_url: payload.sam_gov_url ? sanitizeInput(payload.sam_gov_url) : undefined,
      notes: payload.notes ? sanitizeInput(payload.notes) : undefined,
    }

    const supabase = createWebhookSupabaseClient()

    // Check for duplicate solicitation_number+entity
    if (sanitizedPayload.solicitation_number) {
      const { data: existing, error: checkError } = await supabase
        .from('gov_leads')
        .select('id')
        .eq('solicitation_number', sanitizedPayload.solicitation_number)
        .eq('entity', sanitizedPayload.entity)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = "no rows returned" which is expected
        throw checkError
      }

      if (existing) {
        // Duplicate found - return existing lead
        await logWebhookCall({
          endpoint,
          method: 'POST',
          sourceIp,
          success: true,
          requestBody: sanitizedPayload,
          responseStatus: 200,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Lead already exists',
            leadId: existing.id,
            isDuplicate: true,
          },
          { status: 200 }
        )
      }
    }

    // Calculate fit score
    const fitScore = calculateFitScore(sanitizedPayload, sanitizedPayload.entity)

    // Insert new lead
    const { data: newLead, error: insertError } = await supabase
      .from('gov_leads')
      .insert({
        entity: sanitizedPayload.entity,
        title: sanitizedPayload.title,
        solicitation_number: sanitizedPayload.solicitation_number || null,
        notice_id: sanitizedPayload.notice_id || null,
        description: sanitizedPayload.description || null,
        agency: sanitizedPayload.agency || null,
        sub_agency: sanitizedPayload.sub_agency || null,
        naics_code: sanitizedPayload.naics_code || null,
        set_aside: sanitizedPayload.set_aside,
        contract_type: sanitizedPayload.contract_type || null,
        source: sanitizedPayload.source,
        place_of_performance: sanitizedPayload.place_of_performance || null,
        posted_date: sanitizedPayload.posted_date || null,
        response_deadline: sanitizedPayload.response_deadline || null,
        estimated_value: sanitizedPayload.estimated_value || null,
        proposal_lead: sanitizedPayload.proposal_lead || null,
        sam_gov_url: sanitizedPayload.sam_gov_url || null,
        notes: sanitizedPayload.notes || null,
        fit_score: fitScore,
        status: 'new',
      })
      .select()
      .single()

    if (insertError || !newLead) {
      await logWebhookCall({
        endpoint,
        method: 'POST',
        sourceIp,
        success: false,
        errorMessage: insertError?.message || 'Failed to insert lead',
        requestBody: sanitizedPayload,
        responseStatus: 500,
      })
      return NextResponse.json(
        { error: 'Failed to create lead', details: insertError?.message },
        { status: 500 }
      )
    }

    // Log successful webhook call
    await logWebhookCall({
      endpoint,
      method: 'POST',
      sourceIp,
      success: true,
      requestBody: sanitizedPayload,
      responseStatus: 201,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Lead created successfully',
        leadId: newLead.id,
        lead: newLead,
      },
      { status: 201 }
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
