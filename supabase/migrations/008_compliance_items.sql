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
