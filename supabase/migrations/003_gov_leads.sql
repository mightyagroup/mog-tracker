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
