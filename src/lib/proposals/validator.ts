// Runtime validator — deterministic counterpart to the proposal-validator skill.

import {
  ENTITY_NAICS, ENTITY_SAM_REGISTERED, ENTITY_SET_ASIDE_ELIGIBILITY, ENTITY_SECTORS,
} from '@/lib/constants'
import { checkAddressCompliance } from '@/lib/address-protocol'
import { detectAiTells } from './humanizer-runtime'

export type EntityKey = 'exousia' | 'vitalx' | 'ironhouse'

export type Severity = 'minor' | 'major' | 'fatal'

export type ValidatorFinding = {
  pass: 1 | 2 | 3 | 4 | 5
  rule: string
  message: string
  severity: Severity
  suggestedFix?: string
}

export type ValidatorInput = {
  entity: EntityKey
  proposal: {
    id: string
    solicitation_number?: string | null
    submission_deadline?: string | null
    submission_method?: string | null
    amendments_incorporated?: boolean | null
    amendments_checked_at?: string | null
    incumbent_researched_at?: string | null
    intake_complete?: boolean | null
  }
  lead: {
    title?: string | null
    naics_code?: string | null
    set_aside?: string | null
    agency?: string | null
    place_of_performance?: string | null
    description?: string | null
  }
  complianceItems: Array<{
    id: string
    source_section: string
    requirement_text: string
    requirement_type?: string | null
    status: string
    severity: string
  }>
  deliverables: Array<{
    id: string
    kind: string
    name: string
    format?: string | null
    required_format?: string | null
    pages?: number | null
    page_limit?: number | null
    humanized?: boolean | null
  }>
  subcontractors: Array<{
    id: string
    company_name: string
    loi_signed_at?: string | null
  }>
  narrativeText?: string
}

export type ValidatorOutput = {
  entity: EntityKey
  solicitation_number: string | null
  validated_at: string
  overall_status: 'ready_for_review' | 'hold_action_required'
  pass_results: {
    pass1_eligibility: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'VERIFY'
    pass2_compliance_gaps: number
    pass3_unverified_claims: number
    pass4_assumptions: number
    pass5_fatal_flaws: number
  }
  findings: ValidatorFinding[]
  fatal_flaws_count: number
  major_gaps_count: number
  minor_gaps_count: number
}

function add(findings: ValidatorFinding[], f: ValidatorFinding) { findings.push(f) }

function pass1Eligibility(i: ValidatorInput, out: ValidatorFinding[]): 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'VERIFY' {
  let verdict: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'VERIFY' = 'ELIGIBLE'

  const setAside = (i.lead.set_aside || '').toLowerCase()
  const elig = ENTITY_SET_ASIDE_ELIGIBILITY[i.entity]

  const fatalSetAsides = ['8a', 'hubzone', 'sdvosb']
  if (fatalSetAsides.includes(setAside)) {
    add(out, {
      pass: 1, rule: 'set_aside_ineligible',
      message: i.entity + ' does not qualify for ' + setAside.toUpperCase() + ' set-asides',
      severity: 'fatal', suggestedFix: 'Withdraw this bid.',
    })
    return 'NOT_ELIGIBLE'
  }
  if (setAside === 'wosb' && !elig.wosb) {
    add(out, { pass: 1, rule: 'wosb_ineligible', message: i.entity + ' not WOSB certified', severity: 'fatal' })
    return 'NOT_ELIGIBLE'
  }
  if (setAside === 'edwosb' && !elig.edwosb) {
    add(out, { pass: 1, rule: 'edwosb_ineligible', message: i.entity + ' not EDWOSB certified', severity: 'fatal' })
    return 'NOT_ELIGIBLE'
  }

  const naics = (i.lead.naics_code || '').trim()
  const approvedNaics = ENTITY_NAICS[i.entity] || []
  if (!naics) {
    add(out, {
      pass: 1, rule: 'naics_missing',
      message: 'Solicitation NAICS code not set on the lead',
      severity: 'major', suggestedFix: 'Set the NAICS code on the lead before continuing.',
    })
    verdict = 'VERIFY'
  } else if (!approvedNaics.includes(naics)) {
    add(out, {
      pass: 1, rule: 'naics_not_approved',
      message: 'NAICS ' + naics + ' is not in ' + i.entity + ' approved list: ' + approvedNaics.join(', '),
      severity: 'fatal', suggestedFix: 'Do not bid this under ' + i.entity + '. Consider another entity or withdraw.',
    })
    return 'NOT_ELIGIBLE'
  }

  const sam = ENTITY_SAM_REGISTERED[i.entity]
  if (!sam.active) {
    add(out, { pass: 1, rule: 'sam_inactive', message: i.entity + ' SAM.gov registration is not active', severity: 'fatal' })
    return 'NOT_ELIGIBLE'
  }

  const src = (i.lead as { source?: string | null }).source
  const isFederal = src === 'sam_gov' || src === 'govwin' || src === 'usaspending'
  if (isFederal && !ENTITY_SECTORS[i.entity].federal) {
    add(out, { pass: 1, rule: 'not_federal_eligible', message: i.entity + ' is not federal-eligible', severity: 'fatal' })
    return 'NOT_ELIGIBLE'
  }

  if (i.proposal.submission_deadline) {
    const dl = new Date(i.proposal.submission_deadline).getTime()
    if (!Number.isNaN(dl) && dl < Date.now()) {
      add(out, {
        pass: 1, rule: 'deadline_passed',
        message: 'Submission deadline has already passed: ' + i.proposal.submission_deadline,
        severity: 'fatal', suggestedFix: 'Close this bid as missed.',
      })
      return 'NOT_ELIGIBLE'
    }
  } else {
    add(out, {
      pass: 1, rule: 'deadline_missing',
      message: 'Submission deadline not set on the proposal',
      severity: 'major', suggestedFix: 'Set the deadline from the solicitation before going further.',
    })
    verdict = 'VERIFY'
  }

  return verdict
}

