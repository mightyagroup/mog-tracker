// POST /api/leads/ai-score
// Body: { gov_lead_id: string }
// Uses Claude Sonnet to produce a bid/no-bid recommendation with plain-English
// reasoning, red flags, and green flags. Stored on the gov_lead row.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ENTITY_NAICS } from '@/lib/constants'

const ENTITY_CAPABILITIES: Record<string, string> = {
  exousia: 'Cybersecurity compliance (RMF/NIST 800-53), facilities management, janitorial, landscaping, facilities support, admin/operational support. WOSB + EDWOSB certified. DMV-focused.',
  vitalx: 'HIPAA-compliant healthcare logistics: medical courier, specimen transport, pharmacy delivery, home health medication delivery, NEMT. DMV regional operator.',
  ironhouse: 'Janitorial, landscaping, facilities support, custodial. Owned by Nana Badu (21+ years FCPS facilities experience). DMV-focused.',
}

type AiVerdict = {
  score_0_100: number
  recommendation: 'bid' | 'no-bid' | 'needs-review'
  reasoning: string
  red_flags: string[]
  green_flags: string[]
}

function buildPrompt(lead: Record<string, unknown>, entityNaics: string[], entityCaps: string): string {
  const val = lead.estimated_value ? '$' + (lead.estimated_value as number).toLocaleString() : 'unknown'
  const desc = ((lead.description as string) || '').slice(0, 2000)
  return (
    'You are evaluating a federal contracting opportunity for a small business. Decide bid, no-bid, or needs-review, and explain your reasoning concisely.\n\n' +
    '## The company\n' +
    'Entity: ' + lead.entity + '\n' +
    'Capabilities: ' + entityCaps + '\n' +
    'Target NAICS codes: ' + entityNaics.join(', ') + '\n\n' +
    '## The opportunity\n' +
    'Title: ' + lead.title + '\n' +
    'Agency: ' + (lead.agency || 'unknown') + ' / ' + (lead.sub_agency || '') + ' / ' + (lead.office || '') + '\n' +
    'Place of performance: ' + (lead.place_of_performance || 'unknown') + '\n' +
    'NAICS code: ' + (lead.naics_code || 'unknown') + '\n' +
    'Set-aside: ' + (lead.set_aside || 'none') + '\n' +
    'Contract type: ' + (lead.contract_type || 'unknown') + '\n' +
    'Estimated value: ' + val + '\n' +
    'Response deadline: ' + (lead.response_deadline || 'unknown') + '\n' +
    'Description: ' + desc + '\n\n' +
    '## Your evaluation criteria\n' +
    '1. NAICS match: is the opportunity NAICS in our target list?\n' +
    '2. Geographic fit: does place of performance align with DMV (DC, MD, VA)?\n' +
    '3. Set-aside eligibility: does it allow our certs (WOSB/EDWOSB for Exousia/VitalX)?\n' +
    '4. Scale fit: is estimated value in our sweet spot ($50K-$2M) vs. too small or too large?\n' +
    '5. Time to respond: realistic given the deadline?\n' +
    '6. Capability fit: does the scope match what we can actually deliver?\n' +
    '7. Red flags: incumbent advantage, specialized certifications we lack, unclear scope, unreasonable timelines, unusual bonding requirements.\n\n' +
    '## Output format\n' +
    'Respond with ONLY a JSON object, no markdown fences or preamble:\n' +
    '{\n' +
    '  "score_0_100": <int>,\n' +
    '  "recommendation": "bid" | "no-bid" | "needs-review",\n' +
    '  "reasoning": "<2-4 sentences, plain English>",\n' +
    '  "red_flags": ["..."],\n' +
    '  "green_flags": ["..."]\n' +
    '}'
  )
}

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const govLeadId = body.gov_lead_id as string | undefined
  if (!govLeadId) return NextResponse.json({ error: 'gov_lead_id required' }, { status: 400 })

  if (process.env.AI_SCORING_ENABLED !== '1') {
    return NextResponse.json({ error: 'AI scoring not enabled (set AI_SCORING_ENABLED=1)' }, { status: 503 })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 503 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const today = new Date().toISOString().slice(0, 10)
  const maxPerDay = parseInt(process.env.AI_SCORING_MAX_PER_DAY || '200', 10)
  const { data: bud } = await svc.from('ai_scoring_budget').select('*').eq('scored_date', today).maybeSingle()
  if (bud && bud.count >= maxPerDay) {
    return NextResponse.json({ error: 'Daily AI scoring cap hit (' + maxPerDay + '). Resumes tomorrow.' }, { status: 429 })
  }

  const { data: canEdit } = await svc.rpc('user_can_edit', { p_user_id: user.id })
  if (!canEdit) return NextResponse.json({ error: 'Forbidden (read-only role)' }, { status: 403 })

  const { data: lead, error: leadErr } = await svc
    .from('gov_leads')
    .select('id, entity, title, description, agency, sub_agency, office, place_of_performance, naics_code, set_aside, contract_type, estimated_value, response_deadline')
    .eq('id', govLeadId)
    .maybeSingle()
  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const entityNaics = ENTITY_NAICS[lead.entity as keyof typeof ENTITY_NAICS] || []
  const entityCaps = ENTITY_CAPABILITIES[lead.entity] || ''

  const prompt = buildPrompt(lead, entityNaics, entityCaps)

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const anthropicText = await anthropicRes.text()
  if (!anthropicRes.ok) {
    return NextResponse.json({ error: 'Anthropic API ' + anthropicRes.status + ': ' + anthropicText.slice(0, 300) }, { status: 502 })
  }
  let anthropicJson: { content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } } = {}
  try { anthropicJson = JSON.parse(anthropicText) } catch {}
  const textBlock = (anthropicJson.content || []).find(b => b.type === 'text')?.text || ''

  let verdict: AiVerdict
  try {
    // Claude may wrap JSON in code fences, so extract between the first { and last }.
    const firstBrace = textBlock.indexOf('{')
    const lastBrace = textBlock.lastIndexOf('}')
    const jsonStr = firstBrace >= 0 && lastBrace > firstBrace ? textBlock.slice(firstBrace, lastBrace + 1) : textBlock
    verdict = JSON.parse(jsonStr)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: textBlock.slice(0, 500) }, { status: 502 })
  }

  const totalTokens = (anthropicJson.usage?.input_tokens ?? 0) + (anthropicJson.usage?.output_tokens ?? 0)

  await svc.from('gov_leads').update({
    ai_fit_score: verdict.score_0_100,
    ai_reasoning: verdict.reasoning,
    ai_recommendation: verdict.recommendation,
    ai_red_flags: verdict.red_flags,
    ai_green_flags: verdict.green_flags,
    ai_scored_at: new Date().toISOString(),
    ai_scored_by: user.id,
    ai_model_version: 'claude-sonnet-4-6',
    ai_token_cost: totalTokens,
  }).eq('id', govLeadId)

  await svc.from('ai_scoring_budget').upsert({
    scored_date: today,
    count: (bud?.count ?? 0) + 1,
    total_tokens: (bud?.total_tokens ?? 0) + totalTokens,
  }, { onConflict: 'scored_date' })

  return NextResponse.json({ ok: true, verdict, tokens: totalTokens })
}
