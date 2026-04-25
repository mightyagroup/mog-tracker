# Bid Templates — Phase 1 Bid Starter

Phase 1 of the proposal platform auto-generates a 14-document Bid Starter package whenever a solicitation is uploaded. Templates live here.

## Structure

```
src/lib/bid-templates/
├── AUDIT.md                — verification audit (committed)
├── _token_map.json         — token definitions and per-file inventory (committed)
├── README.md               — this file (committed)
├── source/                 — Ella's real bid samples (GITIGNORED, proprietary)
└── tokenized/              — output: source with identifiers replaced by {{TOKEN}} (GITIGNORED, runtime-loaded from Supabase Storage)
```

## What's a "tokenized" template?

Each template has its bid-specific identifiers replaced with `{{TOKEN}}` placeholders. At generation time, the doc generator (`src/lib/bid-templates/generator.ts`) substitutes each token with a value from one of these sources:

- `entity_data` — `src/lib/proposals/entity-data.ts` (legal name, UEI, CAGE, address, etc.)
- `solicitation_parser` — `src/lib/solicitation-parser.ts` (extracted from the uploaded solicitation PDF/DOCX)
- `subcontractor_search` — `src/lib/subcontractor-search.ts` (per-sub data from internal table + SAM DSBS)
- `usaspending_lookup` — `src/lib/usaspending.ts` (incumbent and prior award lookup)
- `address-protocol` — `src/lib/address-protocol.ts` (Wild Orchid for federal, Culpeper for non-federal)
- `computed` — runtime helpers (`TODAY_DATE`, `RETURN_BY_DATE`, etc.)
- `manual` — populated by the user via UI

Block placeholders (`SOL_CLIN_TABLE`, `SUB_CANDIDATES_BLOCK`, `PRIOR_AWARDS_TABLE`, etc.) are expanded into actual tables or paragraph blocks by the generator, not simple text replacements.

## OPSEC Rule (sub-facing docs)

Three documents are SANITIZED — they go to subcontractors who have not signed an NDA:

- `05_Subcontractor_Scope_of_Work.docx`
- `06_Sub_Outreach_Email.docx`
- `14_SIF_Subcontractor_Information_Form.docx` (Phase 2)

These docs MUST NOT contain any of: `SOL_NUMBER`, `SOL_AGENCY`, `SOL_SUB_AGENCY`, `SOL_NOTICE_ID`, `SOL_SAM_URL`, `SOL_ESTIMATED_VALUE`, `SOL_INCUMBENT_CONTRACTOR`, or any `CO_*` token. The audit (`AUDIT.md`) verifies this and fails the pass if any are detected.

## Regenerating Templates

The two scripts in `scripts/templates/` regenerate the tokenized output from source samples. Both require Python with `python-docx` and `openpyxl`:

```bash
pip install python-docx openpyxl
python3 scripts/templates/tokenize_templates.py     # tokenize the 8 existing samples
python3 scripts/templates/build_new_templates.py    # build the 7 fresh templates
```

Then run the verification audit:

```bash
python3 scripts/templates/verify_tokens.py
```

## Runtime Loading

At deploy time, the tokenized files are uploaded to Supabase Storage under `bid-templates/`. The doc generator pulls them by name. This avoids checking large binary files into git.

Upload (one-time / on template change):

```bash
node scripts/templates/upload-to-storage.mjs
```
