import { EntityType, LeadStatus, SetAsideType, SourceType, ContractType, CommercialStatus, DocumentType } from './types'

export const ENTITY_BRANDING: Record<string, { primary: string; accent: string; name: string }> = {
  mog:       { primary: '#1F2937', accent: '#D4AF37', name: 'MOG Command' },
  exousia:   { primary: '#253A5E', accent: '#D4AF37', name: 'Exousia Solutions' },
  vitalx:    { primary: '#064E3B', accent: '#06A59A', name: 'VitalX' },
  ironhouse: { primary: '#292524', accent: '#B45309', name: 'IronHouse Janitorial & Landscaping' },
}

// NASCENCE Pillars + Procurement â AUTHORITATIVE NAICS/PSC per entity.
// Source of truth: Emmanuela's validator skill, confirmed 2026-04-24.
// All three entities are SAM.gov registered and federal-eligible.
// VitalX additionally has a commercial healthcare logistics side (non-federal).
export const ENTITY_NAICS: Record<EntityType, string[]> = {
  // Exousia: custodial, landscaping, solid waste, facilities ops, procurement/logistics consulting
  exousia:   ['561720', '561730', '562111', '561210', '541614', '541611'],
  // VitalX: medical courier, NEMT, lab services support, pharmacy delivery, mobile diagnostics, general healthcare
  vitalx:    ['492110', '485999', '621511', '492210', '621999'],
  // IronHouse: exactly 4 categories
  ironhouse: ['561720', '561730', '562111', '561210'],
}

// Primary NAICS per entity (for fit score weighting and SAM.gov display)
export const ENTITY_PRIMARY_NAICS: Record<EntityType, string> = {
  exousia:   '561210',
  vitalx:    '492110',
  ironhouse: '561720',
}

// PSC (Product Service Codes) per entity - for SAM.gov search and classification
export const ENTITY_PSC: Record<EntityType, string[]> = {
  exousia:   ['S201', 'S208', 'S205', 'S216', 'R706'],
  vitalx:    ['V119', 'V225', 'Q301', 'Q999'],
  ironhouse: ['S201', 'S208', 'S205', 'S216'],
}

// NAICS -> service category + PSC mapping per entity (for validator + proposal display)
export const ENTITY_NAICS_DETAIL: Record<EntityType, Array<{ naics: string; psc: string; category: string }>> = {
  exousia: [
    { naics: '561720', psc: 'S201', category: 'Custodial / Janitorial Services' },
    { naics: '561730', psc: 'S208', category: 'Landscaping / Grounds Maintenance' },
    { naics: '562111', psc: 'S205', category: 'Solid Waste Collection' },
    { naics: '561210', psc: 'S216', category: 'Facilities Operations Support' },
    { naics: '541614', psc: 'R706', category: 'Procurement / Logistics Consulting' },
    { naics: '541611', psc: 'R706', category: 'Procurement / Logistics Consulting' },
  ],
  vitalx: [
    { naics: '492110', psc: 'V119', category: 'Medical Courier / Specimen Transport' },
    { naics: '485999', psc: 'V225', category: 'NEMT (Non-Emergency Medical Transport)' },
    { naics: '621511', psc: 'Q301', category: 'Lab Services Support' },
    { naics: '492210', psc: 'V119', category: 'Pharmacy Delivery' },
    { naics: '621999', psc: 'Q999', category: 'Mobile Diagnostics / General Healthcare Support' },
  ],
  ironhouse: [
    { naics: '561720', psc: 'S201', category: 'Custodial / Janitorial Services' },
    { naics: '561730', psc: 'S208', category: 'Landscaping / Grounds Maintenance' },
    { naics: '562111', psc: 'S205', category: 'Solid Waste Collection' },
    { naics: '561210', psc: 'S216', category: 'Facilities Operations Support' },
  ],
}

// Every entity is SAM-registered and federal-eligible
export const ENTITY_SAM_REGISTERED: Record<EntityType, { active: boolean; uei?: string; cage?: string }> = {
  exousia:   { active: true, uei: 'XNZ2KYQYK566', cage: '0ENQ3' },
  vitalx:    { active: true },
  ironhouse: { active: true },
}

// Entity eligibility for set-asides (for validator Pass 1)
// swam = Virginia SWaM (Small, Women-owned, Minority-owned) for eVA bids.
export const ENTITY_SET_ASIDE_ELIGIBILITY: Record<EntityType, {
  wosb: boolean; edwosb: boolean; small_business: boolean; hubzone: boolean; sdvosb: boolean; eight_a: boolean; swam?: boolean
}> = {
  exousia:   { wosb: true,  edwosb: true,  small_business: true, hubzone: false, sdvosb: false, eight_a: false, swam: true },
  vitalx:    { wosb: true,  edwosb: true,  small_business: true, hubzone: false, sdvosb: false, eight_a: false, swam: false },
  ironhouse: { wosb: false, edwosb: false, small_business: true, hubzone: false, sdvosb: false, eight_a: false, swam: false },
}

// VitalX operates federal AND commercial; the other two are federal-only
export const ENTITY_SECTORS: Record<EntityType, { federal: boolean; commercial: boolean }> = {
  exousia:   { federal: true, commercial: false },
  vitalx:    { federal: true, commercial: true },
  ironhouse: { federal: true, commercial: false },
}

