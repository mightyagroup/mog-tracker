# LESSONS LEARNED — MOG Tracker App

---

## 2026-04-23 — Postgres CREATE OR REPLACE cannot rename parameters (and DROP cascades to policies)

**Problem:** Migration 036 tried `CREATE OR REPLACE FUNCTION user_can_edit(uid uuid)` but migrations 033 and 035 had already defined it as `user_can_edit(p_user_id uuid)`. Postgres errored with `cannot change name of input parameter "p_user_id"` and the whole migration rolled back. Adding `DROP FUNCTION IF EXISTS user_can_edit(uuid);` then failed with `cannot drop function ... because other objects depend on it` — RLS policies across gov_leads, commercial_leads, contacts, subcontractors all call this function.
**Fix:** Kept the original parameter name `p_user_id` in migration 036's `CREATE OR REPLACE`. The function body still gets updated (to include `va_entity` in the editable roles), but the signature is unchanged so no DROP is needed and no policy gets torn down.
**Prevention:** Never rename a function parameter in a follow-up migration if existing RLS policies reference that function. `CREATE OR REPLACE` can change the body, volatility, and security attributes — keep the parameter names identical to the original definition. If a rename is truly necessary, you must (1) drop every dependent policy, (2) drop and recreate the function, (3) recreate every policy — all in one transactional migration.

---

## 2026-04-23 — exec_sql RPC not present by default in Supabase

**Problem:** `scripts/deploy-all.mjs` tries `sb.rpc('exec_sql', { sql_text })` as its second-choice migration path, but the `exec_sql` function does not exist in a default Supabase project — it's a custom helper you have to create first.
**Fix:** Used the direct-pg path instead (session-pooler URI in `DATABASE_URL`, `pg` npm package). That's more reliable anyway because `exec_sql` would itself need DDL privileges we don't automatically have.
**Prevention:** Store a valid `DATABASE_URL` (session pooler URI with password) in `.env.local` before running any migration script. Don't rely on `exec_sql`. If we ever want the RPC fallback to work, the `CREATE FUNCTION exec_sql(sql_text text) RETURNS void ... SECURITY DEFINER` helper must be seeded into the project once via the dashboard, and the deploy script's documentation should say so.

---

## 2026-03-25 — SAM.gov Data Quality: Phantom Solicitations from Bulk API Search

**Problem:** SAM.gov bulk search API returned solicitation numbers (e.g. 140P822600011, W912PP26QA015) that returned 404 on the public SAM.gov website. These phantom entries polluted the gov_leads table with unverifiable opportunities.
**Fix:** Added HEAD request verification against `https://sam.gov/opp/{noticeId}/view` for each NAICS-matched opportunity before inserting. Added `verified_public` boolean column to `gov_leads` table. Only verified opportunities are inserted. Verification results are cached per noticeId to avoid duplicate checks across entities. Response now includes `verified` and `failedVerification` counts for monitoring.
**Prevention:** Never trust SAM.gov bulk search results at face value. Always verify each opportunity's public page exists before inserting into the database. Monitor the `failedVerification` count in cron output — a spike indicates API data quality issues.

---

## 2026-03-25 — SAM.gov Opportunities API: Missing /prod/ in URL

**Problem:** SAM.gov feed was returning 404 on every fetch. The API URL was `https://api.sam.gov/opportunities/v2/search` but authenticated (API key) access requires the `/prod/` prefix: `https://api.sam.gov/prod/opportunities/v2/search`.
**Fix:** Added `/prod/` to the URL in `src/app/api/cron/sam-feed/route.ts` line 81. Also removed `237310` from Exousia NAICS list per business decision.
**Prevention:** SAM.gov has different base URLs for public vs authenticated access. Always use `/prod/` when passing an `api_key` parameter.

---

## 2026-03-23 — Production Audit Findings

**Problem:** Production audit revealed AI-generated fake data in subcontractor seeds.
**Fix:** Migration 022 clears all fabricated contact fields (contact_name, contact_email, contact_phone) from the 25 teaming partner seeds created in migration 017. These companies were invented — their names, contacts, emails, and 555 phone numbers are not real.
**Prevention:** Never use AI to generate seeded subcontractor or contact records. Only seed data from verifiable sources (SAM.gov search, known relationships, public registries). For commercial leads and hospital systems, seed organization names and websites only — leave contact fields null for manual research.

---

## 2026-03-23 — CLAUDE.md Contains Live Credentials in Git

