// POST /api/proposals/parse-solicitation
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type ParseResult = {
  submission_method?: string
  submission_email?: string
  submission_portal_url?: string
  submission_deadline?: string
  submission_timezone?: string
  section_l_items?: Array<{ requirement: string; requirement_type?: string; severity?: 'minor' | 'major' | 'fatal'; page_limit?: number; format_required?: string }>
  section_m_criteria?: Array<{ criterion: string; weight?: string }>
  amendments?: Array<{ number: string; date?: string; summary?: string }>
  forbidden_clauses?: string[]
  primary_contact?: { name?: string; title?: string; email?: string; phone?: string }
  deliverable_formats?: Record<string, string>
  page_limits?: Record<string, number>
}

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const proposalId = body.proposal_id as string | undefined
  const text = body.solicitation_text as string | undefined
  if (!proposalId || !text) return NextResponse.json({ error: 'proposal_id and solicitation_text required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 503 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const prompt = (
    'You are parsing a federal solicitation into a structured JSON object. Extract ' +
    'ONLY the following fields and return them as a single JSON object, no prose, ' +
    'no code fences, no preamble:\n\n' +
    '{\n' +
    '  "submission_method": "piee | email | sam | paper | other",\n' +
    '  "submission_email": "<if email method>",\n' +
    '  "submission_portal_url": "<if portal method>",\n' +
    '  "submission_deadline": "<ISO 8601 datetime if stated>",\n' +
    '  "submission_timezone": "<IANA tz like America/New_York if stated>",\n' +
    '  "section_l_items": [ { "requirement": "...", "requirement_type": "deliverable|format|cert", "severity": "minor|major|fatal", "page_limit": <number if stated>, "format_required": "pdf|docx|xlsx|pdf_fillable" } ],\n' +
    '  "section_m_criteria": [ { "criterion": "...", "weight": "<pct if stated>" } ],\n' +
    '  "amendments": [ { "number": "0001", "date": "...", "summary": "..." } ],\n' +
    '  "forbidden_clauses": [ "DO NOT SUBMIT A COPY OF THE SOLICITATION IN ITS ENTIRETY", "..." ],\n' +
    '  "primary_contact": { "name": "...", "title": "...", "email": "...", "phone": "..." },\n' +
    '  "deliverable_formats": { "sf_1449": "pdf_fillable", "pricing": "xlsx" },\n' +
    '  "page_limits": { "technical": 25 }\n' +
    '}\n\n' +
    'If a field is not found in the text, omit it. Do not guess. Items that are ' +
    'format-forbidden should be captured in forbidden_clauses so the validator ' +
    'can enforce them.\n\nSolicitation text:\n\n' + text.slice(0, 60000)
  )

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!r.ok) {
    return NextResponse.json({ error: 'claude_api_' + r.status, detail: (await r.text()).slice(0, 400) }, { status: 502 })
  }
  const j = await r.json()
  const block = (j.content || []).find((b: Record<string, unknown>) => b.type === 'text')
  const raw = block && typeof block.text === 'string' ? block.text : ''
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  let parsed: ParseResult = {}
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return NextResponse.json({ error: 'parse_failed', raw: raw.slice(0, 400) }, { status: 502 })
  }

  const proposalUpdate: Record<string, unknown> = {
    amendment_count: (parsed.amendments || []).length,
  }
  if (parsed.submission_method) proposalUpdate.submission_method = parsed.submission_method
  if (parsed.submission_email) proposalUpdate.submission_email = parsed.submission_email
  if (parsed.submission_portal_url) proposalUpdate.submission_portal_url = parsed.submission_portal_url
  if (parsed.submission_deadline) proposalUpdate.submission_deadline = parsed.submission_deadline
  if (parsed.submission_timezone) proposalUpdate.submission_timezone = parsed.submission_timezone
  await svc.from('proposals').update(proposalUpdate).eq('id', proposalId)

  const items: Array<Record<string, unknown>> = []
  for (const x of parsed.section_l_items || []) {
    items.push({
      proposal_id: proposalId,
      source_section: 'L',
      requirement_text: x.requirement,
      requirement_type: x.requirement_type || 'deliverable',
      severity: x.severity || 'major',
      status: 'pending',
    })
  }
  for (const x of parsed.section_m_criteria || []) {
    items.push({
      proposal_id: proposalId,
      source_section: 'M',
      requirement_text: x.criterion + (x.weight ? ' (weight: ' + x.weight + ')' : ''),
      requirement_type: 'evaluation_criterion',
      severity: 'major',
      status: 'pending',
    })
  }
  for (const c of parsed.forbidden_clauses || []) {
    items.push({
      proposal_id: proposalId,
      source_section: 'L',
      requirement_text: 'DO NOT VIOLATE: ' + c,
      requirement_type: 'format',
      severity: 'fatal',
      status: 'pending',
    })
  }

  if (items.length > 0) {
    await svc.from('proposal_compliance_items').insert(items)
  }

  return NextResponse.json({ ok: true, parsed, items_inserted: items.length })
}
