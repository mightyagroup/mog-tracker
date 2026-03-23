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
