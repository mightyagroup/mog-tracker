# MOG Tracker App Overhaul

## Tech Stack
- Next.js on Vercel, Supabase backend
- Pages: `/` (Command Center), `/exousia`, `/ironhouse`, `/vitalx`, `/contacts`, `/compliance`
- Each entity tracker: Leads, Subcontractors, Active Bids, Awards, Pricing Calculator, Contacts
- USASpending proxy at `/api/usaspending` (POST)

## ABSOLUTE RULES (read before touching any code)

1. **Never fabricate data.** No fake solicitation numbers, no placeholder contract values, no dummy incumbents. If data doesn't exist, show "Not Found" or leave the field empty.
2. **Never hardcode secrets in source files.** All API keys, database URLs, webhook tokens go in environment variables only. No Supabase project IDs, no API keys in committed code.
3. **Never display aggregate national spending as contract-specific pricing.** This is the #1 trust issue. If you can't find the specific contract data, say so. Don't show a $251M national aggregate as if it's a $40K grounds maintenance contract.
4. **Never auto-generate solicitation numbers.** Every solicitation number must come directly from SAM.gov source data. If the source doesn't have one, leave it blank.
5. **Never skip error handling.** Every API call needs try/catch, every database write needs validation, every user input needs sanitization.
6. **Never expose internal system details to the client.** Error messages to the user should be generic. Stack traces, database errors, and API keys stay server-side.
7. **Security first.** All webhook endpoints require bearer token auth. All Supabase queries use RLS. All user inputs are sanitized against XSS/injection. All API routes validate request shape before processing.

---

## PHASE 1: CRITICAL FIXES (do these first, in order)

### 1. Fix USASpending Integration

**Problem:** The `/api/usaspending` route searches by NAICS code broadly and returns national aggregates sorted by total amount descending. This means DHS Massena (a $40K/yr grounds contract) showed "AED STRATECON LLC" at $251M, and BEJ Custodial (a $55-75K/yr contract) showed $759M. Users cannot trust the pricing intel.

**Fix:** Rewrite `/api/usaspending` with a waterfall lookup:

```
Step 1: Search by EXACT solicitation number (piid or award_id)
  -> Match found? Use it. Done.

Step 2: No solicitation match -> Search by NAICS + place_of_performance (state/city from the lead record)
  -> Return the top result for THAT location, not the national leader

Step 3: No location match -> Search by NAICS + awarding_agency
  -> Sort by most recent award date, not by total amount

Step 4: No results at all -> Display "No prior award data found for this specific contract"
  -> DO NOT fall back to showing national NAICS aggregates
```

**API details:**
- Endpoint: `POST https://api.usaspending.gov/api/v2/search/spending_by_award/`
- Filters: `award_type_codes` ["A","B","C","D"], `naics_codes`, `place_of_performance_locations`, `time_period` (last 5 years)
- Public API, no auth needed, but cache results in Supabase to avoid hammering it

**UI changes:**
- Show match method badge: "Matched by: Solicitation" / "Location" / "Agency"
- Show confidence: High (solicitation) / Medium (location) / Low (agency)
- Show SPECIFIC award amounts, never aggregated totals
- Add "Manual Override" toggle: user corrects pricing/incumbent and locks it from auto-refresh
- Add a `usaspending_match_method`, `usaspending_confidence`, and `manual_pricing_override` column to the leads table

### 2. Fix Export Button

**Problem:** Export button click handler does nothing. No network request, no file download.

**Fix:**
- Generate CSV with all lead columns: Title, Solicitation #, Agency, Deadline, Value, Incumbent, Prev Award, Fit, Status, Category, Source, Place of Performance, NAICS, Proposal Lead, CO Name, CO Email, Notes
- Trigger browser download of the CSV file
- Show toast confirmation: "Exported X leads to CSV"
- CSV must be re-importable through the Import function (round-trip)

### 3. Fix Duplicate Leads

**Problem:** Same opportunity imported multiple times (e.g., DHS Massena appears twice with different deadline dates).

**Fix:**
- On import: if a lead with the same solicitation number already exists for that entity, UPDATE the existing record instead of creating a new one
- Add unique constraint on (entity_id, solicitation_number) in Supabase
- Add "Merge Duplicates" utility: scan for matching solicitation numbers, let user pick which data to keep
- After deploying, run a one-time cleanup to merge existing duplicates

### 4. Solicitation Number Validation

**Problem:** Some leads have solicitation numbers that don't exist on SAM.gov. They were fabricated during import.

