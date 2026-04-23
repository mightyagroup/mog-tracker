-- Migration 039: Align proposal tables with the intake UI schema.
-- The intake wizard writes a flatter shape than migration 038 planned; add the
-- missing columns so save()/create() no longer fail with "column not found in
-- schema cache".

-- ========================================================================
-- 1. proposals — add intake/drafting/pricing/teaming columns the UI writes
-- ========================================================================

-- assigned_va was uuid; UI treats it as free-text (email or initials)
ALTER TABLE proposals DROP COLUMN IF EXISTS assigned_va;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS assigned_va text;

-- Intake fields (denormalized from gov_leads for point-in-time snapshot)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS intake_complete               boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_number           text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS agency                        text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS naics_code                    text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS set_aside                     text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS place_of_performance          text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS incumbent_contractor          text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contracting_officer_name      text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contracting_officer_email     text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS period_of_performance         text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS page_limit                    text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS font_requirement              text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS evaluation_factors            text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS technical_volume_required     boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS past_performance_count        int DEFAULT 3;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pricing_format                text;

-- Narrative + pricing + teaming storage
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS narrative_draft               text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pricing_data                  jsonb DEFAULT '{}'::jsonb;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pricing_total                 numeric(15,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS teaming_partners              jsonb DEFAULT '[]'::jsonb;

-- Validator cache
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_validation_status        text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS fatal_flaw_count              int DEFAULT 0;

-- Per-entity Drive connection (overrides the global MOG Drive)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS drive_folder_url              text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS drive_folder_id               text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS drive_entity_account          text;

-- Clean solicitation summary (replaces the raw API excerpt in notes)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_summary          text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_services         text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_sub_needs        text;

CREATE INDEX IF NOT EXISTS idx_proposals_agency         ON proposals(agency);
CREATE INDEX IF NOT EXISTS idx_proposals_naics          ON proposals(naics_code);
CREATE INDEX IF NOT EXISTS idx_proposals_intake         ON proposals(intake_complete);

-- ========================================================================
-- 2. proposal_compliance_items — add the columns the matrix UI writes
-- ========================================================================
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS section            text;
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS requirement        text;
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS source_reference   text;
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS evidence_location  text;
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS owner              text;
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS due_date           date;
ALTER TABLE proposal_compliance_items ADD COLUMN IF NOT EXISTS sort_order         int DEFAULT 0;

-- Backfill new columns from 038's original names where possible
UPDATE proposal_compliance_items SET section          = source_section    WHERE section IS NULL AND source_section IS NOT NULL;
UPDATE proposal_compliance_items SET requirement      = requirement_text  WHERE requirement IS NULL AND requirement_text IS NOT NULL;

-- Make requirement_text nullable (so inserts from the new UI work without it)
ALTER TABLE proposal_compliance_items ALTER COLUMN source_section   DROP NOT NULL;
ALTER TABLE proposal_compliance_items ALTER COLUMN requirement_text DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposal_compliance_items_section ON proposal_compliance_items(section);

-- ========================================================================
-- 3. proposal_deliverables — add columns the package/DOCX route writes
-- ========================================================================
ALTER TABLE proposal_deliverables ADD COLUMN IF NOT EXISTS deliverable_type  text;
ALTER TABLE proposal_deliverables ADD COLUMN IF NOT EXISTS manifest_json     jsonb DEFAULT '{}'::jsonb;
ALTER TABLE proposal_deliverables ADD COLUMN IF NOT EXISTS status            text DEFAULT 'draft';

-- Backfill deliverable_type from kind
UPDATE proposal_deliverables SET deliverable_type = kind WHERE deliverable_type IS NULL AND kind IS NOT NULL;

-- Relax required columns
ALTER TABLE proposal_deliverables ALTER COLUMN kind DROP NOT NULL;
ALTER TABLE proposal_deliverables ALTER COLUMN name DROP NOT NULL;

-- ========================================================================
-- 4. proposal_retros — add columns the retrospective UI writes
-- ========================================================================
ALTER TABLE proposal_retros ADD COLUMN IF NOT EXISTS outcome      text;
ALTER TABLE proposal_retros ADD COLUMN IF NOT EXISTS went_well    text;
ALTER TABLE proposal_retros ADD COLUMN IF NOT EXISTS went_poorly  text;
ALTER TABLE proposal_retros ADD COLUMN IF NOT EXISTS to_repeat    text;
ALTER TABLE proposal_retros ADD COLUMN IF NOT EXISTS to_change    text;
ALTER TABLE proposal_retros ADD COLUMN IF NOT EXISTS lessons      text;

-- ========================================================================
-- 5. Per-entity Google Drive configuration
-- ========================================================================
CREATE TABLE IF NOT EXISTS entity_drive_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type NOT NULL UNIQUE,
  root_folder_id text,
  root_folder_url text,
  service_account_email text,
  service_account_json_secret_name text,
  shared_drive_id text,
  default_proposal_subfolder text DEFAULT 'Proposals',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_entity_drive_configs_updated_at ON entity_drive_configs;
CREATE TRIGGER update_entity_drive_configs_updated_at
  BEFORE UPDATE ON entity_drive_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE entity_drive_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read entity_drive_configs" ON entity_drive_configs;
CREATE POLICY "Authenticated users read entity_drive_configs" ON entity_drive_configs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins write entity_drive_configs" ON entity_drive_configs;
CREATE POLICY "Admins write entity_drive_configs" ON entity_drive_configs
  FOR ALL USING (user_can_edit(auth.uid()))
  WITH CHECK (user_can_edit(auth.uid()));

INSERT INTO entity_drive_configs (entity, default_proposal_subfolder)
VALUES
  ('exousia',   'Proposals'),
  ('vitalx',    'Proposals'),
  ('ironhouse', 'Proposals')
ON CONFLICT (entity) DO NOTHING;

-- ========================================================================
-- 6. Repair UTF-8 mojibake in existing data
-- ========================================================================
UPDATE gov_leads SET
  title             = replace(replace(replace(replace(replace(replace(replace(replace(title,             'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE title LIKE '%â%' OR title LIKE '%Â%';
UPDATE gov_leads SET
  description       = replace(replace(replace(replace(replace(replace(replace(replace(description,       'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE description LIKE '%â%' OR description LIKE '%Â%';
UPDATE gov_leads SET
  agency            = replace(replace(replace(replace(replace(replace(replace(replace(agency,            'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE agency LIKE '%â%' OR agency LIKE '%Â%';
UPDATE gov_leads SET
  sub_agency        = replace(replace(replace(replace(replace(replace(replace(replace(sub_agency,        'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE sub_agency LIKE '%â%' OR sub_agency LIKE '%Â%';
UPDATE gov_leads SET
  office            = replace(replace(replace(replace(replace(replace(replace(replace(office,            'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE office LIKE '%â%' OR office LIKE '%Â%';
UPDATE gov_leads SET
  place_of_performance = replace(replace(replace(replace(replace(replace(replace(replace(place_of_performance,'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE place_of_performance LIKE '%â%' OR place_of_performance LIKE '%Â%';
UPDATE gov_leads SET
  proposal_lead     = replace(replace(replace(replace(replace(replace(replace(replace(proposal_lead,     'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE proposal_lead LIKE '%â%' OR proposal_lead LIKE '%Â%';
UPDATE gov_leads SET
  notes             = replace(replace(replace(replace(replace(replace(replace(replace(notes,             'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','') WHERE notes LIKE '%â%' OR notes LIKE '%Â%';

UPDATE interactions SET notes =
  replace(replace(replace(replace(replace(replace(replace(replace(notes, 'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','')
  WHERE notes LIKE '%â%' OR notes LIKE '%Â%';

UPDATE commercial_leads SET notes =
  replace(replace(replace(replace(replace(replace(replace(replace(notes, 'â€™','''' ), 'â€˜',''''), 'â€œ','"'), 'â€','"'), 'â€"','-'), 'â€"','-'), 'Â ',' '), 'Â','')
  WHERE notes LIKE '%â%' OR notes LIKE '%Â%';
