---
name: past-performance-librarian
description: Select, rank, and tailor past performance references for a specific opportunity. Use during proposal drafting. Pulls from the past_performance_entries library, scores each entry against the target opportunity on relevance, recency, size, and complexity, and produces tailored 1-page writeups that mirror the solicitation language.
---

# Past Performance Librarian

## Why this matters

Past performance is the single highest-weighted factor in most federal evaluations. Weak references lose awards that strong narratives win. The goal is not to list everything we've done — it's to present three to five references that look exactly like the work being procured.

## Selection procedure

### 1. Extract target criteria from the solicitation
- NAICS code
- Dollar value range
- Period of performance length
- Place of performance (urban, rural, federal facility, etc.)
- Specific services named
- Customer type (DoD, civilian, state, commercial)

### 2. Score each library entry against the target
Use a 0-10 rubric per dimension:

- **Relevance** — same NAICS + same services = 10; related NAICS = 6; tangential = 2
- **Recency** — last 3 years = 10; 3-5 years = 6; >5 years = 2
- **Size** — within ±50% of target value = 10; within ±200% = 6; outside = 2
- **Complexity** — same or greater complexity = 10; simpler = 4
- **Customer** — same agency or sister agency = 10; same dept = 6; commercial = 3 for federal targets

Composite: weighted average with 40% relevance, 20% each recency/size, 10% each complexity/customer.

### 3. Select 3-5 references
- Minimum 3; maximum per solicitation guidance (usually 5)
- Prefer spread across customers (federal preferred, but mix is OK)
- At least one must be same NAICS
- At least one must be at or above the target value

## Tailoring each reference

Every writeup must have:

1. **Project title** — mirrors the target SOW wording where possible
2. **Customer** — full agency name, contracting officer name + email
3. **Contract number** — SAM-verifiable
4. **Period of performance** — start and end dates
5. **Total dollar value** — with breakdown if multi-year or option years
6. **Relevance statement** — one sentence explicitly connecting this work to the target solicitation
7. **Scope narrative** — 2-3 paragraphs, using the target solicitation's terminology
8. **Results / outcomes** — quantified whenever possible (cost savings, schedule compression, quality metrics)
9. **Challenges and resolutions** — optional but strong for high-score factors
10. **CPARS rating** — include if Satisfactory or above

## Language mirroring rules

- Read Section C (Statement of Work) of the target solicitation
- Pull 5-10 distinctive phrases (e.g., "medical specimen chain of custody", "HIPAA-compliant transport", "24/7 dispatch")
- Use those phrases verbatim in the relevance statement and scope narrative
- Don't fake it — only use phrases that accurately describe what we did

## Red flags

- No past performance within the NAICS → flag to leadership; may be no-bid
- All references > 5 years old → flag; at least one must be recent
- All references from same customer → diversify or explain
- CPARS below Satisfactory in last 3 years → omit that reference; explain gap if asked
- Any false or inflated claim → hard stop, never submit

## Output contract

```json
{
  "selected": [
    {
      "entry_id": "uuid",
      "composite_score": 8.7,
      "scores": { "relevance": 10, "recency": 10, "size": 8, "complexity": 8, "customer": 6 },
      "tailored_writeup_md": "# [Project title]\n..."
    }
  ],
  "rejected": [
    { "entry_id": "uuid", "composite_score": 4.2, "reason": "NAICS mismatch and 6 years old" }
  ],
  "warnings": ["Only 2 references scored above 7; consider adding a third strong entry"]
}
```

The tailored writeup field is what gets pasted into the Past Performance Volume; it must be publication-ready, never a draft.
