/**
 * Lead tracking utilities:
 * - Generate a brief summary note when a lead is first pulled from SAM.gov
 * - Detect field-level changes between old and new lead data
 * - Generate human-readable change notes for the interaction log
 */

import { createHash } from 'crypto'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LeadSnapshot {
  title?: string | null
  solicitation_number?: string | null
  notice_id?: string | null
  description?: string | null
  agency?: string | null
  sub_agency?: string | null
  naics_code?: string | null
  set_aside?: string | null
  contract_type?: string | null
  place_of_performance?: string | null
  posted_date?: string | null
  response_deadline?: string | null
  archive_date?: string | null
  estimated_value?: number | null
  award_amount?: number | null
  sam_gov_url?: string | null
  contracting_officer_name?: string | null
  contracting_officer_email?: string | null
  contracting_officer_phone?: string | null
  status?: string | null
  entity?: string | null
  source?: string | null
}

export interface FieldChange {
  field: string
  label: string
  oldValue: string
  newValue: string
  significance: 'high' | 'medium' | 'low'
}

// ── Field display labels and significance ──────────────────────────────────────

const TRACKED_FIELDS: Record<string, { label: string; significance: 'high' | 'medium' | 'low' }> = {
  title:                       { label: 'Title',                significance: 'high' },
  response_deadline:           { label: 'Response Deadline',    significance: 'high' },
  estimated_value:             { label: 'Estimated Value',      significance: 'high' },
  award_amount:                { label: 'Award Amount',         significance: 'high' },
  set_aside:                   { label: 'Set-Aside',            significance: 'high' },
  naics_code:                  { label: 'NAICS Code',           significance: 'high' },
  place_of_performance:        { label: 'Place of Performance', significance: 'medium' },
  agency:                      { label: 'Agency',               significance: 'medium' },
  sub_agency:                  { label: 'Sub-Agency',           significance: 'medium' },
  contract_type:               { label: 'Contract Type',        significance: 'medium' },
  archive_date:                { label: 'Archive Date',         significance: 'medium' },
  description:                 { label: 'Description',          significance: 'medium' },
  contracting_officer_name:    { label: 'Contracting Officer',  significance: 'low' },
  contracting_officer_email:   { label: 'CO Email',             significance: 'low' },
  contracting_officer_phone:   { label: 'CO Phone',             significance: 'low' },
  sam_gov_url:                 { label: 'SAM.gov URL',          significance: 'low' },
  posted_date:                 { label: 'Posted Date',          significance: 'low' },
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)'

  if (field === 'estimated_value' || field === 'award_amount') {
    const num = Number(value)
    if (isNaN(num)) return String(value)
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
    return `$${num.toLocaleString()}`
  }

  if (field === 'response_deadline' || field === 'posted_date' || field === 'archive_date') {
    try {
      const d = new Date(String(value))
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    } catch {
      return String(value)
    }
  }

  if (field === 'set_aside') {
    const labels: Record<string, string> = {
      wosb: 'WOSB', edwosb: 'EDWOSB', '8a': '8(a)', hubzone: 'HUBZone',
      sdvosb: 'SDVOSB', small_business: 'Small Business',
      total_small_business: 'Total Small Business', full_and_open: 'Full & Open',
      sole_source: 'Sole Source', none: 'None',
    }
    return labels[String(value)] ?? String(value)
  }

  if (field === 'description') {
    const str = String(value)
    return str.length > 120 ? str.slice(0, 120) + '...' : str
  }

  return String(value)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Hash description for change detection ──────────────────────────────────────

export function hashDescription(desc: string | null | undefined): string {
  if (!desc) return ''
  return createHash('md5').update(desc.trim().toLowerCase()).digest('hex').slice(0, 16)
}

// ── Generate initial summary note ──────────────────────────────────────────────
// Called once when a lead is first pulled from SAM.gov

