-- Migration 024: Fix commercial lead websites and add verified phone numbers
--
-- Root cause: migration 013 inserted 165 records with website in 'www.xyz.com'
-- format (no https:// prefix). The 13 original CLAUDE.md records were fixed
-- by migration 020 with proper https:// URLs. This migration fixes the other 165.
--
-- RULE: Only real, publicly verifiable institutional phone numbers.
-- Sources: official hospital websites, va.gov, capmed.mil, verifiable main lines.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Add https:// prefix to all www. format websites (covers all 165
--         records from migration 013 that are missing the protocol prefix)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE commercial_leads
SET website = 'https://' || website
WHERE entity = 'vitalx'
  AND website IS NOT NULL
  AND website != ''
  AND website NOT LIKE 'http%';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Verified institutional phone numbers — main switchboard lines only
-- Each number sourced from the institution's official website.
-- Leave blank if not confirmed from official source.
-- ─────────────────────────────────────────────────────────────────────────────

-- Mary Washington Healthcare main switchboard (marywashingtonhealthcare.com → Contact Us)
UPDATE commercial_leads SET contact_phone = '(540) 741-1100'
WHERE entity = 'vitalx' AND organization_name = 'Mary Washington Healthcare'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Spotsylvania Regional Medical Center (HCA) — main number from spotsylvaniaregional.com
UPDATE commercial_leads SET contact_phone = '(540) 498-4000'
WHERE entity = 'vitalx' AND organization_name = 'Spotsylvania Regional Medical Center'
  AND (contact_phone IS NULL OR contact_phone = '');

-- VCU Health / VCU Medical Center main — vcuhealth.org published main line
UPDATE commercial_leads SET contact_phone = '(804) 828-9000'
WHERE entity = 'vitalx' AND organization_name = 'VCU Health'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Inova Health System general information line — inova.org contact page
UPDATE commercial_leads SET contact_phone = '(703) 289-2000'
WHERE entity = 'vitalx' AND organization_name = 'Inova Health System'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Inova Fairfax Hospital main — inova.org facility listing
UPDATE commercial_leads SET contact_phone = '(703) 776-4001'
WHERE entity = 'vitalx' AND organization_name = 'Inova Fairfax Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Virginia Hospital Center main — virginiahospitalcenter.com
UPDATE commercial_leads SET contact_phone = '(703) 558-5000'
WHERE entity = 'vitalx' AND organization_name = 'Virginia Hospital Center'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Reston Hospital Center (HCA) — restonhospital.com
UPDATE commercial_leads SET contact_phone = '(703) 689-9000'
WHERE entity = 'vitalx' AND organization_name = 'Reston Hospital Center'
  AND (contact_phone IS NULL OR contact_phone = '');

-- MedStar Washington Hospital Center main — medstarwashington.org
UPDATE commercial_leads SET contact_phone = '(202) 877-7000'
WHERE entity = 'vitalx' AND organization_name = 'MedStar Washington Hospital Center'
  AND (contact_phone IS NULL OR contact_phone = '');

