'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityType } from '@/lib/types'
import { Sidebar } from '@/components/layout/Sidebar'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { CalendarCheck, Plus, X, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

type RecordType = 'registration' | 'certification' | 'subscription'
type RecordStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'pending'

interface ComplianceRecord {
  id: string
  record_type: RecordType
  entity: EntityType
  name: string
  status: RecordStatus
  expiration_date?: string | null
  notes?: string | null
  is_recurring?: boolean | null
  billing_cycle?: string | null
  monthly_cost?: number | null
  auto_renew?: boolean | null
  payment_method?: string | null
  cancellation_deadline?: string | null
  created_at: string
  updated_at: string
}

const ENTITY_COLORS: Record<EntityType, string> = {
  exousia: '#D4AF37',
  vitalx:  '#06A59A',
  ironhouse: '#B45309',
}
const ENTITY_LABELS: Record<EntityType, string> = {
  exousia: 'Exousia',
  vitalx: 'VitalX',
  ironhouse: 'IronHouse',
}
const STATUS_CONFIG: Record<RecordStatus, { label: string; color: string; bg: string }> = {
  active:        { label: 'Active',        color: '#4ADE80', bg: '#4ADE8022' },
  expiring_soon: { label: 'Expiring Soon', color: '#FCD34D', bg: '#FCD34D22' },
  expired:       { label: 'Expired',       color: '#FCA5A5', bg: '#FCA5A522' },
  cancelled:     { label: 'Cancelled',     color: '#6B7280', bg: '#6B728022' },
  pending:       { label: 'Pending',       color: '#818CF8', bg: '#818CF822' },
}
const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}

function getDaysUntilDue(dateStr?: string | null): number | null {
  if (!dateStr) return null
  return differenceInDays(parseISO(dateStr), new Date())
}

function computeStatus(record: ComplianceRecord): { label: string; color: string; bg: string; days: number | null } {
  const days = getDaysUntilDue(record.expiration_date ?? record.cancellation_deadline)
  const cfg = STATUS_CONFIG[record.status]
  // Override colors based on days
  if (days !== null) {
    if (days < 0) return { ...STATUS_CONFIG.expired, days }
    if (days <= 7) return { label: 'Due Soon', color: '#FCA5A5', bg: '#FCA5A522', days }
    if (days <= 30) return { label: 'Expiring', color: '#FCD34D', bg: '#FCD34D22', days }
  }
  return { ...cfg, days }
}

function getAnnualCost(record: ComplianceRecord): number {
  if (!record.monthly_cost) return 0
  if (record.billing_cycle === 'annual') return record.monthly_cost * 12
  if (record.billing_cycle === 'quarterly') return record.monthly_cost * 4
  return record.monthly_cost * 12
}

