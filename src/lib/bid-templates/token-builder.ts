// Build a TokenMap (the input to bid-templates/generator) from a parsed
// solicitation, an entity profile, and a list of subcontractor candidates.
//
// Server-side only.

import type { ParsedSolicitation } from '../solicitation-parser'
import type { EntityProposalData } from '../proposals/entity-data'
import type { RankedSub } from '../subcontractor-search'
import type { TokenMap, TableTokenValue, ListTokenValue } from './generator'
import { computeDateTokens } from './generator'

export type BuildOptions = {
  /** When to use as "today" (default: now). */
  now?: Date
  /** Days before response_deadline at which subs must return pricing (default 2). */
  returnByDaysBeforeDeadline?: number
  /** Optional manual / strategic tokens passed in by the user. */
  manualTokens?: TokenMap
}

export function buildBidStarterTokens(opts: {
  bid: ParsedSolicitation
  entity: EntityProposalData
  subs: RankedSub[]
  buildOptions?: BuildOptions
}): TokenMap {
  const { bid, entity, subs, buildOptions = {} } = opts
  const tokens: TokenMap = {}

  // Computed dates first (TODAY_DATE, RETURN_BY_DATE_*, TODAY_MONTH_YEAR).
  const dateTokens = computeDateTokens({
    now: buildOptions.now,
    responseDeadline: bid.response_deadline,
    returnByDaysBeforeDeadline: buildOptions.returnByDaysBeforeDeadline,
  })
  Object.assign(tokens, dateTokens)

  // Entity tokens — taken from entity-data.ts canonical record.
  tokens.ENTITY_NAME = entity.legalName
  tokens.ENTITY_NAME_UPPER = entity.legalName.toUpperCase()
  tokens.ENTITY_UEI = entity.uei || ''
  tokens.ENTITY_CAGE = entity.cageCode || ''
  tokens.ENTITY_SAM_EMAIL = entity.samEmail || ''
  tokens.ENTITY_PUBLIC_EMAIL = entity.publicEmail
  tokens.ENTITY_PHONE = entity.phone || ''
  tokens.ENTITY_PROPOSAL_LEAD = entity.proposalLead
  tokens.ENTITY_PROPOSAL_LEAD_TITLE = entity.proposalLeadTitle
  const primary = entity.naicsCodes.find(n => n.primary) || entity.naicsCodes[0]
  if (primary) {
    tokens.ENTITY_NAICS_PRIMARY = primary.code
  }
  tokens.ENTITY_BUSINESS_TYPE = entity.certifications.join('; ')

  // Solicitation tokens.
  if (bid.solicitation_number) tokens.SOL_NUMBER = bid.solicitation_number
  if (bid.title) tokens.SOL_TITLE = bid.title
  if (bid.agency) tokens.SOL_AGENCY = bid.agency
  if (bid.agency_abbrev) tokens.SOL_AGENCY_ABBREV = bid.agency_abbrev
  if (bid.sub_agency) tokens.SOL_SUB_AGENCY = bid.sub_agency
  if (bid.notice_id) tokens.SOL_NOTICE_ID = bid.notice_id
  if (bid.sam_url) tokens.SOL_SAM_URL = bid.sam_url
  if (bid.naics) tokens.SOL_NAICS = bid.naics
  if (bid.naics_description) tokens.SOL_NAICS_DESCRIPTION = bid.naics_description
  if (bid.size_standard) tokens.SOL_SIZE_STANDARD = bid.size_standard
  if (bid.psc_code) tokens.SOL_PSC_CODE = bid.psc_code
  if (bid.set_aside) tokens.SOL_SET_ASIDE = bid.set_aside
  if (bid.contract_type) tokens.SOL_CONTRACT_TYPE = bid.contract_type
  if (bid.place_of_performance) tokens.SOL_PLACE_OF_PERFORMANCE = bid.place_of_performance
  if (bid.location_city) tokens.SOL_LOCATION_CITY = bid.location_city
  if (bid.location_state) tokens.SOL_LOCATION_STATE = bid.location_state
  if (bid.location_state_abbrev) tokens.SOL_LOCATION_STATE_ABBREV = bid.location_state_abbrev
  if (bid.location_city && bid.location_state_abbrev) {
    tokens.SOL_LOCATION_CITY_STATE = bid.location_city + ', ' + bid.location_state_abbrev
  }
  if (bid.facility_name) tokens.SOL_FACILITY_NAME = bid.facility_name
  if (bid.base_period) tokens.SOL_BASE_PERIOD = bid.base_period
  if (bid.option_years != null) tokens.SOL_OPTION_YEARS = String(bid.option_years) + ' option year(s)'
  if (bid.performance_start_date) tokens.SOL_PERFORMANCE_START_DATE = bid.performance_start_date
  if (bid.response_deadline) tokens.SOL_RESPONSE_DEADLINE = bid.response_deadline
  if (bid.response_deadline_friendly) tokens.SOL_RESPONSE_DEADLINE_FRIENDLY = bid.response_deadline_friendly
  if (bid.evaluation_method) tokens.SOL_EVALUATION_METHOD = bid.evaluation_method
  if (bid.submission_method) tokens.SOL_SUBMISSION_METHOD = bid.submission_method
  if (bid.submission_email) tokens.SUBMISSION_EMAIL = bid.submission_email
  if (bid.submission_portal_url) tokens.SUBMISSION_PORTAL_URL = bid.submission_portal_url
  if (bid.submission_file_naming) tokens.SOL_FILE_NAMING = bid.submission_file_naming
  if (bid.scope_summary) tokens.SOL_SCOPE_SUMMARY = bid.scope_summary
  if (bid.scope_generic_description) tokens.SOL_SCOPE_GENERIC_DESCRIPTION = bid.scope_generic_description
  if (bid.estimated_value != null) tokens.SOL_ESTIMATED_VALUE = formatUsd(bid.estimated_value)
  if (bid.incumbent_contractor) tokens.SOL_INCUMBENT_CONTRACTOR = bid.incumbent_contractor
  if (bid.wage_determination_number) tokens.WAGE_DETERMINATION_NUMBER = bid.wage_determination_number
  if (bid.wage_determination_revision_date) tokens.WAGE_DETERMINATION_REVISION_DATE = bid.wage_determination_revision_date
  if (bid.wage_determination_location) tokens.WAGE_DETERMINATION_LOCATION = bid.wage_determination_location

  // CO contact.
  if (bid.co_name) tokens.CO_NAME = bid.co_name
  if (bid.co_title) tokens.CO_TITLE = bid.co_title
  if (bid.co_email) tokens.CO_EMAIL = bid.co_email
  if (bid.co_phone) tokens.CO_PHONE = bid.co_phone
  if (bid.ko_contact_specialist_name) tokens.KO_CONTACT_SPECIALIST_NAME = bid.ko_contact_specialist_name
  if (bid.ko_contact_specialist_email) tokens.KO_CONTACT_SPECIALIST_EMAIL = bid.ko_contact_specialist_email

  // Work locations / sites.
  if (bid.work_locations && bid.work_locations.length > 0) {
    tokens.SOL_WORK_LOCATIONS = bid.work_locations.join('; ')
    if (bid.work_locations[0]) tokens.SOL_SITE_1 = bid.work_locations[0]
    if (bid.work_locations[1]) tokens.SOL_SITE_2 = bid.work_locations[1]
    if (bid.work_locations[2]) tokens.SOL_SITE_3 = bid.work_locations[2]
    // Sub-facing variants (sanitized): use generic_work_areas if available, else city/state.
    if (bid.generic_work_areas && bid.generic_work_areas.length > 0) {
      if (bid.generic_work_areas[0]) tokens.SOL_WORK_SITE_1 = bid.generic_work_areas[0]
      if (bid.generic_work_areas[1]) tokens.SOL_WORK_SITE_2 = bid.generic_work_areas[1]
      if (bid.generic_work_areas[2]) tokens.SOL_WORK_SITE_3 = bid.generic_work_areas[2]
    } else {
      const generic = bid.location_city && bid.location_state_abbrev
        ? bid.location_city + ', ' + bid.location_state_abbrev
        : (bid.location_state || '')
      tokens.SOL_WORK_SITE_1 = generic
      tokens.SOL_WORK_SITE_2 = generic
      tokens.SOL_WORK_SITE_3 = generic
    }
  }

  // Generic location for sub-facing docs.
  if (bid.location_city && bid.location_state_abbrev) {
    tokens.SOL_GENERIC_LOCATION = bid.location_city + ', ' + bid.location_state_abbrev
  } else if (bid.location_state) {
    tokens.SOL_GENERIC_LOCATION = bid.location_state
  }

  // Subcontractor candidates table (for 07_Subcontractor_Search).
  const subTable: TableTokenValue = {
    headers: [
      'Company', 'UEI', 'Contact', 'Phone', 'Email',
      'NAICS', 'Cert', 'Verification', 'Score', 'Notes',
    ],
    rows: subs.map(s => [
      s.company_name,
      s.uei || '—',
      s.contact_name || (s.source === 'sam_entity' ? 'See SAM Entity record' : '—'),
      s.contact_phone || '—',
      s.contact_email || '—',
      s.naics_codes.join(', '),
      s.certifications.join('; ') || '—',
      verificationBadge(s.verification_status),
      String(s.match_score),
      s.verification_notes || '',
    ]),
  }
  tokens.SUB_CANDIDATES_BLOCK = subTable
  // Empty placeholders for additional candidate tables (07 has 4 — fill rest with empty).
  const emptyTable: TableTokenValue = { headers: subTable.headers, rows: [] }
  tokens.SUB_CANDIDATES_BLOCK_2 = emptyTable
  tokens.SUB_CANDIDATES_BLOCK_3 = emptyTable
  tokens.SUB_CANDIDATES_BLOCK_4 = emptyTable

  // CLIN table for pricing docs.
  if (bid.clins && bid.clins.length > 0) {
    const clinTable: TableTokenValue = {
      headers: ['CLIN', 'Description', 'Qty', 'Unit', 'Unit Price', 'Extended'],
      rows: bid.clins.map(c => [
        c.clin_number,
        c.description,
        c.qty != null ? String(c.qty) : '',
        c.unit || '',
        '$', '$',
      ]),
    }
    tokens.SOL_CLIN_TABLE = clinTable
  } else {
    tokens.SOL_CLIN_TABLE = { headers: ['CLIN', 'Description', 'Qty', 'Unit', 'Unit Price', 'Extended'], rows: [] }
  }

  // Required licenses, insurance, equipment, safety as bullet lists.
  if (bid.required_licenses && bid.required_licenses.length > 0) {
    const list: ListTokenValue = { bullets: bid.required_licenses }
    tokens.REQUIRED_LICENSES_BLOCK = list
  }
  if (bid.insurance_requirements && bid.insurance_requirements.length > 0) {
    const list: ListTokenValue = { bullets: bid.insurance_requirements }
    tokens.INSURANCE_REQUIREMENTS_BLOCK = list
  }
  if (bid.equipment_requirements && bid.equipment_requirements.length > 0) {
    const list: ListTokenValue = { bullets: bid.equipment_requirements }
    tokens.EQUIPMENT_REQUIREMENTS_BLOCK = list
  }
  if (bid.safety_requirements && bid.safety_requirements.length > 0) {
    const list: ListTokenValue = { bullets: bid.safety_requirements }
    tokens.SAFETY_REQUIREMENTS_BLOCK = list
  }

  // Caller-supplied manual tokens override everything above.
  if (buildOptions.manualTokens) {
    Object.assign(tokens, buildOptions.manualTokens)
  }

  return tokens
}

