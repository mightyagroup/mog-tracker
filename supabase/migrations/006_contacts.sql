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
