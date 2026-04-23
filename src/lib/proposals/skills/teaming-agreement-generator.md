---
name: teaming-agreement-generator
description: Generate a teaming agreement between a MOG entity (prime) and a subcontractor or teaming partner for a specific pursuit. Use after selecting teaming partners but before pink team. Produces a standard-form agreement that protects the prime, preserves competitive advantages, and meets FAR flow-down requirements.
---

# Teaming Agreement Generator

## Purpose

A teaming agreement is a pre-award contract between the prime and a proposed subcontractor. It commits both parties to work together on a specific pursuit, defines scope allocation, handles exclusivity, and governs what happens if the prime wins or loses.

**A teaming agreement is NOT a subcontract.** The subcontract is executed after award. The teaming agreement only governs the pre-award pursuit.

## Required sections

### 1. Parties
- Full legal names of prime and sub
- State of incorporation
- Business address (use MOG mailing address — `addressFor('teaming_agreement')` from `src/lib/address-protocol.ts`)
- Signatory name, title, email

### 2. Opportunity identification
- Solicitation number
- Agency / customer
- Title
- Period of performance
- Estimated value
- Submission deadline

### 3. Scope allocation
- Prime scope (named deliverables)
- Sub scope (named deliverables)
- Work share as percentage of total effort (never below the small-business limitation on subcontracting for set-aside work — typically 50% must be performed by the prime)
- Named key personnel and resumes attached as exhibits

### 4. Exclusivity
- Sub agrees to team exclusively with prime on this pursuit
- Duration: from agreement date until award decision + 30 days
- Carve-outs: unrelated NAICS, other customers, etc.
- Penalty for breach: named liquidated damages or hard obligation

### 5. Proprietary information and IP
- Both parties designate proprietary information with written notice
- Non-disclosure extends 5 years past pursuit end
- Pre-existing IP stays with original owner
- Jointly developed IP during pursuit is shared or governed by a separate IP agreement
- Any data rights flow-down per FAR 52.227-14

### 6. Flow-down clauses
Clauses the prime must flow to the sub if awarded:
- FAR 52.219-8 Utilization of Small Business Concerns
- FAR 52.222-26 Equal Opportunity
- FAR 52.222-50 Trafficking
- FAR 52.224-2 Privacy Act (if applicable)
- FAR 52.227-14 Rights in Data
- DFARS 252.204-7012 Safeguarding CDI (if DoD and CUI-handling)
- Additional clauses per Section I of the solicitation

### 7. Proposal cooperation
- Each party prepares its portion of the technical and pricing volume
- Deadlines for each party to deliver sections to the prime
- Prime has final authorship and editorial control
- Each party represents its content is accurate and non-infringing
- Each party pays its own bid and proposal costs

### 8. Post-award subcontract terms
- Commitment to negotiate a subcontract in good faith if prime wins
- Pricing basis: fixed price, time and materials, cost-plus
- Subcontract value not to exceed the pricing included in the proposal
- Termination rights if subcontract negotiations fail

### 9. Termination and default
- Either party may terminate if the pursuit is cancelled by the customer
- Material breach requires 10 days written notice to cure
- Termination does not extinguish NDA obligations

### 10. Governing law and signatures
- Governing law: Virginia (for Exousia and VitalX; adjust for IronHouse)
- Dispute resolution: binding arbitration
- Signatures with date, printed name, and title for both parties

## Address protocol compliance

Use `addressFor('teaming_agreement')` from `src/lib/address-protocol.ts`. This is a federal document; it uses the Culpeper mailing address, NOT the physical Wild Orchid address. Never expose the physical address in a document that may be shared with third parties.

## Red flags before sending

- Sub has not signed an NDA yet — do not share solicitation language before NDA is executed
- Sub cannot meet the flow-down requirements (especially CMMC or Privacy Act)
- Sub's labor categories are priced above prime's rate ceilings
- Sub's named personnel are also named on a competitor's teaming agreement
- Work share violates the small business limitation on subcontracting

## Output

The generator produces a DOCX file with the agreement text, plus a JSON metadata blob that records:

```json
{
  "prime_entity": "exousia",
  "sub_id": "uuid",
  "opportunity": { "solicitation_number": "...", "agency": "..." },
  "work_share": { "prime_pct": 60, "sub_pct": 40 },
  "generated_at": "ISO8601",
  "template_version": "v1",
  "flow_down_clauses": ["FAR 52.219-8", "FAR 52.222-26", "..."],
  "address_used": "culpeper"
}
```

The DOCX file is saved to `proposal_deliverables` with `deliverable_type = 'teaming_agreement'`.
