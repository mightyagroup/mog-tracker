import { NextRequest, NextResponse } from 'next/server'
import { fileToText, parseCsvText, parseXlsxToRows } from '@/lib/file-parsers'

// POST /api/leads/import-file  (multipart/form-data)
// Fields:
//   file       — the uploaded solicitation / spreadsheet / attachment (required)
//   entity     — 'exousia' | 'vitalx' | 'ironhouse' (required)
//   mode       — 'extract_leads' | 'extract_solicitation'  (default: 'extract_leads')
// Returns: { leads: LeadRow[], rawText?: string }
//
// For CSV/XLSX: parses rows directly using existing mappers.
// For PDF/DOCX/images: uses Claude to transcribe, then a second Claude pass to
// extract structured lead fields (title, solicitation_number, agency, etc.).

export const runtime = 'nodejs'
export const maxDuration = 90

type ExtractedLead = {
  title?: string
  solicitation_number?: string
  agency?: string
  naics_code?: string
  set_aside?: string
  response_deadline?: string
  estimated_value?: number | string
  place_of_performance?: string
  description?: string
  sam_gov_url?: string
  incumbent_contractor?: string
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const entity = (form.get('entity') as string) || ''
    const mode = ((form.get('mode') as string) || 'extract_leads') as 'extract_leads' | 'extract_solicitation'

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (!entity || !['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
      return NextResponse.json({ error: 'entity is required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || 'upload'
    const mimeType = file.type || ''

    const kind = (filename.toLowerCase().endsWith('.csv') || mimeType === 'text/csv') ? 'csv' :
                 (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) ? 'xlsx' :
                 'other'

    // Fast path: CSV and XLSX go straight to row-based parsing (no Claude needed)
    if (kind === 'csv') {
      const { headers, rows } = parseCsvText(buffer.toString('utf-8'))
      return NextResponse.json({ leads: [], csv_rows: rows, headers, note: 'CSV passes through the existing mapping UI.' })
    }
    if (kind === 'xlsx') {
      const rows = await parseXlsxToRows(buffer)
      return NextResponse.json({ leads: [], csv_rows: rows, headers: Object.keys(rows[0] || {}), note: 'XLSX rows converted — map columns in the UI.' })
    }

    // PDF / DOCX / image: extract text first
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

    const { text } = await fileToText({ buffer, filename, mimeType, anthropicKey })

    if (mode === 'extract_solicitation') {
      // Return the transcribed text only — caller will attach to a proposal
      return NextResponse.json({ text, leads: [], note: 'Text transcribed for solicitation attachment.' })
    }

    // Use Claude to structure the text into one or more leads
    const extractPrompt = 'You are an extractor. Given the following document text, extract every government contracting opportunity mentioned. Return STRICT JSON only, no preamble:\n' +
      '{ "leads": [ { "title": string, "solicitation_number": string|null, "agency": string|null, "naics_code": string|null, "set_aside": string|null, "response_deadline": ISO8601 string|null, "estimated_value": number|null, "place_of_performance": string|null, "description": string|null, "sam_gov_url": string|null, "incumbent_contractor": string|null } ] }\n' +
      'Rules:\n' +
      '- If a field is not present, set it to null.\n' +
      '- If the document describes only one opportunity, return one object in the array.\n' +
      '- Do not invent data — blank is better than wrong.\n' +
      '- For naics_code return just the 6-digit code.\n' +
      '- For set_aside use one of: wosb, edwosb, 8a, hubzone, sdvosb, small_business, total_small_business, full_and_open, sole_source, none.\n\n' +
      'DOCUMENT TEXT:\n' + text.slice(0, 90000)

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: extractPrompt }],
      }),
    })
    if (!r.ok) {
      const errText = await r.text()
      return NextResponse.json({ error: 'Claude extract: ' + errText.slice(0, 200), text }, { status: 500 })
    }
    const j = await r.json()
    const raw = ((j.content?.[0]?.text as string) || '{}').trim()
    const cleaned = raw.replace(/^\x60\x60\x60(?:json)?\s*/, '').replace(/\s*\x60\x60\x60$/, '').trim()
    let parsed: { leads: ExtractedLead[] } = { leads: [] }
    try { parsed = JSON.parse(cleaned) } catch { /* fallthrough */ }

    return NextResponse.json({
      leads: parsed.leads || [],
      text_preview: text.slice(0, 2000),
      char_count: text.length,
      entity,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
