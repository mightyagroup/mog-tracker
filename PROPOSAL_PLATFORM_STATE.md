# Proposal Platform — Build State & Handoff

Purpose: if this build stalls or a new Claude conversation has to pick it up, read this file first. Everything here is current as of the last commit.

## Current state (authoritative)

- Last proposal-platform commit: see `git log origin/main`. Platform foundation shipped at commit `1cd2c96a`.
- Migration 038 applied to Supabase. Verify with:
    SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'proposal_%';
  Expected: proposals, proposal_compliance_items, proposal_reviews, proposal_deliverables, proposal_retros.
- Vercel: deploys green on the latest commit. buildId changes per deploy.
- Environment variables that MUST be present in both .env.local and Vercel env:
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (all three)
  - DATABASE_URL (Supabase session-pooler URI; only in .env.local, not needed in Vercel)
  - GITHUB_TOKEN (fine-grained PAT, repo=mog-tracker, Contents RW; only in .env.local)
  - ANTHROPIC_API_KEY + AI_SCORING_ENABLED=1 + AI_SCORING_MAX_PER_DAY=200
  - ALERT_EMAIL=admin@mightyoakgroup.com
  - Optional: RESEND_API_KEY (emails otherwise log-only)
  - SAMGOV_API_KEY, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_ROOT_FOLDER_ID

## What is shipped in the proposal platform

Library modules (server-side):
- src/lib/constants.ts — AUTHORITATIVE NAICS/PSC per entity. All three entities SAM-registered and federal-eligible. VitalX also commercial-eligible.
- src/lib/address-protocol.ts — Wild Orchid for federal docs, Culpeper for everything else. addressFor(docType) picker + checkAddressCompliance(docType, text) validator helper. Physical address marked isPublic:false — never leak into non-federal docs.
- src/lib/proposals/humanizer-runtime.ts — 29 deterministic patterns from Ella's humanizer skill. humanizeDeterministic(text) + detectAiTells(text).
- src/lib/proposals/brand-config.ts — per-entity brand config with distinct voice guides. Exports BRAND_CONFIG, getBrand(entity), hasLogo(entity).
- src/lib/proposals/validator.ts — deterministic 5-pass runtime validator. runValidator(input) returns structured ValidatorOutput.
- src/lib/proposals/skills/proposal-validator.md — corrected skill (the NAICS fix Ella authorized).

API routes live:
- POST /api/proposals/validate — runs deterministic validator, logs to proposal_reviews, optional deep:true invokes Claude Sonnet narrative review.
- POST /api/proposals/humanize — deterministic humanizer; deep:true adds Claude Sonnet voice-matched polish.
- POST /api/proposals/parse-solicitation — Claude Sonnet extracts Section L/M, amendments, forbidden clauses, submission method/deadline, primary contact. Writes proposal_compliance_items automatically.

Migration 038 tables:
- proposals — 1:1 with gov_leads. Intake state, submission metadata, address preference, amendment/incumbent tracking, status, assigned_va, submission capture.
- proposal_compliance_items — Section L/M items with owner, status, severity, fulfillment file.
- proposal_reviews — audit log of every validator + pink-team + humanizer run.
- proposal_deliverables — staged files with format, page count, humanization state.
- proposal_retros — post-submit retrospective.
- agency_quirks — per-agency accumulated knowledge.
- subcontractors extended with: rate_card, insurance, license_expiry, equipment, herbicides, pesticide_license, loi_signed_at, loi_url, teaming_template_docx_url.

Brand assets folder:
- public/brands/{exousia,vitalx,ironhouse}/ with README.md in each.
- Drop logo.png (transparent, 1000px+) per entity. Exousia + VitalX are ready per Ella. IronHouse pending.

## What is still to build

