---
name: far-compliance-checker
description: Verify FAR (Federal Acquisition Regulation) clause compliance, required certifications, and representations. Use during intake and before Mark Submitted. Flags missing SAM.gov reps/certs, FAR 52.204-7/8 assertions that need to be current, supply-chain clause gaps, and Buy American requirements that could disqualify the bid.
---

# FAR Compliance Checker

## Why this matters

FAR clauses are not suggestions. A single missing certification (FAR 52.212-3, DFARS 252.204-7012) can disqualify the proposal from award even after selection. Contracting officers have zero discretion on mandatory clauses — missing means out.

## What to check

### 1. SAM.gov active registration
- UEI is valid and not expired
- NAICS code on the lead matches an NAICS on the SAM profile
- SAM renewal date is at least 30 days out (SAM renewals take 7-14 days when delayed)
- EIN, CAGE, and address on the proposal match SAM exactly
- Representations and Certifications section in SAM is current (updated annually)

### 2. Reading FAR clauses in the solicitation
Every solicitation incorporates FAR clauses by reference. Parse Section I for:
- FAR 52.204-7 — System for Award Management
- FAR 52.204-8 — Annual Representations and Certifications
- FAR 52.204-24 — Representation Regarding Certain Telecommunications
- FAR 52.204-25 — Prohibition on Contracting for Certain Telecommunications (Section 889)
- FAR 52.212-3 — Offeror Representations and Certifications (Commercial Items)
- FAR 52.219-1 — Small Business Program Representations
- FAR 52.222-50 — Combating Trafficking in Persons

### 3. Common conditional requirements
- **Contract value $750K+**: Subcontracting plan required (FAR 52.219-9)
- **Contract value $2M+**: First-Tier Subcontractor Reporting (FFATA)
- **Contract value $7.5M+**: Small Business Subcontracting Plan with goals by socioeconomic category
- **Federal prime to DoD**: CMMC Level 2 or 3 depending on CUI handling
- **Services at government sites**: Service Contract Act labor categories and wage determinations
- **Any IT**: Section 508 accessibility (EIT) compliance statement
- **Supply chain risk**: Section 889 Part B representation on covered telecom

### 4. Socioeconomic set-aside verification
When a solicitation is set aside, verify eligibility at the time of offer AND at award:
- WOSB / EDWOSB: SBA certification or self-certification + SBA annual attestation
- HUBZone: principal office in HUBZone AND 35% of employees live in HUBZone
- 8(a): Active 8(a) status; program duration not expired
- SDVOSB/VOSB: VA CVE verification for VA contracts
- Size standard: company size under NAICS-specific threshold for 3-year average

From `src/lib/constants.ts` `ENTITY_SET_ASIDE_ELIGIBILITY`:
- Exousia: WOSB, EDWOSB, small_business
- VitalX: WOSB, EDWOSB, small_business
- IronHouse: small_business only

### 5. Representation statements to include in the offer
- Small Business Representation (FAR 52.219-1)
- Previous Contracts and Compliance (FAR 52.222-22)
- Affirmative Action Compliance (FAR 52.222-25) if $10M+
- Buy American Certificate (FAR 52.225-2) if supply contract
- Covered Telecommunications (FAR 52.204-24)
- Predecessor company (if applicable)

### 6. Flow-down clauses to subcontractors
When teaming with subs, prime is responsible for flowing down certain clauses. Check `proposal_teaming_partners`:
- FAR 52.219-8 Utilization of Small Business Concerns
- FAR 52.222-26 Equal Opportunity
- FAR 52.222-50 Trafficking
- FAR 52.224-2 Privacy Act (for Privacy Act data)
- FAR 52.227-14 Rights in Data
- DFARS 252.204-7012 Safeguarding Covered Defense Information

## Output

```json
{
  "findings": [
    {
      "severity": "fatal" | "high" | "medium",
      "clause": "FAR 52.204-24",
      "issue": "Section 889 representation not included in offer",
      "fix": "Add FAR 52.204-24(d) representation statement to Volume I, Section 3"
    }
  ],
  "sam_status": {
    "active": true,
    "expires": "2026-08-15",
    "naics_match": true
  },
  "set_aside_eligibility": {
    "required": "WOSB",
    "eligible": true,
    "certification_current": true
  }
}
```

Any `severity: fatal` finding must block submission. FAR violations are not forgivable at pink-team time.
