import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fileToText } from '@/lib/file-parsers'

// POST /api/proposals/upload-solicitation  (multipart/form-data)

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const proposalId = (form.get('proposal_id') as string) || ''
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!proposalId) return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || 'solicitation'
    const mimeType = file.type || 'application/octet-stream'

    const { text, kind } = await fileToText({ buffer, filename, mimeType, anthropicKey: apiKey })

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = proposalId + '/' + Date.now() + '-' + safeName
    await supa.storage.createBucket('solicitations', { public: false }).catch(() => null)
    const { error: upErr } = await supa.storage.from('solicitations').upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    })
    if (upErr) {
      return NextResponse.json({ error: 'Storage upload: ' + upErr.message }, { status: 500 })
    }
    const { data: signed } = await supa.storage.from('solicitations').createSignedUrl(storagePath, 60 * 60 * 24 * 7)
    const fileUrl = signed?.signedUrl || null

    const summaryPrompt = 'Summarize the following government solicitation for a proposal team. Return STRICT JSON only:\n' +
      '{ "summary": string (3-5 sentences), "services": string (what services are requested), "sub_needs": string (what subcontractors are needed, if any), "incumbent_search_keys": string (the 3 best search phrases to find the incumbent on USASpending/FPDS-NG — use agency + scope keywords) }\n\n' +
      'SOLICITATION TEXT:\n' + text.slice(0, 80000)

    let summaryJson: {
      summary?: string; services?: string; sub_needs?: string; incumbent_search_keys?: string
    } = {}
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: summaryPrompt }],
        }),
      })
      if (r.ok) {
        const j = await r.json()
        const raw = ((j.content?.[0]?.text as string) || '{}').trim()
        const cleaned = raw.replace(/^\x60\x60\x60(?:json)?\s*/, '').replace(/\s*\x60\x60\x60$/, '').trim()
        summaryJson = JSON.parse(cleaned)
      }
    } catch { /* swallow — upload still succeeds */ }

    const { error: updErr } = await supa.from('proposals').update({
      solicitation_file_url: fileUrl,
      solicitation_file_name: filename,
      solicitation_raw_text: text,
      solicitation_summary: summaryJson.summary || null,
      solicitation_services: summaryJson.services || null,
      solicitation_sub_needs: summaryJson.sub_needs || null,
      incumbent_search_keys: summaryJson.incumbent_search_keys || null,
    }).eq('id', proposalId)

    if (updErr) {
      return NextResponse.json({
        ok: true,
        file_url: fileUrl,
        filename,
        text_preview: text.slice(0, 400),
        text_kind: kind,
        summary: summaryJson,
        db_warning: 'Some solicitation summary columns are missing; apply the latest migration. Upload succeeded.',
        db_error: updErr.message,
      })
    }

    return NextResponse.json({
      ok: true,
      file_url: fileUrl,
      filename,
      text_kind: kind,
      summary: summaryJson,
      char_count: text.length,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
