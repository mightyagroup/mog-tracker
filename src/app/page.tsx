import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Shield, Activity, Building2, TrendingUp, Clock, FileText, LucideIcon, Users, MessageSquare, CalendarCheck, AlertTriangle } from 'lucide-react'

export default async function CommandCenterPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch pipeline counts per entity
  const [exousiaRes, vitalxRes, ironhouseRes, interactionsRes, contactsRes, complianceRes] = await Promise.all([
    supabase.from('gov_leads').select('id, status, estimated_value, response_deadline, title, entity').eq('entity', 'exousia'),
    supabase.from('gov_leads').select('id, status, estimated_value, response_deadline, title, entity').eq('entity', 'vitalx'),
    supabase.from('gov_leads').select('id, status, estimated_value, response_deadline, title, entity').eq('entity', 'ironhouse'),
    supabase.from('interactions').select('id, interaction_date, interaction_type, subject, notes, entity, gov_lead_id').order('created_at', { ascending: false }).limit(10),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('compliance_records').select('id, name, entity, record_type, expiration_date, cancellation_deadline, monthly_cost'),
  ])

  const entities = [
    { key: 'exousia',   name: 'Exousia Solutions',  accent: '#D4AF37', icon: Shield,    href: '/exousia',   leads: exousiaRes.data ?? [],   sub: 'Facilities Mgmt · Procurement · Gov Contracting' },
    { key: 'vitalx',    name: 'VitalX',              accent: '#06A59A', icon: Activity,  href: '/vitalx',    leads: vitalxRes.data ?? [],    sub: 'Healthcare Logistics · Medical Courier · DMV' },
    { key: 'ironhouse', name: 'IronHouse',            accent: '#B45309', icon: Building2, href: '/ironhouse', leads: ironhouseRes.data ?? [], sub: 'Janitorial · Landscaping · Facilities' },
  ]

  const allLeads = [...(exousiaRes.data ?? []), ...(vitalxRes.data ?? []), ...(ironhouseRes.data ?? [])]
  const totalPipeline = allLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)
  const activeBids = allLeads.filter(l => l.status === 'active_bid').length
  const awarded = allLeads.filter(l => l.status === 'awarded').length
  const contactCount = contactsRes.count ?? 0
  const recentActivity = interactionsRes.data ?? []

  // Compliance: upcoming renewals in 30 days + monthly spend
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

  // Upcoming deadlines (next 30 days) across all entities
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const upcoming = allLeads
    .filter(l => l.response_deadline && new Date(l.response_deadline) >= now && new Date(l.response_deadline) <= in30)
    .sort((a, b) => new Date(a.response_deadline!).getTime() - new Date(b.response_deadline!).getTime())
    .slice(0, 8)

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        {/* Header */}
        <header className="px-6 py-5 border-b border-[#374151] bg-[#1A2233]">
          <h1 className="text-white font-bold text-xl">MOG Command Center</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pipeline overview across all Mighty Oak Group entities</p>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* Aggregate stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Leads" value={allLeads.length.toString()} icon={FileText} />
            <StatCard label="Active Bids" value={activeBids.toString()} icon={TrendingUp} color="#86efac" />
            <StatCard label="Awards" value={awarded.toString()} icon={Shield} color="#fcd34d" />
            <StatCard label="Pipeline Value" value={formatPipeline(totalPipeline)} icon={TrendingUp} color="#06A59A" />
          </div>

          {/* Quick access row */}
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
                    {complianceUpcoming.length > 0 ? (
                      <span className="text-yellow-400">{complianceUpcoming.length} due in 30d</span>
                    ) : (
                      <span>${totalMonthlySpend.toFixed(0)}/mo subscriptions</span>
                    )}
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
                  const entityColors: Record<string, string> = { exousia: '#D4AF37', vitalx: '#06A59A', ironhouse: '#B45309' }
                  const dColor = days !== null && days <= 7 ? '#FCA5A5' : '#FCD34D'
                  return (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entityColors[r.entity] ?? '#6B7280' }} />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming deadlines */}
            {upcoming.length > 0 && (
              <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-[#D4AF37]" />
                  <h2 className="text-white font-semibold">Upcoming Deadlines</h2>
                  <span className="text-gray-500 text-xs ml-auto">next 30 days</span>
                </div>
                <div className="space-y-2">
                  {upcoming.map(l => {
                    const days = Math.ceil((new Date(l.response_deadline!).getTime() - now.getTime()) / 86_400_000)
                    const entityColors: Record<string, string> = { exousia: '#D4AF37', vitalx: '#06A59A', ironhouse: '#B45309' }
                    return (
                      <div key={l.id} className="flex items-center gap-3 py-2 border-b border-[#374151] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entityColors[l.entity] ?? '#6B7280' }} />
                        <span className="text-gray-300 text-sm truncate flex-1">{l.title ?? 'Untitled'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${days < 7 ? 'bg-red-900 text-red-300' : days < 14 ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>
                          {days}d
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent activity */}
            {recentActivity.length > 0 && (
              <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare size={16} className="text-[#06A59A]" />
                  <h2 className="text-white font-semibold">Recent Activity</h2>
                </div>
                <div className="space-y-3">
                  {recentActivity.map(i => (
                    <div key={i.id} className="flex items-start gap-3 py-2 border-b border-[#374151] last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#06A59A] flex-shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 text-xs">{i.interaction_date}</span>
                          {i.interaction_type && <span className="text-gray-600 text-xs capitalize">· {i.interaction_type}</span>}
                          {i.entity && <span className="text-gray-600 text-xs">· {i.entity}</span>}
                        </div>
                        {i.subject && i.subject !== 'Note' && <div className="text-gray-300 text-xs font-medium mt-0.5">{i.subject}</div>}
                        {i.notes && <p className="text-gray-400 text-xs mt-0.5 truncate">{i.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

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
