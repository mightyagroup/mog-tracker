import { differenceInDays, parseISO } from 'date-fns'
import { GovLead, EntityType, ServiceCategory } from './types'
import { ENTITY_NAICS } from './constants'

export function calculateFitScore(lead: Partial<GovLead>, entity: EntityType): number {
  let score = 0

  // NAICS match (0–30 points)
  const entityNaics = ENTITY_NAICS[entity]
  if (lead.naics_code && entityNaics.includes(lead.naics_code)) score += 30

  // Set-aside match (0–25 points)
  if (lead.set_aside === 'wosb' || lead.set_aside === 'edwosb') score += 25
  else if (lead.set_aside === 'small_business' || lead.set_aside === 'total_small_business') score += 15
  else if (lead.set_aside === 'full_and_open') score += 5

  // Value range (0–15 points) — sweet spot $50K–$500K
  const val = lead.estimated_value ?? 0
  if (val >= 50_000 && val <= 500_000) score += 15
  else if (val > 500_000 && val <= 2_000_000) score += 10
  else if (val > 0 && val < 50_000) score += 5

  // Location match (0–15 points) — DMV area
  const loc = (lead.place_of_performance ?? '').toLowerCase()
  if (
    loc.includes('virginia') || loc.includes(' va ') || loc.includes(', va') ||
    loc.includes('maryland') || loc.includes(' md ') || loc.includes(', md') ||
    loc.includes('district of columbia') || loc.includes(' dc') || loc.includes('washington')
  ) score += 15

  // Time to respond (0–15 points)
  if (lead.response_deadline) {
    const daysLeft = differenceInDays(parseISO(lead.response_deadline), new Date())
    if (daysLeft >= 14) score += 15
    else if (daysLeft >= 7) score += 10
    else if (daysLeft >= 3) score += 5
  }

  return Math.min(score, 100)
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
