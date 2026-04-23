---
name: page-limit-enforcer
description: Enforce page, word, font, and formatting limits specified in Section L. Use before every submission to catch over-limit content that would cause a source selection board to refuse to read the remainder. A proposal that violates a page limit is often discarded without review regardless of quality.
---

# Page Limit Enforcer

## Why this matters

Federal evaluators stop reading at the page limit. Anything past the limit is invisible. If your winning argument is on page 27 of a 25-page volume, you lose the award, not the board.

## What to check

### Page limits (per volume)
- Technical Volume — typical 10-50 pages
- Management Volume — typical 5-20 pages
- Past Performance Volume — typical 1-3 pages per reference, 3-7 references
- Pricing Volume — usually unlimited but sometimes capped for narrative
- Resumes — usually 2 pages per key personnel

### Font requirements (typical)
- 12-point Times New Roman, Arial, or Calibri for body
- 10-point minimum for tables and captions
- No condensed fonts
- Headers and footers count against margin but usually not page count

### Margin requirements (typical)
- 1 inch top, bottom, left, right
- Half-inch for headers/footers
- No content in margin areas (watermarks, logos are sometimes OK, sometimes not)

### Spacing
- Single-spaced body is standard
- 1.5 or double-spaced only when explicitly required
- Blank lines between paragraphs don't count as spacing violations

### What is typically EXCLUDED from page count
- Cover page
- Table of contents
- List of figures/tables
- Acronyms list
- Appendices (confirm per RFP)
- Resumes in a separate volume
- Forms (SF 33, SF 1449, etc.)

### What is typically INCLUDED in page count
- Executive summary
- All narrative content
- Tables and figures within the narrative
- Internal section dividers if they contain content
- Resumes if bundled into technical volume

## Audit procedure

1. Read Section L page-limit clause verbatim — extract every number and unit
2. Count pages of the rendered output (not the source) because font/margin changes affect pagination
3. Count pages separately for each volume
4. Flag any volume at 95%+ of its limit for author review (line-breaks shift)
5. Check font size with a ruler on a printed copy or inspect the DOCX XML directly
6. Confirm cover page, TOC, acronyms, and appendices are correctly excluded
7. Compare filename conventions against Section L (e.g. `VitalX_RFQ12345_Tech.pdf`)

## Red-flag patterns

- Tables with 10pt font when Section L says 12pt minimum — automatic violation
- Figures with embedded text at 6-8pt — evaluators frequently flag
- Condensed fonts to squeeze more content — treated as formatting violation
- Content in the header/footer area intended to extend page count — rejected
- Narrow margins (<0.75") to fit content — automatic violation

## Output format for the validator

For each issue found, return:
```json
{
  "severity": "fatal" | "high" | "medium",
  "volume": "Technical" | "Management" | "Past Performance" | "Pricing",
  "issue": "Tech Volume is 27 pages; Section L limit is 25",
  "fix": "Cut 2 pages from §2.3 staffing narrative (tables 2.3.1 and 2.3.2 are redundant)"
}
```

`severity: fatal` means the proposal will be rejected without review if submitted as-is.
