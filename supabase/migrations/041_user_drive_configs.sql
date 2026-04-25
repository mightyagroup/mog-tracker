-- Migration 041: Per-user Drive configs
-- Each user (Ella, VA, future team) connects their OWN Drive folder per entity.
-- Lookup priority is user-first, falling back to entity-level entity_drive_configs.

CREATE TABLE IF NOT EXISTS user_drive_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity entity_type NOT NULL,
  root_folder_id text,
  root_folder_url text,
  user_oauth_refresh_token text,
  user_oauth_access_token text,
  user_oauth_expires_at timestamptz,
  user_oauth_email text,
  test_connection_ok boolean,
  test_connection_at timestamptz,
  test_connection_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, entity)
);

DROP TRIGGER IF EXISTS update_user_drive_configs_updated_at ON user_drive_configs;
CREATE TRIGGER update_user_drive_configs_updated_at
  BEFORE UPDATE ON user_drive_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_drive_configs_user ON user_drive_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_drive_configs_entity ON user_drive_configs(entity);

ALTER TABLE user_drive_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own drive config" ON user_drive_configs;
CREATE POLICY "Users read own drive config" ON user_drive_configs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users write own drive config" ON user_drive_configs;
CREATE POLICY "Users write own drive config" ON user_drive_configs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access user_drive_configs" ON user_drive_configs;
CREATE POLICY "Service role full access user_drive_configs" ON user_drive_configs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
