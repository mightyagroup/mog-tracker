'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommercialLead, CommercialStatus } from '@/lib/types'
import {
  COMMERCIAL_STATUSES, COMMERCIAL_STATUS_LABELS,
  VITALX_COMMERCIAL_CATEGORIES,
} from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { CommercialStatusBadge } from './CommercialStatusBadge'
import { CommercialDetailPanel } from './CommercialDetailPanel'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import { Modal } from '@/components/common/Modal'
import { Plus, Search, X, Building2, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface CommercialLeadsTableProps {
  presetStatuses?: CommercialStatus[]
  title?: string
  accentColor?: string
}

const ENTITY = 'vitalx' as const

export function CommercialLeadsTable({ presetStatuses, title, accentColor = '#06A59A' }: CommercialLeadsTableProps) {
  const [leads, setLeads] = useState<CommercialLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedLead, setSelectedLead] = useState<CommercialLead | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('commercial_leads').select('*').eq('entity', ENTITY).order('fit_score', { ascending: false })
    if (presetStatuses?.length) q = q.in('status', presetStatuses)
    const { data } = await q
    setLeads((data ?? []) as CommercialLead[])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let result = leads
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.organization_name.toLowerCase().includes(q) ||
        (l.contact_name ?? '').toLowerCase().includes(q) ||
        (l.contact_email ?? '').toLowerCase().includes(q)
      )
    }
    if (categoryFilter) result = result.filter(l => l.service_category === categoryFilter)
    if (statusFilter) result = result.filter(l => l.status === statusFilter as CommercialStatus)
    return result
  }, [leads, search, categoryFilter, statusFilter])

  function handleUpdate(updated: CommercialLead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelectedLead(updated)
  }

  function handleAdd(lead: CommercialLead) {
    setLeads(prev => [lead, ...prev])
    setShowAdd(false)
    setSelectedLead(lead)
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition"
            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
            placeholder="Search organizations, contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={13} /></button>}
        </div>

        {/* Category filter */}
        {!presetStatuses && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {COMMERCIAL_STATUSES.map(s => <option key={s} value={s}>{COMMERCIAL_STATUS_LABELS[s]}</option>)}
          </select>
        )}

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
        >
          <option value="">All Categories</option>
          {VITALX_COMMERCIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg text-[#111827] ml-auto"
          style={{ backgroundColor: accentColor }}
        >
          <Plus size={15} />
          Add Prospect
        </button>
      </div>

      <div className="mb-3">
        <span className="text-gray-500 text-xs">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search || categoryFilter || statusFilter ? 'No matches found' : `No ${title?.toLowerCase() ?? 'prospects'} yet`}
          description="Add commercial prospects and track your outreach pipeline."
          action={!search && !categoryFilter && !statusFilter ? { label: 'Add Prospect', onClick: () => setShowAdd(true) } : undefined}
        />
      ) : (
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#374151] bg-[#161E2E]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Fit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Est. Value/yr</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Last Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Next Follow-Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {filtered.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-[#253347] cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{lead.organization_name}</div>
                      {lead.website && <div className="text-gray-500 text-xs truncate max-w-[160px]">{lead.website}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="truncate max-w-[140px]">{lead.contact_name ?? '—'}</div>
                      {lead.contact_title && <div className="text-gray-500 text-xs truncate">{lead.contact_title}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <CommercialFitBadge score={lead.fit_score} />
                    </td>
                    <td className="px-4 py-3">
                      <InlineStatusSelect lead={lead} onChange={s => handleInlineStatus(lead.id, s)} accentColor={accentColor} />
                    </td>
                    <td className="px-4 py-3">
                      {lead.service_category ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: accentColor + '22', color: accentColor }}>
                          {lead.service_category}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{formatCurrency(lead.estimated_annual_value)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.last_contact_date ? format(parseISO(lead.last_contact_date), 'MMM d, yy') : '—'}</td>
                    <td className="px-4 py-3">
                      {lead.next_follow_up ? (
                        <span className="text-xs font-medium" style={{ color: accentColor }}>
                          {format(parseISO(lead.next_follow_up), 'MMM d, yy')}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedLead && (
        <CommercialDetailPanel
          lead={selectedLead}
          accentColor={accentColor}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate}
        />
      )}

      {showAdd && (
        <AddCommercialLeadModal
          accentColor={accentColor}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  )

  async function handleInlineStatus(id: string, status: CommercialStatus) {
    const supabase = createClient()
    await supabase.from('commercial_leads').update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, status } : null)
  }
}

