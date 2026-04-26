// DOCX template generator — substitutes {{TOKEN}} placeholders in a tokenized
// .docx file with values from a tokens object, and expands block placeholders
// (table-shaped tokens) into actual table or paragraph XML.
//
// Tokenized templates live as binary files; this module accepts the raw
// Buffer (loaded from Supabase Storage or filesystem) so the same code works
// in serverless and local contexts.
//
// Block placeholders supported:
//   {{SOL_CLIN_TABLE}}              — CLIN pricing table
//   {{SUB_CANDIDATES_BLOCK}}        — single subcontractor candidate table
//   {{SUB_CANDIDATES_BLOCK_2,3,4}}  — additional candidate tables
//   {{PRIOR_AWARDS_TABLE}}          — USASpending prior awards
//   {{COMPETITIVE_ASSESSMENT_TABLE}}— USASpending competitive analysis
//   {{WAGE_RATES_TABLE}}            — DOL wage rates
//   {{LABOR_BREAKDOWN_TABLE}}       — labor cost breakdown
//   {{COMPLIANCE_MATRIX_BLOCK}}     — Section L/M items
//   {{ADDITIONAL_RISKS_BLOCK}}      — additional risk register entries
//   {{CLOSED_RISKS_BLOCK}}          — closed risk entries
//   {{TODO_OPEN_ITEMS_BLOCK}}       — open todo items
//   {{SECTION_L_M_CROSSWALK_TABLE}} — Section L/M crosswalk
//
// All other {{TOKEN}} placeholders are simple text replacements.
//
// Server-side only.

import JSZip from 'jszip'

// ─── Public types ────────────────────────────────────────────────────────────

export type SimpleTokenValue = string | number | null | undefined

export type TableTokenValue = {
  headers: string[]
  rows: Array<Array<string | number | null | undefined>>
}

export type ListTokenValue = {
  bullets: string[]
}

export type TokenValue = SimpleTokenValue | TableTokenValue | ListTokenValue

export type TokenMap = Record<string, TokenValue>

export type GenerateOptions = {
  /** Throw if any unresolved {{TOKEN}} remains in the output. Default: false. */
  strict?: boolean
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a filled DOCX from a tokenized template buffer + tokens map.
 * Returns a Buffer containing the new .docx.
 */
export async function generateBidDoc(
  templateBuffer: Buffer,
  tokens: TokenMap,
  options: GenerateOptions = {}
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer)
  const xmlPaths = listXmlPathsToProcess(zip)
  const replacements = sortReplacementsLongestFirst(tokens)

  for (const path of xmlPaths) {
    const file = zip.file(path)
    if (!file) continue
    const xml = await file.async('string')
    const updated = applyReplacementsToXml(xml, replacements)
    zip.file(path, updated)
  }

  if (options.strict) {
    for (const path of xmlPaths) {
      const file = zip.file(path)
      if (!file) continue
      const xml = await file.async('string')
      const remaining = xml.match(/\{\{[A-Z_0-9]+\}\}/g)
      if (remaining && remaining.length > 0) {
        throw new Error(
          'Unresolved tokens after generation in ' + path + ': ' +
          [...new Set(remaining)].join(', ')
        )
      }
    }
  }

  const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return output
}

/**
 * Convenience: list every {{TOKEN}} that remains unresolved in a generated
 * document. Useful for partial-fill scenarios where missing data is OK.
 */
export async function listUnresolvedTokens(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer)
  const xmlPaths = listXmlPathsToProcess(zip)
  const found = new Set<string>()
  for (const path of xmlPaths) {
    const file = zip.file(path)
    if (!file) continue
    const xml = await file.async('string')
    for (const m of xml.matchAll(/\{\{([A-Z_0-9]+)\}\}/g)) {
      found.add(m[1])
    }
  }
  return [...found].sort()
}

// ─── Internals: XML path discovery ──────────────────────────────────────────

function listXmlPathsToProcess(zip: JSZip): string[] {
  // We process document body, headers, and footers. We do NOT touch
  // styles.xml, settings.xml, etc.
  const paths: string[] = []
  zip.forEach((relativePath) => {
    if (relativePath === 'word/document.xml') paths.push(relativePath)
    else if (relativePath.startsWith('word/header') && relativePath.endsWith('.xml')) paths.push(relativePath)
    else if (relativePath.startsWith('word/footer') && relativePath.endsWith('.xml')) paths.push(relativePath)
  })
  return paths
}

// ─── Internals: replacements ────────────────────────────────────────────────

type Replacement = {
  tokenName: string
  kind: 'simple' | 'table' | 'list'
  simpleValue?: string
  tableValue?: TableTokenValue
  listValue?: ListTokenValue
}

function sortReplacementsLongestFirst(tokens: TokenMap): Replacement[] {
  const replacements: Replacement[] = []
  for (const [name, value] of Object.entries(tokens)) {
    if (value == null) {
      replacements.push({ tokenName: name, kind: 'simple', simpleValue: '' })
      continue
    }
    if (typeof value === 'string' || typeof value === 'number') {
      replacements.push({ tokenName: name, kind: 'simple', simpleValue: String(value) })
      continue
    }
    if (typeof value === 'object' && 'headers' in value && 'rows' in value) {
      replacements.push({ tokenName: name, kind: 'table', tableValue: value as TableTokenValue })
      continue
    }
    if (typeof value === 'object' && 'bullets' in value) {
      replacements.push({ tokenName: name, kind: 'list', listValue: value as ListTokenValue })
      continue
    }
  }
  // Longest token names first to avoid partial-name collisions.
  return replacements.sort((a, b) => b.tokenName.length - a.tokenName.length)
}

