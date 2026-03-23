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