**Problem:** CLAUDE.md is tracked in the repository and contains the Supabase anon key and service role key in plaintext.
**Fix:** Not auto-fixed — requires user decision. Options: (a) add CLAUDE.md to .gitignore and recreate it locally, (b) rotate the Supabase keys and treat the old ones as compromised, (c) accept the risk since this is a private repo.
**Prevention:** Project configuration files that contain credentials should never be committed. Use environment variable references in CLAUDE.md instead of actual keys.

---

## 2026-03-23 — SAM.gov Feed: NAICS Field Has Two Shapes

**Problem:** SAM.gov v2 API returns `naicsCode` (string) on some opportunities and `naicsCodes` (array of objects) on others. Using only `naicsCode` caused 0 inserts on a 300-record fetch.
**Fix:** Added `extractNaicsCode()` function that checks: (1) `naicsCode` string, (2) `naicsCodes[0].code` or `naicsCodes[0].naicsCode`, (3) `classificationCode` as fallback.
**Prevention:** Always check SAM.gov API shape at both the field name and field type level. Run `dryRun=1` after any feed change to confirm NAICS extraction before writing to DB.

---

## 2026-03-23 — SAM.gov Feed: service_category_id FK Bug Caused Silent Insert Failures

**Problem:** `service_category_id: categoryId ?? existing.id` was passing the lead's own UUID as the category FK when `categoryId` was null. This violated the foreign key constraint but errors were being swallowed.
**Fix:** Removed the bad fallback. `service_category_id` is now `categoryId ?? null`.
**Prevention:** Never use `?? someOtherId` as a FK fallback. If the category can't be found, store null and let the user assign it manually.

---

## 2026-03-23 — Supabase RLS: Authenticated Role Needs GRANT Not Just Policy

**Problem:** Compliance page was empty even though 14 records existed. RLS policy existed but browser (authenticated role) couldn't read rows.
**Fix:** Migration 011 added `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated`. Also added `ALTER DEFAULT PRIVILEGES` so future tables auto-get granted.
**Prevention:** Every new table needs both: (1) a permissive RLS policy AND (2) GRANT to the relevant role. Add to every migration template.

---

## 2026-03-23 — USASpending.gov: Agency Name Mismatch Causes 0 Results

**Problem:** SAM.gov's `fullParentPathName` (e.g. "DEPARTMENT OF DEFENSE > ARMY CORPS > ...") doesn't match USASpending.gov's toptier agency names. The agency filter was returning empty results.
**Fix:** Rewritten to: (1) extract only the first segment of fullParentPathName as toptier name, (2) try with agency filter first, (3) fall back to NAICS-only with 3-year time_period filter. Also returns `avg_award_size` and `award_count`.
**Prevention:** USASpending.gov agency names must match their internal toptier taxonomy. Always have a NAICS-only fallback. Never fail silently — surface `{ found: false }` clearly.

---

## 2026-03-23 — React useEffect Missing Deps: Intentional Pattern

**Problem:** Build shows eslint warnings for react-hooks/exhaustive-deps on every component using `useEffect(() => { fetchData() }, [entity])` pattern.
**Fix:** Not fixed — these are intentional. Using `[entity]` (or `[lead.id]`) instead of `[fetchData]` prevents infinite re-render loops since `fetchData` is recreated on every render and is not memoized.
**Prevention:** Add `// eslint-disable-next-line react-hooks/exhaustive-deps` above any useEffect where the deps are intentionally restricted. Document why.

---

## 2026-03-23 — Fit Score: Value Range Not Applied at Feed Time

**Problem:** `calcFitScore()` in the SAM feed doesn't score estimated value (15 pts for $25K–$750K) because SAM.gov v2 doesn't consistently return `awardAmt` in opportunity search results.
**Fix:** Not applied at feed time — this is correct. The frontend `calculateFitScore()` in `utils.ts` does include value scoring and is used when a user manually enters `estimated_value` on a lead.
**Prevention:** Fit score from the SAM feed is a first-pass approximation. Full score is only calculable after the user fills in estimated value. Design the UI to surface "fit score incomplete" when estimated_value is null.

---

## 2026-03-23 — Performance: Missing Indexes on Frequently Queried Columns

**Problem:** No indexes on `commercial_leads.entity`, `commercial_leads.service_category`, `subcontractors.sub_type`, `contacts.email`, `gov_leads.notice_id`, `gov_leads.solicitation_number`.
**Fix:** Migration 023 adds all missing indexes.
**Prevention:** Every column used in `.eq()`, `.in()`, `.order()`, or `.contains()` should have an index. Add indexes in the same migration that creates the table or column.

---