// ── Commercial fit score badge ───────────────────────────────────────────────
function CommercialFitBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#4ADE80' : score >= 65 ? '#FCD34D' : score >= 45 ? '#FB923C' : '#9CA3AF'
  const bg = score >= 80 ? '#4ADE8022' : score >= 65 ? '#FCD34D22' : score >= 45 ? '#FB923C22' : '#9CA3AF22'
  if (!score) return <span className="text-gray-600 text-xs">—</span>
  return (
    <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full" style={{ color, backgroundColor: bg }}>
      {score}
    </span>
  )
}

// ── Inline status cell ──────────────────────────────────────────────────────
function InlineStatusSelect({ lead, onChange }: { lead: CommercialLead; onChange: (s: CommercialStatus) => void; accentColor: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
        <CommercialStatusBadge status={lead.status} />
        <ChevronDown size={11} className="text-gray-600" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-[#1F2937] border border-[#374151] rounded-lg shadow-xl py-1 min-w-36">
          {COMMERCIAL_STATUSES.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false) }} className="block w-full text-left px-3 py-1.5 hover:bg-[#374151] transition">
              <CommercialStatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add commercial lead modal ───────────────────────────────────────────────
function AddCommercialLeadModal({ accentColor, onClose, onSave }: { accentColor: string; onClose: () => void; onSave: (l: CommercialLead) => void }) {
  const [form, setForm] = useState({
    organization_name: '', contact_name: '', contact_title: '', contact_email: '',
    contact_phone: '', website: '', status: 'prospect' as CommercialStatus,
    service_category: '', estimated_annual_value: '', next_follow_up: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.organization_name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('commercial_leads')
      .insert({
        entity: ENTITY,
        organization_name: form.organization_name.trim(),
        contact_name: form.contact_name || null,
        contact_title: form.contact_title || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        website: form.website || null,
        status: form.status,
        service_category: form.service_category || null,
        estimated_annual_value: form.estimated_annual_value ? parseFloat(form.estimated_annual_value) : null,
        next_follow_up: form.next_follow_up || null,
        notes: form.notes || null,
      })
      .select()
      .single()
    if (!error && data) onSave(data as CommercialLead)
    setSaving(false)
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition'
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs text-gray-400 mb-1.5">{label}</label>{children}</div>
  )

  return (
    <Modal title="Add Prospect" onClose={onClose} size="lg" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.organization_name.trim()} className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] disabled:opacity-50 transition" style={{ backgroundColor: accentColor }}>
          {saving ? 'Saving...' : 'Save Prospect'}
        </button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <F label="Organization Name *">
            <input autoFocus className={inp} value={form.organization_name} onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))} placeholder="e.g., Quest Diagnostics" />
          </F>
        </div>
        <F label="Status">
          <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CommercialStatus }))}>
            {COMMERCIAL_STATUSES.map(s => <option key={s} value={s}>{COMMERCIAL_STATUS_LABELS[s]}</option>)}
          </select>
        </F>
        <F label="Service Category">
          <select className={inp} value={form.service_category} onChange={e => setForm(f => ({ ...f, service_category: e.target.value }))}>
            <option value="">— None —</option>
            {VITALX_COMMERCIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
        <F label="Contact Name"><input className={inp} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></F>
        <F label="Contact Title"><input className={inp} value={form.contact_title} onChange={e => setForm(f => ({ ...f, contact_title: e.target.value }))} /></F>
        <F label="Email"><input type="email" className={inp} value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></F>
        <F label="Phone"><input className={inp} value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></F>
        <F label="Website"><input type="url" className={inp} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></F>
        <F label="Est. Annual Value ($)"><input type="number" className={inp} value={form.estimated_annual_value} onChange={e => setForm(f => ({ ...f, estimated_annual_value: e.target.value }))} /></F>
        <F label="Next Follow-Up"><input type="date" className={inp} value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} /></F>
        <div className="col-span-2">
          <F label="Notes"><textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></F>
        </div>
      </div>
    </Modal>
  )
}
