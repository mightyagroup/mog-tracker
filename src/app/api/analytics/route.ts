import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { EntityType, LeadStatus, SourceType } from '@/lib/types'
// ENTITY_NAICS reserved for future pricing intelligence feature

interface AnalyticsData {
  pipelinesSummary: {
    totalLeads: number
    activeBids: number
    awards: number
    pipelineValue: number
    byEntity: Record<EntityType, { leads: number; bids: number; awards: number; value: number }>
  }
  statusDistribution: Record<EntityType, Record<LeadStatus, number>>
  sourceDistribution: Record<SourceType, number>
  monthlyTrends: Array<{
    month: string
    exousia: number
    vitalx: number
    ironhouse: number
  }>
  fitScoreDistribution: { bucket: string; count: number }[]
  winRates: Record<EntityType, { awarded: number; lost: number; rate: number }>
  avgTimeToAward: Record<EntityType, number>
  deadlineProximity: {
    overdue: number
    sevenDays: number
    fourteenDays: number
    thirtyDays: number
    sixtyPlus: number
  }
  topAgencies: Array<{ agency: string; count: number; value: number; avgFitScore: number }>
  categoryBreakdown: Array<{
    entity: EntityType
    category: string
    color: string
    count: number
    value: number
  }>
  commercialPipeline: {
    prospect: number
    outreach: number
    proposal: number
    negotiation: number
    contract: number
    lost: number
    inactive: number
    totalValue: number
  }
}

