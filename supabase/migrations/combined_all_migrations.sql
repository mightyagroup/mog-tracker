-- Migration 001: Core Setup
-- Auto-update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum types
CREATE TYPE entity_type AS ENUM ('exousia', 'vitalx', 'ironhouse');
CREATE TYPE lead_status AS ENUM ('new', 'reviewing', 'bid_no_bid', 'active_bid', 'submitted', 'awarded', 'lost', 'no_bid', 'cancelled');
CREATE TYPE commercial_status AS ENUM ('prospect', 'outreach', 'proposal', 'negotiation', 'contract', 'lost', 'inactive');
CREATE TYPE source_type AS ENUM ('sam_gov', 'govwin', 'eva', 'emma', 'local_gov', 'usaspending', 'manual', 'commercial');
CREATE TYPE set_aside_type AS ENUM ('wosb', 'edwosb', '8a', 'hubzone', 'sdvosb', 'small_business', 'total_small_business', 'full_and_open', 'sole_source', 'none');
CREATE TYPE contract_type AS ENUM ('firm_fixed', 'time_materials', 'cost_plus', 'idiq', 'bpa', 'purchase_order', 'commercial');
-- Migration 002: Service Categories
CREATE TABLE service_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type NOT NULL,
  name text NOT NULL,
  naics_codes text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  color text DEFAULT '#6B7280',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON service_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed Exousia categories
INSERT INTO service_categories (entity, name, naics_codes, keywords, color, sort_order) VALUES
  ('exousia', 'Janitorial Services', '{561720}', '{janitorial,cleaning,custodial,sanitation}', '#06A59A', 1),
  ('exousia', 'Landscaping', '{561730}', '{landscaping,grounds,lawn,mowing,irrigation}', '#059669', 2),
  ('exousia', 'Facilities Support', '{561210}', '{facilities,building,maintenance,hvac,plumbing}', '#2563EB', 3),
  ('exousia', 'Consulting / Advisory', '{541614,541990}', '{consulting,advisory,cybersecurity,compliance,rmf}', '#7C3AED', 4),
  ('exousia', 'Administrative', '{561110}', '{administrative,management,office,support}', '#D97706', 5),
  ('exousia', 'Construction Adjacent', '{237310}', '{construction,highway,road,infrastructure}', '#DC2626', 6);

-- Seed VitalX Government categories
INSERT INTO service_categories (entity, name, naics_codes, keywords, color, sort_order) VALUES
  ('vitalx', 'Medical Courier / Specimen Transport', '{492110,492210}', '{courier,specimen,transport,delivery,medical,laboratory}', '#06A59A', 1),
  ('vitalx', 'Lab Services Support', '{621511}', '{lab,laboratory,clinical,pathology,testing}', '#0891B2', 2),
  ('vitalx', 'Home Health / Pharmacy Delivery', '{621610}', '{home health,pharmacy,medication,delivery}', '#059669', 3),
  ('vitalx', 'NEMT', '{485991,485999}', '{nemt,non-emergency,transport,patient,medical transport}', '#7C3AED', 4),
  ('vitalx', 'DNA / Drug Testing', '{}', '{dna,drug test,paternity,toxicology,collection}', '#D97706', 5),
  ('vitalx', 'General Support', '{561990}', '{support,services,general}', '#6B7280', 6);

-- Seed IronHouse categories (same as Exousia)
INSERT INTO service_categories (entity, name, naics_codes, keywords, color, sort_order) VALUES
  ('ironhouse', 'Janitorial Services', '{561720}', '{janitorial,cleaning,custodial,sanitation}', '#06A59A', 1),
  ('ironhouse', 'Landscaping', '{561730}', '{landscaping,grounds,lawn,mowing,irrigation}', '#059669', 2),
  ('ironhouse', 'Facilities Support', '{561210}', '{facilities,building,maintenance,hvac,plumbing}', '#2563EB', 3),
  ('ironhouse', 'Consulting / Advisory', '{541614,541990}', '{consulting,advisory,compliance}', '#7C3AED', 4),
  ('ironhouse', 'Administrative', '{561110}', '{administrative,management,office,support}', '#D97706', 5),
  ('ironhouse', 'Construction Adjacent', '{237310}', '{construction,highway,road,infrastructure}', '#DC2626', 6);
