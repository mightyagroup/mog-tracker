// Solicitation parser — extracts structured fields from a federal solicitation
// PDF or DOCX into the ParsedSolicitation type used by the Bid Starter generator.
//
// Built on top of file-parsers.ts (which handles PDF via Claude multimodal and
// DOCX via mammoth). All string fields are passed through fixMojibakeDeep
// before returning so downstream callers don't have to defend against
// re-encoded UTF-8.
//
// Server-side only.

import { fileToText } from './file-parsers'
import { fixMojibakeDeep } from './text-utils'

// ─── Public types ────────────────────────────────────────────────────────────

export type Clin = {
  clin_number: string
  description: string
  qty: number | null
  unit: string | null
}

export type ParsedSolicitation = {
  // Identifiers
  solicitation_number?: string
  title?: string
  agency?: string
  agency_abbrev?: string
  sub_agency?: string
  notice_id?: string
  sam_url?: string

  // Classification
  naics?: string
  naics_description?: string
  size_standard?: string
  psc_code?: string
  set_aside?: string
  contract_type?: string

  // Performance
  place_of_performance?: string
  location_city?: string
  location_state?: string
  location_state_abbrev?: string
  facility_name?: string
  base_period?: string
  option_years?: number
  performance_start_date?: string

  // Dates
  response_deadline?: string             // ISO timestamp
  response_deadline_friendly?: string    // human-readable e.g., "April 9, 2026, 2:00 PM ET"
  questions_deadline?: string
  site_visit_date?: string

  // Contacts
  co_name?: string
  co_title?: string
  co_email?: string
  co_phone?: string
  ko_contact_specialist_name?: string
  ko_contact_specialist_email?: string
  ko_contracting_officer_name?: string

  // Financials
  estimated_value?: number
  award_amount?: number
  incumbent_contractor?: string

  // Scope
  scope_summary?: string
  scope_generic_description?: string  // OPSEC-safe phrasing (no agency)
  work_locations?: string[]
  generic_work_areas?: string[]       // OPSEC-safe location list
  required_licenses?: string[]
  insurance_requirements?: string[]
  equipment_requirements?: string[]
  safety_requirements?: string[]

  // L / M
  evaluation_method?: string          // "LPTA", "Best Value", "Trade-Off"
  evaluation_factors?: string[]       // Section M
  submission_method?: string          // "piee" | "email" | "sam" | "paper" | "other"
  submission_email?: string
  submission_portal_url?: string
  submission_requirements?: string[]  // Section L
  submission_file_naming?: string
  far_clauses?: string[]

  // Wage determination
  wage_determination_number?: string
  wage_determination_revision_date?: string
  wage_determination_location?: string

  // Pricing structure
  clins?: Clin[]
}

export type ParseInput = {
  buffer: Buffer
  filename?: string
  mimeType: string
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function parseSolicitation(input: ParseInput): Promise<ParsedSolicitation> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')

  const { text } = await fileToText({
    buffer: input.buffer,
    filename: input.filename || 'solicitation',
    mimeType: input.mimeType,
    anthropicKey: apiKey,
  })

  if (!text || text.trim().length === 0) {
    throw new Error('Empty text extracted from solicitation')
  }

  const parsed = await callClaudeForStructuredFields(text, apiKey)
  return fixMojibakeDeep(parsed)
}

/**
 * Lower-level helper: parse from already-extracted plain text (skips file parsing).
 * Useful when the caller already has the text (e.g., from a prior parse).
 */
export async function parseSolicitationFromText(text: string): Promise<ParsedSolicitation> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')
  const parsed = await callClaudeForStructuredFields(text, apiKey)
  return fixMojibakeDeep(parsed)
}

// ─── Internal: Claude call ───────────────────────────────────────────────────

async function callClaudeForStructuredFields(
  text: string,
  apiKey: string
): Promise<ParsedSolicitation> {
  const prompt = buildExtractionPrompt(text)

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!r.ok) {
    const detail = await r.text()
    throw new Error('Claude API ' + r.status + ': ' + detail.slice(0, 400))
  }

  const j = await r.json()
  const block = (j.content || []).find((b: Record<string, unknown>) => b.type === 'text')
  const raw = (block && typeof (block as { text?: unknown }).text === 'string')
    ? (block as { text: string }).text
    : ''

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Claude returned no JSON object: ' + raw.slice(0, 400))
  }

  let parsed: ParsedSolicitation
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as ParsedSolicitation
  } catch (e) {
    throw new Error('JSON parse failed: ' + (e as Error).message + ' / raw: ' + raw.slice(0, 400))
  }

  return parsed
}

// ─── Internal: prompt construction ───────────────────────────────────────────

