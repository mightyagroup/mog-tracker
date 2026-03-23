'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommercialLead, CommercialStatus, Interaction } from '@/lib/types'
import {
  COMMERCIAL_STATUSES, VITALX_COMMERCIAL_CATEGORIES, OUTREACH_METHODS,
} from '@/lib/constants'
import { CommercialStatusBadge } from './CommercialStatusBadge'
import { formatFullCurrency } from '@/lib/utils'
import { X, Edit2, Save, ChevronDown, MessageSquare, Plus, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface CommercialDetailPanelProps {
  lead: CommercialLead
  accentColor?: string
  onClose: () => void
  onUpdate: (lead: CommercialLead) => void
}

export function CommercialDetailPanel({
  lead, accentColor = '#06A59A', onClose, onUpdate,
}: CommercialDetailPanelProps) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Partial<CommercialLead>>({ ...lead })
  const [saving, setSaving] = useState(false)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [section, setSection] = useState<'info' | 'outreach' | 'notes'>('info')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setForm({ ...lead })
    setEditMode(false)
    loadInteractions()
  }, [lead.id])

  async function loadInteractions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('commercial_lead_id', lead.id)
      .order('interaction_date', { ascending: false })
      .limit(20)
    setInteractions(data ?? [])
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('commercial_leads')
      .update({
        organization_name: form.organization_name,
        contact_name: form.contact_name,
        contact_title: form.contact_title,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        website: form.website,
        status: form.status,
        service_category: form.service_category,
        estimated_annual_value: form.estimated_annual_value,
        contract_length_months: form.contract_length_months,
        last_contact_date: form.last_contact_date,
        next_follow_up: form.next_follow_up,
        outreach_method: form.outreach_method,
        contract_start_date: form.contract_start_date,
        contract_end_date: form.contract_end_date,
        contract_value: form.contract_value,
        proposal_url: form.proposal_url,
        drive_folder_url: form.drive_folder_url,
        notes: form.notes,
      })
      .eq('id', lead.id)
      .select()
      .single()
    if (!error && data) { onUpdate(data as CommercialLead); setEditMode(false) }
    setSaving(false)
  }

  async function handleStatusChange(newStatus: CommercialStatus) {
    const supabase = createClient()
    const { data } = await supabase
      .from('commercial_leads')
      .update({ status: newStatus })
      .eq('id', lead.id)
      .select()
      .single()
    if (data) { onUpdate(data as CommercialLead); setForm(f => ({ ...f, status: newStatus })) }
  }

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('interactions')
      .insert({
        entity: lead.entity,
        commercial_lead_id: lead.id,
        interaction_type: 'note',
        subject: 'Note',
        notes: newNote.trim(),
        interaction_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()
    if (data) { setInteractions(prev => [data, ...prev]); setNewNote('') }
    setAddingNote(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#1A2233] border-l border-[#374151] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#374151] flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {editMode ? (
              <input className={inp} value={form.organization_name ?? ''} onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))} />
            ) : (
              <h2 className="text-white font-semibold text-base">{lead.organization_name}</h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <StatusDropdown status={(form.status ?? lead.status) as CommercialStatus} onChange={handleStatusChange} accentColor={accentColor} />
              {lead.service_category && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: accentColor + '22', color: accentColor }}>
                  {lead.service_category}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editMode ? (
              <>
                <button onClick={() => { setEditMode(false); setForm({ ...lead }) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#111827] transition" style={{ backgroundColor: accentColor }}>
                  <Save size={13} />{saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#374151] rounded-lg transition">
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#374151]"><X size={18} /></button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-[#374151] px-2 flex-shrink-0">
          {(['info', 'outreach', 'notes'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`px-4 py-3 text-sm border-b-2 -mb-px capitalize transition ${section === s ? 'text-white border-current' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
              style={section === s ? { color: accentColor, borderColor: accentColor } : {}}
            >
              {s === 'notes' ? `Notes (${interactions.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {section === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <EField label="Contact Name" value={form.contact_name} editMode={editMode} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
                <EField label="Title" value={form.contact_title} editMode={editMode} onChange={v => setForm(f => ({ ...f, contact_title: v }))} />
                <EField label="Email" value={form.contact_email} editMode={editMode} type="email" onChange={v => setForm(f => ({ ...f, contact_email: v }))} />
                <EField label="Phone" value={form.contact_phone} editMode={editMode} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} />
                <EField label="Website" value={form.website} editMode={editMode} type="url" onChange={v => setForm(f => ({ ...f, website: v }))} />
              </div>

              {editMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Service Category</label>
                    <select className={inp} value={form.service_category ?? ''} onChange={e => setForm(f => ({ ...f, service_category: e.target.value }))}>
                      <option value="">— None —</option>
                      {VITALX_COMMERCIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <Divider label="Deal Info" />
              <div className="grid grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <EField label="Est. Annual Value ($)" value={form.estimated_annual_value?.toString()} editMode type="number" onChange={v => setForm(f => ({ ...f, estimated_annual_value: v ? parseFloat(v) : null }))} />
                    <EField label="Contract Length (months)" value={form.contract_length_months?.toString()} editMode type="number" onChange={v => setForm(f => ({ ...f, contract_length_months: v ? parseInt(v) : null }))} />
                  </>
                ) : (
                  <>
                    <IRow label="Est. Annual Value" value={formatFullCurrency(lead.estimated_annual_value)} />
                    <IRow label="Contract Length" value={lead.contract_length_months ? `${lead.contract_length_months} months` : null} />
                  </>
                )}
              </div>

              {(lead.status === 'contract' || editMode) && (
                <>
                  <Divider label="Contract Details" />
                  <div className="grid grid-cols-2 gap-4">
                    <EField label="Contract Start" value={form.contract_start_date} editMode={editMode} type="date" onChange={v => setForm(f => ({ ...f, contract_start_date: v }))} />
                    <EField label="Contract End" value={form.contract_end_date} editMode={editMode} type="date" onChange={v => setForm(f => ({ ...f, contract_end_date: v }))} />
                    {editMode ? (
                      <EField label="Contract Value ($)" value={form.contract_value?.toString()} editMode type="number" onChange={v => setForm(f => ({ ...f, contract_value: v ? parseFloat(v) : null }))} />
                    ) : (
                      <IRow label="Contract Value" value={formatFullCurrency(lead.contract_value)} />
                    )}
                  </div>
                </>
              )}

              <Divider label="Links" />
              {editMode ? (
                <div className="space-y-2">
                  <EField label="Proposal URL" value={form.proposal_url} editMode type="url" onChange={v => setForm(f => ({ ...f, proposal_url: v }))} />
                  <EField label="Drive Folder URL" value={form.drive_folder_url} editMode type="url" onChange={v => setForm(f => ({ ...f, drive_folder_url: v }))} />
                </div>
              ) : (
                <div className="flex gap-3">
                  {lead.proposal_url && <LinkBtn href={lead.proposal_url} label="Proposal" />}
                  {lead.drive_folder_url && <LinkBtn href={lead.drive_folder_url} label="Drive Folder" />}
                  {lead.website && <LinkBtn href={lead.website} label="Website" />}
                  {!lead.proposal_url && !lead.drive_folder_url && !lead.website && <span className="text-gray-600 text-sm">No links added</span>}
                </div>
              )}
            </div>
          )}

          {section === 'outreach' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <EField label="Last Contact Date" value={form.last_contact_date} editMode type="date" onChange={v => setForm(f => ({ ...f, last_contact_date: v }))} />
                    <EField label="Next Follow-Up" value={form.next_follow_up} editMode type="date" onChange={v => setForm(f => ({ ...f, next_follow_up: v }))} />
                    <div>
                      <label className={lbl}>Outreach Method</label>
                      <select className={inp} value={form.outreach_method ?? ''} onChange={e => setForm(f => ({ ...f, outreach_method: e.target.value }))}>
                        <option value="">— Select —</option>
                        {OUTREACH_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <IRow label="Last Contact" value={lead.last_contact_date ? format(parseISO(lead.last_contact_date), 'MMM d, yyyy') : null} />
                    <div>
                      <div className={lbl}>Next Follow-Up</div>
                      {lead.next_follow_up ? (
                        <div className="text-sm" style={{ color: accentColor }}>{format(parseISO(lead.next_follow_up), 'MMM d, yyyy')}</div>
                      ) : <div className="text-gray-500 text-sm">Not set</div>}
                    </div>
                    <IRow label="Method" value={lead.outreach_method} />
                  </>
                )}
              </div>
            </div>
          )}

          {section === 'notes' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <textarea
                  className={`${inp} resize-none flex-1`}
                  rows={2}
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                />
                <button
                  onClick={addNote}
                  disabled={addingNote || !newNote.trim()}
                  className="px-3 py-2 rounded-lg text-[#111827] font-semibold text-sm disabled:opacity-50 flex-shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={16} />
                </button>
              </div>
              {editMode && (
                <div>
                  <label className={lbl}>General Notes</label>
                  <textarea className={`${inp} resize-none`} rows={4} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              )}
              {!editMode && lead.notes && (
                <div className="bg-[#1F2937] rounded-lg border border-[#374151] p-3">
                  <div className={lbl}>General Notes</div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
              {interactions.length === 0 && !lead.notes ? (
                <div className="text-center py-8 text-gray-500 text-sm">No notes yet.</div>
              ) : (
                <div className="space-y-3">
                  {interactions.map(i => (
                    <div key={i.id} className="bg-[#1F2937] rounded-lg border border-[#374151] px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={12} className="text-gray-500" />
                        <span className="text-gray-500 text-xs">{i.interaction_date}</span>
                      </div>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{i.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusDropdown({ status, onChange }: { status: CommercialStatus; onChange: (s: CommercialStatus) => void; accentColor: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
        <CommercialStatusBadge status={status} />
        <ChevronDown size={12} className="text-gray-500" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-[#1F2937] border border-[#374151] rounded-lg shadow-xl py-1 min-w-36">
          {COMMERCIAL_STATUSES.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false) }} className="block w-full text-left px-3 py-1.5 hover:bg-[#374151]">
              <CommercialStatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EField({ label, value, editMode, onChange, type = 'text' }: { label: string; value?: string | null; editMode: boolean; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {editMode ? (
        <input type={type} className={inp} value={value ?? ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <div className="text-gray-200 text-sm">{value || '—'}</div>
      )}
    </div>
  )
}

function IRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className={lbl}>{label}</div>
      <div className="text-gray-200 text-sm">{value || '—'}</div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">{label}</div>
}

function LinkBtn({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] rounded-lg text-sm text-gray-300 hover:text-white transition">
      <ExternalLink size={12} />{label}
    </a>
  )
}

const lbl = 'block text-xs text-gray-500 mb-1'
const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#06A59A] transition'
