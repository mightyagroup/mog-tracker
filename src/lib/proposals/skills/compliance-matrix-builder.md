---
name: compliance-matrix-builder
description: Decompose a government solicitation into an auditable compliance matrix. Use when a new RFP/RFQ/RFI lands, when amendments drop, or before every pink-team review. Reads Section L (instructions), Section M (evaluation), Section B (pricing schedule), Section H (special terms), and any attachments. Output is a row-per-requirement matrix with section pointer, page reference, owner, due date, status, and evidence location.
---

# Compliance Matrix Builder

## When to run this

- A new solicitation is uploaded and the proposal is in `intake` or `drafting` status
- An amendment is released (never trust the old matrix; re-parse)
- Before pink-team review (every shall-statement must be mapped)
- Before Mark Submitted (every matrix row must be `complete` or `n/a`)

## What counts as a requirement

Every sentence that uses one of these words creates a matrix row:
- `shall`, `must`, `required`, `is required to`, `will`
- `submit`, `provide`, `furnish`, `include`, `identify`, `describe`
- `no later than`, `not later than`, `by [date]`
- Page/font/margin limits
- Formats: DOCX, PDF, searchable PDF, sealed envelope, email subject line
- Required attachments, forms, certifications, representations
- Signatures, notarization, wet-ink vs electronic

Permissive words (`may`, `should`, `encouraged`, `preferred`) do NOT create a matrix row unless Section M uses them as evaluation criteria.

## Required columns (never skip)

1. **section** — the exact clause reference (e.g. `L.3.2.1`, `M.4`, `H.9`)
2. **requirement** — paraphrased, under 200 characters
3. **source_reference** — page number and first five words of the source sentence
4. **status** — `not_started | in_progress | complete | na`
5. **owner** — person accountable (email or initials)
6. **due_date** — the deadline to have evidence ready (NOT the proposal deadline; usually 3 days prior)
7. **evidence_location** — where the satisfying content lives (e.g. `Tech Vol §2.3`, `Attachment B cell C14`, `cover_letter.docx`)
8. **notes** — any open questions for the contracting officer

## Standard buckets (use these categories)

- **Administrative** — registration, certifications, representations, signatures
- **Technical** — Statement of Work response, approach, staffing, management plan
- **Past Performance** — number of refs, age, dollar threshold, format
- **Pricing** — CLIN structure, pricing schedule, price narrative
- **Formatting** — page limit, font size, margins, file type, filename convention
- **Submission** — method (email, SAM.gov, eBuy), address, subject line, cutoff timezone
- **Post-submission** — oral presentation, site visit, Q&A deadline

## Sanity checks before marking the matrix done

- Page limit counted separately for each volume (Technical, Management, Past Performance, Pricing)
- Timezone on the deadline is spelled out explicitly (Eastern Time, not "local")
- If the solicitation has an amendment, the matrix references the amended clause, not the original
- Every reference in Section M has a matching content plan in the technical volume
- Every SF form requested is downloaded and saved to the proposal Drive folder

## Red flags that force a no-bid conversation

- Mandatory certification we don't hold (DUNS-specific, 8(a), HUBZone when not eligible)
- Technical requirement outside our NAICS (see `ENTITY_NAICS` in `src/lib/constants.ts`)
- Page limit under 10 pages for a technical response over $500K (high LOE, low signal)
- Incumbent advantage is structural (sole source specs written for competitor's product)
- Response due in under 72 hours from release with no extension in sight

## Output format for the validator

The compliance matrix must round-trip through `proposal_compliance_items` in Supabase with all eight columns populated. Do not rely on free-text notes for requirements that belong in their own row.
