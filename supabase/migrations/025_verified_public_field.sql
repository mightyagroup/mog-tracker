-- Add verified_public column to gov_leads
-- Tracks whether the opportunity was confirmed to exist on public SAM.gov website
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS verified_public boolean DEFAULT false;

-- Mark the two confirmed-real leads as verified
UPDATE gov_leads SET verified_public = true
WHERE solicitation_number IN ('PANMCC26P0000043160', '70B03C26Q00000091');

-- Delete the two fake solicitations
DELETE FROM gov_leads WHERE solicitation_number IN ('140P822600011', 'W912PP26QA015');