function buildExtractionPrompt(text: string): string {
  // Truncate to fit context window (Claude Sonnet handles ~200k input, but we
  // limit to 80k chars to leave headroom for the schema + response).
  const body = text.length > 80000 ? text.slice(0, 80000) + '\n\n[…truncated…]' : text

  return [
    'You are extracting structured data from a federal solicitation document.',
    'Return ONLY a single JSON object — no prose, no code fences, no preamble.',
    '',
    'If a field is not stated in the solicitation, OMIT it from the JSON.',
    'Do not invent values. Do not guess. Empty omission is correct.',
    '',
    'Schema:',
    '{',
    '  "solicitation_number": "<e.g., W912BV26QA047>",',
    '  "title": "<full official title>",',
    '  "agency": "<full agency name, e.g., U.S. Army Corps of Engineers>",',
    '  "agency_abbrev": "<short, e.g., USACE>",',
    '  "sub_agency": "<sub-agency or district>",',
    '  "notice_id": "<SAM.gov notice ID if present>",',
    '  "sam_url": "<SAM.gov URL if stated>",',
    '  "naics": "<6-digit NAICS code>",',
    '  "naics_description": "<NAICS description>",',
    '  "size_standard": "<SBA size standard, e.g., $9.5M or 500 employees>",',
    '  "psc_code": "<Product Service Code if present>",',
    '  "set_aside": "<e.g., Small Business 100%, WOSB, 8(a), HUBZone, SDVOSB, Full and Open>",',
    '  "contract_type": "<FFP, T&M, IDIQ, BPA, etc.>",',
    '  "place_of_performance": "<full address or location>",',
    '  "location_city": "<city only>",',
    '  "location_state": "<state name>",',
    '  "location_state_abbrev": "<2-letter state>",',
    '  "facility_name": "<specific facility, e.g., B. Everett Jordan Lake>",',
    '  "base_period": "<e.g., 9 months from June 2026>",',
    '  "option_years": <integer number of option years>,',
    '  "performance_start_date": "<ISO date>",',
    '  "response_deadline": "<ISO 8601 datetime>",',
    '  "response_deadline_friendly": "<human readable, include time and tz>",',
    '  "questions_deadline": "<ISO datetime>",',
    '  "site_visit_date": "<ISO datetime>",',
    '  "co_name": "<Contracting Officer name>",',
    '  "co_title": "<title>",',
    '  "co_email": "<email>",',
    '  "co_phone": "<phone>",',
    '  "ko_contact_specialist_name": "<Contract Specialist name>",',
    '  "ko_contact_specialist_email": "<email>",',
    '  "ko_contracting_officer_name": "<alternate KO name if different>",',
    '  "estimated_value": <number, no formatting>,',
    '  "incumbent_contractor": "<if stated>",',
    '  "scope_summary": "<one-paragraph plain-language summary of the work>",',
    '  "scope_generic_description": "<one-paragraph summary that uses NO agency or facility names — written for sub-facing docs (e.g., \'a federal contract for mowing services in southeast Kansas\')>",',
    '  "work_locations": ["<each work site as a separate string>"],',
    '  "generic_work_areas": ["<each work area in OPSEC-safe form, no facility names>"],',
    '  "required_licenses": ["<each required license, e.g., Kansas Commercial Herbicide Applicator>"],',
    '  "insurance_requirements": ["<line items, include $ amounts>"],',
    '  "equipment_requirements": ["<line items>"],',
    '  "safety_requirements": ["<line items, e.g., EM 385-1-1 compliance>"],',
    '  "evaluation_method": "<LPTA | Best Value | Trade-Off | Lowest Price | Other>",',
    '  "evaluation_factors": ["<each Section M factor>"],',
    '  "submission_method": "<piee | email | sam | paper | other>",',
    '  "submission_email": "<if email>",',
    '  "submission_portal_url": "<if portal>",',
    '  "submission_requirements": ["<each Section L item>"],',
    '  "submission_file_naming": "<file naming convention if specified>",',
    '  "far_clauses": ["<FAR 52.xxx-xx clause numbers cited>"],',
    '  "wage_determination_number": "<e.g., WD 2015-4373 Rev 32>",',
    '  "wage_determination_revision_date": "<ISO date>",',
    '  "wage_determination_location": "<county/state>",',
    '  "clins": [',
    '    { "clin_number": "0001", "description": "...", "qty": <number>, "unit": "<each|month|hour|lot|sqft|year>" }',
    '  ]',
    '}',
    '',
    'CRITICAL — OPSEC for sub-facing fields:',
    '- "scope_generic_description" MUST NOT contain the solicitation number, agency name, sub-agency, contracting officer, or specific federal facility names.',
    '- "generic_work_areas" MUST use generic descriptors (city/state, area type) — no facility names.',
    '- These two fields go to subcontractors who have not signed an NDA.',
    '',
    'Solicitation document:',
    '',
    body,
  ].join('\n')
}
