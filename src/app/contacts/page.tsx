'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/lib/types'
import { Sidebar } from '@/components/layout/Sidebar'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import { Users, Search, Plus, X, Phone, Mail, Building2, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CONTACT_TYPES = ['general', 'prospect', 'partner', 'contracting_officer', 'mentor', 'vendor', 'subcontractor']
const CONTACT_TYPE_LABELS: Record<string, string> = {
  general:              'General',
  prospect:             'Prospect',
  partner:              'Partner',
  contracting_officer:  'Contracting Officer',
  mentor:               'Mentor',
  vendor:               'Vendor',
  subcontractor:        'Subcontractor',
}
const ENTITY_OPTIONS = ['exousia', 'vitalx', 'ironhouse'] as const

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [recentInteractions, setRecentInteractions] = useState<{ id: string; interaction_date: string; interaction_type?: string; subject?: string; notes?: string; entity?: string; contacts?: { first_name: string; last_name: string } }[]>([])

  useEffect(() => { fetchContacts() }, [])

  async function fetchContacts() {
    setLoading(true)
    const supabase = createClient()
    const [contactsRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*').order('last_name'),
      supabase.from('interactions').select('*, contacts(first_name, last_name)').order('created_at', { ascending: false }).limit(10),
    ])
    setContacts((contactsRes.data ?? []) as Contact[])
    setRecentInteractions(interactionsRes.data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let result = contacts
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.organization ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.title ?? '').toLowerCase().includes(q)
      )
    }
    if (typeFilter) result = result.filter(c => c.contact_type === typeFilter)
    return result
  }, [contacts, search, typeFilter])

  const contactMetrics = useMemo(() => {
    const now = new Date()
    const parseDate = (s?: string | null) => s ? new Date(s) : null
    const next30 = contacts.filter(c => {
      const future = parseDate(c.next_follow_up)
      if (!future) return false
      const days = Math.ceil((future.getTime() - now.getTime()) / 86_400_000)
      return days >= 0 && days <= 30
    }).length

    const overdue = contacts.filter(c => {
      const future = parseDate(c.next_follow_up)
      return future && future < now
    }).length

    return {
      total: contacts.length,
      prospects: contacts.filter(c => c.contact_type === 'prospect').length,
      subcontractors: contacts.filter(c => c.contact_type === 'subcontractor').length,
      nextFollowUp30: next30,
      overdue,
    }
  }, [contacts])

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    contacts.forEach(c => {
      const type = c.contact_type ?? 'general'
      counts[type] = (counts[type] ?? 0) + 1
    })
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      label: CONTACT_TYPE_LABELS[type] ?? type,
    }))
  }, [contacts])

  const entityBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    contacts.forEach(c => {
      (c.entities_associated ?? []).forEach(e => {
        counts[e] = (counts[e] ?? 0) + 1
      })
    })
    return Object.entries(counts).map(([entity, count]) => ({ entity, count }))
  }, [contacts])

  const overdueFollowUps = useMemo(() => {
    const now = new Date()
    return contacts
      .filter(c => c.next_follow_up && new Date(c.next_follow_up) < now)
      .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime())
      .slice(0, 5)
  }, [contacts])

  function handleSave(c: Contact) {
    setContacts(prev => {
      const idx = prev.findIndex(p => p.id === c.id)
      if (idx >= 0) return prev.map(p => p.id === c.id ? c : p)
      return [c, ...prev]
    })
    setSelectedContact(c)
    setShowAdd(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#1A2233] flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D4AF3722] flex-shrink-0">
            <Users size={20} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">Master Contacts</h1>
            <p className="text-gray-400 text-sm">Shared contacts across all Mighty Oak Group entities</p>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
                placeholder="Search contacts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="">All Types</option>
              {CONTACT_TYPES.map(t => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
            </select>

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg text-[#111827] bg-[#D4AF37] ml-auto"
            >
              <Plus size={15} />
              Add Contact
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <ContactMetricCard label="Total Contacts" value={contactMetrics.total} />
            <ContactMetricCard label="Prospects" value={contactMetrics.prospects} />
            <ContactMetricCard label="Subcontractors" value={contactMetrics.subcontractors} />
            <ContactMetricCard label="Follow-ups 30d" value={contactMetrics.nextFollowUp30} />
            <ContactMetricCard label="Overdue Follow-ups" value={contactMetrics.overdue} color="#FCA5A5" />
          </div>

          <div className="mb-3">
            <span className="text-gray-500 text-xs">{filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search || typeFilter ? 'No matches found' : 'No contacts yet'}
              description="Add contacts for prospects, partners, contracting officers, and more."
              action={!search && !typeFilter ? { label: 'Add Contact', onClick: () => setShowAdd(true) } : undefined}
            />
          ) : (
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#374151] bg-[#161E2E]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Entities</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Last Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Next Follow-Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#374151]">
                    {filtered.map(c => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className="hover:bg-[#253347] cursor-pointer transition"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{c.first_name} {c.last_name}</div>
                          {c.title && <div className="text-gray-500 text-xs">{c.title}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">{c.organization ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-[#374151] text-gray-300">
                            {CONTACT_TYPE_LABELS[c.contact_type ?? 'general'] ?? c.contact_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-white"><Mail size={13} /></a>}
                            {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-white"><Phone size={13} /></a>}
                            {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-white"><ExternalLink size={13} /></a>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(c.entities_associated ?? []).map(e => (
                              <span key={e} className="text-xs px-1.5 py-0.5 rounded bg-[#1A2233] text-gray-400 capitalize">{e}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {c.last_contact_date ? format(parseISO(c.last_contact_date), 'MMM d, yy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-[#D4AF37]">
                          {c.next_follow_up ? format(parseISO(c.next_follow_up), 'MMM d, yy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Additional Dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ContactsByTypeChart data={typeBreakdown} />
        <ContactsByEntityChart data={entityBreakdown} />
        <OverdueFollowUpsList data={overdueFollowUps} />
        <RecentInteractionsFeed data={recentInteractions} />
      </div>

      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={handleSave}
        />
      )}

      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ── Contact Metrics Card ─────────────────────────────────────────────────────
function ContactMetricCard({ label, value, color = '#D4AF37' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#1F2937] rounded-lg border border-[#374151] p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-semibold" style={{ color }}>{value}</div>
    </div>
  )
}

// ── Contacts by Type Chart ──────────────────────────────────────────────────
function ContactsByTypeChart({ data }: { data: { type: string; count: number; label: string }[] }) {
  if (data.length === 0) return null
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <h2 className="text-white font-semibold text-sm mb-4">Contacts by Type</h2>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} angle={-35} textAnchor="end" interval={0} />
            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#FFFFFF' }}
              itemStyle={{ color: '#06A59A' }}
            />
            <Bar dataKey="count" fill="#06A59A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Contacts by Entity Chart ────────────────────────────────────────────────
function ContactsByEntityChart({ data }: { data: { entity: string; count: number }[] }) {
  if (data.length === 0) return null
  const ENTITY_LABELS: Record<string, string> = { exousia: 'Exousia', vitalx: 'VitalX', ironhouse: 'IronHouse' }
  const labeled = data.map(d => ({ ...d, label: ENTITY_LABELS[d.entity] || d.entity }))
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <h2 className="text-white font-semibold text-sm mb-4">Contacts by Associated Entity</h2>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={labeled} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#FFFFFF' }}
              itemStyle={{ color: '#B45309' }}
            />
            <Bar dataKey="count" fill="#B45309" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Overdue Follow-ups List ─────────────────────────────────────────────────
function OverdueFollowUpsList({ data }: { data: Contact[] }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <h2 className="text-white font-semibold text-sm mb-4">Overdue Follow-ups</h2>
      {data.length === 0 ? (
        <p className="text-gray-600 text-sm">No overdue follow-ups</p>
      ) : (
        <div className="space-y-2">
          {data.map(c => (
            <div key={c.id} className="flex items-center justify-between p-2 bg-[#374151] rounded">
              <div>
                <div className="text-white text-sm font-medium">{c.first_name} {c.last_name}</div>
                <div className="text-gray-400 text-xs">{c.organization ?? 'No organization'}</div>
              </div>
              <div className="text-red-400 text-xs">
                {c.next_follow_up ? format(parseISO(c.next_follow_up), 'MMM d') : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Recent Interactions Feed ────────────────────────────────────────────────
function RecentInteractionsFeed({ data }: { data: { id: string; interaction_date: string; interaction_type?: string; subject?: string; notes?: string; entity?: string; contacts?: { first_name: string; last_name: string } }[] }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <h2 className="text-white font-semibold text-sm mb-4">Recent Interactions</h2>
      {data.length === 0 ? (
        <p className="text-gray-600 text-sm">No recent interactions</p>
      ) : (
        <div className="space-y-2">
          {data.map(i => (
            <div key={i.id} className="flex items-start gap-3 p-2 bg-[#374151] rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-[#06A59A] flex-shrink-0 mt-1.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 text-xs">{i.interaction_date}</span>
                  {i.interaction_type && <span className="text-gray-600 text-xs capitalize">· {i.interaction_type}</span>}
                  {i.entity && <span className="text-gray-600 text-xs">· {i.entity}</span>}
                </div>
                {i.contacts && (
                  <div className="text-gray-300 text-xs font-medium mt-0.5">
                    {i.contacts.first_name} {i.contacts.last_name}
                  </div>
                )}
                {i.subject && i.subject !== 'Note' && <div className="text-gray-300 text-xs mt-0.5">{i.subject}</div>}
                {i.notes && <p className="text-gray-400 text-xs mt-0.5 truncate">{i.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Contact Detail Panel ──────────────────────────────────────────────────────
function ContactDetailPanel({ contact, onClose, onUpdate }: { contact: Contact; onClose: () => void; onUpdate: (c: Contact) => void }) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ ...contact })
  const [saving, setSaving] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setForm({ ...contact }); setEditMode(false) }, [contact.id])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        title: form.title || null,
        organization: form.organization || null,
        email: form.email || null,
        phone: form.phone || null,
        linkedin: form.linkedin || null,
        contact_type: form.contact_type,
        entities_associated: form.entities_associated ?? [],
        last_contact_date: form.last_contact_date || null,
        next_follow_up: form.next_follow_up || null,
        relationship_notes: form.relationship_notes || null,
      })
      .eq('id', contact.id)
      .select()
      .single()
    if (!error && data) {
      onUpdate(data as Contact)
      setEditMode(false)
    }
    setSaving(false)
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition'
  const lbl = 'block text-xs text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#1A2233] border-l border-[#374151] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#374151]">
          <div>
            <h2 className="text-white font-semibold text-lg">{contact.first_name} {contact.last_name}</h2>
            {contact.title && <p className="text-gray-400 text-sm">{contact.title}{contact.organization ? ` · ${contact.organization}` : ''}</p>}
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button onClick={() => { setEditMode(false); setForm({ ...contact }) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#111827] bg-[#D4AF37] disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#374151] rounded-lg">Edit</button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#374151]"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {editMode ? (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>First Name</label><input className={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
              <div><label className={lbl}>Last Name</label><input className={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              <div><label className={lbl}>Title</label><input className={inp} value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><label className={lbl}>Organization</label><input className={inp} value={form.organization ?? ''} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} /></div>
              <div><label className={lbl}>Email</label><input type="email" className={inp} value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={lbl}>Phone</label><input className={inp} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className={lbl}>LinkedIn URL</label><input className={inp} value={form.linkedin ?? ''} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} /></div>
              <div>
                <label className={lbl}>Contact Type</label>
                <select className={inp} value={form.contact_type ?? 'general'} onChange={e => setForm(f => ({ ...f, contact_type: e.target.value }))}>
                  {CONTACT_TYPES.map(t => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Last Contact</label><input type="date" className={inp} value={form.last_contact_date ?? ''} onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))} /></div>
              <div><label className={lbl}>Next Follow-Up</label><input type="date" className={inp} value={form.next_follow_up ?? ''} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} /></div>
              <div className="col-span-2">
                <label className={lbl}>Associated Entities</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {ENTITY_OPTIONS.map(e => {
                    const checked = (form.entities_associated ?? []).includes(e)
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          entities_associated: checked
                            ? (f.entities_associated ?? []).filter(x => x !== e)
                            : [...(f.entities_associated ?? []), e],
                        }))}
                        className={`px-3 py-1 text-xs rounded-lg border transition capitalize ${checked ? 'bg-[#D4AF3722] border-[#D4AF37] text-[#D4AF37]' : 'border-[#374151] text-gray-400'}`}
                      >
                        {e}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Relationship Notes</label>
                <textarea className={`${inp} resize-none`} rows={3} value={form.relationship_notes ?? ''} onChange={e => setForm(f => ({ ...f, relationship_notes: e.target.value }))} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {contact.email && (
                  <div>
                    <div className={lbl}>Email</div>
                    <a href={`mailto:${contact.email}`} className="text-[#D4AF37] text-sm hover:underline flex items-center gap-1"><Mail size={13} />{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <div className={lbl}>Phone</div>
                    <a href={`tel:${contact.phone}`} className="text-gray-200 text-sm flex items-center gap-1"><Phone size={13} />{contact.phone}</a>
                  </div>
                )}
                {contact.organization && (
                  <div>
                    <div className={lbl}>Organization</div>
                    <div className="text-gray-200 text-sm flex items-center gap-1"><Building2 size={13} />{contact.organization}</div>
                  </div>
                )}
                {contact.linkedin && (
                  <div>
                    <div className={lbl}>LinkedIn</div>
                    <a href={contact.linkedin} target="_blank" rel="noreferrer" className="text-[#D4AF37] text-sm hover:underline flex items-center gap-1"><ExternalLink size={13} />Profile</a>
                  </div>
                )}
                <div>
                  <div className={lbl}>Type</div>
                  <div className="text-gray-200 text-sm">{CONTACT_TYPE_LABELS[contact.contact_type ?? 'general']}</div>
                </div>
                {(contact.entities_associated ?? []).length > 0 && (
                  <div>
                    <div className={lbl}>Entities</div>
                    <div className="flex gap-1 flex-wrap">
                      {contact.entities_associated!.map(e => (
                        <span key={e} className="text-xs px-2 py-0.5 rounded bg-[#374151] text-gray-300 capitalize">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {contact.last_contact_date && (
                  <div>
                    <div className={lbl}>Last Contact</div>
                    <div className="text-gray-200 text-sm">{format(parseISO(contact.last_contact_date), 'MMM d, yyyy')}</div>
                  </div>
                )}
                {contact.next_follow_up && (
                  <div>
                    <div className={lbl}>Next Follow-Up</div>
                    <div className="text-[#D4AF37] text-sm font-medium">{format(parseISO(contact.next_follow_up), 'MMM d, yyyy')}</div>
                  </div>
                )}
              </div>
              {contact.relationship_notes && (
                <div>
                  <div className={lbl}>Relationship Notes</div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{contact.relationship_notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────
function AddContactModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Contact) => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', title: '', organization: '',
    email: '', phone: '', linkedin: '',
    contact_type: 'general', entities_associated: [] as string[],
    last_contact_date: '', next_follow_up: '', relationship_notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        title: form.title || null,
        organization: form.organization || null,
        email: form.email || null,
        phone: form.phone || null,
        linkedin: form.linkedin || null,
        contact_type: form.contact_type,
        entities_associated: form.entities_associated,
        last_contact_date: form.last_contact_date || null,
        next_follow_up: form.next_follow_up || null,
        relationship_notes: form.relationship_notes || null,
      })
      .select()
      .single()
    if (!error && data) onSave(data as Contact)
    setSaving(false)
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition'
  const lbl = 'block text-xs text-gray-400 mb-1.5'

  return (
    <Modal
      title="Add Contact"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.first_name.trim() || !form.last_name.trim()} className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] bg-[#D4AF37] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Contact'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div><label className={lbl}>First Name *</label><input autoFocus className={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
        <div><label className={lbl}>Last Name *</label><input className={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
        <div><label className={lbl}>Title</label><input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label className={lbl}>Organization</label><input className={inp} value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} /></div>
        <div><label className={lbl}>Email</label><input type="email" className={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><label className={lbl}>Phone</label><input className={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div><label className={lbl}>LinkedIn URL</label><input className={inp} value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} /></div>
        <div>
          <label className={lbl}>Contact Type</label>
          <select className={inp} value={form.contact_type} onChange={e => setForm(f => ({ ...f, contact_type: e.target.value }))}>
            {CONTACT_TYPES.map(t => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Last Contact</label><input type="date" className={inp} value={form.last_contact_date} onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))} /></div>
        <div><label className={lbl}>Next Follow-Up</label><input type="date" className={inp} value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} /></div>
        <div className="col-span-2">
          <label className={lbl}>Associated Entities</label>
          <div className="flex gap-2 flex-wrap">
            {ENTITY_OPTIONS.map(e => {
              const checked = form.entities_associated.includes(e)
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    entities_associated: checked ? f.entities_associated.filter(x => x !== e) : [...f.entities_associated, e],
                  }))}
                  className={`px-3 py-1 text-xs rounded-lg border transition capitalize ${checked ? 'bg-[#D4AF3722] border-[#D4AF37] text-[#D4AF37]' : 'border-[#374151] text-gray-400'}`}
                >
                  {e}
                </button>
              )
            })}
          </div>
        </div>
        <div className="col-span-2">
          <label className={lbl}>Relationship Notes</label>
          <textarea className={`${inp} resize-none`} rows={2} value={form.relationship_notes} onChange={e => setForm(f => ({ ...f, relationship_notes: e.target.value }))} />
        </div>
      </div>
    </Modal>
  )
}
