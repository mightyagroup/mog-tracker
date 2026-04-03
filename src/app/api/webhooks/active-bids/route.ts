import { NextRequest, NextResponse } from 'next/server'
import { createWebhookSupabaseClient, validateWebhookAuth, logWebhookCall, getSourceIp } from '@/lib/webhook-utils'
import { EntityType, GovLead } from '@/lib/types'
import { addDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const sourceIp = getSourceIp(request)
  const endpoint = '/api/webhooks/active-bids'

  try {
    // Validate bearer token
    if (!validateWebhookAuth(request)) {
      await logWebhookCall({
        endpoint,
        method: 'GET',
        sourceIp,
        success: false,
        errorMessage: 'Invalid or missing Authorization header',
        responseStatus: 401,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const entityParam = searchParams.get('entity')
    const daysParam = searchParams.get('days')

    // Validate entity if provided
    if (entityParam && !['exousia', 'vitalx', 'ironhouse'].includes(entityParam)) {
      await logWebhookCall({
        endpoint,
        method: 'GET',
        sourceIp,
        success: false,
        errorMessage: `Invalid entity parameter: ${entityParam}`,
        responseStatus: 400,
      })
      return NextResponse.json(
        { error: 'Invalid entity. Must be exousia, vitalx, or ironhouse' },
        { status: 400 }
      )
    }

    // Parse days parameter (default 14)
    const days = daysParam ? Math.max(1, Math.min(365, parseInt(daysParam, 10))) : 14

    const supabase = createWebhookSupabaseClient()

    // Build query
    let query = supabase
      .from('gov_leads')
      .select(
        'id, entity, title, solicitation_number, agency, response_deadline, estimated_value, status, fit_score, proposal_lead'
      )
      .eq('status', 'active_bid')

    // Filter by entity if provided
    if (entityParam) {
      query = query.eq('entity', entityParam as EntityType)
    }

    // Get all active bids
    const { data: allBids, error: queryError } = await query

    if (queryError) {
      await logWebhookCall({
        endpoint,
        method: 'GET',
        sourceIp,
        success: false,
        errorMessage: queryError.message,
        responseStatus: 500,
      })
      return NextResponse.json(
        { error: 'Failed to fetch active bids', details: queryError.message },
        { status: 500 }
      )
    }

    // Filter bids by deadline window
    const now = new Date()
    const deadlineThreshold = addDays(now, days)

    const filteredBids = (allBids || []).filter((bid: any) => {
      if (!bid.response_deadline) return true // Include bids with no deadline
      const deadline = new Date(bid.response_deadline)
      return deadline <= deadlineThreshold && deadline >= now
    })

    // Format response
    const responseBids = filteredBids.map((bid: any) => ({
      id: bid.id,
      entity: bid.entity,
      title: bid.title,
      solicitation_number: bid.solicitation_number,
      agency: bid.agency,
      response_deadline: bid.response_deadline,
      estimated_value: bid.estimated_value,
      status: bid.status,
      fit_score: bid.fit_score,
      proposal_lead: bid.proposal_lead,
    }))

    // Log successful webhook call
    await logWebhookCall({
      endpoint,
      method: 'GET',
      sourceIp,
      success: true,
      responseStatus: 200,
    })

    return NextResponse.json(
      {
        success: true,
        count: responseBids.length,
        deadlineDaysWindow: days,
        entity: entityParam || 'all',
        bids: responseBids,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logWebhookCall({
      endpoint,
      method: 'GET',
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
