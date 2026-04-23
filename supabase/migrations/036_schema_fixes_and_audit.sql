-- Migration 036: Critical schema fixes
-- Adds missing archived_at column (soft-delete was broken in prod)
-- Adds amendment review columns (no way to unflag reviewed amendments)
-- Creates feed_runs table (no visibility into cron success/failure)
-- Creates deleted_audit table (30-day recovery window for hard deletes)
-- Adds auto_archive_stale_leads function (nightly cleanup of overdue leads)

-- ================================================================
-- 1. Soft-delete column (this was referenced in code but never created)
-- ================================================================
ALTER TABLE gov_leads          ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE commercial_leads   ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE contacts           ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE subcontractors     ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_gov_leads_archived_at        ON gov_leads(archived_at);
CREATE INDEX IF NOT EXISTS idx_commercial_leads_archived_at ON commercial_leads(archived_at);
CREATE INDEX IF NOT EXISTS idx_contacts_archived_at         ON contacts(archived_at);
CREATE INDEX IF NOT EXISTS idx_subcontractors_archived_at   ON subcontractors(archived_at);

-- ================================================================
-- 2. Amendment review columns
--    amendment_count already exists (migration 028).
--    We track which amendment version the user last reviewed so the
--    flag auto-reappears when a NEW amendment drops.
-- ================================================================
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS last_reviewed_amendment_count int DEFAULT 0;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS amendment_reviewed_at         timestamptz;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS amendment_reviewed_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS amendment_review_notes        text;

-- Convenience view: true when there's an unreviewed amendment
CREATE OR REPLACE FUNCTION has_unreviewed_amendment(amendment_count int, last_reviewed_amendment_count int)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(amendment_count, 0) > COALESCE(last_reviewed_amendment_count, 0)
$$;

