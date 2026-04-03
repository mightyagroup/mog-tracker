import { differenceInDays, parseISO } from 'date-fns'
import { GovLead, CommercialLead, EntityType, ServiceCategory, SourceType } from './types'
import { ENTITY_NAICS } from './constants'

export function calculateFitScore(lead: Partial<GovLead>, entity: EntityType): number {
  let score = 0

  // Set-aside match (0–30 points)
  if (lead.set_aside === 'wosb' || lead.set_aside === 'edwosb') score += 30
  else if (lead.set_aside === 'small_business' || lead.set_aside === 'total_small_business') score += 20
  else if (lead.set_aside === 'sole_source' || lead.set_aside === 'hubzone' || lead.set_aside === '8a' || lead.set_aside === 'sdvosb') score += 15
  else if (lead.set_aside === 'full_and_open') score += 5

  // NAICS match (0–25 points)
  const entityNaics = ENTITY_NAICS[entity]
  if (lead.naics_code && entityNaics.includes(lead.naics_code)) score += 25

  // Location (0–20 points)
  const loc = (lead.place_of_performance ?? '').toLowerCase()
  if (
    loc.includes('spotsylvania') || loc.includes('fredericksburg') || loc.includes('stafford') ||
    loc.includes('prince william') || loc.includes('fairfax') || loc.includes('loudoun') ||
    loc.includes('arlington') || loc.includes('alexandria')
  ) score += 20
  else if (loc.includes('virginia') || loc.includes(' va ') || loc.includes(', va') || loc.includes('va,')) score += 16
  else if (
    loc.includes('maryland') || loc.includes(' md ') || loc.includes(', md') ||
    loc.includes('district of columbia') || loc.includes(' dc') || loc.includes('washington, d')
  ) score += 12
  else if (loc.includes('nationwide') || loc.includes('remote') || loc.includes('multiple') || loc === '') score += 8

  // Value range (0–15 points) — sweet spot $25K–$750K
  const val = lead.estimated_value ?? 0
  if (val >= 25_000 && val <= 750_000) score += 15
  else if (val > 750_000 && val <= 2_000_000) score += 10
  else if (val > 0 && val < 25_000) score += 3

  // Time to respond (0–10 points)
  if (lead.response_deadline) {
    const daysLeft = differenceInDays(parseISO(lead.response_deadline), new Date())
    if (daysLeft >= 21) score += 10
    else if (daysLeft >= 14) score += 7
    else if (daysLeft >= 7) score += 4
    else if (daysLeft >= 3) score += 2
  }

  // Source bias (0–5 points)
  const sourcePriority: Record<string, number> = {
    sam_gov: 5,
    govwin: 4,
    usaspending: 4,
    eva: 3,
    emma: 3,
    local_gov: 2,
    commercial: 2,
    manual: 1,
  }
  score += sourcePriority[lead.source ?? 'manual'] ?? 0

  return Math.min(score, 100)
}

export function calculateCommercialFitScore(lead: Partial<CommercialLead> & { source?: SourceType }): number {
  let score = 0

  const estimated = lead.estimated_annual_value ?? 0
  if (estimated >= 100_000) score += 30
  else if (estimated >= 60_000) score += 22
  else if (estimated >= 30_000) score += 15
  else if (estimated > 0) score += 8

  const status = lead.status
  if (status === 'prospect') score += 5
  else if (status === 'outreach') score += 10
  else if (status === 'proposal') score += 15
  else if (status === 'negotiation') score += 18
  else if (status === 'contract') score += 22

  if (lead.source === 'commercial') score += 10

  return Math.min(score, 100)
}

/**
 * Returns true if the lead does NOT meet at least 2 of 4 quality criteria.
 * Low-fit leads are hidden by default in the table.
 */
export function isLowFit(lead: Partial<GovLead>, entity: EntityType): boolean {
  let criteria = 0
  const entityNaics = ENTITY_NAICS[entity]

  // 1. Set-aside targets WOSB / small business
  if (['wosb', 'edwosb', 'small_business', 'total_small_business'].includes(lead.set_aside ?? '')) criteria++

  // 2. Value in target range
  const val = lead.estimated_value ?? 0
  if (val >= 25_000 && val <= 750_000) criteria++

  // 3. Place of performance is in target region (VA/MD/DC/remote)
  const loc = (lead.place_of_performance ?? '').toLowerCase()
  if (
    loc.includes('virginia') || loc.includes('maryland') || loc.includes('dc') ||
    loc.includes('washington') || loc.includes('remote') || loc.includes('nationwide') || loc === ''
  ) criteria++

  // 4. NAICS is a primary code for this entity
  if (lead.naics_code && entityNaics.includes(lead.naics_code)) criteria++

  return criteria < 2
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export function formatFullCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  return differenceInDays(parseISO(deadline), new Date())
}

export function exportLeadsToCSV(leads: GovLead[], categories: ServiceCategory[]): number {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  const headers = [
    'Title', 'Agency', 'Solicitation #', 'Status', 'Source', 'NAICS', 'Set-Aside',
    'Category', 'Est. Value', 'Deadline', 'Place of Performance', 'Fit Score',
    'Proposal Lead', 'SAM.gov URL', 'Notes',
  ]

  const rows = leads.map(l => [
    l.title,
    l.agency ?? '',
    l.solicitation_number ?? '',
    l.status,
    l.source,
    l.naics_code ?? '',
    l.set_aside,
    l.service_category_id ? (catMap[l.service_category_id] ?? '') : '',
    l.estimated_value?.toString() ?? '',
    l.response_deadline ?? '',
    l.place_of_performance ?? '',
    l.fit_score.toString(),
    l.proposal_lead ?? '',
    l.sam_gov_url ?? '',
    l.notes ?? '',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

  return rows.length
}

/**
 * Auto-categorizes a lead based on NAICS code or keywords in title/description.
 * Returns the category ID or null if no match found.
 */
export function autoCategorizeLead(
  entity: EntityType,
  naicsCode: string | null | undefined,
  title: string | null | undefined,
  description: string | null | undefined,
  categories: ServiceCategory[]
): string | null {
  // First, try exact NAICS match
  if (naicsCode) {
    const match = categories.find(c =>
      c.entity === entity && (c.naics_codes as string[]).includes(naicsCode)
    )
    if (match) return match.id
  }

  // Then, try keyword match in title or description
  const text = `${title ?? ''} ${description ?? ''}`.toLowerCase()
  if (text.trim()) {
    const match = categories.find(c =>
      c.entity === entity &&
      (c.keywords as string[]).some(kw => text.includes(kw.toLowerCase()))
    )
    if (match) return match.id
  }

  // Fallback to "General Support" or similar
  const fallback = categories.find(c =>
    c.entity === entity &&
    (c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('support'))
  )
  return fallback?.id ?? null
}

/**
 * Validates if the selected category's NAICS codes include the lead's NAICS.
 * Returns true if valid (no NAICS or matches), false if mismatch.
 */
export function validateCategoryNaics(
  categoryId: string | null | undefined,
  naicsCode: string | null | undefined,
  categories: ServiceCategory[]
): boolean {
  if (!categoryId || !naicsCode) return true // No category or no NAICS = valid
  const category = categories.find(c => c.id === categoryId)
  if (!category) return true // Category not found = allow (might be invalid anyway)
  return (category.naics_codes as string[]).includes(naicsCode)
}
