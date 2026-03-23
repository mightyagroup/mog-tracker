import { differenceInDays, parseISO } from 'date-fns'
import { GovLead, EntityType, ServiceCategory } from './types'
import { ENTITY_NAICS } from './constants'

export function calculateFitScore(lead: Partial<GovLead>, entity: EntityType): number {
  let score = 0

  // Set-aside match (0–35 points) — WOSB/EDWOSB is top priority (Exousia + VitalX are WOSB-certified)
  if (lead.set_aside === 'wosb' || lead.set_aside === 'edwosb') score += 35
  else if (lead.set_aside === 'small_business' || lead.set_aside === 'total_small_business') score += 22
  else if (lead.set_aside === 'sole_source') score += 12
  else if (lead.set_aside === 'full_and_open') score += 5

  // NAICS match (0–25 points) — primary code required
  const entityNaics = ENTITY_NAICS[entity]
  if (lead.naics_code && entityNaics.includes(lead.naics_code)) score += 25

  // Location (0–20 points) — local competition is lower; proximity matters
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

  // Time to respond (0–5 points)
  if (lead.response_deadline) {
    const daysLeft = differenceInDays(parseISO(lead.response_deadline), new Date())
    if (daysLeft >= 14) score += 5
    else if (daysLeft >= 7) score += 3
    else if (daysLeft >= 3) score += 1
  }

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

export function exportLeadsToCSV(leads: GovLead[], categories: ServiceCategory[]): void {
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
}