export const LEAD_STATUSES: LeadStatus[] = [
  'new', 'reviewing', 'bid_no_bid', 'active_bid', 'submitted', 'awarded', 'lost', 'no_bid', 'cancelled',
]

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new:         'New',
  reviewing:   'Reviewing',
  bid_no_bid:  'Bid/No-Bid',
  active_bid:  'Active Bid',
  submitted:   'Submitted',
  awarded:     'Awarded',
  lost:        'Lost',
  no_bid:      'No Bid',
  cancelled:   'Cancelled',
}

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string }> = {
  new:         { bg: '#172554', text: '#93C5FD' },
  reviewing:   { bg: '#1e3a5f', text: '#60A5FA' },
  bid_no_bid:  { bg: '#3b2a1a', text: '#FCD34D' },
  active_bid:  { bg: '#14532d', text: '#86EFAC' },
  submitted:   { bg: '#2e1065', text: '#C4B5FD' },
  awarded:     { bg: '#052e16', text: '#4ADE80' },
  lost:        { bg: '#3b0a0a', text: '#FCA5A5' },
  no_bid:      { bg: '#1F2937', text: '#9CA3AF' },
  cancelled:   { bg: '#111827', text: '#6B7280' },
}

export const SET_ASIDE_LABELS: Record<SetAsideType, string> = {
  wosb:                 'WOSB',
  edwosb:               'EDWOSB',
  '8a':                 '8(a)',
  hubzone:              'HUBZone',
  sdvosb:               'SDVOSB',
  small_business:       'Small Business',
  total_small_business: 'Total SB',
  full_and_open:        'Full & Open',
  sole_source:          'Sole Source',
  none:                 'None',
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  sam_gov:     'Federal (SAM.gov)',
  govwin:      'Federal (GovWin)',
  eva:         'VA State (eVA)',
  emma:        'MD State (eMMA)',
  local_gov:   'Local Government',
  usaspending: 'Federal (USASpending)',
  manual:      'Manual Entry',
  commercial:  'Commercial',
}

export const SOURCE_REGION: Record<SourceType, 'federal' | 'state_va' | 'state_md' | 'local' | 'manual'> = {
  sam_gov:     'federal',
  govwin:      'federal',
  usaspending: 'federal',
  eva:         'state_va',
  emma:        'state_md',
  local_gov:   'local',
  manual:      'manual',
  commercial:  'manual',
}

export const REGION_LABELS: Record<string, string> = {
  federal:  'Federal',
  state_va: 'VA State (eVA)',
  state_md: 'MD State (eMMA)',
  local:    'Local Government',
  manual:   'Manual Entry',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  firm_fixed:    'Firm Fixed Price',
  time_materials:'Time & Materials',
  cost_plus:     'Cost Plus',
  idiq:          'IDIQ',
  bpa:           'BPA',
  purchase_order:'Purchase Order',
  commercial:    'Commercial',
}

export const COMMERCIAL_STATUSES: CommercialStatus[] = [
  'prospect', 'outreach', 'proposal', 'negotiation', 'contract', 'lost', 'inactive',
]

export const COMMERCIAL_STATUS_LABELS: Record<CommercialStatus, string> = {
  prospect:    'Prospect',
  outreach:    'Outreach',
  proposal:    'Proposal',
  negotiation: 'Negotiation',
  contract:    'Contract',
  lost:        'Lost',
  inactive:    'Inactive',
}

export const COMMERCIAL_STATUS_COLORS: Record<CommercialStatus, { bg: string; text: string }> = {
  prospect:    { bg: '#172554', text: '#93C5FD' },
  outreach:    { bg: '#3b2a1a', text: '#FCD34D' },
  proposal:    { bg: '#2e1065', text: '#C4B5FD' },
  negotiation: { bg: '#431407', text: '#FED7AA' },
  contract:    { bg: '#052e16', text: '#4ADE80' },
  lost:        { bg: '#3b0a0a', text: '#FCA5A5' },
  inactive:    { bg: '#111827', text: '#6B7280' },
}

export const VITALX_COMMERCIAL_CATEGORIES = [
  'Hospital Systems',
  'Reference Labs',
  'Clinical Research/Biotech',
  'Pharmacy/Specialty',
  'Home Health',
  'NEMT Brokers',
  'Urgent Care/Outpatient',
  'Blood Banks',
  'VA/Military Healthcare',
  'DNA/Drug Testing',
]

export const OUTREACH_METHODS = [
  'Email',
  'Phone',
  'LinkedIn',
  'In-Person',
  'Referral',
  'Conference',
  'Cold Outreach',
]

export const DEFAULT_COMPLIANCE_ITEMS = [
  'Capability Statement',
  'Past Performance Writeup',
  'Pricing Worksheet',
  'Technical Approach',
  'Subcontractor Agreements',
  'Org Chart',
  'Representations and Certifications',
  'Cover Letter',
  'Project Schedule',
]

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  solicitation: 'Solicitation',
  proposal: 'Proposal',
  teaming_agreement: 'Teaming Agreement',
  capability_statement: 'Capability Statement',
  pricing: 'Pricing',
  contract: 'Contract',
  correspondence: 'Correspondence',
  certification: 'Certification',
  other: 'Other',
}
