import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar'
import { DeadlineCalendar } from '@/components/dashboard/DeadlineCalendar'
import { PipelineCharts } from '@/components/dashboard/PipelineCharts'
import { SOURCE_LABELS } from '@/lib/constants'
import { SourceType } from '@/lib/types'
import {
  Shield, Activity, Building2, TrendingUp, FileText,
  LucideIcon, Users, MessageSquare, CalendarCheck, AlertTriangle, Bell,
} from 'lucide-react'

const ENTITY_COLORS: Record<string, string> = {
  exousia: '#D4AF37',
  vitalx:  '#06A59A',
  ironhouse: '#B45309',
}

const SOURCE_COLORS: Record<string, string> = {
  sam_gov:     '#3B82F6',
  govwin:      '#6366F1',
  eva:         '#8B5CF6',
  emma:        '#EC4899',
  local_gov:   '#F59E0B',
  usaspending: '#06B6D4',
  manual:      '#6B7280',
  commercial:  '#10B981',
}

export default async function CommandCenterPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()

  const [exousiaRes, vitalxRes, ironhouseRes, interactionsRes, contactsRes, complianceRes, categoriesRes] = await Promise.all([
    supabase.from('gov_leads').select('id, status, estimated_value, response_deadline, title, entity, source, service_category_id, solicitation_number, amendment_count, last_amendment_date').eq('entity', 'exousia'),
    supabase.from('gov_leads').select('id, status, estimated_value, response_deadline, title, entity, source, service_category_id, solicitation_number, amendment_count, last_amendment_date').eq('entity', 'vitalx'),
    supabase.from('gov_leads').select('id, status, estimated_value, response_deadline, title, entity, source, service_category_id, solicitation_number, amendment_count, last_amendment_date').eq('entity', 'ironhouse'),
    supabase.from('interactions').select('id, interaction_date, interaction_type, subject, notes, entity').order('created_at', { ascending: false }).limit(10),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('compliance_records').select('id, name, entity, record_type, expiration_date, cancellation_deadline, monthly_cost'),
    supabase.from('service_categories').select('id, entity, name, color').order('sort_order'),
  ])

  const entities = [
    { key: 'exousia',   name: 'Exousia Solutions', accent: '#D4AF37', icon: Shield,    href: '/exousia',   leads: exousiaRes.data ?? [],   sub: 'Facilities Mgmt · Procurement · Gov Contracting' },
    { key: 'vitalx',    name: 'VitalX',             accent: '#06A59A', icon: Activity,  href: '/vitalx',    leads: vitalxRes.data ?? [],    sub: 'Healthcare Logistics · Medical Courier · DMV' },
    { key: 'ironhouse', name: 'IronHouse',           accent: '#B45309', icon: Building2, href: '/ironhouse', leads: ironhouseRes.data ?? [], sub: 'Janitorial · Landscaping · Facilities' },
  ]

  const allLeads = [...(exousiaRes.data ?? []), ...(vitalxRes.data ?? []), ...(ironhouseRes.data ?? [])]
  const totalPipeline = allLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)
  const activeBids = allLeads.filter(l => l.status === 'active_bid').length
  const awarded = allLeads.filter(l => l.status === 'awarded').length
  const contactCount = contactsRes.count ?? 0
  const recentActivity = interactionsRes.data ?? []

  // Recent activity: combine interactions + recent lead updates
  const recentLeads = await supabase
    .from('gov_leads')
    .select('id, title, status, entity, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)
  const recentComm = await supabase
    .from('commercial_leads')
    .select('id, organization_name, status, entity, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)

  const combinedActivity = [
    ...recentActivity.map(i => ({ type: 'interaction', data: i } as const)),
    ...recentLeads.data?.map(l => ({ type: 'lead_update', data: l } as const)) ?? [],
    ...recentComm.data?.map(c => ({ type: 'commercial_update', data: c } as const)) ?? [],
  ].sort((a, b) => {
    const getTimestamp = (item: typeof a) => {
      if (item.type === 'interaction') {
        return item.data.interaction_date
      } else if (item.type === 'lead_update') {
        return item.data.updated_at
      } else {
        return item.data.updated_at
      }
    }
    const aTime = getTimestamp(a)
    const bTime = getTimestamp(b)
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  }).slice(0, 20)

  // Helper function to count deadlines within X days
  const countByDeadline = (days: number) => {
    const future = new Date()
    future.setDate(future.getDate() + days)
    return allLeads.filter(l => l.response_deadline && new Date(l.response_deadline) <= future && new Date(l.response_deadline) >= now).length
  }

  // ── Compliance ────────────────────────────────────────────────────────────
  const complianceRecords = complianceRes.data ?? []
  const complianceUpcoming = complianceRecords
    .filter(r => {
      const d = r.expiration_date ?? r.cancellation_deadline
      if (!d) return false
      const days = Math.ceil((new Date(d).getTime() - now.getTime()) / 86_400_000)
      return days >= 0 && days <= 30
    })
    .sort((a, b) => {
      const da = new Date((a.expiration_date ?? a.cancellation_deadline)!).getTime()
      const db = new Date((b.expiration_date ?? b.cancellation_deadline)!).getTime()
      return da - db
    })
    .slice(0, 5)
  const totalMonthlySpend = complianceRecords
    .filter(r => r.record_type === 'subscription' && r.monthly_cost)
    .reduce((s: number, r) => s + (r.monthly_cost ?? 0), 0)

  // ── Deadline calendar (current month) ─────────────────────────────────────
  const calMonth = now.getMonth()
  const calYear = now.getFullYear()
  const allDeadlines = allLeads
    .filter(l => l.response_deadline)
    .map(l => {
      const d = new Date(l.response_deadline!)
      const daysOut = Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
      return {
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        entity: l.entity as string,
        title: (l.title ?? 'Untitled') as string,
        daysOut,
      }
    })

  // ── Category breakdown ────────────────────────────────────────────────────
  const allCategories = categoriesRes.data ?? []
  const catCounts: Record<string, { name: string; color: string; count: number }> = {}
  for (const lead of allLeads) {
    if (lead.service_category_id) {
      const cat = allCategories.find(c => c.id === lead.service_category_id)
      if (cat) {
        catCounts[cat.name] = catCounts[cat.name] ?? { name: cat.name, color: cat.color, count: 0 }
        catCounts[cat.name].count++
      }
    }
  }
  const categoryBreakdown = Object.values(catCounts).sort((a, b) => b.count - a.count).slice(0, 8)

  // ── Source breakdown ──────────────────────────────────────────────────────
  const sourceCounts: Record<string, number> = {}
  for (const lead of allLeads) {
    if (lead.source) sourceCounts[lead.source] = (sourceCounts[lead.source] ?? 0) + 1
  }
  const sourceBreakdown = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count, label: SOURCE_LABELS[source as SourceType] ?? source }))
    .sort((a, b) => b.count - a.count)

  // ── Pipeline value by entity ──────────────────────────────────────────────
  const pipelineByEntity = entities.map(e => ({
    entity: e.key,
    value: e.leads.reduce((s, l) => s + (l.estimated_value ?? 0), 0),
    color: e.accent,
  }))

  // ── Leads by status ──────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  for (const lead of allLeads) {
    statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    label: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }))

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <header className="px-6 py-5 border-b border-[#374151] bg-[#1A2233]">
          <h1 className="text-white font-bold text-xl">MOG Command Center</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pipeline overview across all Mighty Oak Group entities</p>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* Aggregate stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Leads"    value={allLeads.length.toString()} icon={FileText} />
            <StatCard label="Active Bids"    value={activeBids.toString()}      icon={TrendingUp} color="#86efac" />
            <StatCard label="Awards"         value={awarded.toString()}          icon={Shield}    color="#fcd34d" />
            <StatCard label="Pipeline Value" value={formatPipeline(totalPipeline)} icon={TrendingUp} color="#06A59A" />
          </div>

          {/* Deadline summary (7/14/30 days) */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <TimelineCard label="Due in 7 days" value={countByDeadline(7).toString()} color="#FCA5A5" />
            <TimelineCard label="Due in 14 days" value={countByDeadline(14).toString()} color="#FCD34D" />
            <TimelineCard label="Due in 30 days" value={countByDeadline(30).toString()} color="#60A5FA" />
          </div>

          {/* Quick actions */}
          <QuickActionsBar />

          {/* Quick access cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link href="/contacts">
              <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4 hover:border-[#4B5563] transition flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF3722] flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-medium text-sm">Master Contacts</div>
                  <div className="text-gray-500 text-xs">{contactCount} contact{contactCount !== 1 ? 's' : ''}</div>
                </div>
                <span className="ml-auto text-xs text-[#D4AF37] group-hover:underline flex-shrink-0">View →</span>
              </div>
            </Link>
            <Link href="/compliance">
              <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4 hover:border-[#4B5563] transition flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF3722] flex items-center justify-center flex-shrink-0">
                  <CalendarCheck size={16} className="text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-medium text-sm">Compliance</div>
                  <div className="text-gray-500 text-xs">
                    {complianceUpcoming.length > 0
                      ? <span className="text-yellow-400">{complianceUpcoming.length} due in 30d</span>
                      : <span>${totalMonthlySpend.toFixed(0)}/mo subscriptions</span>}
                  </div>
                </div>
                <span className="ml-auto text-xs text-[#D4AF37] group-hover:underline flex-shrink-0">View →</span>
              </div>
            </Link>
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#06A59A22] flex items-center justify-center flex-shrink-0">
                <MessageSquare size={16} className="text-[#06A59A]" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-medium text-sm">Recent Activity</div>
                <div className="text-gray-500 text-xs">{recentActivity.length} recent interaction{recentActivity.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>

          {/* Entity cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {entities.map(e => {
              const active = e.leads.filter(l => ['active_bid', 'reviewing', 'bid_no_bid'].includes(l.status)).length
              const won = e.leads.filter(l => l.status === 'awarded').length
              const pipeline = e.leads.reduce((s, l) => s + (l.estimated_value ?? 0), 0)
              return (
                <Link key={e.key} href={e.href}>
                  <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 hover:border-[#4B5563] transition group cursor-pointer">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: e.accent + '20' }}>
                        <e.icon size={18} style={{ color: e.accent }} />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{e.name}</div>
                        <div className="text-gray-500 text-xs">{e.sub}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-white font-bold text-lg">{e.leads.length}</div>
                        <div className="text-gray-500 text-xs">Leads</div>
                      </div>
                      <div>
                        <div className="font-bold text-lg" style={{ color: e.accent }}>{active}</div>
                        <div className="text-gray-500 text-xs">Active</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-bold text-lg">{won}</div>
                        <div className="text-gray-500 text-xs">Awarded</div>
                      </div>
                    </div>
                    {pipeline > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#374151] flex items-center justify-between">
                        <span className="text-gray-500 text-xs">Pipeline</span>
                        <span className="text-white text-sm font-medium">{formatPipeline(pipeline)}</span>
                      </div>
                    )}
                    <div className="mt-3 text-xs font-medium group-hover:underline" style={{ color: e.accent }}>
                      Open tracker →
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Compliance alert strip */}
          {complianceUpcoming.length > 0 && (
            <div className="mb-6 bg-[#1F2937] rounded-xl border border-yellow-900/50 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#374151]">
                <AlertTriangle size={14} className="text-yellow-400" />
                <h3 className="text-white font-medium text-sm">Compliance Due in 30 Days</h3>
                <Link href="/compliance" className="ml-auto text-xs text-[#D4AF37] hover:underline">View all →</Link>
              </div>
              <div className="divide-y divide-[#374151]">
                {complianceUpcoming.map((r: { id: string; name: string; entity: string; record_type: string; expiration_date?: string | null; cancellation_deadline?: string | null; monthly_cost?: number | null }) => {
                  const d = r.expiration_date ?? r.cancellation_deadline
                  const days = d ? Math.ceil((new Date(d).getTime() - now.getTime()) / 86_400_000) : null
                  const dColor = days !== null && days <= 7 ? '#FCA5A5' : '#FCD34D'
                  return (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ENTITY_COLORS[r.entity] ?? '#6B7280' }} />
                        <div>
                          <div className="text-gray-200 text-sm">{r.name}</div>
                          <div className="text-gray-500 text-xs capitalize">{r.entity} · {r.record_type}{r.monthly_cost ? ` · $${r.monthly_cost}/mo` : ''}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm" style={{ color: dColor }}>{days === 0 ? 'Today' : `${days}d`}</div>
                        {d && <div className="text-gray-600 text-xs">{new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Amendment alerts */}
          {(() => {
            const amended = allLeads.filter((l: Record<string, unknown>) =>
              ((l.amendment_count as number) ?? 0) > 0 &&
              l.last_amendment_date &&
              (Date.now() - new Date(l.last_amendment_date as string).getTime()) < 14 * 24 * 60 * 60 * 1000
            )
            if (amended.length === 0) return null
            const ENTITY_HREF: Record<string, string> = { exousia: '/exousia', vitalx: '/vitalx', ironhouse: '/ironhouse' }
            return (
              <div className="mb-6 bg-[#1F2937] rounded-xl border border-red-900/50 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-[#374151]">
                  <Bell size={14} className="text-red-400 animate-pulse" />
                  <h3 className="text-white font-medium text-sm">Recent Amendments ({amended.length})</h3>
                  <span className="text-gray-500 text-xs ml-2">Last 14 days</span>
                </div>
                <div className="divide-y divide-[#374151]">
                  {amended.slice(0, 8).map((l: Record<string, unknown>) => {
                    const days = Math.floor((Date.now() - new Date(l.last_amendment_date as string).getTime()) / 86_400_000)
                    return (
                      <Link key={l.id as string} href={ENTITY_HREF[(l.entity as string)] || '/exousia'}>
                        <div className="flex items-center justify-between px-5 py-3 hover:bg-[#253347] transition cursor-pointer">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ENTITY_COLORS[(l.entity as string)] ?? '#6B7280' }} />
                            <div className="min-w-0">
                              <div className="text-gray-200 text-sm truncate">{l.title as string}</div>
                              <div className="text-gray-500 text-xs">
                                <span className="font-mono">{(l.solicitation_number as string) || '—'}</span>
                                <span className="mx-1.5 text-gray-600">·</span>
                                <span className="capitalize">{l.entity as string}</span>
                                <span className="mx-1.5 text-gray-600">·</span>
                                {(l.amendment_count as number)} amendment{(l.amendment_count as number) > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <div className="font-semibold text-sm text-red-400">{days === 0 ? 'Today' : `${days}d ago`}</div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Calendar + breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <DeadlineCalendar
              year={calYear}
              month={calMonth}
              today={now.getDate()}
              allDeadlines={allDeadlines}
            />
            <div className="space-y-4">
              <CategoryBreakdown categories={categoryBreakdown} />
              <SourceBreakdown sources={sourceBreakdown} />
            </div>
          </div>

          {/* Pipeline Charts */}
          <PipelineCharts
            pipelineData={pipelineByEntity}
            statusData={statusBreakdown.map(s => ({ name: s.label, value: s.count }))}
            categoryData={categoryBreakdown.map(c => ({ name: c.name, value: c.count }))}
            sourceData={sourceBreakdown.map(s => ({ name: s.source, value: s.count }))}
          />

          {/* Recent activity */}
          {combinedActivity.length > 0 && (
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-[#06A59A]" />
                <h2 className="text-white font-semibold">Recent Activity</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {combinedActivity.map(item => {
                  const { type, data } = item
                  if (type === 'interaction') {
                    return (
                      <div key={data.id} className="flex items-start gap-3 py-2 border-b border-[#374151] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#06A59A] flex-shrink-0 mt-1.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-500 text-xs">{data.interaction_date}</span>
                            {data.interaction_type && <span className="text-gray-600 text-xs capitalize">· {data.interaction_type}</span>}
                            {data.entity && <span className="text-gray-600 text-xs">· {data.entity}</span>}
                          </div>
                          {data.subject && data.subject !== 'Note' && <div className="text-gray-300 text-xs font-medium mt-0.5">{data.subject}</div>}
                          {data.notes && <p className="text-gray-400 text-xs mt-0.5 truncate">{data.notes}</p>}
                        </div>
                      </div>
                    )
                  } else if (type === 'lead_update') {
                    return (
                      <div key={data.id} className="flex items-start gap-3 py-2 border-b border-[#374151] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0 mt-1.5" />
                        <div className="min-w-0">
                          <div className="text-gray-300 text-xs font-medium">Lead updated: {data.title}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-500 text-xs capitalize">{data.entity}</span>
                            <span className="text-gray-600 text-xs">· {data.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    )
                  } else if (type === 'commercial_update') {
                    return (
                      <div key={data.id} className="flex items-start gap-3 py-2 border-b border-[#374151] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#06A59A] flex-shrink-0 mt-1.5" />
                        <div className="min-w-0">
                          <div className="text-gray-300 text-xs font-medium">Commercial updated: {data.organization_name}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-500 text-xs capitalize">{data.entity}</span>
                            <span className="text-gray-600 text-xs">· {data.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Category Breakdown ────────────────────────────────────────────────────────
function CategoryBreakdown({ categories }: { categories: { name: string; color: string; count: number }[] }) {
  const max = Math.max(...categories.map(c => c.count), 1)
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-white font-semibold text-sm">By Service Category</h2>
        <span className="text-gray-500 text-xs ml-auto">{categories.length} categories</span>
      </div>
      {categories.length === 0 ? (
        <p className="text-gray-600 text-sm py-2">No categorized leads yet</p>
      ) : (
        <div className="space-y-2.5">
          {categories.map(c => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300 text-xs truncate flex-1 mr-2">{c.name}</span>
                <span className="text-gray-500 text-xs tabular-nums flex-shrink-0">{c.count}</span>
              </div>
              <div className="h-1.5 bg-[#374151] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(c.count / max) * 100}%`, backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Source Breakdown ──────────────────────────────────────────────────────────
function SourceBreakdown({ sources }: { sources: { source: string; label: string; count: number }[] }) {
  const max = Math.max(...sources.map(s => s.count), 1)
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-white font-semibold text-sm">By Source</h2>
      </div>
      {sources.length === 0 ? (
        <p className="text-gray-600 text-sm py-2">No leads yet</p>
      ) : (
        <div className="space-y-2.5">
          {sources.map(s => (
            <div key={s.source}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300 text-xs truncate flex-1 mr-2">{s.label}</span>
                <span className="text-gray-500 text-xs tabular-nums flex-shrink-0">{s.count}</span>
              </div>
              <div className="h-1.5 bg-[#374151] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(s.count / max) * 100}%`, backgroundColor: SOURCE_COLORS[s.source] ?? '#6B7280' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Timeline Summary Card ───────────────────────────────────────────────────
function TimelineCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
      <div className="text-xs text-gray-400 tracking-wide mb-1">{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = '#D4AF37' }: { label: string; value: string; icon: LucideIcon; color?: string }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <Icon size={16} className="text-gray-600" />
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

function formatPipeline(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return v === 0 ? '$0' : `$${v}`
}
