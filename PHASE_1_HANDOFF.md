# MOG Tracker — Phase 1 Handoff Document

**Date:** April 25, 2026
**Owner:** Emmanuela Wireko-Brobbey (admin@mightyoakgroup.com)
**Project root:** `/Users/ellawireko-brobbey/Documents/Automation/mog-tracker-app`
**Purpose:** Pick up Phase 1 (Bid Starter auto-generation) in a fresh session without losing context.

---

## QUICK START FOR THE NEXT SESSION

If you are reading this in a fresh session, do these three things first:

1. Read this entire document. Do not skim.
2. Read `CLAUDE.md` and `PROPOSAL_PLATFORM_STATE.md` in the project root for the broader codebase rules.
3. Read `src/lib/bid-templates/source/01_Contract_Intel_Sheet.docx` and `src/lib/bid-templates/source/14_SIF_Subcontractor_Information_Form.docx` (the SOBERS SIF) using python-docx, since the SOBERS SIF defines the per-sub format Ella has approved.

Then start at **Section 7: Implementation Plan for Phase 1** below.

The user explicitly said: **"Don't waste time anymore cutting corners and doing half-assed job."** Follow that. Verify every step. Do not delegate detail work to subagents.

---

## 1. PROJECT OVERVIEW

MOG Tracker is a federal and commercial bid tracking platform for Mighty Oak Group (MOG), the parent management company over three operating entities:

- **Exousia Solutions LLC** — Cybersecurity compliance, facilities management, government contracting. WOSB. UEI XNZ2KYQYK566, CAGE 0ENQ3.
- **VitalX LLC** — HIPAA-compliant healthcare logistics, medical courier, DMV region.
- **IronHouse Janitorial & Landscaping Services LLC** — Janitorial, landscaping, facilities maintenance. Husband Nana Badu's company.

The app replaces Notion bid trackers, HubSpot CRM, GovWin IQ, and Make.com. It runs alongside Google Workspace, SAM.gov, Wave/QuickBooks, Deel, Jotform, Tookan, Calendly, DeepRFP.

### Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 App Router, TypeScript |
| Styling | Tailwind |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth (email/password) with `app_metadata.roles` for admin |
| Hosting | Vercel (auto-deploy from GitHub `main` branch) |
| Drive | Per-entity service account JSON OR per-user OAuth refresh token |
| LLM | Anthropic Claude (multimodal for PDF parsing) |

### Live URLs

- App: `https://mog-tracker-app.vercel.app`
- GitHub: `https://github.com/mightyagroup/mog-tracker`
- Supabase project: `https://lqymdyorcwgeesmkvvob.supabase.co`
- Vercel project: `mightyagroup` org, `mog-tracker-app` project

### Roles

- **admin** — Ella. Full access. Manages users. Permanently deletes leads.
- **manager** — Full data read/write across all entities. No user mgmt.
- **va_entity** — Read/write only assigned entities. No permanent delete.
- **va_readonly** — Read-only for assigned entities.
- **viewer** — Read-only across all entities.

---

## 2. PHASE STATUS AS OF 2026-04-25

### Shipped (Working in Production)

- Per-entity Google Drive (service account, fallback). Admin UI at `/admin/entity-drives`.
- Per-user Google Drive (each user can connect their own folder via OAuth or admin sets it). Admin UI at `/admin/team-drives`. User UI at `/settings/drive`.
- Solicitation file upload on the proposal intake page.
- Solicitation parser (`/api/proposals/parse-solicitation`) using Claude.
- Proposal generation (older system, `src/lib/proposals/generate-proposal.ts`). This is generic, NOT the new Bid Starter system. Build alongside, not replacing.
- SAM.gov daily feed (`/api/cron/sam-feed`).
- USASpending incumbent research helper.
- Pricing calculators (Gov + Commercial).
- Light/dark mode toggle.
- Per-lead CSV export with UTF-8 BOM.
- Subcontractor management (`subcontractors` table + UI).
- Master contacts.
- Compliance items.

### Half-Built or Stub

