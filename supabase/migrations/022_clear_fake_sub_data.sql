-- Clear all fabricated contact data from the 25 teaming partner seeds (migration 017).
-- Company names themselves may also be unverifiable — flagged in notes for user review.
-- These were AI-generated and have NOT been confirmed against SAM.gov or any registry.

UPDATE subcontractors
SET
  contact_name  = NULL,
  contact_email = NULL,
  contact_phone = NULL,
  notes = COALESCE(
    NULLIF(
      regexp_replace(
        COALESCE(notes, ''),
        E'\\n?\\[UNVERIFIED[^\\]]*\\]', '', 'g'
      ),
      ''
    ),
    ''
  ) || E'\n[UNVERIFIED — company name and details have not been confirmed against SAM.gov. Review and replace with real verified data before use in proposals.]'
WHERE sub_type = 'teaming_partner'
  AND (contact_email ILIKE '%@%' AND contact_email NOT LIKE '%@%\.gov')
  AND contact_phone LIKE '%(___) 555-%';
