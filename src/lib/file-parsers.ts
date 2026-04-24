// Universal file-to-text parsers for PDF, DOCX, XLSX, CSV, images.
// Used by /api/leads/import-file, /api/proposals/upload-solicitation,
// /api/pricing/upload-quote. Each parser returns text that Claude (or a
// deterministic post-processor) can then structure into lead fields, CLINs, etc.

import mammoth from 'mammoth'
import ExcelJS from 'exceljs'

export type FileKind = 'csv' | 'xlsx' | 'docx' | 'pdf' | 'image' | 'text' | 'unknown'

export function detectFileKind(filename: string, mimeType: string): FileKind {
  const lower = (filename || '').toLowerCase()
  const mt = (mimeType || '').toLowerCase()
  if (lower.endsWith('.csv') || mt === 'text/csv') return 'csv'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || mt.includes('spreadsheet')) return 'xlsx'
  if (lower.endsWith('.docx') || mt.includes('wordprocessingml')) return 'docx'
  if (lower.endsWith('.pdf') || mt === 'application/pdf') return 'pdf'
  if (lower.match(/\.(png|jpe?g|gif|webp|bmp)$/) || mt.startsWith('image/')) return 'image'
  if (lower.endsWith('.txt') || lower.endsWith('.md') || mt.startsWith('text/')) return 'text'
  return 'unknown'
}

/** Extract plain text from a DOCX buffer. */
export async function parseDocxToText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { value } = await mammoth.extractRawText({ buffer: buffer as any })
  return value
}

/** Extract all worksheet cells from an XLSX file as a newline-delimited text. */
export async function parseXlsxToText(buffer: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any)
  const out: string[] = []
  wb.worksheets.forEach(ws => {
    out.push('### Sheet: ' + ws.name)
    ws.eachRow({ includeEmpty: false }, row => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: false }, cell => {
        const s = cell.text == null ? '' : String(cell.text)
        cells.push(s.trim())
      })
      out.push(cells.join('\t'))
    })
    out.push('')
  })
  return out.join('\n')
}

/** Return the XLSX rows as a parsed objects array (first row = headers). */
export async function parseXlsxToRows(buffer: Buffer, sheetIndex = 0): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any)
  const ws = wb.worksheets[sheetIndex]
  if (!ws) return []
  const rows: Record<string, string>[] = []
  let headers: string[] = []
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const vals: string[] = []
    row.eachCell({ includeEmpty: false }, cell => {
      vals.push(cell.text == null ? '' : String(cell.text))
    })
    if (rowNumber === 1) {
      headers = vals.map(v => v.trim())
    } else {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim() })
      rows.push(obj)
    }
  })
  return rows
}

/** Parse a CSV text into { headers, rows }. RFC 4180-ish. */
export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = []
  let current = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') inQ = !inQ
    else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (current.trim()) lines.push(current)
      current = ''
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else current += ch
  }
  if (current.trim()) lines.push(current)
  if (lines.length < 2) return { headers: [], rows: [] }
  const parseRow = (line: string): string[] => {
    const r: string[] = []
    let c = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { c += '"'; i++ }
        else q = !q
      } else if (ch === ',' && !q) { r.push(c.trim()); c = '' }
      else c += ch
    }
    r.push(c.trim())
    return r
  }
  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(line => {
    const v = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h, v[i] ?? '']))
  })
  return { headers, rows }
}

/** Use Claude multimodal to transcribe a PDF file into plain text. */
export async function parsePdfViaClaude(buffer: Buffer, apiKey: string): Promise<string> {
  const b64 = buffer.toString('base64')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: 'Transcribe this document faithfully. Preserve paragraphs, tables, and section headers. Return the full text only, no preamble.' },
        ],
      }],
    }),
  })
  if (!r.ok) {
    const errText = await r.text()
    throw new Error('Claude PDF: ' + errText.slice(0, 200))
  }
  const j = await r.json()
  return (j.content?.[0]?.text as string) || ''
}

/** Use Claude multimodal to transcribe an image into plain text. */
export async function parseImageViaClaude(buffer: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const b64 = buffer.toString('base64')
  const media = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/png'
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: b64 } },
          { type: 'text', text: 'Transcribe all text from this image. Preserve structure (columns, rows, headers). Return the text only.' },
        ],
      }],
    }),
  })
  if (!r.ok) {
    const errText = await r.text()
    throw new Error('Claude image: ' + errText.slice(0, 200))
  }
  const j = await r.json()
  return (j.content?.[0]?.text as string) || ''
}

/** Route a raw file buffer to the correct parser and return plain text. */
export async function fileToText(opts: {
  buffer: Buffer
  filename: string
  mimeType: string
  anthropicKey?: string
}): Promise<{ text: string; kind: FileKind }> {
  const kind = detectFileKind(opts.filename, opts.mimeType)
  if (kind === 'csv' || kind === 'text') {
    return { text: opts.buffer.toString('utf-8'), kind }
  }
  if (kind === 'xlsx') {
    return { text: await parseXlsxToText(opts.buffer), kind }
  }
  if (kind === 'docx') {
    return { text: await parseDocxToText(opts.buffer), kind }
  }
  if (kind === 'pdf') {
    if (!opts.anthropicKey) throw new Error('ANTHROPIC_API_KEY required for PDF parsing')
    return { text: await parsePdfViaClaude(opts.buffer, opts.anthropicKey), kind }
  }
  if (kind === 'image') {
    if (!opts.anthropicKey) throw new Error('ANTHROPIC_API_KEY required for image parsing')
    return { text: await parseImageViaClaude(opts.buffer, opts.mimeType, opts.anthropicKey), kind }
  }
  throw new Error('Unsupported file type: ' + opts.filename + ' (' + opts.mimeType + ')')
}