## 2026-03-23 — Vercel Cron Schedule

**Setup:** `vercel.json` schedules SAM.gov feed at `0 11 * * *` (cron UTC).
**Result:** Runs at 11:00 UTC = 6:00 AM EST (UTC-5) / 7:00 AM EDT (UTC-4).
**Note:** During daylight saving time (March–November), the feed runs at 7:00 AM local time, not 6:00 AM. If strict 6:00 AM year-round is required, use `0 11 * * *` in winter and `0 10 * * *` in summer, or accept the 1-hour drift.

---

## 2026-03-23 — .gitignore: env Files

**Status:** `.env*.local` is in .gitignore. `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are in `.env.local` (not committed). However, these same values appear in the committed `CLAUDE.md` file — see credential warning above.

---

## 2026-03-23 — SAM.gov POC Contact Extraction

**Setup:** SAM.gov v2 returns `pointOfContact` array. Primary POC (type === 'primary') is extracted as contracting officer.
**Result:** Contracting officer name, email, phone populate on the lead AND upsert to master contacts table with `contact_type: 'contracting_officer'` and `organization` set from `agency ?? sub_agency`.
**Note:** After changing the organization upsert logic, run `/api/cron/sam-feed` once to backfill the 9 existing contacts that had null organization.

---

## 2026-04-04 — Phase 8: State Procurement Feeds (eVA & eMMA)

**Problem**: Virginia (eVA) and Maryland (eMMA) procurement systems don't expose reliable public APIs, unlike SAM.gov. Needed a way to import state procurement opportunities without full API automation.

**Fix**:
1. Built dual-mode feed endpoints (GET for diagnostics, POST for manual/programmatic import)
2. Created stateful database columns (state_procurement_id, last_eva_check, last_emma_check) for deduplication
3. Implemented CSV parsing and bulk import component in the UI with dry-run mode
4. Reused existing utilities (calculateFitScore, autoCategorizeLead) for consistency
5. Added state_feed_logs audit table for tracking all feed operations
6. Updated vercel.json with weekly read-only cron checks (informational only)

**Prevention**:
- For state/regional systems without public APIs, design flexible POST endpoints that accept JSON
- Always provide dry-run mode for imports to reduce user error
- Include detailed error reporting (which records failed, why, and how many succeeded)
- Use deduplication IDs with source prefix (eva_*, emma_*) to prevent collisions across systems
- Log all feed operations to audit table for debugging and reporting
- Leverage existing utility functions rather than duplicating fit score/categorization logic

**TypeScript Lesson**: When selecting partial data from Supabase, import and type-cast to known interfaces (ServiceCategory[]) rather than `any` to maintain type safety during function calls.

---

## 2026-04-04 — Phase 11: Document Management with Supabase Storage

**Design**: Built a complete document management system with:
1. Private Supabase Storage bucket (50MB limit, MIME type whitelist)
2. Database table linking documents to leads/subcontractors/entities
3. Four React components: DocumentUpload (drag-drop), DocumentList (table), LeadDocuments (embedded), DocumentPreview (modal)
4. Three API endpoints: POST (upload), GET (list/download with signed URLs), PATCH (metadata), DELETE
5. Signed URLs with 60-minute expiry for secure downloads

**Key Decisions**:
- Storage path format: `{entity}/{lead_id or 'general'}/{timestamp}_{sanitized_filename}.{ext}` ensures unique paths and easy cleanup by entity/lead
- Document types enum (solicitation, proposal, teaming_agreement, capability_statement, pricing, contract, correspondence, certification, other) matches bid lifecycle
- Drag-and-drop UX with multi-file selection, real-time validation (MIME type, file size), and progress feedback
- Authenticated RLS on documents table — all authenticated users can CRUD (fine-grained access control deferred to future phases)
- File deletion removes from both Supabase Storage AND database in a single DELETE operation
- Signed URLs generated on-demand at download time (no pre-generation, no expiry surprises)

**TypeScript**: Full strict typing throughout — no `any` types. Document interface includes all fields from database schema. DocumentType is a discriminated union matching database enum.

**UI Pattern**: LeadDocuments component wraps DocumentUpload + DocumentList for use in lead detail panels. Components are composable and work standalone or embedded.

**Error Handling**: All components surface errors via alert-style UI feedback. Network errors, validation failures, and auth issues are caught and displayed to user. Upload errors include specific file-level details (which file, what failed).

**Prevention**:
- Always validate files client-side before upload (MIME type, size) AND server-side (API layer)
- Use signed URLs with reasonable expiry (60 min) to prevent long-lived download links
- Store file metadata (size, type, upload time) in database to support filtering and audit
- Implement soft delete (is_archived boolean) alongside hard delete to maintain audit trail
- Test file previews with multiple formats (PDF, image, unsupported types) — handle graceful fallbacks
- Structure storage paths to support bulk operations (e.g., delete all files for a lead)

---

## 2026-04-04 — Circular RLS Dependency Breaks All Data Access

**Problem:** Migration 033 introduced RBAC with helper functions (`user_can_access_entity()`, `user_can_edit()`, etc.) that query `user_profiles` to check roles. However, `user_profiles` itself had RLS enabled with an "Admin can do everything" policy that contained `EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')`. This created a circular dependency: any RLS check on any table triggered a check on `user_profiles`, which triggered its own RLS check on `user_profiles`, which PostgreSQL resolved by returning empty results. All helper functions returned NULL, all policies evaluated to FALSE, and the entire app showed zero data across every entity tracker.

