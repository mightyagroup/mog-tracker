-- Migration 029: Deep contact info fields for commercial_leads
-- Adds detailed contact fields, office address, and service summary notes

-- Contact depth fields
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS contact_department text;
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS contact_direct_phone text;
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS contact_linkedin text;

-- Office / facility address
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS office_name text;
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS office_address text;
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS office_city text;
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS office_state text;
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS office_zip text;

-- Service summary and important notes (separate from general notes)
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS service_summary text;