-- ================================================================
-- 3. Feed runs log — one row per cron execution so we can see health
-- ================================================================
CREATE TABLE IF NOT EXISTS feed_runs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_name       text NOT NULL,              -- 'sam_gov', 'eva', 'emma', 'purge_archived', 'auto_archive', 'daily_digest'
  started_at      timestamptz DEFAULT now(),
  finished_at     timestamptz,
  status          text NOT NULL DEFAULT 'running',  -- 'running', 'success', 'partial', 'failed'
  trigger_source  text,                       -- 'vercel_cron', 'github_action', 'manual'
  fetched_count   int DEFAULT 0,
  inserted_count  int DEFAULT 0,
  updated_count   int DEFAULT 0,
  skipped_count   int DEFAULT 0,
  amendment_count int DEFAULT 0,
  error_count     int DEFAULT 0,
  errors          jsonb DEFAULT '[]'::jsonb,
  run_notes       text,
  duration_ms     int,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_runs_feed_started ON feed_runs(feed_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_runs_status       ON feed_runs(status);

ALTER TABLE feed_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read feed_runs" ON feed_runs;
CREATE POLICY "Admins can read feed_runs" ON feed_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role writes feed_runs" ON feed_runs;
CREATE POLICY "Service role writes feed_runs" ON feed_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 4. Deleted audit — 30-day recovery window for any hard delete
-- ================================================================
CREATE TABLE IF NOT EXISTS deleted_audit (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name     text NOT NULL,
  record_id      uuid NOT NULL,
  deleted_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at     timestamptz DEFAULT now(),
  delete_reason  text,                -- 'manual', 'auto_purge_7d', 'auto_stale_deadline', 'admin_bulk'
  snapshot       jsonb NOT NULL,      -- full row as it existed before delete
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deleted_audit_table_record ON deleted_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deleted_audit_deleted_at   ON deleted_audit(deleted_at);

ALTER TABLE deleted_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read deleted_audit" ON deleted_audit;
CREATE POLICY "Admins can read deleted_audit" ON deleted_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role writes deleted_audit" ON deleted_audit;
CREATE POLICY "Service role writes deleted_audit" ON deleted_audit
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-purge audit rows older than 30 days (recovery window expired)
CREATE OR REPLACE FUNCTION purge_deleted_audit_older_than_30d()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count int;
BEGIN
  WITH d AS (
    DELETE FROM deleted_audit
    WHERE deleted_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM d;
  RETURN deleted_count;
END; $$;

-- ================================================================
-- 5. Auto-archive stale overdue leads
--    Runs daily. Archives gov_leads where:
--      - response_deadline has passed
--      - status is NOT one of the valuable outcomes
--      - not already archived
--    Does NOT touch leads that were acted on (active_bid, submitted, awarded).
-- ================================================================
CREATE OR REPLACE FUNCTION auto_archive_stale_leads()
RETURNS TABLE(archived_count int, ids uuid[]) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE archived_ids uuid[];
BEGIN
  WITH updated AS (
    UPDATE gov_leads
    SET archived_at = now()
    WHERE archived_at IS NULL
      AND response_deadline IS NOT NULL
      AND response_deadline < now()
      AND status NOT IN ('active_bid', 'submitted', 'awarded')
    RETURNING id
  )
  SELECT array_agg(id) INTO archived_ids FROM updated;

  RETURN QUERY SELECT COALESCE(array_length(archived_ids, 1), 0), COALESCE(archived_ids, ARRAY[]::uuid[]);
END; $$;

-- ================================================================
-- 6. Hard-delete archived leads older than 7 days
--    Writes to deleted_audit before delete so nothing is unrecoverable
--    for 30 days.
-- ================================================================
CREATE OR REPLACE FUNCTION purge_archived_leads_7d()
RETURNS TABLE(gov_deleted int, commercial_deleted int) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  gov_count int;
  com_count int;
  cutoff timestamptz := now() - interval '7 days';
BEGIN
  -- Snapshot gov_leads to audit, then delete
  WITH snapshot AS (
    INSERT INTO deleted_audit (table_name, record_id, deleted_by, delete_reason, snapshot)
    SELECT 'gov_leads', id, NULL, 'auto_purge_7d', to_jsonb(gov_leads.*)
    FROM gov_leads
    WHERE archived_at IS NOT NULL AND archived_at < cutoff
    RETURNING record_id
  ),
  deleted AS (
    DELETE FROM gov_leads WHERE id IN (SELECT record_id FROM snapshot) RETURNING 1
  )
  SELECT count(*) INTO gov_count FROM deleted;

  -- Same for commercial_leads
  WITH snapshot AS (
    INSERT INTO deleted_audit (table_name, record_id, deleted_by, delete_reason, snapshot)
    SELECT 'commercial_leads', id, NULL, 'auto_purge_7d', to_jsonb(commercial_leads.*)
    FROM commercial_leads
    WHERE archived_at IS NOT NULL AND archived_at < cutoff
    RETURNING record_id
  ),
  deleted AS (
    DELETE FROM commercial_leads WHERE id IN (SELECT record_id FROM snapshot) RETURNING 1
  )
  SELECT count(*) INTO com_count FROM deleted;

  RETURN QUERY SELECT gov_count, com_count;
END; $$;

-- ================================================================
-- 7. Expand role check to support VA roles for least-privilege
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_type = 'CHECK' AND constraint_name = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'manager', 'viewer', 'va_entity', 'va_readonly'));

-- Update user_can_edit helper to deny va_readonly writes.
-- Keep parameter name "p_user_id" to match migrations 033/035 so existing RLS
-- policies that reference this function keep working (CREATE OR REPLACE cannot
-- change parameter names, and DROP CASCADE would take the policies with it).
CREATE OR REPLACE FUNCTION user_can_edit(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_active AND role IN ('admin', 'manager', 'va_entity')
     FROM user_profiles WHERE user_id = p_user_id),
    false
  )
$$;

-- ================================================================
-- 8. Sanity: grant sequence/table usage so service role and authed roles work
-- ================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_runs       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON deleted_audit   TO service_role;
GRANT SELECT ON feed_runs       TO authenticated;
GRANT SELECT ON deleted_audit   TO authenticated;