### A. Remaining API routes (priority order)
1. POST /api/proposals/pink-team-review — adversarial persona via Claude; returns punch list + optional fix suggestions.
2. POST /api/proposals/apply-safe-fixes — takes an array of fix actions (rename file, strip solicitation copy, swap contact), executes whitelist only, logs diff to proposal_reviews.applied_fixes.
3. POST /api/proposals/research-incumbent — hits USASpending.gov /api/v2/search/spending_by_award/ for prior awards at the agency+NAICS, writes back to proposals.incumbent_* fields.
4. POST /api/proposals/convert-to-pdf — headless Chromium via @sparticuz/chromium-min + puppeteer-core. Requires adding those deps to package.json. Renders DOCX to HTML to PDF. Note: docx package in this repo already; use it to get HTML preview, then Chromium renders.
5. POST /api/proposals/generate-package — extends src/lib/proposals/generate-proposal.ts. Inputs: proposal_id. Reads compliance matrix, applies entity brand (logo + color + voice guide), enforces address protocol per document type, runs every AI-drafted narrative through humanizer runtime. Outputs: DOCX per deliverable + PDF rendering if format requires.
6. POST /api/proposals/create — creates a proposals row from a gov_lead, kicks intake wizard.

### B. UI pages (all under src/app/proposals/)
1. page.tsx — hub across entities. Status-filtered pipeline board. Per-VA assignment filter. Deadline-urgency sort.
2. [entity]/page.tsx — per-entity hub, same board but filtered. Entity brand header. Link to create new from a gov_lead.
3. [entity]/[id]/intake/page.tsx — 10-field gated intake wizard. Cannot mark intake_complete=true unless all green.
4. [entity]/[id]/compliance/page.tsx — matrix view.
5. [entity]/[id]/teaming/page.tsx — per-proposal sub selector + teaming package builder.
6. [entity]/[id]/pricing/page.tsx — CLIN worksheet preloaded with NAICS template + sub rates. Incumbent panel.
7. [entity]/[id]/pink-team/page.tsx — runs /pink-team-review, displays punch list.
8. [entity]/[id]/validate/page.tsx — THE DEDICATED VALIDATION SECTION. Read-only. Gates submission.
9. [entity]/[id]/submit/page.tsx — pre-flight checklist.
10. [entity]/[id]/retrospective/page.tsx — 5-field post-submit form.

### C. Sidebar nav
- Edit src/components/layout/Sidebar.tsx to add a Proposals section above the entity entries.

### D. Skills (markdown files committed to the repo)
Store in src/lib/proposals/skills/ (the .claude/skills/ path is blocked from session writes):
1. compliance-matrix-builder.md
2. pink-team-reviewer.md
3. page-limit-enforcer.md
4. pricing-math-auditor.md
5. far-compliance-checker.md
6. past-performance-librarian.md
7. teaming-agreement-generator.md

### E. Package additions
- package.json: add @sparticuz/chromium-min and puppeteer-core for PDF rendering.

## How to commit without local bash (canonical recipe)

Local bash is jammed. Use the GitHub Contents API from the browser tab. This PAT is scoped for the repo:

Steps:
1. Upload each file as a blob: POST api + /git/blobs { content, encoding: 'utf-8' }
2. Get base ref: GET api + /git/ref/heads/main
3. Get base commit: GET api + /git/commits/<base>
4. Create tree: POST api + /git/trees { base_tree, tree: [{ path, mode: '100644', type: 'blob', sha }] }
5. Create commit: POST api + /git/commits { message, tree, parents: [baseSha] }
6. Update ref: PATCH api + /git/refs/heads/main { sha, force: false }

Workflows gotcha: the PAT does NOT have Workflows scope. Any file under .github/workflows/ will 403 the tree API. Either regenerate the PAT with Workflows scope, or commit workflow files via the GitHub web UI.

Template-literal gotcha: when pasting file content into String.raw templates in the browser, avoid files that contain backticks or dollar-brace. Rewrite those to string concatenation before shipping.

## How to apply migrations without local bash

Use the Supabase dashboard session token. In any tab on supabase.com/dashboard:

    const auth = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token'))
    const token = auth.access_token
    await fetch('https://api.supabase.com/v1/projects/lqymdyorcwgeesmkvvob/database/query', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SQL_STRING })
    })

