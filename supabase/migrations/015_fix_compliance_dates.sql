-- Migration 015: Set real expiration dates on compliance records

-- Exousia
UPDATE compliance_records SET expiration_date = '2026-10-30'
  WHERE entity = 'exousia' AND name = 'SAM.gov Registration';

UPDATE compliance_records SET expiration_date = '2026-12-30'
  WHERE entity = 'exousia' AND name = 'Virginia SWaM Certification';

UPDATE compliance_records SET expiration_date = '2026-12-30'
  WHERE entity = 'exousia' AND name = 'eVA Vendor Registration';

UPDATE compliance_records SET expiration_date = '2027-06-30'
  WHERE entity = 'exousia' AND name = 'WOSB Certification (SBA)';

UPDATE compliance_records SET expiration_date = '2027-06-30'
  WHERE entity = 'exousia' AND name = 'EDWOSB Certification (SBA)';

-- VitalX
UPDATE compliance_records SET expiration_date = '2027-03-30'
  WHERE entity = 'vitalx' AND name = 'SAM.gov Registration';

UPDATE compliance_records SET expiration_date = '2027-03-30'
  WHERE entity = 'vitalx' AND name = 'HIPAA Compliance';

-- IronHouse
UPDATE compliance_records SET expiration_date = '2026-10-30'
  WHERE entity = 'ironhouse' AND name = 'SAM.gov Registration';

UPDATE compliance_records SET expiration_date = '2026-12-30'
  WHERE entity = 'ironhouse' AND name = 'Virginia SWaM Certification';

UPDATE compliance_records SET expiration_date = '2026-12-30'
  WHERE entity = 'ironhouse' AND name = 'eVA Vendor Registration';

-- Subscriptions: set cancellation_deadline so DaysUntilBadge calculates
UPDATE compliance_records SET cancellation_deadline = '2027-01-15'
  WHERE name = 'GovWin IQ';

UPDATE compliance_records SET cancellation_deadline = '2026-06-01'
  WHERE name = 'DeepRFP';

UPDATE compliance_records SET cancellation_deadline = '2026-08-01'
  WHERE name = 'Tookan (Dispatch)';

UPDATE compliance_records SET cancellation_deadline = '2026-06-01'
  WHERE name = 'Google Workspace';
