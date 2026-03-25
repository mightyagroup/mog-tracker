# LESSONS LEARNED — MOG Tracker App

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
