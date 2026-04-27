-- 042 — drive_folder_id columns + bid_folder_name on proposals
--
-- Surfaced by Ella's "Backfill found 0 folders" run on 2026-04-27. The
-- existing schema only stored drive_folder_URL, not the raw folder_id, so
-- every code path that wanted to call Drive Permissions API had to parse
-- the URL. The new endpoints I shipped (generate-bid-starter, backfill,
-- import-bulk) write drive_folder_id directly. This migration adds the
-- column on gov_leads + commercial_leads, backfills it by parsing the
-- existing URLs, and adds the bid_folder_name column on proposals.

-- 1. gov_leads.drive_folder_id
ALTER TABLE gov_leads ADD COLUMN IF NOT EXISTS drive_folder_id text;

-- Backfill from drive_folder_url where set
-- URL pattern: https://drive.google.com/drive/folders/<id>[?...]
UPDATE gov_leads
SET drive_folder_id = substring(drive_folder_url FROM 'folders/([A-Za-z0-9_-]+)')
WHERE drive_folder_url IS NOT NULL AND drive_folder_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_gov_leads_drive_folder_id ON gov_leads(drive_folder_id) WHERE drive_folder_id IS NOT NULL;

-- 2. commercial_leads.drive_folder_id (parallel to gov_leads)
ALTER TABLE commercial_leads ADD COLUMN IF NOT EXISTS drive_folder_id text;

UPDATE commercial_leads
SET drive_folder_id = substring(drive_folder_url FROM 'folders/([A-Za-z0-9_-]+)')
WHERE drive_folder_url IS NOT NULL AND drive_folder_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_leads_drive_folder_id ON commercial_leads(drive_folder_id) WHERE drive_folder_id IS NOT NULL;

-- 3. proposals.bid_folder_name (used by generate-bid-starter to record
-- the folder name like "MowingToronto-DOD-W912BV26QA047")
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS bid_folder_name text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS bid_folder_url  text;

NOTIFY pgrst, 'reload schema';
