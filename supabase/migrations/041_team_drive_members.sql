-- 041 — Team Drive members
--
-- Per the issue Ella raised on 2026-04-26: every Drive folder we create
-- (entity root, per-bid, anything) ends up in the service-account's account.
-- Without an explicit share, Ella (info@exousias.com) and her VAs hit
-- Google's "Request access" wall when they click "Drive Folder" in the app.
--
-- This table is the single source of truth for "who gets Editor access to
-- every folder we create, automatically." The Drive helper layer reads this
-- table after every createFolder / createBidPackageFolder call and grants
-- permissions accordingly. Adding a new VA email here also kicks off a
-- backfill across all existing gov_lead Drive folders.

CREATE TABLE IF NOT EXISTS team_drive_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'editor', -- editor | commenter | reader
  -- Empty array = access to all entities. Otherwise only listed entities.
  entities entity_type[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT team_drive_members_email_lower_unique UNIQUE (email),
  CONSTRAINT team_drive_members_role_check CHECK (role IN ('editor', 'commenter', 'reader'))
);

DROP TRIGGER IF EXISTS update_team_drive_members_updated_at ON team_drive_members;
CREATE TRIGGER update_team_drive_members_updated_at
  BEFORE UPDATE ON team_drive_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_team_drive_members_active ON team_drive_members(active);

ALTER TABLE team_drive_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read team_drive_members" ON team_drive_members;
CREATE POLICY "Authenticated read team_drive_members" ON team_drive_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can write. Admin check uses the same helper as RBAC.
DROP POLICY IF EXISTS "Admins write team_drive_members" ON team_drive_members;
CREATE POLICY "Admins write team_drive_members" ON team_drive_members
  FOR ALL USING (
    coalesce((auth.jwt() -> 'app_metadata' -> 'roles' ? 'admin'), false)
  )
  WITH CHECK (
    coalesce((auth.jwt() -> 'app_metadata' -> 'roles' ? 'admin'), false)
  );

-- Seed Ella's primary admin emails so the system has a working default
-- the moment this migration runs. New folders will auto-share with these
-- without any further setup. Ella can add VA emails via the admin UI.
INSERT INTO team_drive_members (email, display_name, role, entities, active, notes) VALUES
  ('admin@mightyoakgroup.com', 'MOG Admin (primary)',         'editor', '{}', true, 'Default admin — gets every folder.'),
  ('info@exousias.com',         'Exousia public/inbox',        'editor', '{}', true, 'Email Ella uses in browser.'),
  ('admin@exousiaofficial.com', 'Exousia SAM admin',           'editor', '{exousia}', true, 'SAM.gov registered email.'),
  ('info@thevitalx.com',        'VitalX public',               'editor', '{vitalx}',  true, 'VitalX inbox.'),
  ('may.opoku@gmail.com',       'Emmanuela personal',          'editor', '{}', true, 'Backup admin email.')
ON CONFLICT (email) DO NOTHING;

-- Track which folders we've already shared with which members so the
-- backfill is idempotent and we don't churn the Drive permissions API.
CREATE TABLE IF NOT EXISTS drive_folder_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id text NOT NULL,
  email text NOT NULL,
  permission_id text,                  -- returned by Drive API on create
  role text NOT NULL DEFAULT 'editor',
  granted_at timestamptz DEFAULT now(),
  CONSTRAINT drive_folder_shares_unique UNIQUE (folder_id, email)
);

CREATE INDEX IF NOT EXISTS idx_drive_folder_shares_folder ON drive_folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_drive_folder_shares_email  ON drive_folder_shares(email);

ALTER TABLE drive_folder_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read drive_folder_shares" ON drive_folder_shares;
CREATE POLICY "Authenticated read drive_folder_shares" ON drive_folder_shares
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service write drive_folder_shares" ON drive_folder_shares;
CREATE POLICY "Service write drive_folder_shares" ON drive_folder_shares
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
