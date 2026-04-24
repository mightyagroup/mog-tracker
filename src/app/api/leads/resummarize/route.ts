import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/leads/resummarize  { lead_id: string }
// Uses Claude Sonnet to turn a gov_lead's description + current notes into a clean
// synopsis: services, location, sub needs. Writes to gov_leads.notes and overrides
// the raw SAM API URL excerpt that the feed script initially stored.

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const leadId = body.lead_id as string
    if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { data: lead } = await supa.from('gov_leads').select('*').eq('id', leadId).single()
    if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 })

    const source = [lead.title, lead.description, lead.notes].filter(Boolean).join('\n\n')
    const prompt = 'Rewrite the following federal solicitation metadata into a clean 3-5 sentence synopsis for a proposal team. Include: what services are being requested, where the work will be performed, estimated size/scope, and whether subcontractors are likely needed. Be specific, avoid filler. Return PLAIN TEXT only, no preamble.\n\n' +
      'Agency: ' + (lead.agency || 'unknown') + '\n' +
      'NAICS: ' + (lead.naics_code || 'unknown') + '\n' +
      'Set-aside: ' + (lead.set_aside || 'none') + '\n' +
      'Value: ' + (lead.estimated_value || 'unknown') + '\n\n' +
      'SOURCE TEXT:\n' + source.slice(0, 40000)

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const j = await r.json()
    if (!r.ok) return NextResponse.json({ error: 'Claude: ' + JSON.stringify(j).slice(0, 200) }, { status: 500 })
    const summary = ((j.content?.[0]?.text as string) || '').trim()

    const { error: updErr } = await supa.from('gov_leads').update({ notes: summary }).eq('id', leadId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, summary })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
