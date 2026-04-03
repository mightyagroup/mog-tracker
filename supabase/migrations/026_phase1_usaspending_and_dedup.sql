-- Migration 026: Phase 1 critical fixes

-- 1) Add USASpending match / confidence / manual override / solicitation verification columns
ALTER TABLE gov_leads
  ADD COLUMN IF NOT EXISTS usaspending_match_method text,
  ADD COLUMN IF NOT EXISTS usaspending_confidence text,
  ADD COLUMN IF NOT EXISTS manual_pricing_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS solicitation_verified boolean DEFAULT false;

-- 2) Enforce deduplication by entity + solicitation_number (nullable solicitation_number excluded)
CREATE UNIQUE INDEX IF NOT EXISTS uq_gov_leads_entity_solicitation_number
  ON gov_leads(entity, solicitation_number)
  WHERE solicitation_number IS NOT NULL;

-- 3) One-off cleanup for existing duplicates if any (keeps most recent by updated_at)
WITH duplicates AS (
  SELECT entity, solicitation_number, array_agg(id ORDER BY updated_at DESC) AS ids
  FROM gov_leads
  WHERE solicitation_number IS NOT NULL
  GROUP BY entity, solicitation_number
  HAVING COUNT(*) > 1
), keep AS (
  SELECT entity, solicitation_number, ids[1] AS keep_id, ids[2:] AS remove_ids
  FROM duplicates
)
DELETE FROM gov_leads
WHERE id IN (SELECT unnest(remove_ids) FROM keep);
