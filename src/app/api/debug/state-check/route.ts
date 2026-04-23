import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_request: Request) {
  const supabase = await createServerSupabaseClient()

  const TODAY = new Date('2026-04-22')
  const sevenDaysAgo = new Date(TODAY.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(TODAY.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const results = {
    timestamp: new Date().toISOString(),
    tableCounts: {} as Record<string, number>,
    govLeads: {
      byEntity: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      overdueCount: 0,
      sevenDaysOverdueCount: 0,
      createdLast7: 0,
      createdLast30: 0,
      oldestLead: null as string | null,
      newestLead: null as string | null,
      hasArchivedAt: false,
      last5Leads: [] as Record<string, unknown>[],
    },
    commercialLeads: {
      byStatus: {} as Record<string, number>,
      noContactCount: 0,
      oldestLead: null as string | null,
      newestLead: null as string | null,
      organizations: [] as string[],
    },
    userProfiles: {
      exists: false,
      count: 0,
      profiles: [] as Record<string, unknown>[],
    },
  }

  try {
    // Count all tables
    const tables = ['gov_leads', 'commercial_leads', 'contacts', 'subcontractors', 'interactions', 'compliance_items', 'pricing_records', 'service_categories']

    for (const table of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      results.tableCounts[table] = count || 0
    }

    // Gov leads breakdown
    const { data: allGovLeads } = await supabase.from('gov_leads').select('entity, status, response_deadline, created_at, id')
    if (allGovLeads) {
      // By entity
      for (const lead of allGovLeads) {
        results.govLeads.byEntity[lead.entity] = (results.govLeads.byEntity[lead.entity] || 0) + 1
        results.govLeads.byStatus[lead.status] = (results.govLeads.byStatus[lead.status] || 0) + 1

        // Check dates
        if (lead.response_deadline && new Date(lead.response_deadline) < TODAY) {
          results.govLeads.overdueCount++
        }
        const sevenDaysAgoDate = new Date(TODAY.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (lead.response_deadline && new Date(lead.response_deadline) < sevenDaysAgoDate) {
          results.govLeads.sevenDaysOverdueCount++
        }
        if (new Date(lead.created_at) >= new Date(sevenDaysAgo)) {
          results.govLeads.createdLast7++
        }
        if (new Date(lead.created_at) >= new Date(thirtyDaysAgo)) {
          results.govLeads.createdLast30++
        }
      }

      // Time range
      const sorted = allGovLeads.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      if (sorted.length > 0) {
        results.govLeads.oldestLead = sorted[0].created_at
        results.govLeads.newestLead = sorted[sorted.length - 1].created_at
      }
    }

    // Check archived_at column
    const { data: archiveTest } = await supabase.from('gov_leads').select('archived_at').limit(1)
    results.govLeads.hasArchivedAt = !!archiveTest

    // Last 5 leads
    const { data: last5 } = await supabase.from('gov_leads').select('title, entity, source, created_at').order('created_at', { ascending: false }).limit(5)
    if (last5) {
      results.govLeads.last5Leads = last5
    }

    // Commercial leads breakdown
    const { data: allCommLeads } = await supabase.from('commercial_leads').select('status, last_contact_date, created_at, organization_name')
    if (allCommLeads) {
      for (const lead of allCommLeads) {
        results.commercialLeads.byStatus[lead.status] = (results.commercialLeads.byStatus[lead.status] || 0) + 1
        if (!lead.last_contact_date) {
          results.commercialLeads.noContactCount++
        }
      }

      const sorted = allCommLeads.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      if (sorted.length > 0) {
        results.commercialLeads.oldestLead = sorted[0].created_at
        results.commercialLeads.newestLead = sorted[sorted.length - 1].created_at
        results.commercialLeads.organizations = allCommLeads.map(l => l.organization_name).filter(Boolean)
      }
    }

    // User profiles
    const { data: profiles, error: profilesError } = await supabase.from('user_profiles').select('user_id, email, role, entities_access, is_active')
    if (!profilesError && profiles) {
      results.userProfiles.exists = true
      results.userProfiles.count = profiles.length
      results.userProfiles.profiles = profiles
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      { error: String(error), results },
      { status: 500 }
    )
  }
}
