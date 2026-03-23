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