export default function CompliancePage() {
  const [records, setRecords] = useState<ComplianceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'registrations' | 'subscriptions'>('registrations')
  const [entityFilter, setEntityFilter] = useState<EntityType | ''>('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<ComplianceRecord | null>(null)

  useEffect(() => { fetchRecords() }, [])

  async function fetchRecords() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('compliance_records')
      .select('*')
      .order('expiration_date', { ascending: true, nullsFirst: false })
    setRecords((data ?? []) as ComplianceRecord[])
    setLoading(false)
  }

  function handleSave(r: ComplianceRecord) {
    setRecords(prev => {
      const idx = prev.findIndex(p => p.id === r.id)
      if (idx >= 0) return prev.map(p => p.id === r.id ? r : p)
      return [...prev, r]
    })
    setSelected(r)
    setShowAdd(false)
  }

  const registrations = useMemo(() =>
    records.filter(r => r.record_type !== 'subscription' && (entityFilter === '' || r.entity === entityFilter)),
    [records, entityFilter]
  )
  const subscriptions = useMemo(() =>
    records.filter(r => r.record_type === 'subscription' && (entityFilter === '' || r.entity === entityFilter)),
    [records, entityFilter]
  )

  // Spend summary
  const totalMonthlyByEntity = useMemo(() => {
    const totals: Record<string, number> = {}
    records.filter(r => r.record_type === 'subscription' && r.monthly_cost).forEach(r => {
      totals[r.entity] = (totals[r.entity] ?? 0) + (r.monthly_cost ?? 0)
    })
    return totals
  }, [records])

  const totalMonthly = Object.values(totalMonthlyByEntity).reduce((s, v) => s + v, 0)

  // Upcoming (next 30 days with a date)
  const upcoming = useMemo(() =>
    records
      .filter(r => {
        const d = r.expiration_date ?? r.cancellation_deadline
        if (!d) return false
        const days = getDaysUntilDue(d)
        return days !== null && days >= 0 && days <= 30
      })
      .sort((a, b) => {
        const da = getDaysUntilDue(a.expiration_date ?? a.cancellation_deadline) ?? 999
        const db = getDaysUntilDue(b.expiration_date ?? b.cancellation_deadline) ?? 999
        return da - db
      }),
    [records]
  )

  const displayed = tab === 'registrations' ? registrations : subscriptions

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#1A2233] flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D4AF3722] flex-shrink-0">
            <CalendarCheck size={20} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">Compliance Calendar</h1>
            <p className="text-gray-400 text-sm">Registrations, certifications, and recurring software costs</p>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {/* Summary widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
              <div className="text-gray-400 text-xs mb-1">Total Monthly Spend</div>
              <div className="text-white font-bold text-xl">${totalMonthly.toFixed(0)}<span className="text-gray-500 text-sm font-normal">/mo</span></div>
              <div className="text-gray-500 text-xs mt-1">${(totalMonthly * 12).toFixed(0)}/yr</div>
            </div>
            {(['exousia', 'vitalx', 'ironhouse'] as EntityType[]).map(e => (
              <div key={e} className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
                <div className="text-xs mb-1" style={{ color: ENTITY_COLORS[e] }}>{ENTITY_LABELS[e]}</div>
                <div className="text-white font-bold text-lg">${(totalMonthlyByEntity[e] ?? 0).toFixed(0)}<span className="text-gray-500 text-sm font-normal">/mo</span></div>
                <div className="text-gray-500 text-xs mt-1">${((totalMonthlyByEntity[e] ?? 0) * 12).toFixed(0)}/yr</div>
              </div>
            ))}
          </div>

          {/* Upcoming renewals */}
          {upcoming.length > 0 && (
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#374151] flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-400" />
                <h3 className="text-white font-medium text-sm">Upcoming in 30 Days</h3>
              </div>
              <div className="divide-y divide-[#374151]">
                {upcoming.map(r => {
                  const d = r.expiration_date ?? r.cancellation_deadline
                  const days = getDaysUntilDue(d)
                  const color = days !== null && days <= 7 ? '#FCA5A5' : '#FCD34D'
                  return (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#253347] cursor-pointer" onClick={() => setSelected(r)}>
                      <div>
                        <div className="text-white text-sm font-medium">{r.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs capitalize" style={{ color: ENTITY_COLORS[r.entity] }}>{r.entity}</span>
                          <span className="text-gray-500 text-xs">·</span>
                          <span className="text-gray-500 text-xs capitalize">{r.record_type}</span>
                          {r.monthly_cost && <span className="text-gray-400 text-xs">· ${r.monthly_cost}/mo</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm" style={{ color }}>
                          {days === 0 ? 'Today' : `${days}d`}
                        </div>
                        <div className="text-gray-500 text-xs">{d ? format(parseISO(d), 'MMM d, yyyy') : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tab + filter toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex border border-[#374151] rounded-lg overflow-hidden">
              <button
                onClick={() => setTab('registrations')}
                className="px-4 py-2 text-sm font-medium transition"
                style={tab === 'registrations' ? { backgroundColor: '#D4AF3722', color: '#D4AF37' } : { color: '#9CA3AF' }}
              >
                Registrations &amp; Certs
              </button>
              <button
                onClick={() => setTab('subscriptions')}
                className="px-4 py-2 text-sm font-medium transition border-l border-[#374151]"
                style={tab === 'subscriptions' ? { backgroundColor: '#D4AF3722', color: '#D4AF37' } : { color: '#9CA3AF' }}
              >
                Subscriptions &amp; Tools
              </button>
            </div>

            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value as EntityType | '')}
              className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="">All Entities</option>
              <option value="exousia">Exousia</option>
              <option value="vitalx">VitalX</option>
              <option value="ironhouse">IronHouse</option>
            </select>

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg text-[#111827] bg-[#D4AF37] ml-auto"
            >
              <Plus size={15} />
              Add Record
            </button>
          </div>

          {/* Records table */}
          {loading ? (
            <div className="text-gray-500 text-sm py-12 text-center">Loading…</div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No records yet"
              description={tab === 'registrations' ? 'Track SAM.gov, WOSB, SWaM, and other certifications.' : 'Track recurring software subscriptions and costs.'}
              action={{ label: 'Add Record', onClick: () => setShowAdd(true) }}
            />
          ) : tab === 'registrations' ? (
            <RegistrationsTable records={displayed} onSelect={setSelected} />
          ) : (
            <SubscriptionsTable records={displayed} onSelect={setSelected} />
          )}
        </main>
      </div>

      {selected && (
        <RecordDetailPanel
          record={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleSave}
          onDelete={id => {
            setRecords(prev => prev.filter(r => r.id !== id))
            setSelected(null)
          }}
        />
      )}

      {showAdd && (
        <AddRecordModal
          defaultType={tab === 'subscriptions' ? 'subscription' : 'registration'}
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ── Registrations Table ───────────────────────────────────────────────────────
function RegistrationsTable({ records, onSelect }: { records: ComplianceRecord[]; onSelect: (r: ComplianceRecord) => void }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#374151] bg-[#161E2E]">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Record</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Expiration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Days Until Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#374151]">
            {records.map(r => {
              const { label, color, bg, days } = computeStatus(r)
              return (
                <tr key={r.id} onClick={() => onSelect(r)} className="hover:bg-[#253347] cursor-pointer transition">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{r.name}</div>
                    {r.notes && <div className="text-gray-500 text-xs truncate max-w-xs">{r.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium capitalize" style={{ color: ENTITY_COLORS[r.entity] }}>{r.entity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#374151] text-gray-300 capitalize">{r.record_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color, backgroundColor: bg }}>{label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {r.expiration_date ? format(parseISO(r.expiration_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <DaysUntilBadge days={days} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Subscriptions Table ───────────────────────────────────────────────────────
function SubscriptionsTable({ records, onSelect }: { records: ComplianceRecord[]; onSelect: (r: ComplianceRecord) => void }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#374151] bg-[#161E2E]">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Tool / Service</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Billing</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Monthly</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Annual</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Auto-Renew</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Next Renewal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Cancel By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#374151]">
            {records.map(r => {
              const annual = getAnnualCost(r)
              const renewalDays = getDaysUntilDue(r.expiration_date)
              const cancelDays = getDaysUntilDue(r.cancellation_deadline)
              return (
                <tr key={r.id} onClick={() => onSelect(r)} className="hover:bg-[#253347] cursor-pointer transition">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{r.name}</div>
                    {r.payment_method && <div className="text-gray-500 text-xs">{r.payment_method}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium capitalize" style={{ color: ENTITY_COLORS[r.entity] }}>{r.entity}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs capitalize">
                    {r.billing_cycle ? BILLING_CYCLE_LABELS[r.billing_cycle] : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200 text-xs font-mono">
                    {r.monthly_cost ? `$${r.monthly_cost.toFixed(0)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200 text-xs font-mono">
                    {annual > 0 ? `$${annual.toFixed(0)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.auto_renew ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} />Yes</span>
                    ) : (
                      <span className="text-gray-500 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400 text-xs">{r.expiration_date ? format(parseISO(r.expiration_date), 'MMM d, yy') : '—'}</div>
                    {renewalDays !== null && renewalDays <= 30 && renewalDays >= 0 && (
                      <DaysUntilBadge days={renewalDays} compact />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400 text-xs">{r.cancellation_deadline ? format(parseISO(r.cancellation_deadline), 'MMM d, yy') : '—'}</div>
                    {cancelDays !== null && cancelDays <= 14 && cancelDays >= 0 && (
                      <DaysUntilBadge days={cancelDays} compact />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Totals footer */}
      <div className="px-5 py-3 border-t border-[#374151] flex items-center justify-between">
        <span className="text-gray-500 text-xs">{records.length} subscription{records.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-6 text-xs">
          <span className="text-gray-400">Total Monthly: <span className="text-white font-semibold font-mono">${records.reduce((s, r) => s + (r.monthly_cost ?? 0), 0).toFixed(0)}</span></span>
          <span className="text-gray-400">Annual: <span className="text-white font-semibold font-mono">${records.reduce((s, r) => s + getAnnualCost(r), 0).toFixed(0)}</span></span>
        </div>
      </div>
    </div>
  )
}

// ── Days Until Badge ──────────────────────────────────────────────────────────
function DaysUntilBadge({ days, compact }: { days: number | null; compact?: boolean }) {
  if (days === null) return <span className="text-gray-600 text-xs">—</span>
  if (days < 0) return <span className={`text-xs font-medium ${compact ? '' : 'px-2 py-0.5 rounded bg-[#FCA5A522]'} text-[#FCA5A5]`}>Expired</span>
  const color = days <= 7 ? '#FCA5A5' : days <= 30 ? '#FCD34D' : '#4ADE80'
  const bg = days <= 7 ? '#FCA5A522' : days <= 30 ? '#FCD34D22' : '#4ADE8022'
  const label = days === 0 ? 'Today' : `${days}d`
  if (compact) return <span className="text-xs font-semibold mt-0.5 block" style={{ color }}>{label}</span>
  return <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color, backgroundColor: bg }}>{label}</span>
}

// ── Record Detail Panel ───────────────────────────────────────────────────────
function RecordDetailPanel({
  record, onClose, onUpdate, onDelete,
}: {
  record: ComplianceRecord
  onClose: () => void
  onUpdate: (r: ComplianceRecord) => void
  onDelete: (id: string) => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ ...record })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setForm({ ...record }); setEditMode(false) }, [record.id])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('compliance_records')
      .update({
        name: form.name,
        entity: form.entity,
        record_type: form.record_type,
        status: form.status,
        expiration_date: form.expiration_date || null,
        notes: form.notes || null,
        is_recurring: form.is_recurring,
        billing_cycle: form.billing_cycle || null,
        monthly_cost: form.monthly_cost ?? null,
        auto_renew: form.auto_renew,
        payment_method: form.payment_method || null,
        cancellation_deadline: form.cancellation_deadline || null,
      })
      .eq('id', record.id)
      .select()
      .single()
    if (!error && data) { onUpdate(data as ComplianceRecord); setEditMode(false) }
    setSaving(false)
  }

  async function handleDelete() {
    const supabase = createClient()
    await supabase.from('compliance_records').delete().eq('id', record.id)
    onDelete(record.id)
  }

  const { label, color, bg, days } = computeStatus(record)
  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none'
  const lbl = 'block text-xs text-gray-500 mb-1'
  const isSubscription = record.record_type === 'subscription'

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1A2233] border-l border-[#374151] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#374151] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-base leading-tight">{record.name}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs capitalize font-medium" style={{ color: ENTITY_COLORS[record.entity] }}>{record.entity}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400 text-xs capitalize">{record.record_type}</span>
              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color, backgroundColor: bg }}>{label}</span>
              {days !== null && <DaysUntilBadge days={days} />}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {editMode ? (
              <>
                <button onClick={() => { setEditMode(false); setForm({ ...record }) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D4AF37] text-[#111827] disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#374151] rounded-lg">Edit</button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#374151]"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {editMode ? (
            <div className="space-y-3">
              <div><label className={lbl}>Name</label><input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Entity</label>
                  <select className={inp} value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value as EntityType }))}>
                    <option value="exousia">Exousia</option>
                    <option value="vitalx">VitalX</option>
                    <option value="ironhouse">IronHouse</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Type</label>
                  <select className={inp} value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value as RecordType }))}>
                    <option value="registration">Registration</option>
                    <option value="certification">Certification</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Status</label>
                  <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RecordStatus }))}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Expiration / Renewal Date</label>
                  <input type="date" className={inp} value={form.expiration_date ?? ''} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value || null }))} />
                </div>
              </div>
              {(form.record_type === 'subscription' || isSubscription) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Billing Cycle</label>
                      <select className={inp} value={form.billing_cycle ?? ''} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value || null }))}>
                        <option value="">— Select —</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Monthly Cost ($)</label>
                      <input type="number" min="0" step="0.01" className={inp} value={form.monthly_cost ?? ''} onChange={e => setForm(f => ({ ...f, monthly_cost: e.target.value ? parseFloat(e.target.value) : null }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Payment Method</label>
                      <input className={inp} value={form.payment_method ?? ''} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="e.g., Credit Card" />
                    </div>
                    <div>
                      <label className={lbl}>Cancellation Deadline</label>
                      <input type="date" className={inp} value={form.cancellation_deadline ?? ''} onChange={e => setForm(f => ({ ...f, cancellation_deadline: e.target.value || null }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                      <input type="checkbox" checked={form.auto_renew ?? false} onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))} className="rounded" />
                      Auto-renew
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                      <input type="checkbox" checked={form.is_recurring ?? false} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="rounded" />
                      Recurring
                    </label>
                  </div>
                </>
              )}
              <div><label className={lbl}>Notes</label><textarea className={`${inp} resize-none`} rows={3} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
          ) : (
            <div className="space-y-4">
              {record.expiration_date && (
                <div>
                  <div className={lbl}>Expiration / Renewal Date</div>
                  <div className="text-gray-200 text-sm flex items-center gap-2">
                    <Clock size={13} />
                    {format(parseISO(record.expiration_date), 'MMMM d, yyyy')}
                  </div>
                </div>
              )}
              {isSubscription && (
                <div className="bg-[#111827] rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#D4AF37] text-xs font-semibold mb-2">
                    <DollarSign size={12} />
                    Cost Summary
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className={lbl}>Billing Cycle</div><div className="text-gray-200 capitalize">{record.billing_cycle ? BILLING_CYCLE_LABELS[record.billing_cycle] : '—'}</div></div>
                    <div><div className={lbl}>Monthly Cost</div><div className="text-gray-200 font-mono">{record.monthly_cost ? `$${record.monthly_cost}` : '—'}</div></div>
                    <div><div className={lbl}>Annual Cost</div><div className="text-white font-semibold font-mono">{getAnnualCost(record) > 0 ? `$${getAnnualCost(record).toFixed(0)}` : '—'}</div></div>
                    <div><div className={lbl}>Payment Method</div><div className="text-gray-200">{record.payment_method ?? '—'}</div></div>
                    <div><div className={lbl}>Auto-Renew</div><div className={record.auto_renew ? 'text-green-400' : 'text-gray-400'}>{record.auto_renew ? 'Yes' : 'No'}</div></div>
                    {record.cancellation_deadline && (
                      <div>
                        <div className={lbl}>Cancel By</div>
                        <div className="text-red-400 text-sm font-medium">{format(parseISO(record.cancellation_deadline), 'MMM d, yyyy')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {record.notes && (
                <div>
                  <div className={lbl}>Notes</div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{record.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="px-6 py-4 border-t border-[#374151] flex-shrink-0">
          {confirmDelete ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Delete this record?</span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 text-xs text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleDelete} className="px-3 py-1 text-xs font-semibold rounded bg-red-600 text-white">Delete</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-600 hover:text-red-400 transition">Delete record</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Record Modal ──────────────────────────────────────────────────────────
function AddRecordModal({
  defaultType, onClose, onSave,
}: {
  defaultType: RecordType
  onClose: () => void
  onSave: (r: ComplianceRecord) => void
}) {
  const [form, setForm] = useState({
    record_type: defaultType,
    entity: 'exousia' as EntityType,
    name: '',
    status: 'active' as RecordStatus,
    expiration_date: '',
    notes: '',
    is_recurring: false,
    billing_cycle: 'monthly',
    monthly_cost: '',
    auto_renew: false,
    payment_method: '',
    cancellation_deadline: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('compliance_records')
      .insert({
        record_type: form.record_type,
        entity: form.entity,
        name: form.name.trim(),
        status: form.status,
        expiration_date: form.expiration_date || null,
        notes: form.notes || null,
        is_recurring: form.record_type === 'subscription' ? form.is_recurring : false,
        billing_cycle: form.record_type === 'subscription' ? (form.billing_cycle || null) : null,
        monthly_cost: form.record_type === 'subscription' && form.monthly_cost ? parseFloat(form.monthly_cost) : null,
        auto_renew: form.record_type === 'subscription' ? form.auto_renew : false,
        payment_method: form.record_type === 'subscription' ? (form.payment_method || null) : null,
        cancellation_deadline: form.record_type === 'subscription' ? (form.cancellation_deadline || null) : null,
      })
      .select()
      .single()
    if (!error && data) onSave(data as ComplianceRecord)
    setSaving(false)
  }

  const isSubscription = form.record_type === 'subscription'
  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none'
  const lbl = 'block text-xs text-gray-400 mb-1.5'

  return (
    <Modal
      title="Add Compliance Record"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] bg-[#D4AF37] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Record'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={lbl}>Name *</label><input autoFocus className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., SAM.gov Registration" /></div>
        <div>
          <label className={lbl}>Type</label>
          <select className={inp} value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value as RecordType }))}>
            <option value="registration">Registration</option>
            <option value="certification">Certification</option>
            <option value="subscription">Subscription / Tool</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Entity</label>
          <select className={inp} value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value as EntityType }))}>
            <option value="exousia">Exousia</option>
            <option value="vitalx">VitalX</option>
            <option value="ironhouse">IronHouse</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RecordStatus }))}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>{isSubscription ? 'Renewal Date' : 'Expiration Date'}</label>
          <input type="date" className={inp} value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} />
        </div>
        {isSubscription && (
          <>
            <div>
              <label className={lbl}>Billing Cycle</label>
              <select className={inp} value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Monthly Cost ($)</label>
              <input type="number" min="0" step="0.01" className={inp} value={form.monthly_cost} onChange={e => setForm(f => ({ ...f, monthly_cost: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className={lbl}>Payment Method</label>
              <input className={inp} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="e.g., Credit Card" />
            </div>
            <div>
              <label className={lbl}>Cancellation Deadline</label>
              <input type="date" className={inp} value={form.cancellation_deadline} onChange={e => setForm(f => ({ ...f, cancellation_deadline: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                <input type="checkbox" checked={form.auto_renew} onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))} className="rounded" />
                Auto-renew
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="rounded" />
                Recurring
              </label>
            </div>
          </>
        )}
        <div className="col-span-2"><label className={lbl}>Notes</label><textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}
