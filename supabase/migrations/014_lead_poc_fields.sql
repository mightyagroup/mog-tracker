-- Migration 014: Add contracting officer POC fields to gov_leads

ALTER TABLE gov_leads
  ADD COLUMN IF NOT EXISTS contracting_officer_name  text,
  ADD COLUMN IF NOT EXISTS contracting_officer_email text,
  ADD COLUMN IF NOT EXISTS contracting_officer_phone text;
