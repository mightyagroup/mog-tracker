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
