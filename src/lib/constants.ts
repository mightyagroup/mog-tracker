import { EntityType, LeadStatus, SetAsideType, SourceType, ContractType, CommercialStatus } from './types'

export const ENTITY_BRANDING: Record<string, { primary: string; accent: string; name: string }> = {
  mog:       { primary: '#1F2937', accent: '#D4AF37', name: 'MOG Command' },
  exousia:   { primary: '#253A5E', accent: '#D4AF37', name: 'Exousia Solutions' },
  vitalx:    { primary: '#064E3B', accent: '#06A59A', name: 'VitalX' },
  ironhouse: { primary: '#292524', accent: '#B45309', name: 'IronHouse Janitorial & Landscaping' },
}

export const ENTITY_NAICS: Record<EntityType, string[]> = {
  exousia:   ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
  vitalx:    ['492110', '492210', '621511', '621610', '485991', '485999', '561990'],
  ironhouse: ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
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
  'Download and review full solicitation',
  'Identify all submission requirements',
  'Confirm NAICS code and size standard',
  'Verify SAM.gov registration is active',
  'Check set-aside eligibility',
  'Identify evaluation criteria and weights',
  'Review past performance requirements',
  'Draft technical approach',
  'Complete pricing worksheet',
  'Identify subcontractors needed',
  'Draft subcontractor agreements',
  'Prepare past performance references',
  'Internal review and quality check',
  'Final pricing review',
  'Submit proposal before deadline',
  'Confirm receipt of submission',
]
