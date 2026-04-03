-- Migration 028: Amendment tracking fields for gov_leads
-- Adds fields to track solicitation amendments and change history

-- Amendment tracking columns
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS amendment_count int DEFAULT 0;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS last_amendment_date timestamptz;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS description_hash text;

-- Index for daily monitoring queries
CREATE INDEX IF NOT EXISTS idx_gov_leads_last_checked ON gov_leads(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_gov_leads_amendment_count ON gov_leads(amendment_count) WHERE amendment_count > 0;