**Fix:**
- Add `solicitation_verified` boolean column (default: false)
- On lead create/import: if the number doesn't come directly from a SAM.gov API response, set `solicitation_verified = false` and show a yellow "Unverified" badge
- Add "Verify on SAM.gov" link button that opens `https://sam.gov/opp/{noticeId}/view`
- Add a batch verification API route that checks unverified solicitations against SAM.gov
- Run batch verification daily via Vercel cron
- On CSV/Notion import: map the solicitation column directly. If empty, leave empty. Never generate one.

---

## PHASE 2: SERVICE CATEGORIES (Nascence Playbook Alignment)

### IronHouse Categories: EXACTLY 4, no more

| Category | NAICS | PSC |
|----------|-------|-----|
| Custodial / Janitorial Services | 561720 | S201 |
| Landscaping / Grounds Maintenance | 561730 | S208 |
| Solid Waste Collection | 562111 | S205 |
| Facilities Operations Support | 561210 | S216 |

Remove "Construction Adjacent", "Procurement/Logistics Consulting", and "Administrative Services" from IronHouse. Run a migration: check each existing lead's title and NAICS, assign the best-fit Nascence category. Leads that don't fit any of the 4 get a "Misfit" flag for manual review.

### Exousia Categories: Nascence Pillars + Procurement

| Category | NAICS |
|----------|-------|
| Custodial / Janitorial Services | 561720 |
| Landscaping / Grounds Maintenance | 561730 |
| Solid Waste Collection | 562111 |
| Facilities Operations Support | 561210 |
| Procurement / Logistics Consulting | 541614, 541611 |

Remove "Construction Adjacent", "Administrative Services", and "Cybersecurity / RMF Advisory" from Exousia. Same migration logic as IronHouse.

### VitalX Categories: Healthcare Logistics

| Category | NAICS |
|----------|-------|
| Medical Courier / Specimen Transport | 492110 |
| NEMT (Non-Emergency Medical Transport) | 485999 |
| Lab Services Support | 621511 |
| Pharmacy Delivery | 492210 |
| Mobile Diagnostics | 621999 |
| General Healthcare Support | 621999 |

Remove "General Support" (too vague).

---

## PHASE 3: LEAD SOURCING AND SCORING

### SAM.gov Auto-Sourcing

Add automated lead sourcing from SAM.gov Opportunities API for ALL entities:

- **Endpoint:** `https://api.sam.gov/prod/opportunities/v2/search`
- **Auth:** API key in env var `SAMGOV_API_KEY` (user obtains from sam.gov/profile/details)
- **Rate limit:** 1,000 requests/day. Cache all results in Supabase.
- **Search by entity NAICS codes:** IronHouse (561720, 561730, 562111, 561210), Exousia (same + 541614, 541611), VitalX (492110, 485999, 621511, 492210)
- **Filter:** Posted in last 30 days, types = Combined Synopsis/Solicitation + Solicitation + Sources Sought, set-asides = SB/WOSB/EDWOSB/8(a)
- **VitalX geographic priority:** DMV region (VA, MD, DC) first, then nationwide
- **Daily Vercel cron job** to pull new opportunities and import as "New" leads
- **Deduplication on import:** check solicitation number against existing leads before inserting

### Fit Score Algorithm (0-100)

```
set_aside_match     * 25  // EDWOSB/WOSB/8(a)/SB match = 25, no match = 0
naics_alignment     * 20  // Primary NAICS match = 20, secondary = 10, none = 0
geographic_fit      * 15  // DMV = 15, within 500mi = 10, nationwide = 5, overseas = 0
contract_value      * 20  // $500K+ = 20, $200-499K = 18, $100-199K = 15, $50-99K = 10, $25-49K = 5, under $25K = 2
agency_history      * 10  // Won with this agency before = 10, bid before = 5, new = 0
deadline_viability  * 10  // >14 days = 10, 7-14 = 7, 3-7 = 4, <3 days = 0
```

- Add per-entity "Minimum Fit Score" setting (default 40). Leads below threshold auto-hide.
- Add "High Value Only" toggle filter ($100K+ estimated value)
- Add "Top 5 Recommendations" section per entity dashboard: Fit > 60, Value > $50K, Deadline > 7 days, matching set-aside. Include "Dismiss" button.

---

## PHASE 4: AUTOMATION AND INTEGRATION

### Make.com Webhook Endpoints

Create these API routes, all secured with bearer token from `WEBHOOK_SECRET` env var:

- `POST /api/webhooks/new-lead` — Create lead from external trigger
- `POST /api/webhooks/update-lead` — Update existing lead by solicitation number
- `GET /api/webhooks/active-bids` — Return current active bids for alert triggers

**Security requirements for webhooks:**
- Validate bearer token on every request. Reject with 401 if missing or wrong.
- Validate request body shape. Reject malformed payloads with 400.
- Rate limit: max 100 requests per minute per IP.
- Log all webhook calls to a `webhook_logs` table (timestamp, source IP, endpoint, success/failure). Do NOT log the bearer token.
- Sanitize all incoming data before writing to the database.

