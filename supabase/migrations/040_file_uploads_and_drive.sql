-- Migration 040: Support universal file uploads + per-entity Drive credentials.
-- Already applied to production. Committed to repo for reference.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_file_url    text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_file_name   text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS solicitation_raw_text    text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS incumbent_search_keys    text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS incumbent_award_history  jsonb DEFAULT '[]'::jsonb;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS amendments_latest_check  timestamptz;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS amendments_detected      jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS subcontractor_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE SET NULL,
  file_url text,
  file_name text,
  mime_type text,
  raw_text text,
  extracted_clins jsonb DEFAULT '[]'::jsonb,
  total_quote numeric(15,2),
  margin_notes text,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_subcontractor_quotes_updated_at ON subcontractor_quotes;
CREATE TRIGGER update_subcontractor_quotes_updated_at
  BEFORE UPDATE ON subcontractor_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_subcontractor_quotes_prop ON subcontractor_quotes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_quotes_sub  ON subcontractor_quotes(subcontractor_id);

ALTER TABLE subcontractor_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read subcontractor_quotes" ON subcontractor_quotes;
CREATE POLICY "Authenticated read subcontractor_quotes" ON subcontractor_quotes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Editors write subcontractor_quotes" ON subcontractor_quotes;
CREATE POLICY "Editors write subcontractor_quotes" ON subcontractor_quotes
  FOR ALL USING (user_can_edit(auth.uid()))
  WITH CHECK (user_can_edit(auth.uid()));

ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS service_account_json      jsonb;
ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS user_oauth_refresh_token  text;
ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS user_oauth_access_token   text;
ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS user_oauth_expires_at     timestamptz;
ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS test_connection_ok        boolean;
ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS test_connection_at        timestamptz;
ALTER TABLE entity_drive_configs ADD COLUMN IF NOT EXISTS test_connection_error     text;

NOTIFY pgrst, 'reload schema';
