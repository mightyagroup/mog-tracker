-- Migration 032: State Procurement Feeds (eVA and eMMA)
-- Adds state_procurement_id column for deduplication and related fields for state feeds

-- Add state_procurement_id column to gov_leads for tracking state procurement records
ALTER TABLE gov_leads
ADD COLUMN IF NOT EXISTS state_procurement_id text UNIQUE;

-- Add index for efficient state procurement lookups
CREATE INDEX IF NOT EXISTS idx_gov_leads_state_procurement_id
ON gov_leads(state_procurement_id)
WHERE state_procurement_id IS NOT NULL;

-- Add import source tracking (which system the lead came from: eva, emma, etc.)
-- source enum already exists and supports 'eva' and 'emma'

-- Add last_eva_check and last_emma_check for tracking feed runs
ALTER TABLE gov_leads
ADD COLUMN IF NOT EXISTS last_eva_check timestamptz,
ADD COLUMN IF NOT EXISTS last_emma_check timestamptz;

-- Create state_feed_logs table for tracking feed runs and diagnostics
CREATE TABLE IF NOT EXISTS state_feed_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  feed_type text NOT NULL, -- 'eva' or 'emma'
  run_date timestamptz DEFAULT now(),

  -- Counts
  fetched int DEFAULT 0,
  inserted int DEFAULT 0,
  updated int DEFAULT 0,
  skipped int DEFAULT 0,
  errors_count int DEFAULT 0,

  -- Status
  status text NOT NULL, -- 'success' or 'error'
  error_message text,

  -- Details
  details jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_state_feed_logs_updated_at
  BEFORE UPDATE ON state_feed_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE state_feed_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read state feed logs" ON state_feed_logs
  FOR SELECT USING (auth.role() = 'authenticated');
