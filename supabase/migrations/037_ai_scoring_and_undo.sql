-- Migration 037: AI scoring columns + undo index for deleted_audit
-- Idempotent: safe to re-apply.

-- ================================================================
-- 1. AI scoring columns on gov_leads
-- ================================================================
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_fit_score       int;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_reasoning       text;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_recommendation  text;  -- 'bid' | 'no-bid' | 'needs-review'
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_red_flags       jsonb DEFAULT '[]'::jsonb;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_green_flags     jsonb DEFAULT '[]'::jsonb;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_scored_at       timestamptz;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_scored_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_model_version   text;  -- e.g. 'claude-sonnet-4-6'
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS ai_token_cost      int;   -- total input+output tokens, for cost tracking

CREATE INDEX IF NOT EXISTS idx_gov_leads_ai_scored_at ON gov_leads(ai_scored_at);

-- ================================================================
-- 2. Daily AI scoring budget tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_scoring_budget (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scored_date  date NOT NULL,
  count        int NOT NULL DEFAULT 0,
  total_tokens int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (scored_date)
);

DROP TRIGGER IF EXISTS update_ai_scoring_budget_updated_at ON ai_scoring_budget;
CREATE TRIGGER update_ai_scoring_budget_updated_at
  BEFORE UPDATE ON ai_scoring_budget
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_scoring_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ai_scoring_budget" ON ai_scoring_budget;
CREATE POLICY "Admins can read ai_scoring_budget" ON ai_scoring_budget
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','manager') AND is_active = true)
  );

DROP POLICY IF EXISTS "Service role writes ai_scoring_budget" ON ai_scoring_budget;
CREATE POLICY "Service role writes ai_scoring_budget" ON ai_scoring_budget
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 3. Deleted audit — add undone_at so restores don't double-restore
-- ================================================================
ALTER TABLE deleted_audit ADD COLUMN IF NOT EXISTS undone_at   timestamptz;
ALTER TABLE deleted_audit ADD COLUMN IF NOT EXISTS undone_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deleted_audit_undone ON deleted_audit(undone_at) WHERE undone_at IS NULL;

-- ================================================================
-- 4. Morning digest subscriptions
-- ================================================================
CREATE TABLE IF NOT EXISTS digest_subscriptions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  daily_enabled  boolean DEFAULT true,
  include_entities entity_type[] DEFAULT ARRAY['exousia','vitalx','ironhouse']::entity_type[],
  last_sent_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

DROP TRIGGER IF EXISTS update_digest_subscriptions_updated_at ON digest_subscriptions;
CREATE TRIGGER update_digest_subscriptions_updated_at
  BEFORE UPDATE ON digest_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE digest_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own digest subscription" ON digest_subscriptions;
CREATE POLICY "Users manage own digest subscription" ON digest_subscriptions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role reads all digest subscriptions" ON digest_subscriptions;
CREATE POLICY "Service role reads all digest subscriptions" ON digest_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- ================================================================
-- 5. Grants for service role
-- ================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_scoring_budget    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON digest_subscriptions TO service_role;
GRANT SELECT ON ai_scoring_budget    TO authenticated;
GRANT SELECT ON digest_subscriptions TO authenticated;