- eVA scraper (`/api/cron/eva-feed`) — blocked by AWS WAF. Detects and reports cleanly. Manual import via POST works. Future fix: email-notification ingestion (Task #39).
- eMMA + DC procurement portals — not investigated yet (Task #40).

### Not Started (Phase 1 — what this handoff is about)

- 12-doc Bid Starter package generator (auto-generated when solicitation uploaded).
- Per-sub outreach generator (SIF + email per sub, on-demand).
- Final submission package generator (the 7 docs that go to the CO).
- Master subcontract agreement package (post-award, the 9-doc SOBERS-style agreement).

---

## 3. THE 4-PHASE BID DOCUMENT ARCHITECTURE

This is the canonical structure Ella confirmed. Build to this exactly.

### Folder structure (per active bid)

```
[KeyServiceLocation]-[Agency]-[SolicitationNumber]/
  Example: MowingToronto-DOD-W912BV26QA047
  Example: WarrenBridgeCleaning-DOI-140L6226Q0008

├── 01_Contract_Intel_Sheet.docx           [INTERNAL]
├── 02_USASpending_Deep_Dive.docx          [INTERNAL]
├── 03_Wage_Determination.docx             [INTERNAL]   not in source templates yet, build new
├── 04a_Proposal_Pricing.docx              [INTERNAL]
├── 04b_Proposal_Technical.docx            [INTERNAL]   not in source templates yet, build new
├── 05_Subcontractor_Scope_of_Work.docx    [SANITIZED — goes to subs]
├── 06_Sub_Outreach_Email.docx             [SANITIZED]  not in source templates yet, build new
├── 07_Subcontractor_Search.docx           [INTERNAL]   VA's main working tool
├── 08_Tracker_Workbook.xlsx               [INTERNAL]   not in source templates yet, build new
├── 09_To_Do_List.docx                     [INTERNAL]   not in source templates yet, build new
├── 10_Risk_Log.docx                       [INTERNAL]   not in source templates yet, build new
├── 11_Contract_Summary.docx               [INTERNAL]
├── 12_Game_Plan.docx                      [INTERNAL]   not in source templates yet, build new
├── 13_Submission_Checklist.docx           [INTERNAL]
│
├── Sub_Outreach/                          [generated per-sub on demand, Phase 2]
│   ├── [SubName]_SIF.docx                 [SANITIZED — SOBERS format]
│   └── [SubName]_Outreach_Email.docx      [SANITIZED]
│
└── Final_Submission/                      [generated when ready to submit, Phase 3]
    ├── 0_SUBMISSION_CHECKLIST.docx
    ├── 1_Cover_Letter_Submission.docx
    ├── 2_SF1449_Page1.pdf (signed)
    ├── 3_Contractor_Information_Sheet.docx
    ├── 4_Pricing_Schedule.docx + .xlsx
    ├── 5_Subcontractor_Data_Worksheet.docx
    └── 6_Representations_and_Certifications.docx

[Post-award only, Phase 4]
└── Subcontract_Agreement_[SubName]/
    ├── 01_Master_Subcontract_Agreement.docx
    ├── 02_Exhibit_A_Statement_of_Work.docx
    ├── 03_Exhibit_B_Pricing_Schedule.xlsx
    ├── 04_Exhibit_C_FAR_Flow_Down_Clauses.docx
    ├── 05_Exhibit_D_Insurance_Requirements.docx
    ├── 06_Exhibit_E_Mutual_NDA.docx
    ├── 07_Exhibit_F_Invoice_Template.xlsx
    ├── 08_Exhibit_G_Annual_Mowing_Calendar.xlsx
    └── 09_Exhibit_H_Onboarding_Compliance_Checklist.docx
```

### What goes where (Drive sync rules)

- **Ella's Drive** (`VA Operations/Exousia/Active_Bids/[FolderName]/`): full bid folder, all docs.
- **VA's Drive** (`VA Operations/Exousia/Active_Bids/[FolderName]/`): subset she needs to do her work. Includes: Contract_Summary, Subcontractor_Scope_of_Work, Subcontractor_Search (FULL detail, not censored), Sub_Outreach folder, To_Do_List, Risk_Log. Excludes: Pricing, USASpending_Deep_Dive, Game_Plan, Final_Submission folder.
- **Subs** never see any internal doc. They only receive the Sub_Outreach docs that Ella explicitly emails them.

### Phase definitions

| Phase | Scope | Trigger | Status |
|---|---|---|---|
| 1 | Bid Starter (12 docs at top of bid folder) | Solicitation file upload + "Generate Bid Starter" button | NEXT BUILD |
| 2 | Per-sub outreach (SIF + email per sub) | "Generate outreach for [Sub]" button next to each candidate in Subcontractor_Search results | After Phase 1 ships |
| 3 | Final submission (7 docs in Final_Submission/) | "Generate Final Submission" button after pricing + tech narrative locked | After Phase 2 |
| 4 | Master subcontract agreement (9 docs) | Post-award, after sub signs NDA, "Generate Subcontract Agreement for [Sub]" | After Phase 3 |

---

## 4. CRITICAL OPERATIONAL RULES (locked in)

### Rule 1: OPSEC (sub-facing docs strip bid identifiers)

The 3 docs that go to subs CANNOT include:

- Solicitation number (e.g., W912BV26QA047)
- Agency name (e.g., U.S. Army Corps of Engineers, Department of Defense, USACE)
- Sub-agency / district (e.g., Tulsa District, Wilmington District)
- Contracting Officer name, email, phone
- Notice ID, SAM.gov URL
- Estimated contract value
- Incumbent / USASpending / win-probability data

These docs reference "a federal contract" + work locations + scope only. The 3 docs:

1. `05_Subcontractor_Scope_of_Work.docx` (in Bid Starter)
2. `06_Sub_Outreach_Email.docx` (in Bid Starter)
3. `[SubName]_SIF.docx` and `[SubName]_Outreach_Email.docx` (Phase 2)

The Master Subcontract Agreement (Phase 4) DOES include the sol# because by then the sub has signed an NDA and is under contract. That's the right tradeoff.

### Rule 2: Subcontractor_Search.docx is INTERNAL — full detail, no censoring

Originally I proposed a stripped version for VA. Wrong. VA needs the full doc to do her job (call subs, review capabilities, make recommendations). Subs never see this doc.

### Rule 3: Verification badges (never claim verification we haven't done)

Every sub in the search results gets one of four badges:

| Badge | Meaning |
|---|---|
| ✅ SAM.gov Verified | UEI active in last 30 days, set-asides match |
| ⚠️ Listed, Not Confirmed | Found in DSBS but auto-verify failed, manual check needed |
| 🔍 Web Research Only | Not in DSBS, must register before contracting |
| ❌ Unable to Verify | Conflicting/stale info, manual research needed |

Contact info gets a fresh pull at search time (not cached): phone reachability, website 200/404 check, Google business listing match. Flag stale/broken info with specifics so VA knows what to verify manually.

### Rule 4: Quality over quantity

Cap candidate list at 12-15 subs per bid. Better 8 well-vetted subs than 25 with shaky data.

### Rule 5: SIF format (per-sub, on demand, SOBERS pattern)

The SIF is a personalized doc for ONE specific sub. Pre-filled with everything we already know (from the solicitation + light web research about that sub) so the sub fills only the gaps.

Section structure (locked, taken from `Sobers Lawn Care SIF.docx`):

| Section | Source | Content |
|---|---|---|
| Header (entity, "Subcontractor Information & Pricing Form", region, month/year) | bid + sub research | auto |
| "Dear [FirstName]," | sub research | owner first name from web |
| Opening paragraph (what bid is about) | bid | from parsed solicitation |
| Return-by date | computed | solicitation deadline minus 2 days |
| §1 Company Info | sub research + blanks | name, contact, phone, email pre-filled with "[Please confirm]". Address, EIN, employees, biz reg # left blank. |
| §2 Required Documents | bid | Licenses, insurance minimums (specific $ amounts from solicitation), equipment specs, safety plan reqs |
| §3 Work Locations + Scope | bid | Place of perf, season, hours, holidays |
| §4 Pricing Table | bid (CLINs) | One row per CLIN with description, cycles/yr, units, qty pre-filled. Sub fills $ |
| §5 Availability + Experience | bid-tailored | Specific to this contract |
| §6 On-Site Requirements | bid | Bullet list of operational reqs |
| §7 Confirmation | static | Signature block |
| Return Instructions | bid + entity | What to send back, where |

Web research depth (per-sub):

- Light by default: website + Google business listing
- Plus: whatever the solicitation requires the sub to provide (licenses, certs, insurance certs)
- Pre-fill anything we can confirm via web. Leave blank what we cannot.

---

## 5. SOURCE TEMPLATES INVENTORY

19 source templates copied to `src/lib/bid-templates/source/` from Ella's real bid folders. **This folder is gitignored** (proprietary). Don't commit it.

### Bid Starter source templates (8 of 12 docs exist as samples)

| File | Source | Maps to Phase 1 doc |
|---|---|---|
| 01_Contract_Intel_Sheet.docx | Bid Starter | 01 |
| 02_USASpending_Deep_Dive.docx | Bid Starter | 02 |
| 04_Proposal_Pricing.docx | Bid Starter | 04a |
| 05_Subcontractor_Scope_of_Work.docx | Bid Starter (was "Subcontractor Scope of Work (1).docx") | 05 |
| 07_Subcontractor_Search.docx | Bid Starter | 07 |
| 11_Contract_Summary.docx | Bid Starter | 11 |
| 13_Submission_Checklist.docx | Final Submission folder (was "0_SUBMISSION_CHECKLIST.docx") | 13 |
| 14_SIF_Subcontractor_Information_Form.docx | Bid Starter (was "Sobers Lawn Care SIF.docx") | Phase 2 reference |

### Bid Starter docs Ella does NOT have samples for (build from scratch using federal best practices + Exousia voice)

- 03_Wage_Determination.docx — extract DOL wage rates from solicitation + add SCA disclaimer
- 04b_Proposal_Technical.docx — technical narrative
- 06_Sub_Outreach_Email.docx — cold outreach email to subs (sanitized per OPSEC rule)
- 08_Tracker_Workbook.xlsx — multi-sheet bid tracker
- 09_To_Do_List.docx — step-by-step what to do based on solicitation requirements
- 10_Risk_Log.docx — risk register
- 12_Game_Plan.docx — strategic approach

### Final Submission source templates (Phase 3)

| File | Original location |
|---|---|
| 15_Cover_Letter_Submission.docx | Final Submission/1_Cover_Letter_Submission.docx |
| 16_Contractor_Information_Sheet.docx | Final Submission/3_Contractor_Information_Sheet.docx |
| 17_Pricing_Schedule.docx | Final Submission/4_Pricing_Schedule.docx |
| 18_Subcontractor_Data_Worksheet.docx | Final Submission/5_Subcontractor_Data_Worksheet.docx |
| 19_Representations_and_Certifications.docx | Final Submission/6_Representations_and_Certifications.docx |

(Also `2_SF1449_Page1.pdf` is a federal form, no template needed.)

### Subcontract Agreement source templates (Phase 4 — SOBERS pattern)

| File | Original location |
|---|---|
| 20_Master_Subcontract_Agreement.docx | Subcontractor Agreement EXOUSIA SOBERS/01_Master_Subcontract_Agreement.docx |
| 21_Exhibit_A_SOW.docx | 02_Exhibit_A_Statement_of_Work.docx |
| 22_Exhibit_C_FAR_Flow_Down.docx | 04_Exhibit_C_FAR_Flow_Down_Clauses.docx |
| 23_Exhibit_D_Insurance.docx | 05_Exhibit_D_Insurance_Requirements.docx |
| 24_Exhibit_E_NDA.docx | 06_Exhibit_E_Mutual_NDA.docx |
| 25_Exhibit_H_Onboarding_Checklist.docx | 09_Exhibit_H_Onboarding_Compliance_Checklist.docx |

### Test data paths (real solicitations Ella has worked)

These are accessible via mounted Downloads folder:

- `/Users/ellawireko-brobbey/Downloads/Bid Starter/W912BV26QA047/` — Mowing Toronto Lakes (DoD/USACE), full sample bid she submitted
- `/Users/ellawireko-brobbey/Downloads/Bid Starter/W912BV26QA047/Solicitation_W912BV26QA047.pdf` — the source PDF for end-to-end testing
- `/Users/ellawireko-brobbey/Downloads/Final Submission W912BV26QA047/` — what Ella actually submitted

For Bash workspace: `/sessions/<id>/mnt/Downloads/...`

### Extracted text dumps (for studying structure)

Already extracted to `.tmp/sample_bid_extract/` (gitignored):

- `Bid_Starter.json`
- `Final_Submission_W912BV26QA047.json`
- `Subcontractor_Agreement_EXOUSIA_SOBERS.json`
- `Exousia_Templates.json`

These are JSON dumps of every paragraph and table from the original docx files. Useful for understanding structure without re-running python-docx.

---

## 6. TASKS REMAINING (in priority order)

| # | Task | Status | Priority |
|---|---|---|---|
| 48 | Phase 1A.1 — Tokenize 12 bid-level templates (no SIF) | pending | 1 |
| 43 | Phase 1B — Solicitation parser via Claude multimodal | pending | 2 |
| 44 | Phase 1C — Doc generator (template substitution engine) | pending | 3 |
| 45 | Phase 1D — Subcontractor search engine | pending | 4 |
| 46 | Phase 1E — /api/proposals/[id]/generate-bid-starter endpoint | pending | 5 |
| 47 | Phase 1F — UI button + progress on intake page | pending | 6 |
| 49 | Phase 2 — Per-sub outreach generator (SIF + Email) | pending | 7 |
| 39 | Build eVA email-notification ingestion pipeline | pending | low |
| 40 | Investigate eMMA + DC procurement portals | pending | low |

Tasks 1-3 are the critical path (#41 deferred to next session). Tasks 4-6 round out Phase 1. Task 7 (Phase 2) ships next.

---

## 7. IMPLEMENTATION PLAN FOR PHASE 1

### Order of operations (do not skip, do not parallelize until you understand dependencies)

#### Step 1 — Tokenize 12 templates (Task #48) — DO IT YOURSELF, no subagent

Subagent attempt on 2026-04-25 failed silently (claimed success, produced byte-identical copies of source). Do this manually.

For each of the 8 source templates that exist (`01`, `02`, `04`, `05`, `07`, `11`, `13`, `15`-`19`), use python-docx to:

1. Open the source file
2. Walk every paragraph and every table cell
3. Replace dynamic content with `{{TOKEN}}` placeholders. Token naming: see token list below.
4. Save to `src/lib/bid-templates/tokenized/[same-filename].docx`

For the 4 missing docs (`03`, `06`, `08`, `09`, `10`, `12`), write fresh templates from scratch using the federal best-practice format. Match Exousia's brand voice from the existing samples (see `src/lib/proposals/brand-config.ts` and `src/lib/proposals/entity-data.ts` for canonical entity values).

**Token naming convention** (snake_case, descriptive):

```
Entity tokens (from entity-data.ts):
  ENTITY_NAME, ENTITY_UEI, ENTITY_CAGE, ENTITY_NAICS_PRIMARY,
  ENTITY_NAICS_DESCRIPTION, ENTITY_BUSINESS_TYPE, ENTITY_PROPOSAL_LEAD,
  ENTITY_SAM_EMAIL, ENTITY_PUBLIC_EMAIL, ENTITY_PHONE,
  ENTITY_ADDRESS_PRIMARY, ENTITY_ADDRESS_REMITTANCE

Solicitation tokens (from solicitation parser):
  SOL_NUMBER, SOL_TITLE, SOL_AGENCY, SOL_SUB_AGENCY,
  SOL_NOTICE_ID, SOL_SAM_URL, SOL_SOURCE,
  SOL_NAICS, SOL_NAICS_DESCRIPTION, SOL_SIZE_STANDARD, SOL_PSC_CODE,
  SOL_SET_ASIDE, SOL_CONTRACT_TYPE,
  SOL_PLACE_OF_PERFORMANCE, SOL_BASE_PERIOD, SOL_OPTION_YEARS,
  SOL_RESPONSE_DEADLINE, SOL_RESPONSE_DEADLINE_DATE_ONLY,
  SOL_QUESTIONS_DEADLINE, SOL_SITE_VISIT_DATE,
  CO_NAME, CO_TITLE, CO_EMAIL, CO_PHONE,
  KO_CONTACT_SPECIALIST_NAME, KO_CONTRACTING_OFFICER_NAME,
  SOL_ESTIMATED_VALUE, SOL_AWARD_AMOUNT, SOL_INCUMBENT_CONTRACTOR,
  SOL_SCOPE_SUMMARY, SOL_WORK_LOCATIONS,
  SOL_REQUIRED_LICENSES, SOL_INSURANCE_REQUIREMENTS,
  SOL_EQUIPMENT_REQUIREMENTS, SOL_SAFETY_REQUIREMENTS,
  SOL_EVALUATION_FACTORS, SOL_SUBMISSION_REQUIREMENTS, SOL_FAR_CLAUSES,
  WAGE_DETERMINATION_NUMBER, WAGE_DETERMINATION_REVISION_DATE

Computed tokens:
  TODAY_DATE, TODAY_MONTH_YEAR, RETURN_BY_DATE

Block placeholders (special — renderer expands these):
  SOL_CLIN_TABLE          (for pricing CLIN tables)
  SUB_CANDIDATES_BLOCK    (for 07_Subcontractor_Search candidate list)
  PRIOR_AWARDS_TABLE      (for 02_USASpending_Deep_Dive prior awards)
```

**OPSEC enforcement during tokenization:**

`05_Subcontractor_Scope_of_Work.docx` MUST NOT contain any of these tokens: `SOL_NUMBER`, `SOL_AGENCY`, `SOL_SUB_AGENCY`, `CO_*`, `SOL_NOTICE_ID`, `SOL_SAM_URL`, `SOL_ESTIMATED_VALUE`, `SOL_INCUMBENT_CONTRACTOR`. Replace with generic phrasing in the static text. Same rule for 06, and for the per-sub SIF in Phase 2.

**Verification step:** After tokenizing each file, open it with python-docx and count `{{...}}` patterns. If count is 0, you didn't actually modify the file (this is what the subagent did wrong). Re-do.

**Output:** `src/lib/bid-templates/tokenized/*.docx` + `_token_map.json` + `AUDIT.md`. The whole `bid-templates/` folder is gitignored for now until verified clean.

#### Step 2 — Solicitation parser (Task #43)

File: `src/lib/solicitation-parser.ts`

API: `parseSolicitation(buffer: Buffer, mimeType: string): Promise<ParsedSolicitation>`

Use Claude multimodal API to extract structured fields from a PDF or DOCX solicitation. Return type:

```typescript
type ParsedSolicitation = {
  solicitation_number?: string
  title?: string
  agency?: string
  sub_agency?: string
  notice_id?: string
  sam_url?: string
  naics?: string
  naics_description?: string
  size_standard?: string
  psc_code?: string
  set_aside?: string
  contract_type?: string
  place_of_performance?: string
  base_period?: string
  option_years?: number
  response_deadline?: string  // ISO timestamp
  questions_deadline?: string
  site_visit_date?: string
  co_name?: string
  co_title?: string
  co_email?: string
  co_phone?: string
  ko_contact_specialist_name?: string
  ko_contracting_officer_name?: string
  estimated_value?: number
  scope_summary?: string  // 1-paragraph plain language
  work_locations?: string[]  // bulleted
  required_licenses?: string[]
  insurance_requirements?: string[]
  equipment_requirements?: string[]
  safety_requirements?: string[]
  evaluation_factors?: string[]  // Section M
  submission_requirements?: string[]  // Section L
  far_clauses?: string[]  // FAR clauses cited
  wage_determination_number?: string
  wage_determination_revision_date?: string
  clins?: Array<{ clin_number: string; description: string; qty: number; unit: string }>
}
```

**Existing infrastructure to reuse:**

- `src/app/api/proposals/parse-solicitation/route.ts` — already calls Claude. Read it first; you may extend rather than replace.
- `src/lib/file-parsers.ts` — handles PDF, DOCX, XLSX, image, CSV, text. Reuse for input handling.
- Anthropic API key is in `ANTHROPIC_API_KEY` env var (Vercel + .env.local).

**Apply text-utils:** After Claude returns the JSON response, run `fixMojibakeDeep()` from `src/lib/text-utils.ts` on the result before persisting.

#### Step 3 — Doc generator (Task #44)

File: `src/lib/bid-templates/generator.ts`

API: `generateBidDoc(templateName: string, tokens: Record<string, string | string[]>): Promise<Buffer>`

Use python-docx via a Node child process OR use the JS `docx` library (already a dep at `docx@^9.0.0`). The python-docx approach has higher fidelity for preserving formatting.

Recommended approach: use `docx` library + a custom token replacer that walks the document XML directly (since python-docx requires Python which isn't available on Vercel serverless).

Algorithm:

1. Load tokenized .docx as a binary
2. Unzip in-memory (docx is a zip of XML files)
3. Find every `{{TOKEN}}` in `word/document.xml` and `word/header*.xml`, `word/footer*.xml`
4. Replace with the value from the tokens map
5. For block placeholders (`{{SOL_CLIN_TABLE}}`, etc.), expand into table rows or paragraphs as needed
6. Re-zip and return Buffer

**Library options:**

- `docxtemplater` (npm) — purpose-built for this use case. Add as dep.
- Or roll your own with `pizzip` + `xmldom`.

`docxtemplater` is the simpler call. Install with `npm install docxtemplater pizzip`.

#### Step 4 — Subcontractor search engine (Task #45)

File: `src/lib/subcontractor-search.ts`

API: `searchSubcontractors(bid: ParsedSolicitation, entity: EntityType): Promise<RankedSub[]>`

```typescript
type RankedSub = {
  company_name: string
  uei?: string
  cage?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: string
  naics_codes: string[]
  certifications: string[]  // WOSB, 8a, HUBZone, SDVOSB, SWaM, etc.
  geographic_coverage?: string
  match_score: number  // 0-100, ranking signal
  verification_status: 'sam_verified' | 'listed_not_confirmed' | 'web_only' | 'unable_to_verify'
  verification_notes?: string  // "phone unreachable", "website 404", etc.
  source: 'internal' | 'sam_dsbs' | 'dsbsd_swam' | 'web_research'
  raw_data?: Record<string, unknown>  // for debugging
}
```

Algorithm:

1. Query internal `subcontractors` table by NAICS + DMV proximity. Cap at 5.
2. If <3 strong matches, run SAM.gov DSBS search (Dynamic Small Business Search) by NAICS + state.
3. If still <8, run DSBSD (VA SWaM directory) search.
4. If still <8, run Claude web search for "[NAICS service] subcontractors near [place of performance]" and extract candidates.
5. Hard filter: every sub must have a UEI OR be flagged "must register before contracting".
6. Verify contact info: phone reachability check, website 200/404 check.
7. Rank by match score. Cap at 12-15.

#### Step 5 — Generate-bid-starter endpoint (Task #46)

File: `src/app/api/proposals/[id]/generate-bid-starter/route.ts`

POST endpoint. Body: `{ proposal_id: string }`. Returns: `{ folder_url: string, docs_generated: string[], errors: string[] }`.

Algorithm:

1. Fetch proposal + linked gov_lead from Supabase
2. Run solicitation parser on the uploaded solicitation file (from Supabase Storage)
3. Run subcontractor search
4. Generate folder name: `[derive KeyServiceLocation from scope]-[Agency abbrev]-[Solicitation #]`. Examples: "MowingToronto-DOD-W912BV26QA047", "WarrenBridgeCleaning-DOI-140L6226Q0008". Use a Claude prompt to derive KeyServiceLocation from `SOL_TITLE` + `SOL_PLACE_OF_PERFORMANCE` (e.g., "MowingToronto" from "Mowing Services - Fall River and Toronto Lakes, KS/OK"). Keep it short, PascalCase, no spaces.
5. Call existing `/api/drive/create-bid-folder` to create the Drive folder
6. For each of the 12 templates, call generator with parsed tokens + sub data
7. Upload each generated doc to Drive via existing `/api/drive/upload`
8. Mirror the VA-needed subset to VA's Drive folder (use per-user Drive config)
9. Update `gov_leads.status` to `'active_bid'`, set `drive_folder_url`
10. Log every step to `proposal_deliverables` table for audit

#### Step 6 — UI button (Task #47)

File: `src/app/proposals/[entity]/[id]/intake/page.tsx`

Add a "Generate Bid Starter Package" button below the solicitation upload panel. On click:

1. POST to `/api/proposals/[id]/generate-bid-starter`
2. Show real-time progress (parsing solicitation, searching subs, generating docs, uploading to Drive)
3. On success, show Drive folder link + per-doc list

Use SSE or polling for progress updates. SSE is cleaner; reuse the pattern in `src/app/api/proposals/parse-solicitation/route.ts` if it has streaming.

#### Step 7 — End-to-end smoke test

Test against Ella's two real solicitation PDFs:

- `Solicitation_W912BV26QA047.pdf` (MowingToronto, DoD/USACE)
- WarrenBridgeCleaning solicitation (find in Downloads)

Verify for each:

- All 12 docs generated
- Folder named correctly
- Sub-facing docs do NOT contain sol#/CO/agency
- Internal docs contain full detail
- Subcontractor_Search has at least 8 candidates with verification badges
- VA's Drive folder has the right subset
- Lead status moved to active_bid
- Drive folder link surfaces on intake page

#### Step 8 — Commit + deploy

Commit pattern (no local git, use GitHub API):

```javascript
// scripts/commit-phase1.mjs
import { commitDiskFiles } from './lib/github-commit.mjs'
const result = await commitDiskFiles({
  message: 'Phase 1: Bid Starter auto-generation (12 docs, sub search, OPSEC enforced)',
  localPaths: [
    'src/lib/solicitation-parser.ts',
    'src/lib/bid-templates/generator.ts',
    'src/lib/subcontractor-search.ts',
    'src/app/api/proposals/[id]/generate-bid-starter/route.ts',
    'src/app/proposals/[entity]/[id]/intake/page.tsx',
    // ... and the tokenized templates if you remove them from gitignore
  ],
})
```

Then verify Vercel deploy succeeds:

```bash
sleep 90 && curl -sI "https://mog-tracker-app.vercel.app/api/proposals/test-id/generate-bid-starter" | head -3
```

---

## 8. KEY FILES & PATHS REFERENCE

### Existing files DO NOT recreate (extend or import from)

| Path | Purpose |
|---|---|
| `src/lib/proposals/entity-data.ts` | Canonical entity values (UEI, CAGE, addresses, brand colors). Use for entity tokens. |
| `src/lib/proposals/brand-config.ts` | Per-entity tagline + voice |
| `src/lib/proposals/generate-proposal.ts` | OLD generic proposal generator. Don't replace. Build alongside. |
| `src/lib/file-parsers.ts` | PDF, DOCX, XLSX, image, CSV, text parsers |
| `src/lib/text-utils.ts` | NEW. fixMojibake, fixMojibakeDeep, smartToAscii. Use after every external API call. |
| `src/lib/google-drive.ts` | OAuth-based Drive helpers |
| `src/lib/google-drive-client.ts` | Service account based Drive helpers |
| `src/lib/utils.ts` | Misc utilities + CSV export (now BOM-prefixed) |
| `src/lib/constants.ts` | ENTITY_NAICS, ENTITY_PRIMARY_NAICS, ENTITY_PSC, ENTITY_BRANDING |
| `src/app/api/proposals/parse-solicitation/route.ts` | Existing Claude-based parser |
| `src/app/api/proposals/upload-solicitation/route.ts` | File upload to Supabase storage |
| `src/app/api/drive/upload/route.ts` | Drive file upload (per-user OR per-entity) |
| `src/app/api/drive/create-bid-folder/route.ts` | Drive folder creation |
| `src/components/proposals/SolicitationPanel.tsx` | Existing intake UI for solicitation upload |
| `scripts/lib/github-commit.mjs` | GitHub commit-via-API helper. Use for ALL commits (no local git). |

### Database tables (Supabase)

Key tables for Phase 1:

- `gov_leads` — the bid record. Has `drive_folder_url`, `drive_folder_id`.
- `proposals` — proposal metadata linked to gov_lead
- `proposal_compliance_items` — Section L/M cross-walk
- `proposal_deliverables` — generated docs audit log
- `subcontractors` — internal sub directory
- `entity_drive_configs` — per-entity service account JSON + root folder
- `user_drive_configs` — per-user OAuth refresh token + root folder per entity
- `service_categories` — NAICS to category mapping per entity

Schema is defined across migrations `001_` through `041_` in `supabase/migrations/`. Migrations apply via `https://api.supabase.com/v1/projects/lqymdyorcwgeesmkvvob/database/query` with PAT from env (or via Supabase Dashboard SQL editor).

### Environment variables (.env.local + Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://lqymdyorcwgeesmkvvob.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<jwt>
SUPABASE_SERVICE_ROLE_KEY=<jwt>
DATABASE_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=<fine-grained PAT, Contents: RW>
GOOGLE_OAUTH_CLIENT_ID_EXOUSIA=...
GOOGLE_OAUTH_CLIENT_SECRET_EXOUSIA=...
GOOGLE_OAUTH_CLIENT_ID_VITALX=...
GOOGLE_OAUTH_CLIENT_SECRET_VITALX=...
GOOGLE_OAUTH_CLIENT_ID_IRONHOUSE=...
GOOGLE_OAUTH_CLIENT_SECRET_IRONHOUSE=...
SAMGOV_API_KEY=...
USASPENDING_API_KEY=...
CRON_SECRET=...
```

### Bash workspace mounts

When running bash via mcp_workspace_bash, paths differ from file tools:

| File tools (Read/Write/Edit/Glob/Grep) | bash |
|---|---|
| `/Users/ellawireko-brobbey/Documents/Automation/mog-tracker-app` | `/sessions/<id>/mnt/mog-tracker-app/` |
| `/Users/ellawireko-brobbey/Downloads` | `/sessions/<id>/mnt/Downloads/` (must request_cowork_directory first) |
| `/Users/ellawireko-brobbey/.claude/skills` | `/sessions/<id>/mnt/.claude/skills/` (read-only) |
| `outputs/` (temporary) | `/sessions/<id>/mnt/outputs/` |

---

## 9. GOTCHAS & LESSONS LEARNED

### Gotcha 1: Subagent template tokenization fails silently

The general-purpose subagent claimed it tokenized 12 docx files but produced byte-identical copies of source. Always verify subagent output by reading actual files, not by trusting the summary. For detail-heavy work like template tokenization, do it yourself.

### Gotcha 2: DOCX raw LS/PS bytes break TypeScript

If you embed U+2028 (Line Separator) or U+2029 (Paragraph Separator) directly in a regex source, TS sees them as newlines and fails to parse. Use `  ` escape sequences instead. See `src/lib/text-utils.ts` line 51.

### Gotcha 3: CSV exports default to Windows-1252 in Excel

When Excel opens a UTF-8 CSV without BOM, it defaults to Windows-1252 and renders every multi-byte char (—, ✓, ○) as mojibake (â€", â, Â). Fix: always prefix CSV with `﻿` BOM and set MIME type `text/csv;charset=utf-8`. Already fixed in 3 export sites. Apply same pattern to any new CSV export.

### Gotcha 4: eVA portal blocked by AWS WAF

`https://mvendor.cgieva.com/Vendor/public/AllOpportunities.jsp` returns AWS WAF challenge for any non-browser request. Cannot scrape programmatically. Future fix: email-notification ingestion pipeline (Task #39).

### Gotcha 5: NextResponse.json() does NOT include charset by default

The default Content-Type is `application/json` (no charset). Modern browsers treat as UTF-8 per spec, but some legacy clients don't. For defensive responses, set explicit charset (already done in middleware rate-limit response).

### Gotcha 6: Mammoth output is UTF-8 native

`mammoth.extractRawText({ buffer })` returns UTF-8 strings. No conversion needed. But if upstream content was already mojibake, mammoth preserves it. Always pipe through `fixMojibake()` from text-utils.ts.

### Gotcha 7: Per-user Drive config has higher priority than per-entity

Lookup order in `/api/drive/upload`: `user_drive_configs.root_folder_id > entity_drive_configs.root_folder_id`. Auth: `user_drive_configs.user_oauth_refresh_token > entity-pool (admin-shared)`. Same priority for Phase 1 generated docs.

### Gotcha 8: No local git — commit via GitHub API

The .git directory is on a fuse mount that gets locked. Use `scripts/lib/github-commit.mjs`. Pattern:

```javascript
import { commitDiskFiles } from './lib/github-commit.mjs'
await commitDiskFiles({ message: '...', localPaths: ['src/...'] })
```

Then Vercel auto-deploys on push.

### Gotcha 9: Migrations apply via Supabase Platform API or Dashboard, not local CLI

Use `https://api.supabase.com/v1/projects/lqymdyorcwgeesmkvvob/database/query` with personal access token. Or paste SQL into the Dashboard SQL Editor at `https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new`.

### Gotcha 10: Vercel cron jobs require CRON_SECRET in Authorization header

For `/api/cron/*` routes, set `Authorization: Bearer ${CRON_SECRET}` header. Vercel sets this automatically for scheduled runs but if you test manually you need the secret.

### Gotcha 11: Browser cache after charset fixes

After deploying a charset/encoding fix, users may continue to see mojibake until they hard-refresh (Cmd+Shift+R). Mention this in any related user communication.

### Gotcha 12: KeyServiceLocation derivation

Folder name `[KeyServiceLocation]-[Agency]-[SolicitationNumber]` requires deriving a short, PascalCase service location from the solicitation title + place of performance. Examples Ella has used:

- "Mowing Services - Fall River and Toronto Lakes, KS/OK" + Toronto Lake → "MowingToronto"
- "Custodial and Refuse Collection Services - Poe's Ridge Recreation Area" + Moncure NC → "WarrenBridgeCleaning" (note: this folder name doesn't directly derive from the title; she chose a memorable shorthand)

Don't try to fully automate this. Suggest 2-3 options based on the parsed scope, let Ella pick or override. Default to `[FirstWordOfScope][PlaceOfPerformance]` if she doesn't override.

---

## 10. RECENT COMMITS (last 10)

| SHA | Message |
|---|---|
| fe2f0de | Broaden bid-templates gitignore to cover work-in-progress tokenized output |
| c783c50 | eva-feed: relax SupaClient type to unblock production build |
| 8cb11f4 | Fix CSV mojibake at the root: UTF-8 BOM + charset on all 3 CSV exports + text-utils helpers + JSON charset |
| 800a793 | eVA scraper: detect AWS WAF challenge and JS-rendered tables, surface clean diagnostic |
| dcf8629 | Fix UTF-8 charset rendering + live eVA scraper of public listing |

---

## 11. ELLA'S COMMUNICATION STYLE (for whoever picks this up)

From her stored preferences:

- Direct, structured, practical. No fluff or filler.
- Plain language. No corporate jargon.
- If her idea has a flaw or risk, tell her clearly.
- Step-by-step guidance for implementation.
- When explaining complex concepts, break into logical structures or frameworks.
- Real-world examples applied to her businesses.
- She prefers detailed explanations when learning something new (compliance, systems, business strategy).
- Avoid em dashes. Avoid "utilize", "leverage", "robust", "seamless".
- Don't open with "Great question", "Absolutely", "Of course".
- If something could create legal/compliance/structural risk, point it out directly.

She's a cybersecurity compliance specialist by day, building 3 businesses (Exousia, VitalX, IronHouse) under MOG. She values rigor, OPSEC, and systems thinking. She doesn't tolerate half-built work. She does tolerate honest "I stopped here because" status updates.

---

## 12. WHAT TO TELL ELLA WHEN YOU PICK THIS UP

A 4-sentence opening:

> "Read PHASE_1_HANDOFF.md. I'm picking up at Task #48 (tokenize 12 templates manually, no subagent). I'll work through Tasks #43-#47 in order and ship Phase 1 end-to-end with smoke tests on your two real solicitations. I'll commit small, verify Vercel, and report after each major step."

Don't ask permission to start. She already greenlit. Just begin.

---

## END OF HANDOFF DOCUMENT

If anything in this doc is unclear, stop and ask Ella before guessing. The cost of asking once is much lower than the cost of building the wrong thing for 2 hours.