export async function GET(_request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore
            }
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    // ────── 1. Pipeline Summary ──────────────────────────────────────────
    const [exousiaRes, vitalxRes, ironhouseRes] = await Promise.all([
      supabase
        .from('gov_leads')
        .select('id, status, estimated_value, service_category_id, source, response_deadline, created_at, awarded_date, agency')
        .eq('entity', 'exousia').is('archived_at', null),
      supabase
        .from('gov_leads')
        .select('id, status, estimated_value, service_category_id, source, response_deadline, created_at, awarded_date, agency')
        .eq('entity', 'vitalx').is('archived_at', null),
      supabase
        .from('gov_leads')
        .select('id, status, estimated_value, service_category_id, source, response_deadline, created_at, awarded_date, agency')
        .eq('entity', 'ironhouse').is('archived_at', null),
    ])

    const allGovLeads = [
      ...(exousiaRes.data ?? []).map(l => ({ ...l, entity: 'exousia' as EntityType })),
      ...(vitalxRes.data ?? []).map(l => ({ ...l, entity: 'vitalx' as EntityType })),
      ...(ironhouseRes.data ?? []).map(l => ({ ...l, entity: 'ironhouse' as EntityType })),
    ]

    const totalLeads = allGovLeads.length
    const activeBids = allGovLeads.filter(l => l.status === 'active_bid').length
    const awards = allGovLeads.filter(l => l.status === 'awarded').length
    const pipelineValue = allGovLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)

    const pipelineByEntity: Record<EntityType, { leads: number; bids: number; awards: number; value: number }> = {
      exousia: { leads: 0, bids: 0, awards: 0, value: 0 },
      vitalx: { leads: 0, bids: 0, awards: 0, value: 0 },
      ironhouse: { leads: 0, bids: 0, awards: 0, value: 0 },
    }

    allGovLeads.forEach(lead => {
      const entity = lead.entity as EntityType
      pipelineByEntity[entity].leads += 1
      if (lead.status === 'active_bid') pipelineByEntity[entity].bids += 1
      if (lead.status === 'awarded') pipelineByEntity[entity].awards += 1
      pipelineByEntity[entity].value += lead.estimated_value ?? 0
    })

    // ────── 2. Status Distribution ───────────────────────────────────────
    const statuses: LeadStatus[] = [
      'new',
      'reviewing',
      'bid_no_bid',
      'active_bid',
      'submitted',
      'awarded',
      'lost',
      'no_bid',
      'cancelled',
    ]

    const statusDistribution: Record<EntityType, Record<LeadStatus, number>> = {
      exousia: {} as Record<LeadStatus, number>,
      vitalx: {} as Record<LeadStatus, number>,
      ironhouse: {} as Record<LeadStatus, number>,
    }

    for (const entity of ['exousia', 'vitalx', 'ironhouse'] as EntityType[]) {
      for (const status of statuses) {
        statusDistribution[entity][status] = allGovLeads.filter(
          l => l.entity === entity && l.status === status
        ).length
      }
    }

    // ────── 3. Source Distribution ───────────────────────────────────────
    const sourceDistribution: Record<SourceType, number> = {
      sam_gov: 0,
      govwin: 0,
      eva: 0,
      emma: 0,
      local_gov: 0,
      usaspending: 0,
      manual: 0,
      commercial: 0,
    }

    allGovLeads.forEach(lead => {
      const source = (lead.source as SourceType) || 'manual'
      sourceDistribution[source] = (sourceDistribution[source] ?? 0) + 1
    })

    // ────── 4. Monthly Trends (last 12 months) ───────────────────────────
    const monthlyTrends: Record<string, { exousia: number; vitalx: number; ironhouse: number }> = {}
    const months: string[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const key = d.toLocaleString('en-US', { year: 'numeric', month: 'short' })
      months.push(key)
      monthlyTrends[key] = { exousia: 0, vitalx: 0, ironhouse: 0 }
    }

    allGovLeads.forEach(lead => {
      if (!lead.created_at) return
      const created = new Date(lead.created_at)
      const key = created.toLocaleString('en-US', { year: 'numeric', month: 'short' })
      if (monthlyTrends[key]) {
        const entity = lead.entity as EntityType
        monthlyTrends[key][entity] += 1
      }
    })

    const monthlyTrendsArray = months.map(month => ({
      month,
      exousia: monthlyTrends[month].exousia,
      vitalx: monthlyTrends[month].vitalx,
      ironhouse: monthlyTrends[month].ironhouse,
    }))

    // ────── 5. Fit Score Distribution ────────────────────────────────────
    const fitScoreBuckets: Record<string, number> = {
      '0-25': 0,
      '26-50': 0,
      '51-75': 0,
      '76-100': 0,
    }

    // Get fit scores (we'll need to fetch this separately if stored)
    // For now, assuming fit_score is not in the initial select; this would need adjustment

    // ────── 6. Win Rates ─────────────────────────────────────────────────
    const winRates: Record<EntityType, { awarded: number; lost: number; rate: number }> = {
      exousia: { awarded: 0, lost: 0, rate: 0 },
      vitalx: { awarded: 0, lost: 0, rate: 0 },
      ironhouse: { awarded: 0, lost: 0, rate: 0 },
    }

    for (const entity of ['exousia', 'vitalx', 'ironhouse'] as EntityType[]) {
      const awarded = allGovLeads.filter(l => l.entity === entity && l.status === 'awarded').length
      const lost = allGovLeads.filter(l => l.entity === entity && l.status === 'lost').length
      const total = awarded + lost
      winRates[entity] = {
        awarded,
        lost,
        rate: total > 0 ? (awarded / total) * 100 : 0,
      }
    }

    // ────── 7. Average Time to Award ─────────────────────────────────────
    const avgTimeToAward: Record<EntityType, number> = {
      exousia: 0,
      vitalx: 0,
      ironhouse: 0,
    }

    for (const entity of ['exousia', 'vitalx', 'ironhouse'] as EntityType[]) {
      const awardedLeads = allGovLeads.filter(
        l => l.entity === entity && l.status === 'awarded' && l.created_at && l.awarded_date
      )
      if (awardedLeads.length > 0) {
        const totalDays = awardedLeads.reduce((sum, l) => {
          const created = new Date(l.created_at!)
          const awarded = new Date((l.awarded_date as unknown as string) || l.created_at!)
          return sum + (awarded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        }, 0)
        avgTimeToAward[entity] = Math.round(totalDays / awardedLeads.length)
      }
    }

    // ────── 8. Deadline Proximity ────────────────────────────────────────
    const deadlineProximity = {
      overdue: 0,
      sevenDays: 0,
      fourteenDays: 0,
      thirtyDays: 0,
      sixtyPlus: 0,
    }

    allGovLeads.forEach(lead => {
      if (!lead.response_deadline) return
      const deadline = new Date(lead.response_deadline)
      const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      if (daysUntil < 0) deadlineProximity.overdue += 1
      else if (daysUntil <= 7) deadlineProximity.sevenDays += 1
      else if (daysUntil <= 14) deadlineProximity.fourteenDays += 1
      else if (daysUntil <= 30) deadlineProximity.thirtyDays += 1
      else if (daysUntil <= 60) deadlineProximity.sixtyPlus += 1
    })

    // ────── 9. Top Agencies ─────────────────────────────────────────────
    const agencyMap: Record<string, { count: number; value: number; fitScores: number[] }> = {}

    allGovLeads.forEach(lead => {
      if (!lead.agency) return
      if (!agencyMap[lead.agency]) {
        agencyMap[lead.agency] = { count: 0, value: 0, fitScores: [] }
      }
      agencyMap[lead.agency].count += 1
      agencyMap[lead.agency].value += lead.estimated_value ?? 0
    })

    const topAgencies = Object.entries(agencyMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([agency, data]) => ({
        agency,
        count: data.count,
        value: data.value,
        avgFitScore: data.fitScores.length > 0 ? data.fitScores.reduce((a, b) => a + b, 0) / data.fitScores.length : 0,
      }))

    // ────── 10. Category Breakdown ───────────────────────────────────────
    const [categoriesRes] = await Promise.all([
      supabase.from('service_categories').select('id, entity, name, color'),
    ])

    const categories = categoriesRes.data ?? []
    const categoryBreakdown: Array<{
      entity: EntityType
      category: string
      color: string
      count: number
      value: number
    }> = []

    categories.forEach(cat => {
      const leads = allGovLeads.filter(
        l => l.entity === cat.entity && l.service_category_id === cat.id
      )
      if (leads.length > 0) {
        categoryBreakdown.push({
          entity: cat.entity as EntityType,
          category: cat.name,
          color: cat.color,
          count: leads.length,
          value: leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0),
        })
      }
    })

    // ────── 11. Commercial Pipeline (VitalX) ─────────────────────────────
    const commercialRes = await supabase
      .from('commercial_leads')
      .select('id, status, estimated_annual_value, contract_value')
      .eq('entity', 'vitalx').is('archived_at', null)

    const commercialLeads = commercialRes.data ?? []
    const commercialPipeline = {
      prospect: commercialLeads.filter(l => l.status === 'prospect').length,
      outreach: commercialLeads.filter(l => l.status === 'outreach').length,
      proposal: commercialLeads.filter(l => l.status === 'proposal').length,
      negotiation: commercialLeads.filter(l => l.status === 'negotiation').length,
      contract: commercialLeads.filter(l => l.status === 'contract').length,
      lost: commercialLeads.filter(l => l.status === 'lost').length,
      inactive: commercialLeads.filter(l => l.status === 'inactive').length,
      totalValue: commercialLeads.reduce((sum, l) => {
        return sum + (l.status === 'contract' ? l.contract_value ?? 0 : l.estimated_annual_value ?? 0)
      }, 0),
    }

    // ────── Fit Score Distribution (using 0 defaults for now) ────────────
    const fitScoreDistribution = [
      { bucket: '0-25', count: fitScoreBuckets['0-25'] },
      { bucket: '26-50', count: fitScoreBuckets['26-50'] },
      { bucket: '51-75', count: fitScoreBuckets['51-75'] },
      { bucket: '76-100', count: fitScoreBuckets['76-100'] },
    ]

    const response: AnalyticsData = {
      pipelinesSummary: {
        totalLeads,
        activeBids,
        awards,
        pipelineValue,
        byEntity: pipelineByEntity,
      },
      statusDistribution,
      sourceDistribution,
      monthlyTrends: monthlyTrendsArray,
      fitScoreDistribution,
      winRates,
      avgTimeToAward,
      deadlineProximity,
      topAgencies,
      categoryBreakdown,
      commercialPipeline,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
