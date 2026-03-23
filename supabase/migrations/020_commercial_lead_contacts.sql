-- Update VitalX commercial leads with verified public contact info
-- RULES: phone numbers = main published institutional switchboards only
--        websites = publicly stable domain URLs
--        contact_name and contact_email left NULL — for manual research

-- ── Websites (all publicly verified stable domains) ────────────────────────

UPDATE commercial_leads SET website = 'https://www.questdiagnostics.com'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Quest Diagnostics%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.labcorp.com'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Labcorp%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.vcuhealth.org'
WHERE entity = 'vitalx' AND organization_name ILIKE '%VCU%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.medstarhealth.org'
WHERE entity = 'vitalx' AND organization_name ILIKE '%MedStar%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.inova.org'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Inova%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.hopkinsmedicine.org'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Johns Hopkins%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.childrensnational.org'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Children%National%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.gwhospital.com'
WHERE entity = 'vitalx' AND organization_name ILIKE '%George Washington University Hospital%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://healthy.kaiserpermanente.org/virginia'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Kaiser%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.sentara.com'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Sentara%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.novanthealth.org'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Novant%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.bioreference.com'
WHERE entity = 'vitalx' AND organization_name ILIKE '%BioReference%' AND (website IS NULL OR website = '');

UPDATE commercial_leads SET website = 'https://www.iconplc.com'
WHERE entity = 'vitalx' AND organization_name ILIKE '%ICON%' AND (website IS NULL OR website = '');

-- ── Phone numbers — main institutional switchboards (published, stable) ────
-- Only included where the number is a well-documented main line

-- Johns Hopkins Hospital main switchboard — (410) 955-5000
-- Published on hopkinsmedicine.org contact page; stable for decades
UPDATE commercial_leads SET contact_phone = '(410) 955-5000'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Johns Hopkins%' AND (contact_phone IS NULL OR contact_phone = '');

-- Children's National Hospital DC main — (202) 476-5000
-- Published on childrensnational.org; main DC campus switchboard
UPDATE commercial_leads SET contact_phone = '(202) 476-5000'
WHERE entity = 'vitalx' AND organization_name ILIKE '%Children%National%' AND (contact_phone IS NULL OR contact_phone = '');

-- Note: VCU Health, MedStar, Inova, GWU, Kaiser, Sentara, Quest, Labcorp
-- regional/switchboard numbers require direct verification — left NULL for manual entry
