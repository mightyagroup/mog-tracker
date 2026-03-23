'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityType, ServiceCategory } from '@/lib/types'
import { AddLeadModal } from '@/components/tracker/AddLeadModal'
import { Modal } from '@/components/common/Modal'
import { Plus, ChevronDown, Check } from 'lucide-react'

const ENTITY_CONFIG: Record<EntityType, { label: string; accent: string; defaultLead?: string }> = {
  exousia:   { label: 'Exousia Solutions', accent: '#D4AF37' },
  vitalx:    { label: 'VitalX',            accent: '#06A59A' },
  ironhouse: { label: 'IronHouse',         accent: '#B45309', defaultLead: 'Nana Badu' },
}

const CONTACT_TYPES = [
  'general', 'prospect', 'partner', 'contracting_officer', 'mentor', 'vendor', 'subcontractor',
]
const CONTACT_TYPE_LABELS: Record<string, string> = {
  general: 'General', prospect: 'Prospect', partner: 'Partner',
  contracting_officer: 'Contracting Officer', mentor: 'Mentor',
  vendor: 'Vendor', subcontractor: 'Subcontractor',
}

export function QuickActionsBar() {
  const [entityPickerOpen, setEntityPickerOpen] = useState(false)
  const [addLeadEntity, setAddLeadEntity] = useState<EntityType | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddSub, setShowAddSub] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  async function openAddLead(entity: EntityType) {
    const supabase = createClient()
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .eq('entity', entity)
      .order('sort_order')
    setCategories((data ?? []) as ServiceCategory[])
    setAddLeadEntity(entity)
    setEntityPickerOpen(false)
  }

  function flash(msg: string) {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(null), 3000)
  }

  const btnBase = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition'

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-gray-500 text-xs font-medium">Quick Add:</span>

        {/* Add Lead with entity picker */}
        <div className="relative">
          <button
            onClick={() => setEntityPickerOpen(v => !v)}
            className={`${btnBase} text-[#111827] bg-[#D4AF37] hover:opacity-90`}
          >
            <Plus size={12} />
            Add Lead
            <ChevronDown size={11} />
          </button>
          {entityPickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setEntityPickerOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-[#1F2937] border border-[#374151] rounded-lg shadow-2xl overflow-hidden min-w-44">
                {(Object.keys(ENTITY_CONFIG) as EntityType[]).map(e => (
                  <button
                    key={e}
                    onClick={() => openAddLead(e)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#374151] hover:text-white transition flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ENTITY_CONFIG[e].accent }}
                    />
                    {ENTITY_CONFIG[e].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add Contact */}
        <button
          onClick={() => setShowAddContact(true)}
          className={`${btnBase} border border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]`}
        >
          <Plus size={12} />
          Add Contact
        </button>

        {/* Add Subcontractor */}
        <button
          onClick={() => setShowAddSub(true)}
          className={`${btnBase} border border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]`}
        >
          <Plus size={12} />
          Add Subcontractor
        </button>

        {savedMsg && (
          <span className="flex items-center gap-1 text-xs text-green-400 font-medium ml-1">
            <Check size={12} />
            {savedMsg}
          </span>
        )}
      </div>

      {addLeadEntity && (
        <AddLeadModal
          entity={addLeadEntity}
          categories={categories}
          onClose={() => setAddLeadEntity(null)}
          onSave={() => { setAddLeadEntity(null); flash('Lead added') }}
          defaultProposalLead={ENTITY_CONFIG[addLeadEntity].defaultLead}
        />
      )}

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onSave={() => { setShowAddContact(false); flash('Contact added') }}
        />
      )}

      {showAddSub && (
        <AddSubcontractorModal
          onClose={() => setShowAddSub(false)}
          onSave={() => { setShowAddSub(false); flash('Subcontractor added') }}
        />
      )}
    </>
  )
}

// ── Inline Add Contact Modal ──────────────────────────────────────────────────
function AddContactModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', title: '', organization: '',
    email: '', phone: '', contact_type: 'general',
    entities_associated: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('contacts').insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      title: form.title || null,
      organization: form.organization || null,
      email: form.email || null,
      phone: form.phone || null,
      contact_type: form.contact_type,
      entities_associated: form.entities_associated,
    })
    setSaving(false)
    onSave()
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none'
  const lbl = 'block text-xs text-gray-400 mb-1.5'
  const ENTITY_OPTIONS = ['exousia', 'vitalx', 'ironhouse'] as const

  return (
    <Modal title="Add Contact" onClose={onClose} size="md" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
          className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] bg-[#D4AF37] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Contact'}
        </button>
      </>
    }>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>First Name *</label><input autoFocus className={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
        <div><label className={lbl}>Last Name *</label><input className={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
        <div><label className={lbl}>Title</label><input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label className={lbl}>Organization</label><input className={inp} value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} /></div>
        <div><label className={lbl}>Email</label><input type="email" className={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><label className={lbl}>Phone</label><input className={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div className="col-span-2">
          <label className={lbl}>Type</label>
          <select className={inp} value={form.contact_type} onChange={e => setForm(f => ({ ...f, contact_type: e.target.value }))}>
            {CONTACT_TYPES.map(t => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={lbl}>Associate with Entities</label>
          <div className="flex gap-2 flex-wrap">
            {ENTITY_OPTIONS.map(e => {
              const checked = form.entities_associated.includes(e)
              return (
                <button key={e} type="button"
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
      </div>
    </Modal>
  )
}

// ── Inline Add Subcontractor Modal ────────────────────────────────────────────
function AddSubcontractorModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', contact_email: '', contact_phone: '',
    services_offered: '', geographic_coverage: '',
    entities_associated: [] as string[],
    certifications: '',
    teaming_agreement_status: 'none',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.company_name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('subcontractors').insert({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      services_offered: form.services_offered || null,
      geographic_coverage: form.geographic_coverage || null,
      entities_associated: form.entities_associated,
      certifications: form.certifications ? form.certifications.split(',').map(s => s.trim()).filter(Boolean) : [],
      naics_codes: [],
      set_asides: [],
      teaming_agreement_status: form.teaming_agreement_status,
      notes: form.notes || null,
    })
    setSaving(false)
    onSave()
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none'
  const lbl = 'block text-xs text-gray-400 mb-1.5'
  const ENTITY_OPTIONS = ['exousia', 'vitalx', 'ironhouse'] as const

  return (
    <Modal title="Add Subcontractor" onClose={onClose} size="md" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || !form.company_name.trim()}
          className="px-5 py-2 font-semibold text-sm rounded-lg text-[#111827] bg-[#D4AF37] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Subcontractor'}
        </button>
      </>
    }>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className={lbl}>Company Name *</label><input autoFocus className={inp} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
        <div><label className={lbl}>Contact Name</label><input className={inp} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
        <div><label className={lbl}>Contact Email</label><input type="email" className={inp} value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
        <div><label className={lbl}>Contact Phone</label><input className={inp} value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
        <div>
          <label className={lbl}>Teaming Agreement</label>
          <select className={inp} value={form.teaming_agreement_status} onChange={e => setForm(f => ({ ...f, teaming_agreement_status: e.target.value }))}>
            <option value="none">None</option>
            <option value="drafting">Drafting</option>
            <option value="executed">Executed</option>
          </select>
        </div>
        <div className="col-span-2"><label className={lbl}>Services Offered</label><input className={inp} value={form.services_offered} onChange={e => setForm(f => ({ ...f, services_offered: e.target.value }))} placeholder="e.g., Janitorial, landscaping" /></div>
        <div><label className={lbl}>Geographic Coverage</label><input className={inp} value={form.geographic_coverage} onChange={e => setForm(f => ({ ...f, geographic_coverage: e.target.value }))} /></div>
        <div><label className={lbl}>Certifications (comma-sep)</label><input className={inp} value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} placeholder="WOSB, 8a, HUBZone" /></div>
        <div className="col-span-2">
          <label className={lbl}>Associated Entities</label>
          <div className="flex gap-2 flex-wrap">
            {ENTITY_OPTIONS.map(e => {
              const checked = form.entities_associated.includes(e)
              return (
                <button key={e} type="button"
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
        <div className="col-span-2"><label className={lbl}>Notes</label><textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}
