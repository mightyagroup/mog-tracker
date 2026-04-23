-- Migration 038: Proposal Platform
-- Creates the tables that power the dedicated /proposals section.

CREATE TABLE IF NOT EXISTS proposals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gov_lead_id uuid NOT NULL REFERENCES gov_leads(id) ON DELETE CASCADE,
  entity entity_type NOT NULL,
  intake_complete boolean DEFAULT false,
  submission_method text,
  submission_email text,
  submission_portal_url text,
  submission_deadline timestamptz,
  submission_timezone text,
  proposal_address text DEFAULT 'physical',
  amendments_checked_at timestamptz,
  amendment_count int DEFAULT 0,
  amendments_incorporated boolean DEFAULT false,
  incumbent_researched_at timestamptz,
  incumbent_name text,
  incumbent_prior_value numeric(15,2),
  incumbent_notes text,
  drive_folder_url text,
  status text DEFAULT 'intake',
  assigned_va uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_validated_at timestamptz,
  last_validation_status text,
  fatal_flaw_count int DEFAULT 0,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_confirmation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (gov_lead_id)
);

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_proposals_entity         ON proposals(entity);
CREATE INDEX IF NOT EXISTS idx_proposals_status         ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_deadline       ON proposals(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_proposals_gov_lead       ON proposals(gov_lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_assigned_va    ON proposals(assigned_va);
CREATE INDEX IF NOT EXISTS idx_proposals_archived_at    ON proposals(archived_at);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read proposals" ON proposals;
CREATE POLICY "Authenticated users read proposals" ON proposals FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Editors can write proposals" ON proposals;
CREATE POLICY "Editors can write proposals" ON proposals FOR ALL USING (user_can_edit(auth.uid())) WITH CHECK (user_can_edit(auth.uid()));

CREATE TABLE IF NOT EXISTS proposal_compliance_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  source_section text NOT NULL,
  requirement_text text NOT NULL,
  requirement_type text,
  reference_page int,
  status text DEFAULT 'pending',
  owner_role text,
  owner_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fulfillment_doc_url text,
  fulfillment_doc_name text,
  severity text DEFAULT 'major',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_proposal_compliance_items_updated_at ON proposal_compliance_items;
CREATE TRIGGER update_proposal_compliance_items_updated_at
  BEFORE UPDATE ON proposal_compliance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_proposal_compliance_items_prop   ON proposal_compliance_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_compliance_items_status ON proposal_compliance_items(status);
ALTER TABLE proposal_compliance_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read proposal_compliance_items" ON proposal_compliance_items;
CREATE POLICY "Authenticated users read proposal_compliance_items" ON proposal_compliance_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Editors write proposal_compliance_items" ON proposal_compliance_items;
CREATE POLICY "Editors write proposal_compliance_items" ON proposal_compliance_items FOR ALL USING (user_can_edit(auth.uid())) WITH CHECK (user_can_edit(auth.uid()));

CREATE TABLE IF NOT EXISTS proposal_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  review_type text NOT NULL,
  review_pass text,
  overall_status text,
  fatal_flaws_count int DEFAULT 0,
  major_gaps_count int DEFAULT 0,
  minor_gaps_count int DEFAULT 0,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied_fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewer_type text,
  reviewer_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  model_version text,
  tokens_used int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_proposal_reviews_updated_at ON proposal_reviews;
CREATE TRIGGER update_proposal_reviews_updated_at
  BEFORE UPDATE ON proposal_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_proposal_reviews_prop    ON proposal_reviews(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_reviews_type    ON proposal_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_proposal_reviews_created ON proposal_reviews(created_at);
ALTER TABLE proposal_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read proposal_reviews" ON proposal_reviews;
CREATE POLICY "Authenticated users read proposal_reviews" ON proposal_reviews FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Service role writes proposal_reviews" ON proposal_reviews;
CREATE POLICY "Service role writes proposal_reviews" ON proposal_reviews FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS proposal_deliverables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  drive_file_id text,
  drive_url text,
  format text,
  required_format text,
  pages int,
  page_limit int,
  humanized boolean DEFAULT false,
  humanizer_findings jsonb DEFAULT '[]'::jsonb,
  ready_for_pink_team boolean DEFAULT false,
  pink_team_passed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_proposal_deliverables_updated_at ON proposal_deliverables;
CREATE TRIGGER update_proposal_deliverables_updated_at
  BEFORE UPDATE ON proposal_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_proposal_deliverables_prop ON proposal_deliverables(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_deliverables_kind ON proposal_deliverables(kind);
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read proposal_deliverables" ON proposal_deliverables;
CREATE POLICY "Authenticated users read proposal_deliverables" ON proposal_deliverables FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Editors write proposal_deliverables" ON proposal_deliverables;
CREATE POLICY "Editors write proposal_deliverables" ON proposal_deliverables FOR ALL USING (user_can_edit(auth.uid())) WITH CHECK (user_can_edit(auth.uid()));

CREATE TABLE IF NOT EXISTS proposal_retros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  what_went_right text,
  what_broke text,
  amendments_caught boolean,
  amendments_missed_count int DEFAULT 0,
  time_to_submit_hours numeric(6,2),
  time_target_hours numeric(6,2),
  improvement_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_proposal_retros_updated_at ON proposal_retros;
CREATE TRIGGER update_proposal_retros_updated_at
  BEFORE UPDATE ON proposal_retros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_proposal_retros_prop ON proposal_retros(proposal_id);
ALTER TABLE proposal_retros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read proposal_retros" ON proposal_retros;
CREATE POLICY "Authenticated users read proposal_retros" ON proposal_retros FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Editors write proposal_retros" ON proposal_retros;
CREATE POLICY "Editors write proposal_retros" ON proposal_retros FOR ALL USING (user_can_edit(auth.uid())) WITH CHECK (user_can_edit(auth.uid()));

ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS rate_card      jsonb DEFAULT '{}'::jsonb;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS insurance      jsonb DEFAULT '{}'::jsonb;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS license_expiry jsonb DEFAULT '{}'::jsonb;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS equipment      text[];
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS herbicides     text[];
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS pesticide_license text;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS teaming_template_docx_url text;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS loi_signed_at timestamptz;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS loi_url text;

CREATE TABLE IF NOT EXISTS agency_quirks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency text NOT NULL,
  sub_agency text,
  submission_method_preference text,
  known_quirks jsonb DEFAULT '[]'::jsonb,
  last_bid_id uuid REFERENCES gov_leads(id) ON DELETE SET NULL,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agency, sub_agency)
);

DROP TRIGGER IF EXISTS update_agency_quirks_updated_at ON agency_quirks;
CREATE TRIGGER update_agency_quirks_updated_at
  BEFORE UPDATE ON agency_quirks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agency_quirks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read agency_quirks" ON agency_quirks;
CREATE POLICY "Authenticated users read agency_quirks" ON agency_quirks FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Editors write agency_quirks" ON agency_quirks;
CREATE POLICY "Editors write agency_quirks" ON agency_quirks FOR ALL USING (user_can_edit(auth.uid())) WITH CHECK (user_can_edit(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON proposals                  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_compliance_items  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_reviews           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_deliverables      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_retros            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_quirks              TO service_role;

GRANT SELECT ON proposals                  TO authenticated;
GRANT SELECT ON proposal_compliance_items  TO authenticated;
GRANT SELECT ON proposal_reviews           TO authenticated;
GRANT SELECT ON proposal_deliverables      TO authenticated;
GRANT SELECT ON proposal_retros            TO authenticated;
GRANT SELECT ON agency_quirks              TO authenticated;