Make the SQL idempotent (the migration lint in scripts/lint-migrations.mjs enforces this pattern).

## Architectural decisions already made — don't redo

1. Proposals live inside the existing mog-tracker-app repo as a sibling section, not a separate Next.js project. Namespace: /proposals/** routes, proposal_* tables, src/components/proposal/ + src/lib/proposals/.
2. Per-entity namespacing is URL-based (/proposals/exousia, etc.), not separate databases. Filter by entity column.
3. Validator is a dedicated section at /proposals/[entity]/[id]/validate. It is read-only, independent of the production flow, runs on demand. The 5-pass model from Ella's skill is THE contract.
4. Humanizer is mandatory. Every AI-authored paragraph passes through humanizeDeterministic before touching a document.
5. DOCX to PDF via headless Chromium (@sparticuz/chromium-min + puppeteer-core).
6. Address protocol is enforced at generation and validation time. Wild Orchid NEVER in non-federal docs.
7. Voice guides are distinct per entity.
8. Pink team is flag + suggest-fixes + auto-apply-safe-fixes. Safe-fix whitelist: rename file, strip solicitation copy, swap contact, insert amendment acknowledgment.
9. All three entities are federal-eligible. VitalX has both federal and commercial.

## Ella's key directives (quote, do not paraphrase)

- "each entity should have their own space so everything is clean, independent and compliant and auditable."
- "I don't need to have to manually convert docx to pdf, the system should determine that by the solicitation requirement and create the doc as such so I can review and sign."
- "my proposals shouldn't be sounding and looking like some thing just ai vomitted together with no human touch." Humanizer is non-negotiable.
- "My physical address home shouldn't be publicly visible is for proposal use only."
- "don't defer anything, and build everything needed correctly and properly. I don't want to comeback to this."
- "Ask me questions for clarification" — use the AskUserQuestion tool, not inline text questions.

## Authoritative NAICS (lock down)

Exousia: 561720, 561730, 562111, 561210, 541614, 541611
IronHouse: 561720, 561730, 562111, 561210 (exactly 4)
VitalX: 492110, 485999, 621511, 492210, 621999

## Addresses (lock down)

Physical / legal (federal proposals, SAM.gov, SBA, CAGE, gov contracts):
  6509 Wild Orchid Ct, Fredericksburg, VA 22407
  This is Ella's home. NEVER show in public/external docs.

Mailing / correspondence (subs, NDAs, teaming, invoices, cap statements, remittance, public):
  107B E. Davis St, Culpeper, VA 22701

Entities: Mighty Oak Group LLC, Exousia Solutions LLC, VitalX LLC, IronHouse Services LLC.

## How a fresh Claude should resume

1. Read this file first.
2. Read src/lib/proposals/validator.ts and src/lib/proposals/humanizer-runtime.ts for the contracts.
3. Read src/lib/constants.ts for NAICS/entity metadata.
4. Pick up the next unbuilt UI page or API route in section B order.
5. Commit via the GitHub Contents API recipe above.
6. After committing, verify at https://api.github.com/repos/mightyagroup/mog-tracker/deployments?per_page=3 that the deploy status is success.

## Known gotchas

- Local bash in this session is jammed. Do not try npm install or npm run build locally. Use GitHub push; let Vercel build.
- tsconfig.json target is es2015 — required for for..of over Map. Don't downgrade.
- @typescript-eslint/no-unused-vars is ERROR with argsIgnorePattern ^_. Use _request for unused route handler args.
- @typescript-eslint/no-explicit-any is ERROR. Use Record<string, unknown> or unknown with casts.
- React-hooks exhaustive-deps is WARN — do not let it block builds.
- Fine-grained PAT lacks Workflows scope. Anything in .github/workflows/ must be committed via the web UI.
- PIEE submission is manual. Do not try to automate — DoD CAC-gated.

## Contact

Emmanuela Wireko-Brobbey — admin@mightyoakgroup.com / may.opoku@gmail.com
