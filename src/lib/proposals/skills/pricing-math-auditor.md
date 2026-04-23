---
name: pricing-math-auditor
description: Verify every number in the pricing volume. Use before Mark Submitted. Catches math errors, overhead mismatches, markups that exceed agency norms, CLIN structure violations, and missing option year pricing. A single math error in pricing is more likely to lose the award than any narrative flaw.
---

# Pricing Math Auditor

## Why this matters

Federal pricing is audited three ways: (1) by the contracting officer's price analyst, (2) by DCAA if cost-reimbursable, (3) by the bidder's own math before submission. Errors in (3) guarantee a red flag in (1). Wrong totals are treated as sloppy at best and fraudulent at worst.

## What to audit (in order)

### 1. CLIN structure matches Section B
- Every CLIN in Section B must have a corresponding pricing row
- CLIN numbering must match exactly (0001, 0002 — not 1, 2)
- CLIN descriptions must mirror Section B wording
- Unit of measure must match (each, hour, month, lot, sqft)
- Quantity must match Section B

### 2. Per-CLIN arithmetic
For each CLIN:
- Extended Price = Qty × Unit Cost, computed manually and compared to the stored value
- Sum of sub-costs (labor + materials + equipment + subcontract + overhead + other) equals Total Cost for that CLIN
- Margin % applied consistently: either to base cost, or to fully burdened cost — pick one per solicitation

### 3. Overall rollups
- Total Base Cost = sum of CLIN base costs (to the cent)
- Overhead $ = Base Cost × Overhead %  (verify multiplication)
- G&A $ = (Base + Overhead) × G&A %
- Fee/Profit $ = (Base + Overhead + G&A) × Fee %  (unless solicitation specifies a different formula)
- Grand Total = Base + Overhead + G&A + Fee

### 4. Markup sanity checks
Flag as suspicious when:
- Overhead > 20% for services-heavy work
- G&A > 12% for small business
- Fee > 10% on fixed-price services (many agencies cap at 7-8%)
- Blended margin < 8% (check that subs aren't being lost money on)
- Blended margin > 30% (you'll lose on price against any competitor)

### 5. Option year pricing
- Every base year CLIN must have option year equivalents if the solicitation has option periods
- Option year pricing should reflect labor escalation (typically 2-4% per year)
- Option year quantities should match the base year unless otherwise specified
- Grand totals must include option years when Section M evaluates total evaluated price

### 6. Labor category and rate validation
When using labor categories:
- Cross-check each labor rate against GSA schedule rates (if on-schedule)
- Rates should be lower than or equal to GSA ceiling
- Escalation between base and option years should be consistent
- Named people in the technical volume should have matching labor categories in pricing

## Red flags that warrant author review

- Pricing total doesn't equal narrative total in executive summary
- Pricing worksheet uses one overhead %, cost narrative mentions another
- Subcontractor markup exceeds 10% (many agencies flag above 7%)
- Labor category names don't match SF 1449 Schedule B
- Quantities of months don't equal period of performance length
- Surge pricing or variable-hour work isn't clearly labeled

## Output format

```json
{
  "findings": [
    {
      "severity": "fatal" | "high" | "medium" | "low",
      "clin": "0001",
      "field": "extended_price",
      "stored": 36000,
      "calculated": 36500,
      "delta": 500,
      "message": "CLIN 0001 extended price mismatch: stored $36,000, calculated $36,500 from 12 months × $3,042 unit cost"
    }
  ],
  "rollup_check": {
    "total_base_cost": { "stored": number, "calculated": number, "ok": boolean },
    "total_overhead": { "stored": number, "calculated": number, "ok": boolean },
    "grand_total": { "stored": number, "calculated": number, "ok": boolean }
  },
  "sanity_flags": [
    "Overhead 22% on services-heavy scope exceeds typical cap"
  ]
}
```

Any `severity: fatal` finding means the proposal cannot ship until corrected. Always recalculate from raw unit cost × qty; never trust the stored `extended_price` field.