function pass2Compliance(i: ValidatorInput, out: ValidatorFinding[]): number {
  let gapCount = 0
  const items = i.complianceItems

  if (items.length === 0) {
    add(out, {
      pass: 2, rule: 'no_compliance_matrix',
      message: 'Compliance matrix is empty — no Section L deliverables or Section M criteria recorded.',
      severity: 'major',
      suggestedFix: 'Run the compliance-matrix-builder skill against the solicitation PDF.',
    })
    return 1
  }

  for (const it of items) {
    if (it.status !== 'met' && it.status !== 'waived') {
      gapCount++
      add(out, {
        pass: 2, rule: 'compliance_gap',
        message: '[' + it.source_section + '] ' + it.requirement_text.slice(0, 140) + ' — status: ' + it.status,
        severity: (it.severity as Severity) || 'major',
        suggestedFix: 'Assign an owner and close the deliverable before submission.',
      })
    }
  }

  if (!i.proposal.amendments_incorporated) {
    add(out, {
      pass: 2, rule: 'amendments_not_incorporated',
      message: 'Amendments to the solicitation are not marked as incorporated.',
      severity: 'major',
      suggestedFix: 'Check SAM.gov for amendments and acknowledge each on the SF-30.',
    })
    gapCount++
  }

  if (!i.proposal.submission_method) {
    add(out, {
      pass: 2, rule: 'submission_method_missing',
      message: 'Submission method not recorded (PIEE, email, SAM, etc.).',
      severity: 'major',
      suggestedFix: 'Read Section L and set submission_method on the proposal.',
    })
    gapCount++
  }

  if (i.narrativeText) {
    const addrCheck = checkAddressCompliance('federal_proposal', i.narrativeText)
    if (!addrCheck.ok) {
      for (const v of addrCheck.violations) {
        add(out, {
          pass: 2, rule: 'address_protocol',
          message: v.reason,
          severity: 'major',
        })
        gapCount++
      }
    }
  }

  for (const d of i.deliverables) {
    if (d.required_format && d.format && d.required_format.toLowerCase() !== d.format.toLowerCase()) {
      add(out, {
        pass: 2, rule: 'format_mismatch',
        message: d.name + ': required format is ' + d.required_format + ', actual is ' + d.format,
        severity: 'fatal',
        suggestedFix: 'Regenerate ' + d.name + ' in the required ' + d.required_format + ' format.',
      })
      gapCount++
    }
    if (d.page_limit && d.pages && d.pages > d.page_limit) {
      add(out, {
        pass: 2, rule: 'page_limit_exceeded',
        message: d.name + ': ' + d.pages + ' pages exceeds limit of ' + d.page_limit,
        severity: 'fatal',
        suggestedFix: 'Reduce content below the page limit.',
      })
      gapCount++
    }
  }

  return gapCount
}

function pass3Fabrication(i: ValidatorInput, out: ValidatorFinding[]): number {
  let unverifiedCount = 0

  for (const s of i.subcontractors) {
    if (!s.loi_signed_at) {
      unverifiedCount++
      add(out, {
        pass: 3, rule: 'sub_not_confirmed',
        message: 'Subcontractor named without signed LOI / Teaming Agreement: ' + s.company_name,
        severity: 'major',
        suggestedFix: 'Get an LOI or Teaming Agreement on file before listing this sub in the package.',
      })
    }
  }

  for (const d of i.deliverables) {
    if (d.humanized === false) {
      unverifiedCount++
      add(out, {
        pass: 3, rule: 'deliverable_not_humanized',
        message: d.name + ' has not passed the humanizer post-process.',
        severity: 'major',
        suggestedFix: 'Run the humanizer on this deliverable before pink team.',
      })
    }
  }

  if (i.narrativeText) {
    const tells = detectAiTells(i.narrativeText)
    for (const t of tells) {
      unverifiedCount++
      add(out, {
        pass: 3, rule: 'ai_tell_detected',
        message: 'AI-writing pattern in narrative: ' + t.pattern + ' (' + t.match + ')',
        severity: t.severity,
        suggestedFix: 'Run humanizer on narrative or manually revise.',
      })
    }
  }

  return unverifiedCount
}