-- Migration 003: Government Leads
CREATE TABLE gov_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type NOT NULL,

  -- Opportunity Info
  title text NOT NULL,
  solicitation_number text,
  notice_id text,
  description text,

  -- Classification
  status lead_status DEFAULT 'new',
  service_category_id uuid REFERENCES service_categories(id),
  naics_code text,
  set_aside set_aside_type DEFAULT 'none',
  contract_type contract_type,
  source source_type DEFAULT 'manual',

  -- Agency
  agency text,
  sub_agency text,
  office text,
  place_of_performance text,

  -- Dates
  posted_date date,
  response_deadline timestamptz,
  archive_date date,

  -- Financials
  estimated_value numeric(15,2),
  award_amount numeric(15,2),

  -- USASpending Intelligence
  previous_award_total numeric(15,2),
  incumbent_contractor text,
  award_history_notes text,

  -- Scoring
  fit_score int DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),

  -- Assignment
  proposal_lead text,

  -- Links
  sam_gov_url text,
  solicitation_url text,
  drive_folder_url text,

  -- Notes
  notes text,
  bid_decision_notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_gov_leads_updated_at
  BEFORE UPDATE ON gov_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_gov_leads_entity ON gov_leads(entity);
CREATE INDEX idx_gov_leads_status ON gov_leads(status);
CREATE INDEX idx_gov_leads_category ON gov_leads(service_category_id);
CREATE INDEX idx_gov_leads_deadline ON gov_leads(response_deadline);
CREATE INDEX idx_gov_leads_source ON gov_leads(source);

ALTER TABLE gov_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON gov_leads
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration 004: Commercial Leads (VitalX only)
CREATE TABLE commercial_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type DEFAULT 'vitalx',

  -- Organization Info
  organization_name text NOT NULL,
  contact_name text,
  contact_title text,
  contact_email text,
  contact_phone text,
  website text,

  -- Classification
  status commercial_status DEFAULT 'prospect',
  service_category text,

  -- Deal Info
  estimated_annual_value numeric(15,2),
  contract_length_months int,

  -- Outreach Tracking
  last_contact_date date,
  next_follow_up date,
  outreach_method text,

  -- Contract Details (when won)
  contract_start_date date,
  contract_end_date date,
  contract_value numeric(15,2),

  -- Links
  proposal_url text,
  drive_folder_url text,

  -- Notes
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_commercial_leads_updated_at
  BEFORE UPDATE ON commercial_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_commercial_leads_status ON commercial_leads(status);
CREATE INDEX idx_commercial_leads_follow_up ON commercial_leads(next_follow_up);

ALTER TABLE commercial_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON commercial_leads
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration 005: Subcontractors
CREATE TABLE subcontractors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Company Info
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,

  -- Certifications
  uei text,
  cage_code text,
  certifications text[] DEFAULT '{}',
  naics_codes text[] DEFAULT '{}',
  set_asides text[] DEFAULT '{}',

  -- Capabilities
  services_offered text,
  geographic_coverage text,

  -- Relationship
  entities_associated entity_type[] DEFAULT '{}',
  teaming_agreement_status text DEFAULT 'none',
  teaming_agreement_url text,

  -- Notes
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_subcontractors_updated_at
  BEFORE UPDATE ON subcontractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON subcontractors
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration 006: Master Contacts
CREATE TABLE contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Person Info
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  organization text,
  email text,
  phone text,
  linkedin text,

  -- Classification
  contact_type text DEFAULT 'general',
  entities_associated entity_type[] DEFAULT '{}',

  -- Interaction
  last_contact_date date,
  next_follow_up date,
  relationship_notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON contacts
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration 007: Interaction Log
CREATE TABLE interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- References
  entity entity_type,
  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE SET NULL,
  commercial_lead_id uuid REFERENCES commercial_leads(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE SET NULL,

  -- Interaction Details
  interaction_date date DEFAULT CURRENT_DATE,
  interaction_type text,
  subject text,
  notes text,
  follow_up_date date,
  follow_up_action text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON interactions
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration 008: Compliance Checklist
CREATE TABLE compliance_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE CASCADE,

  item_name text NOT NULL,
  is_complete boolean DEFAULT false,
  due_date date,
  assigned_to text,
  notes text,
  sort_order int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON compliance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON compliance_items
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration 009: Pricing Records
CREATE TABLE pricing_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  entity entity_type NOT NULL,
  pricing_type text NOT NULL,

  -- Reference
  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE SET NULL,
  commercial_lead_id uuid REFERENCES commercial_leads(id) ON DELETE SET NULL,

  -- Pricing Data (JSONB for flexibility)
  pricing_data jsonb NOT NULL DEFAULT '{}',

  -- Summary
  total_price numeric(15,2),
  total_cost numeric(15,2),
  margin_percent numeric(5,2),

  -- Metadata
  version int DEFAULT 1,
  is_submitted boolean DEFAULT false,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_pricing_records_updated_at
  BEFORE UPDATE ON pricing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pricing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON pricing_records
  FOR ALL USING (auth.role() = 'authenticated');
