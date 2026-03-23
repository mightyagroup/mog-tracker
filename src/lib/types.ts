export type EntityType = 'exousia' | 'vitalx' | 'ironhouse'

export type LeadStatus =
  | 'new'
  | 'reviewing'
  | 'bid_no_bid'
  | 'active_bid'
  | 'submitted'
  | 'awarded'
  | 'lost'
  | 'no_bid'
  | 'cancelled'

export type CommercialStatus =
  | 'prospect'
  | 'outreach'
  | 'proposal'
  | 'negotiation'
  | 'contract'
  | 'lost'
  | 'inactive'

export type SourceType =
  | 'sam_gov'
  | 'govwin'
  | 'eva'
  | 'emma'
  | 'local_gov'
  | 'usaspending'
  | 'manual'
  | 'commercial'

export type SetAsideType =
  | 'wosb'
  | 'edwosb'
  | '8a'
  | 'hubzone'
  | 'sdvosb'
  | 'small_business'
  | 'total_small_business'
  | 'full_and_open'
  | 'sole_source'
  | 'none'

export type ContractType =
  | 'firm_fixed'
  | 'time_materials'
  | 'cost_plus'
  | 'idiq'
  | 'bpa'
  | 'purchase_order'
  | 'commercial'

export interface ServiceCategory {
  id: string
  entity: EntityType
  name: string
  naics_codes: string[]
  keywords: string[]
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface GovLead {
  id: string
  entity: EntityType
  title: string
  solicitation_number?: string | null
  notice_id?: string | null
  description?: string | null
  status: LeadStatus
  service_category_id?: string | null
  service_category?: ServiceCategory | null
  naics_code?: string | null
  set_aside: SetAsideType
  contract_type?: ContractType | null
  source: SourceType
  agency?: string | null
  sub_agency?: string | null
  office?: string | null
  place_of_performance?: string | null
  posted_date?: string | null
  response_deadline?: string | null
  archive_date?: string | null
  estimated_value?: number | null
  award_amount?: number | null
  previous_award_total?: number | null
  incumbent_contractor?: string | null
  award_history_notes?: string | null
  fit_score: number
  proposal_lead?: string | null
  sam_gov_url?: string | null
  solicitation_url?: string | null
  drive_folder_url?: string | null
  notes?: string | null
  bid_decision_notes?: string | null
  created_at: string
  updated_at: string
}

export interface Subcontractor {
  id: string
  company_name: string
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  website?: string | null
  uei?: string | null
  cage_code?: string | null
  certifications: string[]
  naics_codes: string[]
  set_asides: string[]
  services_offered?: string | null
  geographic_coverage?: string | null
  entities_associated: EntityType[]
  teaming_agreement_status: string
  teaming_agreement_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ComplianceItem {
  id: string
  gov_lead_id: string
  item_name: string
  is_complete: boolean
  due_date?: string | null
  assigned_to?: string | null
  notes?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  entity?: EntityType | null
  gov_lead_id?: string | null
  commercial_lead_id?: string | null
  contact_id?: string | null
  subcontractor_id?: string | null
  interaction_date: string
  interaction_type?: string | null
  subject?: string | null
  notes?: string | null
  follow_up_date?: string | null
  follow_up_action?: string | null
  created_at: string
  updated_at: string
}