function pass4Assumptions(i: ValidatorInput, out: ValidatorFinding[]): number {
  let count = 0

  if (!i.proposal.incumbent_researched_at) {
    count++
    add(out, {
      pass: 4, rule: 'incumbent_not_researched',
      message: 'Incumbent pricing research was skipped. FPDS / USASpending should be checked.',
      severity: 'major',
      suggestedFix: 'Run /api/proposals/research-incumbent before finalizing pricing.',
    })
  }

  if (!i.proposal.intake_complete) {
    count++
    add(out, {
      pass: 4, rule: 'intake_incomplete',
      message: 'Intake wizard has not been marked complete. Some fields may be unset.',
      severity: 'major',
      suggestedFix: 'Complete the intake wizard before drafting deliverables.',
    })
  }

  const unconfirmedSubs = i.subcontractors.filter(s => !s.loi_signed_at).length
  if (unconfirmedSubs > 0) {
    count++
    add(out, {
      pass: 4, rule: 'unconfirmed_teaming',
      message: unconfirmedSubs + ' subcontractor(s) are referenced without a signed LOI/Teaming Agreement.',
      severity: 'major',
      suggestedFix: 'Confirm each sub or remove them from the package.',
    })
  }

  return count
}

function pass5Fatal(i: ValidatorInput, out: ValidatorFinding[]): number {
  let count = 0

  if (i.proposal.submission_deadline) {
    const dl = new Date(i.proposal.submission_deadline).getTime()
    if (!Number.isNaN(dl) && dl < Date.now()) {
      count++
      add(out, { pass: 5, rule: 'deadline_passed_final', message: 'Deadline has passed.', severity: 'fatal' })
    }
  }

  const openFatal = i.complianceItems.filter(c => c.severity === 'fatal' && c.status !== 'met' && c.status !== 'waived')
  for (const c of openFatal) {
    count++
    add(out, {
      pass: 5, rule: 'open_fatal_compliance',
      message: 'FATAL compliance item still open: ' + c.requirement_text.slice(0, 120),
      severity: 'fatal',
    })
  }

  for (const d of i.deliverables) {
    if (d.required_format && d.format && d.required_format.toLowerCase() !== d.format.toLowerCase()) {
      count++
      add(out, {
        pass: 5, rule: 'open_format_mismatch',
        message: 'FATAL: ' + d.name + ' must be ' + d.required_format + ' but is ' + d.format,
        severity: 'fatal',
      })
    }
    if (d.page_limit && d.pages && d.pages > d.page_limit) {
      count++
      add(out, {
        pass: 5, rule: 'open_page_limit',
        message: 'FATAL: ' + d.name + ' exceeds page limit.',
        severity: 'fatal',
      })
    }
  }

  return count
}

export function runValidator(input: ValidatorInput): ValidatorOutput {
  const findings: ValidatorFinding[] = []
  const pass1 = pass1Eligibility(input, findings)
  const pass2 = pass1 === 'NOT_ELIGIBLE' ? 0 : pass2Compliance(input, findings)
  const pass3 = pass1 === 'NOT_ELIGIBLE' ? 0 : pass3Fabrication(input, findings)
  const pass4 = pass1 === 'NOT_ELIGIBLE' ? 0 : pass4Assumptions(input, findings)
  const pass5 = pass1 === 'NOT_ELIGIBLE' ? 1 : pass5Fatal(input, findings)

  const fatalCount = findings.filter(f => f.severity === 'fatal').length
  const majorCount = findings.filter(f => f.severity === 'major').length
  const minorCount = findings.filter(f => f.severity === 'minor').length

  const overall: ValidatorOutput['overall_status'] =
    fatalCount > 0 || majorCount > 0 ? 'hold_action_required' : 'ready_for_review'

  return {
    entity: input.entity,
    solicitation_number: input.proposal.solicitation_number || null,
    validated_at: new Date().toISOString(),
    overall_status: overall,
    pass_results: {
      pass1_eligibility: pass1,
      pass2_compliance_gaps: pass2,
      pass3_unverified_claims: pass3,
      pass4_assumptions: pass4,
      pass5_fatal_flaws: pass5,
    },
    findings,
    fatal_flaws_count: fatalCount,
    major_gaps_count: majorCount,
    minor_gaps_count: minorCount,
  }
}
