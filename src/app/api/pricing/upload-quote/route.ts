import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fileToText } from '@/lib/file-parsers'

// POST /api/pricing/upload-quote  (multipart/form-data)

export const runtime = 'nodejs'
export const maxDuration = 90

type CLIN = {
  clin?: string
  description?: string
  qty?: number
  unit?: string
  unit_cost?: number
  extended_price?: number
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const proposalId = (form.get('proposal_id') as string) || ''
    const subcontractorId = (form.get('subcontractor_id') as string) || ''
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!proposalId) return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || 'quote'
    const mimeType = file.type || 'application/octet-stream'

    const { text } = await fileToText({ buffer, filename, mimeType, anthropicKey: apiKey })

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = 'quotes/' + proposalId + '/' + Date.now() + '-' + safeName
    await supa.storage.createBucket('subcontractor-quotes', { public: false }).catch(() => null)
    const { error: upErr } = await supa.storage.from('subcontractor-quotes').upload(storagePath, buffer, {
      contentType: mimeType, upsert: true,
    })
    if (upErr) {
      return NextResponse.json({ error: 'Storage upload: ' + upErr.message }, { status: 500 })
    }
    const { data: signed } = await supa.storage.from('subcontractor-quotes').createSignedUrl(storagePath, 60 * 60 * 24 * 30)
    const fileUrl = signed?.signedUrl || null

    const prompt = 'You are a government pricing analyst. Extract every line item from this subcontractor quote. Return STRICT JSON only:\n' +
      '{ "clins": [ { "clin": string|null, "description": string, "qty": number, "unit": string (each|hour|month|year|lot|sqft|mile|trip|specimen|patient), "unit_cost": number, "extended_price": number } ], "total": number, "notes": string }\n' +
      'Rules:\n' +
      '- If CLIN number is not labeled, set it to null or an index like "001".\n' +
      '- Units should be lowercase normalized.\n' +
      '- Prices are in USD.\n' +
      '- Do not invent line items — quality over completeness.\n\n' +
      'QUOTE TEXT:\n' + text.slice(0, 80000)

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!r.ok) {
      const errText = await r.text()
      return NextResponse.json({ error: 'Claude: ' + errText.slice(0, 200), file_url: fileUrl }, { status: 500 })
    }
    const j = await r.json()
    const raw = ((j.content?.[0]?.text as string) || '{}').trim()
    const cleaned = raw.replace(/^\x60\x60\x60(?:json)?\s*/, '').replace(/\s*\x60\x60\x60$/, '').trim()
    let parsed: { clins?: CLIN[]; total?: number; notes?: string } = {}
    try { parsed = JSON.parse(cleaned) } catch { /* fallthrough */ }

    const { data: quoteRow, error: insErr } = await supa.from('subcontractor_quotes').insert({
      proposal_id: proposalId,
      subcontractor_id: subcontractorId || null,
      file_url: fileUrl,
      file_name: filename,
      mime_type: mimeType,
      raw_text: text.slice(0, 200000),
      extracted_clins: parsed.clins || [],
      total_quote: parsed.total || null,
      margin_notes: parsed.notes || null,
    }).select().single()

    if (insErr) {
      return NextResponse.json({
        ok: true,
        warning: 'quote saved to storage but DB row failed: ' + insErr.message,
        file_url: fileUrl,
        clins: parsed.clins || [],
        total: parsed.total || 0,
      })
    }

    return NextResponse.json({
      ok: true,
      quote_id: quoteRow.id,
      file_url: fileUrl,
      filename,
      clins: parsed.clins || [],
      total: parsed.total || 0,
      notes: parsed.notes || null,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