**Fix:** Recreated all 4 helper functions (`get_user_role`, `get_user_entities`, `user_can_access_entity`, `user_can_edit`) with `SECURITY DEFINER SET search_path = public`. SECURITY DEFINER causes the function to execute as its owner (postgres), bypassing RLS when reading `user_profiles`. Also replaced the circular admin policy on `user_profiles` with simpler non-recursive policies that use the SECURITY DEFINER functions. Applied via migration 035_fix_rls_circular_dependency.sql.

**Prevention:**
- Never create RLS policies on a table that query the same table (directly or via functions)
- Always use SECURITY DEFINER for helper functions that RLS policies depend on
- When implementing RBAC, the "role lookup" table (user_profiles) must have simple, non-recursive RLS policies (e.g., `user_id = auth.uid()` for self-read)
- Test RLS changes immediately after applying them by querying as an authenticated user, not just the service role
- The compliance_records table still had the old generic policy and continued working, which was the key diagnostic clue (data existed but RBAC-protected tables returned nothing)


## [2026-04-22] — Soft-delete was broken in production because archived_at column was never created

**Problem:** Purge-archived cron and all soft-delete UI code referenced `archived_at` column that was never defined in any migration (migrations 001-035 inclusive). The code was written assuming the column existed. In production, every "Delete" button either silently failed or threw. This had gone undetected for weeks because users assumed clicking Delete + things disappearing meant it worked — but rows remained in the DB and just got refetched.

**Fix:** Migration 036 adds `archived_at` to gov_leads, commercial_leads, contacts, subcontractors, plus indexes. Also added `last_reviewed_amendment_count` + review columns so amendments can be marked reviewed.

**Prevention:** Before implementing any feature that touches a new column, grep migrations/ to confirm the column exists. Add a smoke test that inserts a row and sets every "interesting" nullable column.

## [2026-04-22] — SAM.gov feed was pulling only 1-2 leads per week because pagination was capped at 3 pages

**Problem:** Feed was set to `for (let page = 0; page < 3; page++)` — hard cap of 300 opportunities per run even if the 30-day window had more. Combined with dedup on notice_id, the feed appeared to stop producing new leads. There was also no retry on transient SAM.gov 5xx, so a single bad response killed the whole run silently.

**Fix:**
- Rewrote sam-feed to loop pagination per NAICS code up to 20 pages each (~2,000 opps/NAICS safety cap)
- Added 3-attempt retry with exponential backoff + jitter on transient errors
- One NAICS failing no longer kills the whole run; errors accumulated per-NAICS
- Added `feed_runs` table (migration 036) that logs every run with status/counts/errors
- Added /admin/feed-health page to watch the feed's health visually
- Added 400ms sleep between NAICS queries to stay under SAM.gov's 10 req/min rate limit

**Prevention:** Every long-running cron must log to feed_runs before and after. An unlogged run is an invisible run.

## [2026-04-22] — Amendment flag had no way to mark as reviewed

**Problem:** Amendment badge would render forever once `amendment_count > 0`. No review column, no button. Users had to mentally track which amendments they'd already dealt with.

**Fix:** Added `last_reviewed_amendment_count`, `amendment_reviewed_at`, `amendment_reviewed_by`, `amendment_review_notes` to gov_leads. Added "Mark Reviewed" button next to the badge. Added /api/leads/review-amendment endpoint. Badge gray/strikes through when reviewed; re-appears red automatically when feed detects a new amendment (amendment_count bumps above last_reviewed_amendment_count).

**Prevention:** Any "flag" column needs a "flag cleared at" partner column from day one.
