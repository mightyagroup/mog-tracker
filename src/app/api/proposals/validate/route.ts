// POST /api/proposals/validate
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { runValidator, type ValidatorInput, type EntityKey } from '@/lib/proposals/validator'

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const proposalId = body.proposal_id as string | undefined
  const deep = !!body.deep
  if (!proposalId) return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: proposal, error: pErr } = await svc.from('proposals')
    .select('*, gov_leads!inner(id, title, naics_code, set_aside, agency, place_of_performance, description, source)')
    .eq('id', proposalId).maybeSingle()
  if (pErr || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const { data: items } = await svc.from('proposal_compliance_items')
    .select('id, source_section, requirement_text, requirement_type, status, severity')
    .eq('proposal_id', proposalId)

  const { data: dels } = await svc.from('proposal_deliverables')
    .select('id, kind, name, format, required_format, pages, page_limit, humanized')
    .eq('proposal_id', proposalId)

  const { data: subs } = await svc.from('subcontractors')
    .select('id, company_name, loi_signed_at, entities_associated')
  const filteredSubs = (subs || []).filter(s =>
    Array.isArray(s.entities_associated) && s.entities_associated.includes(proposal.entity)
  )

  const lead = (proposal as { gov_leads: Record<string, unknown> }).gov_leads
  const input: ValidatorInput = {
    entity: proposal.entity as EntityKey,
    proposal: {
      id: proposal.id,
      solicitation_number: null,
      submission_deadline: proposal.submission_deadline,
      submission_method: proposal.submission_method,
      amendments_incorporated: proposal.amendments_incorporated,
      amendments_checked_at: proposal.amendments_checked_at,
      incumbent_researched_at: proposal.incumbent_researched_at,
      intake_complete: proposal.intake_complete,
    },
    lead: {
      title: lead.title as string | null,
      naics_code: lead.naics_code as string | null,
      set_aside: lead.set_aside as string | null,
      agency: lead.agency as string | null,
      place_of_performance: lead.place_of_performance as string | null,
      description: lead.description as string | null,
    },
    complianceItems: items || [],
    deliverables: dels || [],
    subcontractors: filteredSubs,
  }

  const result = runValidator(input)

  await svc.from('proposal_reviews').insert({
    proposal_id: proposalId,
    review_type: 'validator',
    overall_status: result.overall_status === 'ready_for_review' ? 'pass' : 'hold',
    fatal_flaws_count: result.fatal_flaws_count,
    major_gaps_count: result.major_gaps_count,
    minor_gaps_count: result.minor_gaps_count,
    findings: result.findings,
    reviewer_type: 'deterministic',
    reviewer_user: user.id,
  })

  await svc.from('proposals').update({
    last_validated_at: new Date().toISOString(),
    last_validation_status: result.overall_status,
    fatal_flaw_count: result.fatal_flaws_count,
  }).eq('id', proposalId)

  let deepReview: Record<string, unknown> | null = null
  if (deep && result.pass_results.pass1_eligibility !== 'NOT_ELIGIBLE' && process.env.ANTHROPIC_API_KEY) {
    const promptSkill = 'You are the proposal-validator skill running a read-only narrative review. The deterministic validator already flagged the items below. Review the proposal package details for anything the deterministic validator cannot detect: tone inconsistencies, promises the entity cannot substantiate, format ambiguity, risky wording. Return ONLY a JSON array of additional findings: [{"rule": "...", "message": "...", "severity": "minor|major|fatal", "suggestedFix": "..."}]. Do not echo the deterministic findings.'
    const prompt = promptSkill + '\n\nProposal: ' + JSON.stringify(result, null, 2).slice(0, 8000)
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (r.ok) {
        const j = await r.json()
        const text = (j.content || []).find((b: Record<string, unknown>) => b.type === 'text')
        if (text && typeof text.text === 'string') {
          const mStart = text.text.indexOf('[')
          const mEnd = text.text.lastIndexOf(']')
          if (mStart >= 0 && mEnd > mStart) {
            try {
              const extra = JSON.parse(text.text.slice(mStart, mEnd + 1))
              deepReview = { findings: extra, model: 'claude-sonnet-4-6' }
              await svc.from('proposal_reviews').insert({
                proposal_id: proposalId,
                review_type: 'validator',
                reviewer_type: 'claude',
                model_version: 'claude-sonnet-4-6',
                findings: extra,
                overall_status: 'pass',
              })
            } catch {}
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, result, deepReview })
}
