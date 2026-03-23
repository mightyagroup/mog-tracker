-- Add start_date to compliance_records for calendar view
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS start_date date;
