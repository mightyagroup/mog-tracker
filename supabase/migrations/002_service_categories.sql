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
