import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/proposals/generate-package
// Body: { proposal_id: string }
// Builds a structured submission package manifest (JSON) and stores to proposal_deliverables.
// DOCX/PDF assembly is done later via a separate worker; this endpoint locks the manifest.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const proposalId = body.proposal_id as string
    if (!proposalId) return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { data: p } = await supa.from('proposals')
      .select('id, entity, narrative_draft, evaluation_factors, pricing_data, pricing_total, teaming_partners, solicitation_number, agency, submission_method, contracting_officer_email, page_limit, font_requirement, past_performance_count, gov_leads(title, response_deadline)')
      .eq('id', proposalId)
      .single()

    if (!p) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })

    const { data: compItems } = await supa.from('proposal_compliance_items')
      .select('section, requirement, status, source_reference, evidence_location')
      .eq('proposal_id', proposalId)
      .order('sort_order')

    const prop = (p as unknown) as {
      id: string; entity: string; narrative_draft: string | null; evaluation_factors: string | null;
      pricing_data: unknown; pricing_total: number | null; teaming_partners: unknown;
      solicitation_number: string | null; agency: string | null; submission_method: string | null;
      contracting_officer_email: string | null; page_limit: string | null; font_requirement: string | null;
      past_performance_count: number | null;
      gov_leads?: { title?: string; response_deadline?: string }
    }

    // Build manifest: sections that make up the final package
    const manifest = {
      proposal_id: proposalId,
      entity: prop.entity,
      solicitation_number: prop.solicitation_number,
      agency: prop.agency,
      deadline: prop.gov_leads?.response_deadline,
      submission_method: prop.submission_method,
      contracting_officer_email: prop.contracting_officer_email,
      formatting: {
        page_limit: prop.page_limit,
        font_requirement: prop.font_requirement,
      },
      sections: [
        { key: 'cover_letter', title: 'Cover Letter', required: true, source: 'template' },
        { key: 'technical_volume', title: 'Technical Volume', required: Boolean(prop.narrative_draft), source: 'narrative_draft' },
        { key: 'past_performance', title: 'Past Performance', required: (prop.past_performance_count || 0) > 0, source: 'library' },
        { key: 'pricing', title: 'Pricing Volume', required: Boolean(prop.pricing_data), source: 'pricing_data' },
        { key: 'compliance_matrix', title: 'Compliance Matrix', required: true, source: 'proposal_compliance_items' },
        { key: 'teaming_attachments', title: 'Teaming Agreements', required: Array.isArray(prop.teaming_partners) && (prop.teaming_partners as unknown[]).length > 0, source: 'subcontractors' },
      ],
      compliance_items: compItems || [],
      built_at: new Date().toISOString(),
    }

    const { data: delivRow, error: delivErr } = await supa.from('proposal_deliverables').insert({
      proposal_id: proposalId,
      deliverable_type: 'submission_package',
      manifest_json: manifest,
      status: 'manifest_locked',
    }).select().single()

    if (delivErr) {
      return NextResponse.json({ error: delivErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deliverable_id: delivRow.id,
      manifest,
      note: 'Manifest locked. DOCX/PDF assembly runs asynchronously via the worker.',
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
