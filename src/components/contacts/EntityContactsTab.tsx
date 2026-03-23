'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact, Interaction, EntityType } from '@/lib/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { Users, Plus, X, Phone, Mail, ExternalLink, MessageSquare, Calendar, ChevronRight, Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const CONTACT_TYPES = ['general', 'prospect', 'partner', 'contracting_officer', 'mentor', 'vendor', 'subcontractor']
const CONTACT_TYPE_LABELS: Record<string, string> = {
  general:             'General',
  prospect:            'Prospect',
  partner:             'Partner',
  contracting_officer: 'Contracting Officer',
  mentor:              'Mentor',
  vendor:              'Vendor',
  subcontractor:       'Subcontractor',
}
const INTERACTION_TYPES = ['email', 'phone', 'meeting', 'linkedin', 'proposal', 'site_visit', 'other']
const INTERACTION_TYPE_LABELS: Record<string, string> = {
  email: 'Email', phone: 'Phone', meeting: 'Meeting', linkedin: 'LinkedIn',
  proposal: 'Proposal', site_visit: 'Site Visit', other: 'Other',
}

interface EntityContactsTabProps {
  entity: EntityType
  accentColor: string
}

interface ContactWithInteractionCount extends Contact {
  interaction_count?: number
}

export function EntityContactsTab({ entity, accentColor }: EntityContactsTabProps) {
  const [contacts, setContacts] = useState<ContactWithInteractionCount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<ContactWithInteractionCount | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showLinkContact, setShowLinkContact] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch contacts associated with this entity
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*')
      .contains('entities_associated', [entity])
      .order('last_name')

    if (!contactData) { setLoading(false); return }

    // Fetch interaction counts per contact for this entity
    const contactIds = contactData.map(c => c.id)
    if (contactIds.length > 0) {
      const { data: interactionData } = await supabase
        .from('interactions')
        .select('contact_id')
        .eq('entity', entity)
        .in('contact_id', contactIds)

      const counts: Record<string, number> = {}
      for (const row of interactionData ?? []) {
        if (row.contact_id) counts[row.contact_id] = (counts[row.contact_id] ?? 0) + 1
      }

      setContacts(contactData.map(c => ({ ...c, interaction_count: counts[c.id] ?? 0 })) as ContactWithInteractionCount[])
    } else {
      setContacts([])
    }
    setLoading(false)
  }, [entity])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const filtered = contacts.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.organization ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.title ?? '').toLowerCase().includes(q)
    )
  })

  function handleContactSaved(c: Contact) {
    setContacts(prev => {
      const idx = prev.findIndex(p => p.id === c.id)
      if (idx >= 0) return prev.map(p => p.id === c.id ? { ...c, interaction_count: p.interaction_count } : p)
      return [{ ...c, interaction_count: 0 }, ...prev]
    })
    setSelectedContact({ ...c, interaction_count: 0 })
    setShowAddContact(false)
    setShowLinkContact(false)
  }

  const inp = `w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition`

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className={inp}
            style={{ ['--tw-ring-color' as string]: accentColor }}
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
        <button
          onClick={() => setShowLinkContact(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg transition"
        >
          <ChevronRight size={14} />
          Link Existing
        </button>
        <button
          onClick={() => setShowAddContact(true)}
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg text-[#111827] transition"
          style={{ backgroundColor: accentColor }}
        >
          <Plus size={15} />
          New Contact
        </button>
      </div>

      <div className="text-gray-500 text-xs">{filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}</div>

      {loading ? (
        <div className="text-gray-500 text-sm py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matches found' : 'No contacts linked yet'}
          description="Add contacts or link existing master contacts to this entity."
          action={!search ? { label: 'Add Contact', onClick: () => setShowAddContact(true) } : undefined}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Last Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Next Follow-Up</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Interactions</th>
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
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {c.last_contact_date ? format(parseISO(c.last_contact_date), 'MMM d, yy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: c.next_follow_up ? accentColor : undefined }}>
                      {c.next_follow_up ? format(parseISO(c.next_follow_up), 'MMM d, yy') : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(c.interaction_count ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <MessageSquare size={11} />
                          {c.interaction_count}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contact detail slide-over with entity-scoped interaction log */}
      {selectedContact && (
        <ContactInteractionPanel
          contact={selectedContact}
          entity={entity}
          accentColor={accentColor}
          onClose={() => setSelectedContact(null)}
          onUpdate={updated => {
            setContacts(prev => prev.map(c => c.id === updated.id ? { ...updated, interaction_count: c.interaction_count } : c))
            setSelectedContact(prev => prev ? { ...updated, interaction_count: prev.interaction_count } : null)
          }}
          onInteractionAdded={() => {
            setContacts(prev => prev.map(c =>
              c.id === selectedContact.id ? { ...c, interaction_count: (c.interaction_count ?? 0) + 1 } : c
            ))
          }}
        />
      )}

      {showAddContact && (
        <AddContactModal
          entity={entity}
          accentColor={accentColor}
          onClose={() => setShowAddContact(false)}
          onSave={handleContactSaved}
        />
      )}

      {showLinkContact && (
        <LinkContactModal
          entity={entity}
          accentColor={accentColor}
          existingIds={contacts.map(c => c.id)}
          onClose={() => setShowLinkContact(false)}
          onLinked={fetchContacts}
        />
      )}
    </div>
  )
}

// ── Contact + Interaction Panel ───────────────────────────────────────────────
function ContactInteractionPanel({
  contact, entity, accentColor, onClose, onUpdate, onInteractionAdded,
}: {
  contact: Contact
  entity: EntityType
  accentColor: string
  onClose: () => void
  onUpdate: (c: Contact) => void
  onInteractionAdded: () => void
}) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loadingInt, setLoadingInt] = useState(true)
  const [showAddInteraction, setShowAddInteraction] = useState(false)

  useEffect(() => {
    fetchInteractions()
  }, [contact.id, entity]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInteractions() {
    setLoadingInt(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('entity', entity)
      .order('interaction_date', { ascending: false })
    setInteractions((data ?? []) as Interaction[])
    setLoadingInt(false)
  }

  async function handleAddInteraction(form: AddInteractionForm) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('interactions')
      .insert({
        entity,
        contact_id: contact.id,
        interaction_date: form.interaction_date,
        interaction_type: form.interaction_type || null,
        subject: form.subject || null,
        notes: form.notes || null,
        follow_up_date: form.follow_up_date || null,
        follow_up_action: form.follow_up_action || null,
      })
      .select()
      .single()
    if (!error && data) {
      setInteractions(prev => [data as Interaction, ...prev])
      onInteractionAdded()
      setShowAddInteraction(false)

      // Update last_contact_date on the contact
      const supabase2 = createClient()
      const { data: updated } = await supabase2
        .from('contacts')
        .update({ last_contact_date: form.interaction_date })
        .eq('id', contact.id)
        .select()
        .single()
      if (updated) onUpdate(updated as Contact)
    }
  }

  const lbl = 'block text-xs text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1A2233] border-l border-[#374151] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#374151] flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">{contact.first_name} {contact.last_name}</h2>
            {(contact.title || contact.organization) && (
              <p className="text-gray-400 text-sm">
                {[contact.title, contact.organization].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                  <Mail size={12} />{contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                  <Phone size={12} />{contact.phone}
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#374151] flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Interaction log */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151]">
            <div>
              <h3 className="text-white font-medium text-sm">Interaction Log</h3>
              <p className="text-gray-500 text-xs mt-0.5 capitalize">{entity} · {interactions.length} {interactions.length === 1 ? 'entry' : 'entries'}</p>
            </div>
            <button
              onClick={() => setShowAddInteraction(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#111827] transition"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={13} />
              Log Interaction
            </button>
          </div>

          {loadingInt ? (
            <div className="text-gray-500 text-sm p-6 text-center">Loading…</div>
          ) : interactions.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={28} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No interactions logged yet</p>
              <button
                onClick={() => setShowAddInteraction(true)}
                className="mt-3 text-xs font-medium transition"
                style={{ color: accentColor }}
              >
                Log first interaction
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#374151]">
              {interactions.map(i => (
                <div key={i.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {i.interaction_type && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[#374151] text-gray-300">
                            {INTERACTION_TYPE_LABELS[i.interaction_type] ?? i.interaction_type}
                          </span>
                        )}
                        {i.subject && <span className="text-white text-sm font-medium truncate">{i.subject}</span>}
                      </div>
                      {i.notes && <p className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed">{i.notes}</p>}
                      {i.follow_up_action && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: accentColor }}>
                          <Calendar size={11} />
                          <span className="font-medium">Follow-up:</span>
                          {i.follow_up_date && <span>{format(parseISO(i.follow_up_date), 'MMM d, yyyy')} — </span>}
                          {i.follow_up_action}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs flex-shrink-0">
                      {format(parseISO(i.interaction_date), 'MMM d, yy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes / follow-up section */}
        {contact.relationship_notes && (
          <div className="px-6 py-4 border-t border-[#374151] bg-[#161E2E] flex-shrink-0">
            <div className={lbl}>Relationship Notes (Master)</div>
            <p className="text-gray-400 text-xs whitespace-pre-wrap">{contact.relationship_notes}</p>
          </div>
        )}

        {showAddInteraction && (
          <AddInteractionModal
            accentColor={accentColor}
            onClose={() => setShowAddInteraction(false)}
            onSave={handleAddInteraction}
          />
        )}
      </div>
    </div>
  )
}

// ── Add Interaction Modal ─────────────────────────────────────────────────────
interface AddInteractionForm {
  interaction_date: string
  interaction_type: string
  subject: string
  notes: string
  follow_up_date: string
  follow_up_action: string
}

function AddInteractionModal({
  accentColor, onClose, onSave,
}: {
  accentColor: string
  onClose: () => void
  onSave: (form: AddInteractionForm) => Promise<void>
}) {
  const [form, setForm] = useState<AddInteractionForm>({
    interaction_date: new Date().toISOString().slice(0, 10),
    interaction_type: 'email',
    subject: '',
    notes: '',
    follow_up_date: '',
    follow_up_action: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition'
  const lbl = 'block text-xs text-gray-400 mb-1.5'

  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-[#1F2937] rounded-xl border border-[#374151] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#374151]">
          <h3 className="text-white font-semibold text-sm">Log Interaction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Date</label>
              <input type="date" className={inp} value={form.interaction_date} onChange={e => setForm(f => ({ ...f, interaction_date: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Type</label>
              <select className={inp} value={form.interaction_type} onChange={e => setForm(f => ({ ...f, interaction_type: e.target.value }))}>
                {INTERACTION_TYPES.map(t => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Subject</label>
            <input className={inp} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g., Initial outreach email" />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={`${inp} resize-none`} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What was discussed, next steps, key info..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Follow-up Date</label>
              <input type="date" className={inp} value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Follow-up Action</label>
              <input className={inp} value={form.follow_up_action} onChange={e => setForm(f => ({ ...f, follow_up_action: e.target.value }))} placeholder="e.g., Send proposal" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#374151]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {saving ? 'Saving…' : 'Log Interaction'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Contact Modal (pre-selects entity) ────────────────────────────────────
function AddContactModal({
  entity, accentColor, onClose, onSave,
}: {
  entity: EntityType
  accentColor: string
  onClose: () => void
  onSave: (c: Contact) => void
}) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', title: '', organization: '',
    email: '', phone: '', linkedin: '',
    contact_type: 'general',
    entities_associated: [entity] as string[],
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

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition'
  const lbl = 'block text-xs text-gray-400 mb-1.5'
  const ENTITY_OPTIONS = ['exousia', 'vitalx', 'ironhouse'] as const

  return (
    <Modal
      title="Add Contact"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
            className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
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
        <div><label className={lbl}>Last Contact Date</label><input type="date" className={inp} value={form.last_contact_date} onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))} /></div>
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
                  className="px-3 py-1 text-xs rounded-lg border transition capitalize"
                  style={checked ? { backgroundColor: accentColor + '22', borderColor: accentColor, color: accentColor } : { borderColor: '#374151', color: '#9CA3AF' }}
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

// ── Link Existing Contact Modal ───────────────────────────────────────────────
function LinkContactModal({
  entity, accentColor, existingIds, onClose, onLinked,
}: {
  entity: EntityType
  accentColor: string
  existingIds: string[]
  onClose: () => void
  onLinked: () => void
}) {
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('contacts').select('*').order('last_name')
      setAllContacts(((data ?? []) as Contact[]).filter(c => !existingIds.includes(c.id)))
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = allContacts.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.organization ?? '').toLowerCase().includes(q)
    )
  })

  async function handleLink(contact: Contact) {
    setLinking(contact.id)
    const supabase = createClient()
    const current = contact.entities_associated ?? []
    if (!current.includes(entity)) {
      await supabase
        .from('contacts')
        .update({ entities_associated: [...current, entity] })
        .eq('id', contact.id)
    }
    setLinking(null)
    onLinked()
    onClose()
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none'

  return (
    <Modal title="Link Existing Contact" onClose={onClose} size="md" footer={
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
    }>
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className={inp} placeholder="Search master contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="text-gray-500 text-sm py-4 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 text-center">
            {search ? 'No matches found' : 'All master contacts are already linked'}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-[#374151] rounded-lg border border-[#374151]">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#253347]">
                <div>
                  <div className="text-white text-sm font-medium">{c.first_name} {c.last_name}</div>
                  <div className="text-gray-500 text-xs">{[c.title, c.organization].filter(Boolean).join(' · ')}</div>
                </div>
                <button
                  onClick={() => handleLink(c)}
                  disabled={linking === c.id}
                  className="px-3 py-1 text-xs font-semibold rounded-lg text-[#111827] disabled:opacity-50 transition"
                  style={{ backgroundColor: accentColor }}
                >
                  {linking === c.id ? 'Linking…' : 'Link'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
