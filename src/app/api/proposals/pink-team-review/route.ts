import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/proposals/pink-team-review
// Body: { proposal_id: string }
// Calls Claude Sonnet to score the narrative against Section M evaluation factors.
// Persists to proposal_reviews with review_type='pink_team'.

const MODEL = 'claude-sonnet-4-6'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const proposalId = body.proposal_id as string
    if (!proposalId) {
      return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { data: p } = await supa.from('proposals')
      .select('id, entity, narrative_draft, evaluation_factors, gov_leads(title, agency)')
      .eq('id', proposalId)
      .single()

    if (!p) {
      return NextResponse.json({ error: 'proposal not found' }, { status: 404 })
    }
    const prop = (p as unknown) as {
      id: string; entity: string; narrative_draft: string | null; evaluation_factors: string | null;
      gov_leads?: { title?: string; agency?: string }
    }

    if (!prop.narrative_draft || prop.narrative_draft.trim().length < 200) {
      return NextResponse.json({ error: 'narrative too short for pink team review' }, { status: 400 })
    }

    const systemPrompt = 'You are a government proposal pink team evaluator. You score a proposal narrative against the Section M evaluation factors as if you were a federal source selection board. You return strict JSON only, no preamble.'

    const userPrompt = 'Proposal for: ' + (prop.gov_leads?.title || 'unknown opportunity') +
      '\nAgency: ' + (prop.gov_leads?.agency || 'unknown') +
      '\nEntity: ' + prop.entity +
      '\n\nEvaluation factors (Section M):\n' + (prop.evaluation_factors || 'not specified') +
      '\n\nNarrative to evaluate:\n' + prop.narrative_draft +
      '\n\nReturn JSON with this shape:\n' +
      '{\n' +
      '  "overall_score": number (0-10, one decimal ok),\n' +
      '  "factor_scores": [{"factor": string, "score": number 0-10, "rationale": string}],\n' +
      '  "strengths": [string, ...],\n' +
      '  "weaknesses": [string, ...],\n' +
      '  "rewrites": [{"section": string, "original": string, "suggested": string}]\n' +
      '}\n\nBe critical. Score as if you were grading a real submission. Flag any AI tells, puffery, or unsubstantiated claims. Reward specific, measurable commitments.'

    const anthR = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthR.ok) {
      const errText = await anthR.text()
      return NextResponse.json({ error: 'Anthropic API: ' + errText.slice(0, 200) }, { status: 500 })
    }
    const anth = await anthR.json()
    const rawText = (anth.content?.[0]?.text as string) || '{}'

    // Strip markdown fences if present
    const cleaned = rawText.replace(/^\x60\x60\x60(?:json)?\s*/, '').replace(/\s*\x60\x60\x60$/, '').trim()
    let result: unknown
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Claude returned non-JSON', raw: rawText.slice(0, 400) }, { status: 500 })
    }

    const { error: insErr } = await supa.from('proposal_reviews').insert({
      proposal_id: proposalId,
      review_type: 'pink_team',
      model: MODEL,
      result_json: result,
    })
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, result })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
