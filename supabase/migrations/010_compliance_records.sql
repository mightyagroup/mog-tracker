-- Migration 010: Compliance Records (Registrations, Certifications, Subscriptions)

CREATE TABLE compliance_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Classification
  record_type text NOT NULL CHECK (record_type IN ('registration', 'certification', 'subscription')),
  entity entity_type NOT NULL,

  -- Core fields (all record types)
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'cancelled', 'pending')),
  expiration_date date,
  notes text,

  -- Subscription-specific fields
  is_recurring boolean DEFAULT false,
  billing_cycle text CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', NULL)),
  monthly_cost numeric(10,2),
  auto_renew boolean DEFAULT false,
  payment_method text,
  cancellation_deadline date,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_compliance_records_updated_at
  BEFORE UPDATE ON compliance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_compliance_records_entity ON compliance_records(entity);
CREATE INDEX idx_compliance_records_type ON compliance_records(record_type);
CREATE INDEX idx_compliance_records_expiration ON compliance_records(expiration_date);

ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON compliance_records
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed: Registrations & Certifications
INSERT INTO compliance_records (record_type, entity, name, status, expiration_date, notes) VALUES
  -- Exousia
  ('registration', 'exousia', 'SAM.gov Registration', 'active', NULL, 'UEI: XNZ2KYQYK566 · CAGE: 0ENQ3. Renews annually. Must be active to bid on federal contracts.'),
  ('certification', 'exousia', 'WOSB Certification (SBA)', 'active', NULL, 'Women-Owned Small Business. Must be maintained via SBA WOSB program.'),
  ('certification', 'exousia', 'EDWOSB Certification (SBA)', 'active', NULL, 'Economically Disadvantaged WOSB. Higher priority set-aside tier.'),
  ('registration', 'exousia', 'Virginia SWaM Certification', 'active', NULL, 'Small, Women-owned, Minority-owned Business certification for VA state contracts.'),
  ('registration', 'exousia', 'eVA Vendor Registration', 'active', NULL, 'Virginia eProcurement portal. Required for VA state government contracting.'),

  -- VitalX
  ('registration', 'vitalx', 'SAM.gov Registration', 'pending', NULL, 'VitalX SAM.gov registration not yet completed. Required before federal bidding.'),
  ('certification', 'vitalx', 'HIPAA Compliance', 'active', NULL, 'HIPAA-compliant operations for healthcare logistics. Review annually.'),

  -- IronHouse
  ('registration', 'ironhouse', 'SAM.gov Registration', 'active', NULL, 'IronHouse SAM.gov registration. Verify UEI is current.'),
  ('registration', 'ironhouse', 'Virginia SWaM Certification', 'active', NULL, 'SWaM certification for VA state janitorial and landscaping contracts.'),
  ('registration', 'ironhouse', 'eVA Vendor Registration', 'active', NULL, 'Virginia eProcurement portal registration for IronHouse.');

-- Seed: Subscriptions & Tools
INSERT INTO compliance_records (record_type, entity, name, status, is_recurring, billing_cycle, monthly_cost, auto_renew, payment_method, notes) VALUES
  ('subscription', 'exousia', 'GovWin IQ', 'active', true, 'annual', 225.00, true, 'Credit Card', 'Federal opportunity intelligence. Exousia primary user.'),
  ('subscription', 'exousia', 'DeepRFP', 'active', true, 'monthly', 49.00, true, 'Credit Card', 'AI-assisted proposal writing tool.'),
  ('subscription', 'vitalx', 'Tookan (Dispatch)', 'active', true, 'monthly', 99.00, true, 'Credit Card', 'Driver dispatch and route optimization for VitalX courier ops.'),
  ('subscription', 'exousia', 'Google Workspace', 'active', true, 'monthly', 30.00, true, 'Credit Card', 'Shared across MOG entities. Business Starter plan.');
