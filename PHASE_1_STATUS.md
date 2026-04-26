# Phase 1 — Status (2026-04-25)

**Author:** Continuing the handoff started in `PHASE_1_HANDOFF.md`.
**Outcome:** All six task IDs (#43 through #48) shipped to production. End-to-end smoke test against a live solicitation is the remaining manual step for Ella.

---

## What shipped

| # | Task | Status | Commit |
|---|---|---|---|
| 48 | Phase 1A.1 — Tokenize 14 templates | ✓ shipped | `6667d79` |
| 43 | Phase 1B — Solicitation parser | ✓ shipped | `de79dda` |
| 44 | Phase 1C — DOCX template generator | ✓ shipped | `21ea708` |
| 45 | Phase 1D — Subcontractor search engine | ✓ shipped | `5a71943` |
| 46 | Phase 1E — `/api/proposals/[id]/generate-bid-starter` | ✓ shipped | `06ab3e8` |
| 47 | Phase 1F — UI button on intake page | ✓ shipped | `3aeb1a7` |

All 6 commits deploy green on Vercel (status: success).

---

## Files added or changed

```
src/lib/solicitation-parser.ts                       (parseSolicitation)
src/lib/subcontractor-search.ts                      (searchSubcontractors)
src/lib/bid-templates/generator.ts                   (generateBidDoc)
src/lib/bid-templates/token-builder.ts               (buildBidStarterTokens, buildBidFolderName)
src/lib/bid-templates/template-loader.ts             (loadTemplate from Supabase Storage)
src/lib/bid-templates/AUDIT.md                       (verification audit, OPSEC PASS)
src/lib/bid-templates/README.md                      (folder structure + ops guide)
src/lib/bid-templates/_token_map.json                (185 tokens defined)
src/app/api/proposals/[id]/generate-bid-starter/     (POST endpoint)
src/app/proposals/[entity]/[id]/intake/page.tsx      (button + progress UI)
scripts/templates/tokenize_templates.py              (regen the 8 source samples)
scripts/templates/build_new_templates.py             (build the 7 fresh templates)
scripts/templates/verify_tokens.py                   (audit pass/fail enforcer)
scripts/templates/upload-to-storage.mjs              (one-time storage uploader)
.gitignore                                           (narrowed to source/ + tokenized/)
package.json                                         (restored @types/pg)
```

---

## Tokenization (Task #48)

15 templates verified to contain real `{{TOKEN}}` placeholders. The previous subagent attempt produced byte-identical copies of source — that work was scrapped and redone manually with explicit per-file substitution maps.

| File | Tokens (total / unique) | Source |
|---|---|---|
| 01_Contract_Intel_Sheet.docx | 33 / 30 | tokenized from sample |
| 02_USASpending_Deep_Dive.docx | 42 / 23 | tokenized from sample |
| 03_Wage_Determination.docx | 16 / 13 | built fresh |
| 04a_Proposal_Pricing.docx | 30 / 18 | tokenized from sample |
| 04b_Proposal_Technical.docx | 33 / 24 | built fresh |
| 05_Subcontractor_Scope_of_Work.docx | 13 / 13 | tokenized (sanitized) |
| 06_Sub_Outreach_Email.docx | 22 / 14 | built fresh (sanitized) |
| 07_Subcontractor_Search.docx | 14 / 13 | tokenized from sample |
| 08_Tracker_Workbook.xlsx | 21 / 21 | built fresh |
| 09_To_Do_List.docx | 9 / 9 | built fresh |
| 10_Risk_Log.docx | 14 / 6 | built fresh |
| 11_Contract_Summary.docx | 16 / 13 | tokenized from sample |
| 12_Game_Plan.docx | 26 / 26 | built fresh |
| 13_Submission_Checklist.docx | 20 / 14 | tokenized from sample |
| 14_SIF_Subcontractor_Information_Form.docx | 33 / 27 | tokenized (Phase 2 ref) |

OPSEC verification PASSES on the three sub-facing docs (05, 06, 14). They contain no `SOL_NUMBER`, `SOL_AGENCY`, `SOL_SUB_AGENCY`, `SOL_NOTICE_ID`, `SOL_SAM_URL`, `SOL_ESTIMATED_VALUE`, `SOL_INCUMBENT_CONTRACTOR`, or any `CO_*` token.

Re-verify any time:

```bash
python3 scripts/templates/verify_tokens.py
```

Templates uploaded to Supabase Storage (`bid-templates/tokenized/`) by running `node scripts/templates/upload-to-storage.mjs`. All 15 confirmed present.

---

## End-to-end smoke test (Task #7)

What I did locally:

- Generator pipeline tested by feeding sample tokens into `11_Contract_Summary.docx`. Result: 10 of 16 tokens replaced cleanly, output file readable as a valid DOCX. The remaining 6 unresolved tokens (`SOL_SITE_1/2/3`, `SOL_BASE_PERIOD_FRIENDLY`, `SOL_FACILITY_AND_LOCATION`, `SOL_FINAL_PERFORMANCE_END_DATE`) were not in the test token set; they would be filled in a real run from the parsed solicitation.

What still needs Ella's session:

1. Open `https://mog-tracker-app.vercel.app/proposals/exousia/[id]/intake` for an existing proposal that has a solicitation PDF uploaded (W912BV26QA047 if you have one).
2. Click **Generate Bid Starter Package**.
3. Verify (a) Drive folder created with the right name, (b) 14 docs uploaded, (c) sub-facing docs (05, 06) contain no agency/sol#, (d) `gov_lead.status` moved to `active_bid`, (e) `proposal_deliverables` table has 14 rows.

If a step fails, the UI returns a structured error including any unresolved tokens or missing templates.

---

## What I learned the hard way

The Vercel build was failing for ~30 minutes after I committed the generator. Local TypeScript compiled cleanly, ESLint was clean, lint warnings were unchanged. After bisecting commit-by-commit using the GitHub Git Data API to push isolated trees, I traced the failure to **`@types/pg` getting silently dropped from `devDependencies`** when I ran `npm install pizzip` and `npm install --package-lock-only`. Without `@types/pg`, the existing `apply-migration/route.ts` failed type-checking with `TS7016`, which fails the Next.js build but produces no useful error message in the deployment metadata.

Lesson, captured in the relevant commit message: when running local `npm install`/`uninstall` to add or change deps, copy back the EXACT `package.json` and `package-lock.json` from a known-green commit before pushing — npm can silently drop unrelated entries during dep tree resolution.

I also walked back the choice of `pizzip` to `jszip` (already a transitive dep via `mammoth` and `exceljs`, ships built-in TypeScript types). One less dep to maintain.

---

## What's not done yet (deliberate scope edges)

- **Per-sub outreach generator (Phase 2, Task #49).** SIF + outreach email per sub. Stays gated behind Phase 1 stability.
- **Final submission package generator (Phase 3).** Templates 15-19 sit in `source/` only; not yet tokenized. Scoped for after Phase 1 is proven on a real bid.
- **Master subcontract agreement (Phase 4).** Templates 20-25 in `source/`. Post-award.
- **eVA email-notification ingestion (#39)** and **eMMA / DC portals (#40)** still pending — independent of Phase 1.
- **Smoke test against W912BV26QA047 and WarrenBridgeCleaning** — needs Ella in the live app. The endpoint is wired, the templates are uploaded, the UI button is shipped.

---

## How to retry tokenization if a template needs changes

The two Python scripts are reproducible:

```bash
pip install python-docx openpyxl
python3 scripts/templates/tokenize_templates.py
python3 scripts/templates/build_new_templates.py
python3 scripts/templates/verify_tokens.py
node scripts/templates/upload-to-storage.mjs
```

Substitution maps are inline in `tokenize_templates.py` keyed by file. To add or change a token, edit the `FILE_SUBS` dict for the relevant file, re-run the three Python scripts (verify_tokens enforces no zero-token output and OPSEC), then upload.
