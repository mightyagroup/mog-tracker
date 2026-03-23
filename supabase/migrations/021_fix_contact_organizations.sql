-- One-time fix: populate contacts.organization from gov_leads for contracting officers
-- Matches on email (unique identifier) and pulls the agency name from the most recent
-- gov_lead associated with that contracting officer.

UPDATE contacts c
SET organization = sub.agency
FROM (
  SELECT DISTINCT ON (gl.contracting_officer_email)
    gl.contracting_officer_email,
    gl.agency
  FROM gov_leads gl
  WHERE gl.contracting_officer_email IS NOT NULL
    AND gl.agency IS NOT NULL
    AND gl.agency != ''
  ORDER BY gl.contracting_officer_email, gl.created_at DESC
) sub
WHERE c.email = sub.contracting_officer_email
  AND c.contact_type = 'contracting_officer'
  AND (c.organization IS NULL OR c.organization = '');