function verificationBadge(status: RankedSub['verification_status']): string {
  switch (status) {
    case 'sam_verified':         return '✓ SAM verified'
    case 'listed_not_confirmed': return '⚠ Listed, not confirmed'
    case 'web_only':             return '? Web research only'
    case 'unable_to_verify':     return '✗ Unable to verify'
    default:                     return '—'
  }
}

function formatUsd(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── KeyServiceLocation derivation ───────────────────────────────────────────

/**
 * Build the bid folder name: [KeyServiceLocation]-[AgencyAbbrev]-[SolicitationNumber].
 * Examples:
 *   "MowingToronto-DOD-W912BV26QA047"
 *   "WarrenBridgeCleaning-DOI-140L6226Q0008"
 *
 * If overrides are provided, they take precedence.
 */
export function buildBidFolderName(opts: {
  bid: ParsedSolicitation
  keyServiceLocation?: string  // user override
  agencyShort?: string         // user override (e.g., "DOD" instead of "USACE")
}): string {
  const { bid, keyServiceLocation, agencyShort } = opts

  const ksl = keyServiceLocation || deriveKeyServiceLocation(bid)
  const agency = agencyShort || deriveAgencyShort(bid) || 'AGENCY'
  const sol = (bid.solicitation_number || 'TBD').replace(/[^A-Z0-9]/gi, '')

  return [ksl, agency, sol].filter(Boolean).join('-')
}

function deriveKeyServiceLocation(bid: ParsedSolicitation): string {
  const title = (bid.title || '').toLowerCase()
  // First word that hints at the service category.
  const SERVICE_WORDS = ['mowing', 'cleaning', 'janitorial', 'custodial', 'landscaping',
                         'maintenance', 'courier', 'transport', 'security', 'inspection']
  let serviceWord = SERVICE_WORDS.find(w => title.includes(w)) || ''
  if (!serviceWord) {
    const firstTitleWord = (bid.title || '').trim().split(/\s+/)[0] || ''
    serviceWord = firstTitleWord.toLowerCase()
  }

  let location = bid.location_city || bid.facility_name || bid.location_state || ''
  // Strip non-alphanum, take first word
  location = location.split(/[\s,]/)[0].replace(/[^A-Za-z]/g, '')

  return capitalize(serviceWord) + capitalize(location)
}

function deriveAgencyShort(bid: ParsedSolicitation): string | undefined {
  if (bid.agency_abbrev) return bid.agency_abbrev.replace(/[^A-Z]/gi, '').toUpperCase()
  const a = (bid.agency || '').toLowerCase()
  if (a.includes('army corps')) return 'DOD'
  if (a.includes('army')) return 'DOA'
  if (a.includes('navy')) return 'DON'
  if (a.includes('air force')) return 'DAF'
  if (a.includes('defense')) return 'DOD'
  if (a.includes('interior')) return 'DOI'
  if (a.includes('agriculture')) return 'USDA'
  if (a.includes('homeland')) return 'DHS'
  if (a.includes('veterans')) return 'VA'
  if (a.includes('justice')) return 'DOJ'
  if (a.includes('general services')) return 'GSA'
  if (a.includes('health and human')) return 'HHS'
  if (a.includes('national institute')) return 'NIH'
  return undefined
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