### Notion Integration (v1: CSV improvement)

- Fix CSV import to handle Notion export column names, date formats, and encoding
- Deduplication on import (check solicitation number)
- If the user later provides a `NOTION_API_KEY` env var, add a "Sync with Notion" button for direct API pull

---

## PHASE 5: ENHANCEMENTS

### Subcontractor Management
- Link subcontractors to specific leads (many-to-many)
- Track status per lead: Contacted, Interested, SIF Sent, SIF Received, Selected, Rejected
- Suggest subcontractors based on NAICS + geography match

### Bid Package Tracking
- When lead moves to "Active Bid", auto-create checklist (already works). Add:
  - File upload per checklist item (Supabase Storage)
  - "Bid Package Complete" percentage
  - Deadline countdown with color coding: green >7d, yellow 3-7d, red <3d, black overdue

### Pipeline Analytics (Command Center)
- Win Rate: Awards / (Awards + Lost) %
- Pipeline by Agency (bar chart)
- Pipeline by Value Tier
- Nascence Playbook Alignment Score: % of active pipeline in the 4 Nascence NAICS codes
- Monthly pipeline trend (line chart)

### Data Hygiene (automated)
- Auto-archive leads 30+ days past deadline
- Flag leads missing deadline or NAICS code
- Daily Vercel cron for archiving and flagging

---

## SECURITY REQUIREMENTS (apply to ALL phases)

### Application Security
- **Input sanitization:** Sanitize all user inputs and API payloads against XSS, SQL injection, and NoSQL injection before processing or storing
- **CORS:** Restrict allowed origins to the production domain only. No wildcard origins.
- **Rate limiting:** Add rate limiting to all public-facing API routes (USASpending proxy, webhooks, SAM.gov search). Use Vercel Edge middleware or an in-memory store.
- **Error handling:** All API routes must have try/catch. Return generic error messages to the client. Log detailed errors server-side only. Never expose stack traces, database errors, or env var values.
- **Content Security Policy:** Add CSP headers to prevent XSS via script injection

### Database Security (Supabase)
- **Row Level Security (RLS):** Enable RLS on ALL tables. Define policies so that:
  - Reads are scoped to the authenticated app service role
  - Writes validate the entity context (a webhook for IronHouse can't write to Exousia leads)
  - Delete operations are restricted (soft delete via archive flag, not hard delete)
- **Audit trail:** Add `created_at`, `updated_at`, and `updated_by` columns to all tables. Track who/what changed data and when.
- **No direct client-side Supabase access with the service role key.** All writes go through Next.js API routes that validate and sanitize first.

### Secrets Management
- All secrets in Vercel environment variables, never in code or config files
- Required env vars: `SAMGOV_API_KEY`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
- Optional: `NOTION_API_KEY`
- Add a startup check: if required env vars are missing, log an error and fail gracefully instead of crashing with an exposed error

### API Security
- SAM.gov API: respect the 1,000/day rate limit. Implement a counter with daily reset. If limit approached, queue requests for next day.
- USASpending API: cache results in Supabase (keyed by solicitation + NAICS + location). Re-fetch only if cache is older than 7 days.
- All outbound API calls use HTTPS only. No HTTP fallback.

---

## ENVIRONMENT VARIABLES

```
# Already set in Vercel — DO NOT create duplicates or rename these
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL (already set)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key (already set)
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (already set, Production only)
SAMGOV_API_KEY=                    # SAM.gov API key (already set, All Environments)
CRON_SECRET=                       # Vercel cron job auth (already set)
WEBHOOK_SECRET=                    # Make.com webhook bearer token (already set, All Environments)

# Optional — not yet set
NOTION_API_KEY=                    # For future Notion direct sync
```

---

## IMPLEMENTATION ORDER

1. Fix USASpending waterfall lookup (Phase 1.1) — trust issue, breaks pricing intel
2. Fix Export button (Phase 1.2) — blocks all bulk operations
3. Fix duplicate leads + add unique constraint (Phase 1.3)
4. Solicitation validation + Unverified badges (Phase 1.4)
5. Update service categories per entity + run migration (Phase 2)
6. SAM.gov auto-sourcing + daily cron (Phase 3)
7. Fit score algorithm rewrite (Phase 3)
8. Security hardening pass: RLS, input sanitization, rate limiting, CSP, CORS (Security section)
9. Make.com webhooks (Phase 4)
10. Pipeline analytics and enhancements (Phase 5)

**After each phase, test thoroughly before moving to the next.** Don't stack untested changes.
