// POST /api/proposals/humanize
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { humanizeDeterministic, detectAiTells } from '@/lib/proposals/humanizer-runtime'
import { BRAND_CONFIG } from '@/lib/proposals/brand-config'

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const text = body.text as string | undefined
  const entity = (body.entity || 'exousia') as 'exousia' | 'vitalx' | 'ironhouse'
  const deep = !!body.deep
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const det = humanizeDeterministic(text)
  const detTells = detectAiTells(det)

  if (!deep || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, text: det, remainingTells: detTells, mode: 'deterministic' })
  }

  const voice = BRAND_CONFIG[entity]?.voiceGuide
  const voiceSnippet = voice ? (
    '\n\nMatch the voice guide for ' + entity + ':\n' +
    'Tone: ' + voice.tone + '\n' +
    'Avoid: ' + voice.avoid.join(', ') + '\n' +
    'Prefer: ' + voice.prefer.join(', ') + '\n' +
    'Sample opening for reference: ' + voice.sampleOpening
  ) : ''

  const prompt = (
    'You are running the humanizer skill. Remove remaining AI-writing patterns ' +
    'from the text below. Preserve meaning. Keep sentence structure varied. No ' +
    'chatbot openers, no rule-of-three, no em dashes, no curly quotes, no ' +
    'bullet-heavy structure unless the source had it. Return only the rewritten ' +
    'text with no preamble or explanation.' + voiceSnippet +
    '\n\nText to humanize:\n\n' + det
  )

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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!r.ok) {
      return NextResponse.json({ ok: true, text: det, remainingTells: detTells, mode: 'deterministic_fallback', error: 'claude_api_' + r.status })
    }
    const j = await r.json()
    const out = (j.content || []).find((b: Record<string, unknown>) => b.type === 'text')
    const cleaned = (out && typeof out.text === 'string') ? humanizeDeterministic(out.text) : det
    const finalTells = detectAiTells(cleaned)
    return NextResponse.json({ ok: true, text: cleaned, remainingTells: finalTells, mode: 'deterministic+claude' })
  } catch (e) {
    return NextResponse.json({ ok: true, text: det, remainingTells: detTells, mode: 'deterministic_fallback', error: e instanceof Error ? e.message : 'unknown' })
  }
}
