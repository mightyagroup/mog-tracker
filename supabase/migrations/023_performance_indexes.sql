-- Add missing performance indexes discovered during production audit

-- commercial_leads: entity is filtered on every page load
CREATE INDEX IF NOT EXISTS idx_commercial_leads_entity
  ON commercial_leads(entity);

-- commercial_leads: service_category is filtered/grouped in VitalX views
CREATE INDEX IF NOT EXISTS idx_commercial_leads_category
  ON commercial_leads(service_category);

-- commercial_leads: fit_score is sorted on every load
CREATE INDEX IF NOT EXISTS idx_commercial_leads_fit_score
  ON commercial_leads(fit_score DESC);

-- subcontractors: sub_type is filtered in the new type tabs
CREATE INDEX IF NOT EXISTS idx_subcontractors_sub_type
  ON subcontractors(sub_type);

-- contacts: email is looked up during SAM feed upsert (already has no unique constraint)
CREATE INDEX IF NOT EXISTS idx_contacts_email
  ON contacts(email);

-- contacts: contact_type is filtered in the contacts page
CREATE INDEX IF NOT EXISTS idx_contacts_type
  ON contacts(contact_type);

-- gov_leads: notice_id and solicitation_number are looked up during SAM deduplication
CREATE INDEX IF NOT EXISTS idx_gov_leads_notice_id
  ON gov_leads(notice_id);

CREATE INDEX IF NOT EXISTS idx_gov_leads_solicitation_number
  ON gov_leads(solicitation_number);
