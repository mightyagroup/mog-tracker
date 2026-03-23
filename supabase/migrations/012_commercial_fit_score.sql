-- Migration 012: Add fit_score and volume_tier to commercial_leads

ALTER TABLE commercial_leads
  ADD COLUMN IF NOT EXISTS fit_score int DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  ADD COLUMN IF NOT EXISTS volume_tier text;
  -- volume_tier values: 'large_system', 'mid_system', 'single_facility',
  --                     'national_lab', 'regional_lab', 'specialty', 'broker', 'government'

CREATE INDEX IF NOT EXISTS idx_commercial_leads_fit_score ON commercial_leads(fit_score DESC);

-- Update any existing records to have a non-null fit_score
UPDATE commercial_leads SET fit_score = 0 WHERE fit_score IS NULL;
