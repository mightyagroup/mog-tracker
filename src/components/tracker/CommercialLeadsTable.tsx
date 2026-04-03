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
import { Plus, Search, X, Building2, ChevronDown, Radar, Loader2, CheckCircle2, MapPin } from 'lucide-react'
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns'

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
  const [showDiscover, setShowDiscover] = useState(false)

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
          onClick={() => setShowDiscover(true)}
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg text-white ml-auto border border-[#374151] bg-[#1F2937] hover:bg-[#374151] transition"
        >
          <Radar size={15} />
          Discover Prospects
        </button>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg text-[#111827]"
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">First Seen</th>
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
                    <td className="px-4 py-3">
                      {lead.created_at ? (
                        <CommercialFirstSeenBadge createdAt={lead.created_at} />
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

      {showDiscover && (
        <DiscoverProspectsModal
          accentColor={accentColor}
          onClose={() => setShowDiscover(false)}
          onImported={() => { setShowDiscover(false); fetchLeads() }}
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
function CommercialFirstSeenBadge({ createdAt }: { createdAt: string }) {
  const date = parseISO(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let badgeColor = 'text-gray-500'
  let bgColor = ''
  if (diffDays === 0) {
    badgeColor = 'text-emerald-400'
    bgColor = 'bg-emerald-400/10'
  } else if (diffDays <= 2) {
    badgeColor = 'text-blue-400'
    bgColor = 'bg-blue-400/10'
  } else if (diffDays <= 7) {
    badgeColor = 'text-gray-300'
  }

  const relative = diffDays === 0
    ? 'Today'
    : formatDistanceToNowStrict(date, { addSuffix: true })

  return (
    <div className="flex flex-col">
      <span className={`text-xs font-medium ${badgeColor} ${bgColor} ${bgColor ? 'px-1.5 py-0.5 rounded' : ''}`}>
        {relative}
      </span>
      <span className="text-[10px] text-gray-600 mt-0.5">{format(date, 'MMM d, yyyy')}</span>
    </div>
  )
}

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
    if (!error && data) {
      // Auto-create initial summary interaction note
      const lead = data as CommercialLead
      const summaryLines: string[] = [
        `NEW PROSPECT ADDED: ${lead.organization_name}`,
        '',
        `Category: ${lead.service_category || 'Not set'}`,
        `Status: ${lead.status || 'prospect'}`,
      ]
      if (lead.estimated_annual_value) summaryLines.push(`Est. Annual Value: $${Number(lead.estimated_annual_value).toLocaleString()}`)
      if (lead.contact_name) summaryLines.push(`Contact: ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''}`)
      if (lead.contact_email) summaryLines.push(`Email: ${lead.contact_email}`)
      if (lead.contact_phone) summaryLines.push(`Phone: ${lead.contact_phone}`)
      if (lead.notes) summaryLines.push('', 'Notes:', lead.notes)
      summaryLines.push('', `Source: Manual entry`, `Created: ${new Date().toISOString().split('T')[0]}`)

      await supabase.from('interactions').insert({
        entity: 'vitalx',
        commercial_lead_id: lead.id,
        interaction_date: new Date().toISOString().split('T')[0],
        interaction_type: 'system_update',
        subject: 'New Prospect -- Initial Summary',
        notes: summaryLines.join('\n'),
      })

      onSave(lead)
    }
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

// ── Discover Prospects Modal ─────────────────────────────────────────────────

interface Prospect {
  organization_name: string
  contact_name: string | null
  contact_title: string | null
  contact_phone: string | null
  address: string
  city: string
  state: string
  zip: string
  npi_number: string
  taxonomy_description: string
  suggested_category: string
  source: string
}

function DiscoverProspectsModal({
  accentColor,
  onClose,
  onImported,
}: {
  accentColor: string
  onClose: () => void
  onImported: () => void
}) {
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('VA')
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)

  async function handleSearch() {
    setSearching(true)
    setHasSearched(false)
    setProspects([])
    setSelected(new Set())
    setImportResult(null)

    try {
      const body: Record<string, unknown> = {
        mode: city ? 'quick' : 'full',
        autoImport: false,
      }
      if (category) body.categories = [category]
      if (city) body.city = city
      if (state) body.state = state

      const resp = await fetch('/api/commercial/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      setProspects(data.prospects || [])
      setHasSearched(true)
    } catch (err) {
      console.error('Discovery failed:', err)
    } finally {
      setSearching(false)
    }
  }

  function toggleSelect(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === prospects.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(prospects.map((_, i) => i)))
    }
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)

    const toImport = prospects.filter((_, i) => selected.has(i))
    const supabase = createClient()

    const inserts = toImport.map(p => ({
      entity: 'vitalx' as const,
      organization_name: p.organization_name,
      contact_name: p.contact_name,
      contact_title: p.contact_title,
      contact_phone: p.contact_phone,
      service_category: p.suggested_category,
      status: 'prospect' as const,
      notes: [
        `NPI: ${p.npi_number}`,
        `Type: ${p.taxonomy_description}`,
        `Address: ${p.address}, ${p.city}, ${p.state} ${p.zip}`,
        `Source: NPI Registry auto-discovery`,
        `Discovered: ${new Date().toISOString().split('T')[0]}`,
      ].join('\n'),
    }))

    let imported = 0
    for (let i = 0; i < inserts.length; i += 20) {
      const chunk = inserts.slice(i, i + 20)
      const { data } = await supabase
        .from('commercial_leads')
        .insert(chunk)
        .select('id, organization_name, service_category, contact_name, contact_title, contact_phone, notes')
      imported += data?.length || 0

      // Auto-create initial summary notes for each imported lead
      if (data && data.length > 0) {
        const interactionInserts = data.map((lead: Record<string, unknown>) => ({
          entity: 'vitalx',
          commercial_lead_id: lead.id as string,
          interaction_date: new Date().toISOString().split('T')[0],
          interaction_type: 'system_update',
          subject: 'New Prospect -- NPI Discovery Import',
          notes: [
            `NEW PROSPECT IMPORTED: ${lead.organization_name}`,
            '',
            `Category: ${lead.service_category || 'Not set'}`,
            lead.contact_name ? `Contact: ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''}` : null,
            lead.contact_phone ? `Phone: ${lead.contact_phone}` : null,
            '',
            `Source: NPI Registry auto-discovery`,
            `Imported: ${new Date().toISOString().split('T')[0]}`,
            '',
            lead.notes ? `Details:\n${lead.notes}` : null,
          ].filter(Boolean).join('\n'),
        }))
        await supabase.from('interactions').insert(interactionInserts)
      }
    }

    setImportResult({ imported })
    setImporting(false)

    // If any were imported, refresh the parent table after a short delay
    if (imported > 0) {
      setTimeout(() => onImported(), 1500)
    }
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition'

  const DMV_CITIES_BY_STATE: Record<string, string[]> = {
    VA: ['Arlington', 'Alexandria', 'Fairfax', 'Reston', 'Richmond', 'Springfield', 'Woodbridge', 'Manassas', 'Herndon', 'Leesburg', 'McLean', 'Vienna', 'Falls Church', 'Chantilly', 'Ashburn', 'Sterling', 'Fredericksburg'],
    MD: ['Bethesda', 'Rockville', 'Silver Spring', 'Baltimore', 'Columbia', 'Gaithersburg', 'Laurel', 'Annapolis', 'Frederick', 'Germantown', 'Largo', 'Greenbelt', 'Bowie'],
    DC: ['Washington'],
  }

  return (
    <Modal title="Discover Prospects" onClose={onClose} size="xl" footer={
      importResult ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: accentColor }}>
          <CheckCircle2 size={16} />
          Imported {importResult.imported} prospects. Refreshing...
        </div>
      ) : (
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          {prospects.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] disabled:opacity-50 transition"
              style={{ backgroundColor: accentColor }}
            >
              {importing ? 'Importing...' : `Import ${selected.size} Selected`}
            </button>
          )}
        </>
      )
    }>
      {/* Search Controls */}
      <div className="mb-4 space-y-3">
        <p className="text-sm text-gray-400">
          Search the NPI Registry for healthcare facilities in the DMV area that may need medical courier, specimen transport, or pharmacy delivery services.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select className={inp} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {VITALX_COMMERCIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">State</label>
            <select className={inp} value={state} onChange={e => { setState(e.target.value); setCity('') }}>
              <option value="VA">Virginia</option>
              <option value="MD">Maryland</option>
              <option value="DC">Washington DC</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">City (optional, faster)</label>
            <select className={inp} value={city} onChange={e => setCity(e.target.value)}>
              <option value="">All cities (statewide)</option>
              {(DMV_CITIES_BY_STATE[state] || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching}
          className="flex items-center gap-2 px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] transition disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
          {searching ? 'Searching NPI Registry...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {hasSearched && prospects.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No new prospects found. Try a different category, city, or state. Organizations already in your database are automatically excluded.
        </div>
      )}

      {prospects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{prospects.length} new prospects found (already deduped against your database)</span>
            <button onClick={toggleAll} className="text-xs hover:text-white transition" style={{ color: accentColor }}>
              {selected.size === prospects.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto border border-[#374151] rounded-lg divide-y divide-[#374151]">
            {prospects.map((p, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition ${selected.has(idx) ? 'bg-[#253347]' : 'hover:bg-[#1F2937]'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleSelect(idx)}
                  className="mt-1 accent-[#06A59A]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{p.organization_name}</div>
                  <div className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                    <MapPin size={10} />
                    {p.city}, {p.state} {p.zip}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: accentColor + '22', color: accentColor }}>
                      {p.suggested_category}
                    </span>
                    <span className="text-gray-500 text-xs">{p.taxonomy_description}</span>
                  </div>
                  {p.contact_name && (
                    <div className="text-gray-400 text-xs mt-1">
                      Contact: {p.contact_name}{p.contact_title ? ` (${p.contact_title})` : ''}{p.contact_phone ? ` - ${p.contact_phone}` : ''}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