export function generateInitialSummary(lead: LeadSnapshot): string {
  const parts: string[] = []

  parts.push('NEW OPPORTUNITY PULLED FROM SAM.GOV')
  parts.push('---')

  if (lead.title) parts.push(`Title: ${lead.title}`)
  if (lead.solicitation_number) parts.push(`Solicitation: ${lead.solicitation_number}`)
  if (lead.agency) parts.push(`Agency: ${lead.agency}`)
  if (lead.sub_agency) parts.push(`Sub-Agency: ${lead.sub_agency}`)
  if (lead.naics_code) parts.push(`NAICS: ${lead.naics_code}`)

  if (lead.set_aside && lead.set_aside !== 'none') {
    parts.push(`Set-Aside: ${formatValue('set_aside', lead.set_aside)}`)
  }

  if (lead.contract_type) {
    const ctLabels: Record<string, string> = {
      firm_fixed: 'Firm Fixed Price', time_materials: 'Time & Materials',
      cost_plus: 'Cost Plus', idiq: 'IDIQ', bpa: 'BPA',
      purchase_order: 'Purchase Order',
    }
    parts.push(`Contract Type: ${ctLabels[lead.contract_type] ?? lead.contract_type}`)
  }

  if (lead.estimated_value) {
    parts.push(`Estimated Value: ${formatValue('estimated_value', lead.estimated_value)}`)
  }

  if (lead.place_of_performance) parts.push(`Location: ${lead.place_of_performance}`)

  if (lead.response_deadline) {
    parts.push(`Deadline: ${formatValue('response_deadline', lead.response_deadline)}`)
    const daysOut = Math.ceil((new Date(lead.response_deadline).getTime() - Date.now()) / 86_400_000)
    if (daysOut > 0) parts.push(`Days to Respond: ${daysOut}`)
    else if (daysOut === 0) parts.push('Days to Respond: TODAY')
    else parts.push(`Days to Respond: OVERDUE by ${Math.abs(daysOut)} days`)
  }

  if (lead.contracting_officer_name) {
    let pocLine = `POC: ${lead.contracting_officer_name}`
    if (lead.contracting_officer_email) pocLine += ` (${lead.contracting_officer_email})`
    if (lead.contracting_officer_phone) pocLine += ` | ${lead.contracting_officer_phone}`
    parts.push(pocLine)
  }

  if (lead.sam_gov_url) parts.push(`SAM.gov: ${lead.sam_gov_url}`)

  if (lead.description) {
    parts.push('---')
    parts.push('Description (excerpt):')
    const desc = lead.description.trim()
    parts.push(desc.length > 500 ? desc.slice(0, 500) + '...' : desc)
  }

  return parts.join('\n')
}

// ── Detect changes between old and new lead data ───────────────────────────────

export function detectChanges(oldLead: LeadSnapshot, newLead: LeadSnapshot): FieldChange[] {
  const changes: FieldChange[] = []

  for (const [field, meta] of Object.entries(TRACKED_FIELDS)) {
    const oldVal = (oldLead as Record<string, unknown>)[field]
    const newVal = (newLead as Record<string, unknown>)[field]

    // Normalize for comparison
    const oldStr = normalize(field, oldVal)
    const newStr = normalize(field, newVal)

    if (oldStr !== newStr && newStr !== '') {
      // For description, compare hashes instead of full text
      if (field === 'description') {
        const oldHash = hashDescription(oldVal as string)
        const newHash = hashDescription(newVal as string)
        if (oldHash === newHash) continue
      }

      changes.push({
        field,
        label: meta.label,
        oldValue: formatValue(field, oldVal),
        newValue: formatValue(field, newVal),
        significance: meta.significance,
      })
    }
  }

  // Sort by significance: high first
  const order = { high: 0, medium: 1, low: 2 }
  changes.sort((a, b) => order[a.significance] - order[b.significance])

  return changes
}

function normalize(field: string, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (field === 'estimated_value' || field === 'award_amount') return String(Number(value) || 0)
  return String(value).trim().toLowerCase()
}

// ── Generate change note for interaction log ───────────────────────────────────

export function generateChangeNote(lead: LeadSnapshot, changes: FieldChange[]): string {
  if (changes.length === 0) return ''

  const parts: string[] = []

  // Brief contract context at the top
  parts.push('LEAD UPDATED -- CHANGES DETECTED')
  parts.push('---')
  if (lead.title) parts.push(`Contract: ${lead.title}`)
  if (lead.solicitation_number) parts.push(`Solicitation: ${lead.solicitation_number}`)
  if (lead.agency) parts.push(`Agency: ${lead.agency}`)
  parts.push('---')

  // Deadline change gets special treatment
  const deadlineChange = changes.find(c => c.field === 'response_deadline')
  if (deadlineChange) {
    parts.push(`DEADLINE CHANGED: ${deadlineChange.oldValue} --> ${deadlineChange.newValue}`)
    const newDeadline = (lead as Record<string, unknown>)['response_deadline']
    if (newDeadline) {
      const daysOut = Math.ceil((new Date(String(newDeadline)).getTime() - Date.now()) / 86_400_000)
      if (daysOut > 0) parts.push(`  New days to respond: ${daysOut}`)
    }
    parts.push('')
  }

  // All changes listed
  parts.push('Changes:')
  for (const change of changes) {
    if (change.field === 'response_deadline') continue // already shown above
    if (change.field === 'description') {
      parts.push(`- ${change.label}: Content updated (description text has changed)`)
    } else {
      parts.push(`- ${change.label}: ${change.oldValue} --> ${change.newValue}`)
    }
  }

  parts.push('')
  parts.push(`Detected: ${formatDate(new Date())}`)

  // Flag if this looks like an amendment
  const highChanges = changes.filter(c => c.significance === 'high')
  if (highChanges.length > 0) {
    parts.push('')
    parts.push('NOTE: High-significance changes detected. This may be a solicitation amendment. Review the full solicitation on SAM.gov.')
  }

  return parts.join('\n')
}

// ── Determine if changes constitute a likely amendment ─────────────────────────

export function isLikelyAmendment(changes: FieldChange[]): boolean {
  // An amendment typically changes deadline, description, or scope-related fields
  const amendmentSignals = ['response_deadline', 'description', 'title', 'estimated_value', 'set_aside', 'naics_code']
  return changes.some(c => amendmentSignals.includes(c.field) && c.significance === 'high')
}
