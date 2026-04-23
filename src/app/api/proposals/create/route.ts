import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/proposals/create
// Body: { gov_lead_id: string, entity: 'exousia'|'vitalx'|'ironhouse' }
// Creates a new proposal linked to the gov_lead. Seeds intake from lead fields.
// Returns: { proposal_id: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const govLeadId = body.gov_lead_id as string
    const entity = body.entity as string
    if (!govLeadId || !entity) {
      return NextResponse.json({ error: 'gov_lead_id and entity required' }, { status: 400 })
    }
    if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
      return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    // Prevent duplicate proposals for same lead+entity
    const existing = await supa.from('proposals')
      .select('id')
      .eq('gov_lead_id', govLeadId)
      .eq('entity', entity)
      .is('archived_at', null)
      .maybeSingle()
    if (existing.data) {
      return NextResponse.json({ proposal_id: existing.data.id, existing: true })
    }

    // Load lead for seeding
    const { data: lead, error: leadErr } = await supa.from('gov_leads')
      .select('*')
      .eq('id', govLeadId)
      .single()
    if (leadErr || !lead) {
      return NextResponse.json({ error: 'gov lead not found' }, { status: 404 })
    }

    const { data: created, error } = await supa.from('proposals').insert({
      entity,
      gov_lead_id: govLeadId,
      status: 'intake',
      intake_complete: false,
      solicitation_number: lead.solicitation_number,
      agency: lead.agency,
      naics_code: lead.naics_code,
      set_aside: lead.set_aside,
      place_of_performance: lead.place_of_performance,
      submission_deadline: lead.response_deadline,
      incumbent_contractor: lead.incumbent_contractor,
    }).select().single()

    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 })
    }

    return NextResponse.json({ proposal_id: created.id, existing: false })
  } catch (e: unknown) {
    const msg = (e as Error).message || 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