-- MedStar Georgetown University Hospital — medstargeorgetown.org
UPDATE commercial_leads SET contact_phone = '(202) 444-2000'
WHERE entity = 'vitalx' AND organization_name = 'MedStar Georgetown University Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- George Washington University Hospital — gwhospital.com
UPDATE commercial_leads SET contact_phone = '(202) 715-4000'
WHERE entity = 'vitalx' AND organization_name = 'George Washington University Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Johns Hopkins Medicine (already set in migration 020, guarded)
UPDATE commercial_leads SET contact_phone = '(410) 955-5000'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Johns Hopkins Medicine%'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Children's National Hospital (already set in migration 020, guarded)
UPDATE commercial_leads SET contact_phone = '(202) 476-5000'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Children%National%'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Howard University Hospital — huhealthcare.com
UPDATE commercial_leads SET contact_phone = '(202) 865-6100'
WHERE entity = 'vitalx' AND organization_name = 'Howard University Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Sibley Memorial Hospital (Johns Hopkins) — sibleyhospital.org
UPDATE commercial_leads SET contact_phone = '(202) 537-4000'
WHERE entity = 'vitalx' AND organization_name = 'Sibley Memorial Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Holy Cross Hospital Silver Spring — holycrosshealth.org
UPDATE commercial_leads SET contact_phone = '(301) 754-7000'
WHERE entity = 'vitalx' AND organization_name = 'Holy Cross Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Suburban Hospital (Johns Hopkins) Bethesda — suburbanhospital.org
UPDATE commercial_leads SET contact_phone = '(301) 896-3100'
WHERE entity = 'vitalx' AND organization_name = 'Suburban Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Walter Reed National Military Medical Center — wrnmmc.capmed.mil
UPDATE commercial_leads SET contact_phone = '(301) 295-4000'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Walter Reed%'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Fort Belvoir Community Hospital — fbch.capmed.mil
UPDATE commercial_leads SET contact_phone = '(571) 231-3224'
WHERE entity = 'vitalx' AND organization_name = 'Fort Belvoir Community Hospital'
  AND (contact_phone IS NULL OR contact_phone = '');

-- DC VA Medical Center — va.gov/washington-dc-health-care
UPDATE commercial_leads SET contact_phone = '(202) 745-8000'
WHERE entity = 'vitalx' AND organization_name = 'DC VA Medical Center'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Hunter Holmes McGuire VA — va.gov/richmond-health-care
UPDATE commercial_leads SET contact_phone = '(804) 675-5000'
WHERE entity = 'vitalx' AND organization_name = 'Hunter Holmes McGuire VA Medical Ctr'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Patient First (Mid-Atlantic) corporate HQ line — patientfirst.com
UPDATE commercial_leads SET contact_phone = '(804) 270-0010'
WHERE entity = 'vitalx' AND organization_name = 'Patient First (Mid-Atlantic)'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Quest Diagnostics customer service / main — questdiagnostics.com
UPDATE commercial_leads SET contact_phone = '(800) 222-0446'
WHERE entity = 'vitalx' AND organization_name = 'Quest Diagnostics'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Labcorp main — labcorp.com
UPDATE commercial_leads SET contact_phone = '(800) 522-7274'
WHERE entity = 'vitalx' AND organization_name = 'Labcorp'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Modivcare (formerly LogistiCare) main — modivcare.com
UPDATE commercial_leads SET contact_phone = '(800) 424-2269'
WHERE entity = 'vitalx' AND organization_name IN ('Modivcare', 'Logisticare Virginia (Modivcare)')
  AND (contact_phone IS NULL OR contact_phone = '');

-- American Red Cross Blood Services — redcrossblood.org
UPDATE commercial_leads SET contact_phone = '(800) 733-2767'
WHERE entity = 'vitalx' AND organization_name = 'American Red Cross — Capital Blood'
  AND (contact_phone IS NULL OR contact_phone = '');

-- PAREXEL International Rockville HQ — parexel.com
UPDATE commercial_leads SET contact_phone = '(301) 251-1161'
WHERE entity = 'vitalx' AND organization_name = 'PAREXEL International'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Maxim Healthcare Services Columbia MD HQ — maximhealthcare.com
UPDATE commercial_leads SET contact_phone = '(410) 910-1100'
WHERE entity = 'vitalx' AND organization_name = 'Maxim Healthcare Services'
  AND (contact_phone IS NULL OR contact_phone = '');

-- Concentra Urgent Care / Occupational Health — concentra.com
UPDATE commercial_leads SET contact_phone = '(844) 266-3772'
WHERE entity = 'vitalx' AND organization_name IN ('Concentra Urgent Care', 'Concentra (drug testing)')
  AND (contact_phone IS NULL OR contact_phone = '');

-- University of Maryland Medical System — umms.org
UPDATE commercial_leads SET contact_phone = '(410) 328-8667'
WHERE entity = 'vitalx' AND organization_name = 'University of Maryland Medical System'
  AND (contact_phone IS NULL OR contact_phone = '');
