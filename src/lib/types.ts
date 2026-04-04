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
  psc_codes: string[]
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
  contracting_officer_name?: string | null
  contracting_officer_email?: string | null
  contracting_officer_phone?: string | null
  sam_gov_url?: string | null
  solicitation_url?: string | null
  drive_folder_url?: string | null
  notes?: string | null
  bid_decision_notes?: string | null
  usaspending_match_method?: string | null
  usaspending_confidence?: string | null
  manual_pricing_override?: boolean | null
  solicitation_verified?: boolean | null
  amendment_count?: number | null
  last_amendment_date?: string | null
  last_checked_at?: string | null
  description_hash?: string | null
  created_at: string
  updated_at: string
}

export interface CommercialLead {
  id: string
  entity: EntityType
  organization_name: string
  contact_name?: string | null
  contact_title?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_department?: string | null
  contact_direct_phone?: string | null
  contact_linkedin?: string | null
  website?: string | null
  office_name?: string | null
  office_address?: string | null
  office_city?: string | null
  office_state?: string | null
  office_zip?: string | null
  status: CommercialStatus
  service_category?: string | null
  estimated_annual_value?: number | null
  contract_length_months?: number | null
  last_contact_date?: string | null
  next_follow_up?: string | null
  outreach_method?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  contract_value?: number | null
  proposal_url?: string | null
  drive_folder_url?: string | null
  notes?: string | null
  service_summary?: string | null
  fit_score: number
  volume_tier?: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  first_name: string
  last_name: string
  title?: string | null
  organization?: string | null
  email?: string | null
  phone?: string | null
  linkedin?: string | null
  contact_type?: string | null
  entities_associated?: EntityType[] | null
  last_contact_date?: string | null
  next_follow_up?: string | null
  relationship_notes?: string | null
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
  service_tags: string[]
  services_offered?: string | null
  geographic_coverage?: string | null
  entities_associated: EntityType[]
  sub_type: string
  teaming_agreement_status: string
  teaming_agreement_url?: string | null
  fit_score: number
  reputation_rating: number
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

export type UserRole = 'admin' | 'manager' | 'viewer'

export interface UserProfile {
  id: string
  user_id: string
  role: UserRole
  display_name?: string | null
  email?: string | null
  entities_access: EntityType[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type NotificationType =
  | 'deadline_reminder'
  | 'new_lead'
  | 'status_change'
  | 'amendment_detected'
  | 'daily_digest'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  entity?: EntityType | null
  notification_type: NotificationType
  title: string
  message: string
  link?: string | null
  is_read: boolean
  gov_lead_id?: string | null
  commercial_lead_id?: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  deadline_reminders: boolean
  deadline_days_before: number[]
  new_leads: boolean
  status_changes: boolean
  amendment_alerts: boolean
  daily_digest: boolean
  created_at: string
  updated_at: string
}

export type DocumentType =
  | 'solicitation'
  | 'proposal'
  | 'teaming_agreement'
  | 'capability_statement'
  | 'pricing'
  | 'contract'
  | 'correspondence'
  | 'certification'
  | 'other'

export interface Document {
  id: string
  entity: EntityType
  gov_lead_id?: string | null
  commercial_lead_id?: string | null
  subcontractor_id?: string | null
  file_name: string
  file_type?: string | null
  file_size?: number | null
  storage_path: string
  document_type?: DocumentType | null
  description?: string | null
  uploaded_by?: string | null
  version: number
  is_archived: boolean
  created_at: string
  updated_at: string
}