function applyReplacementsToXml(xml: string, replacements: Replacement[]): string {
  let result = xml

  // Pass 1: handle block (table/list) placeholders. Each placeholder lives in
  // its own paragraph (because we generated templates that way). We find the
  // enclosing <w:p>...</w:p> and replace it with rendered XML.
  for (const r of replacements) {
    if (r.kind === 'simple') continue
    const pattern = new RegExp(
      '<w:p\\b[^>]*>(?:(?!</w:p>)[\\s\\S])*?\\{\\{' + r.tokenName + '\\}\\}(?:(?!</w:p>)[\\s\\S])*?</w:p>',
      'g'
    )
    if (r.kind === 'table' && r.tableValue) {
      const tableXml = renderTableXml(r.tableValue)
      result = result.replace(pattern, tableXml)
    } else if (r.kind === 'list' && r.listValue) {
      const listXml = renderListXml(r.listValue)
      result = result.replace(pattern, listXml)
    }
  }

  // Pass 2: simple text replacements.
  for (const r of replacements) {
    if (r.kind !== 'simple') continue
    const placeholder = '{{' + r.tokenName + '}}'
    const value = escapeXml(r.simpleValue || '')
    result = result.split(placeholder).join(value)
  }

  return result
}

// ─── Internals: XML rendering ───────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function renderTableXml(table: TableTokenValue): string {
  const cols = table.headers.length || (table.rows[0]?.length ?? 1)
  const tblPr = (
    '<w:tblPr>' +
    '<w:tblW w:w="0" w:type="auto"/>' +
    '<w:tblBorders>' +
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '</w:tblBorders>' +
    '</w:tblPr>'
  )
  const tblGrid = '<w:tblGrid>' + Array(cols).fill('<w:gridCol w:w="1500"/>').join('') + '</w:tblGrid>'

  const headerRow = renderTableRow(table.headers, true)
  const dataRows = table.rows.map(row => {
    // Pad/truncate to header column count for safety
    const padded: Array<string | number | null | undefined> = []
    for (let i = 0; i < cols; i++) padded.push(row[i] ?? '')
    return renderTableRow(padded.map(v => String(v ?? '')), false)
  }).join('')

  return '<w:tbl>' + tblPr + tblGrid + headerRow + dataRows + '</w:tbl>'
}

function renderTableRow(cells: Array<string | number | null | undefined>, isHeader: boolean): string {
  const cellsXml = cells.map(c => renderTableCell(String(c ?? ''), isHeader)).join('')
  return '<w:tr>' + cellsXml + '</w:tr>'
}

function renderTableCell(text: string, isHeader: boolean): string {
  const tcPr = '<w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>'
  const runProps = isHeader ? '<w:rPr><w:b/></w:rPr>' : ''
  // Multi-line cell text: each line becomes its own paragraph
  const lines = text.split('\n')
  const paragraphs = lines.map(line => (
    '<w:p>' +
    '<w:r>' + runProps + '<w:t xml:space="preserve">' + escapeXml(line) + '</w:t></w:r>' +
    '</w:p>'
  )).join('')
  return '<w:tc>' + tcPr + paragraphs + '</w:tc>'
}

function renderListXml(list: ListTokenValue): string {
  return list.bullets.map(text => (
    '<w:p>' +
    '<w:pPr><w:pStyle w:val="ListBullet"/></w:pPr>' +
    '<w:r><w:t xml:space="preserve">' + escapeXml(text) + '</w:t></w:r>' +
    '</w:p>'
  )).join('')
}

// ─── Token derivation helpers (computed values) ──────────────────────────────

/**
 * Build computed tokens (TODAY_DATE, TODAY_MONTH_YEAR, RETURN_BY_DATE, etc.)
 * given a base date and an optional response deadline.
 */
export function computeDateTokens(opts: {
  now?: Date
  responseDeadline?: Date | string
  returnByDaysBeforeDeadline?: number
}): Record<string, string> {
  const now = opts.now || new Date()
  const tokens: Record<string, string> = {
    TODAY_DATE: formatIsoDate(now),
    TODAY_MONTH_YEAR: formatMonthYear(now),
  }
  if (opts.responseDeadline) {
    const deadline = typeof opts.responseDeadline === 'string'
      ? new Date(opts.responseDeadline)
      : opts.responseDeadline
    if (!isNaN(deadline.getTime())) {
      const offsetDays = opts.returnByDaysBeforeDeadline ?? 2
      const returnBy = new Date(deadline.getTime() - offsetDays * 24 * 60 * 60 * 1000)
      tokens.RETURN_BY_DATE = formatIsoDate(returnBy)
      tokens.RETURN_BY_DATE_FRIENDLY = formatFriendlyDate(returnBy)
      tokens.RETURN_BY_DATE_SHORT = formatShortDate(returnBy)
    }
  }
  return tokens
}

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatMonthYear(d: Date): string {
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function formatFriendlyDate(d: Date): string {
  return d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatShortDate(d: Date): string {
  return d.toLocaleString('en-US', { month: 'long', day: 'numeric' })
}
