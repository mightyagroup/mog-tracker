// Address protocol for all MOG entities (Exousia, VitalX, IronHouse, MOG parent).
// Locked 2026-04-24.
//
// Two distinct addresses exist:
//  - PHYSICAL / LEGAL:   6509 Wild Orchid Ct, Fredericksburg, VA 22407
//  - MAILING / CORRESP:  107B E. Davis St, Culpeper, VA 22701
//
// Rule summary:
//  - Federal proposals, SAM.gov, SBA, CAGE, government-generated contract docs
//    → PHYSICAL (Wild Orchid). Matches validated federal registration records.
//  - Subcontractor agreements, NDAs, teaming agreements, independent contractor
//    agreements, invoices, capability statements, vendor mail, external business
//    correspondence, payment remittance → MAILING (Culpeper).
//
// CRITICAL: The physical address is Emmanuela's home; it must never be shown
// in public-facing UI, public API responses, or any document intended for
// external parties unless the document type is explicitly in FEDERAL_DOC_TYPES.
//
// The validator enforces this; the proposal generator picks the correct address
// automatically based on the document type.

export const PHYSICAL_ADDRESS = {
  line1: '6509 Wild Orchid Ct',
  line2: '',
  city: 'Fredericksburg',
  state: 'VA',
  zip: '22407',
  formatted: '6509 Wild Orchid Ct, Fredericksburg, VA 22407',
  isPublic: false,
  purpose: 'physical_legal',
}

export const MAILING_ADDRESS = {
  line1: '107B E. Davis St',
  line2: '',
  city: 'Culpeper',
  state: 'VA',
  zip: '22701',
  formatted: '107B E. Davis St, Culpeper, VA 22701',
  isPublic: true,
  purpose: 'mailing_correspondence',
}

export const FEDERAL_DOC_TYPES = new Set<string>([
  'sf_1449',
  'sf_30',
  'sf_33',
  'reps_and_certs',
  'federal_proposal_cover',
  'federal_technical_proposal',
  'federal_past_performance',
  'federal_pricing_schedule',
  'sam_registration',
  'sba_certification',
  'cage_documentation',
  'far_52_certification',
  'government_contract',
  'wage_determination_attachment',
])

export type AddressUse =
  | 'federal_proposal'
  | 'teaming_agreement'
  | 'nda'
  | 'subcontractor_agreement'
  | 'invoice'
  | 'capability_statement'
  | 'correspondence'
  | 'payment_remittance'
  | 'public_website'
  | 'marketing'

export function addressFor(use: AddressUse | string): typeof PHYSICAL_ADDRESS | typeof MAILING_ADDRESS {
  if (use === 'federal_proposal') return PHYSICAL_ADDRESS
  if (FEDERAL_DOC_TYPES.has(use)) return PHYSICAL_ADDRESS
  return MAILING_ADDRESS
}

export function addressPair() {
  return {
    physical: PHYSICAL_ADDRESS,
    mailing: MAILING_ADDRESS,
  }
}

export function checkAddressCompliance(docType: AddressUse | string, text: string): {
  ok: boolean
  violations: Array<{ pattern: string; reason: string }>
} {
  const violations: Array<{ pattern: string; reason: string }> = []
  const isFederal = FEDERAL_DOC_TYPES.has(docType) || docType === 'federal_proposal'

  if (!isFederal) {
    const physicalHit = /6509\s+Wild\s+Orchid\s+Ct|Wild\s+Orchid\s+Ct/i.test(text)
    if (physicalHit) {
      violations.push({
        pattern: '6509 Wild Orchid Ct',
        reason: 'Physical address appears in a non-federal document. Use 107B E. Davis St, Culpeper instead.',
      })
    }
  }

  if (isFederal) {
    const physicalHit = /6509\s+Wild\s+Orchid\s+Ct/i.test(text)
    if (!physicalHit) {
      violations.push({
        pattern: '(missing) 6509 Wild Orchid Ct',
        reason: 'Federal document is missing the registered physical address — inconsistent with SAM.gov.',
      })
    }
  }

  return { ok: violations.length === 0, violations }
}

export const ENTITY_ADDRESSES = {
  mog:       { legalName: 'Mighty Oak Group LLC' },
  exousia:   { legalName: 'Exousia Solutions LLC' },
  vitalx:    { legalName: 'VitalX LLC' },
  ironhouse: { legalName: 'IronHouse Services LLC' },
}
