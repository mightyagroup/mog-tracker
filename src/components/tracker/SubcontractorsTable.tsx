'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subcontractor, EntityType } from '@/lib/types'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import { Building2, Plus, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface SubcontractorsTableProps {
  entity: EntityType
}

const EMPTY_SUB: Omit<Subcontractor, 'id' | 'created_at' | 'updated_at'> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  uei: '',
  cage_code: '',
  certifications: [],
  naics_codes: [],
  set_asides: [],
  services_offered: '',
  geographic_coverage: '',
  entities_associated: [],
  teaming_agreement_status: 'none',
  teaming_agreement_url: '',
  notes: '',
}

export function SubcontractorsTable({ entity }: SubcontractorsTableProps) {
  const [subs, setSubs] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_SUB, entities_associated: [entity] as EntityType[] })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchSubs()
  }, [entity])

  async function fetchSubs() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('subcontractors')
      .select('*')
      .contains('entities_associated', [entity])
      .order('company_name')
    setSubs(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('subcontractors')
      .insert({
        ...form,
        entities_associated: form.entities_associated,
        certifications: form.certifications,
        naics_codes: form.naics_codes,
        set_asides: form.set_asides,
      })
      .select()
      .single()

    if (!error && data) {
      setSubs(prev => [...prev, data])
      setShowModal(false)
      setForm({ ...EMPTY_SUB, entities_associated: [entity] })
    }
    setSaving(false)
  }

  function handleArrayField(field: 'certifications' | 'naics_codes' | 'set_asides', value: string) {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    setForm(f => ({ ...f, [field]: arr }))
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold text-lg">Subcontractors</h2>
          <p className="text-gray-400 text-sm mt-0.5">{subs.length} partner{subs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#b8952e] text-[#111827] font-semibold text-sm rounded-lg transition"
        >
          <Plus size={16} />
          Add Subcontractor
        </button>
      </div>

      {subs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No subcontractors yet"
          description="Add teaming partners, 8(a) subs, and other contractors you work with."
          action={{ label: 'Add Subcontractor', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {subs.map(sub => (
            <div key={sub.id} className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
              {/* Row header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#253347] transition"
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#374151] flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{sub.company_name}</div>
                    <div className="text-gray-400 text-sm truncate">
                      {sub.contact_name || '—'}{sub.contact_email ? ` · ${sub.contact_email}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {sub.certifications.length > 0 && (
                    <div className="flex gap-1.5">
                      {sub.certifications.slice(0, 3).map(cert => (
                        <span key={cert} className="px-2 py-0.5 rounded text-xs bg-[#2e1065] text-purple-300 font-medium">
                          {cert}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    sub.teaming_agreement_status === 'executed'
                      ? 'bg-[#052e16] text-green-400'
                      : sub.teaming_agreement_status === 'drafting'
                      ? 'bg-[#3b2a1a] text-yellow-300'
                      : 'bg-[#1F2937] text-gray-500'
                  }`}>
                    {sub.teaming_agreement_status === 'executed' ? 'Executed'
                      : sub.teaming_agreement_status === 'drafting' ? 'Drafting'
                      : 'No Agreement'}
                  </span>
                  {expandedId === sub.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === sub.id && (
                <div className="px-5 pb-5 pt-2 border-t border-[#374151] grid grid-cols-2 gap-4 text-sm">
                  <Detail label="UEI" value={sub.uei} />
                  <Detail label="CAGE Code" value={sub.cage_code} />
                  <Detail label="Phone" value={sub.contact_phone} />
                  <Detail label="Geographic Coverage" value={sub.geographic_coverage} />
                  <div className="col-span-2">
                    <Detail label="NAICS Codes" value={sub.naics_codes.join(', ') || null} />
                  </div>
                  <div className="col-span-2">
                    <Detail label="Services Offered" value={sub.services_offered} />
                  </div>
                  <div className="col-span-2">
                    <Detail label="Notes" value={sub.notes} />
                  </div>
                  {sub.website && (
                    <div className="col-span-2">
                      <a href={sub.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm">
                        <ExternalLink size={13} /> {sub.website}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showModal && (
        <Modal
          title="Add Subcontractor"
          onClose={() => setShowModal(false)}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.company_name}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b8952e] disabled:opacity-50 text-[#111827] font-semibold text-sm rounded-lg transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Company Name *" required>
                <input className={inputCls} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Logistics LLC" />
              </FormField>
            </div>
            <FormField label="Contact Name">
              <input className={inputCls} value={form.contact_name ?? ''} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </FormField>
            <FormField label="Contact Email">
              <input type="email" className={inputCls} value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            </FormField>
            <FormField label="Phone">
              <input className={inputCls} value={form.contact_phone ?? ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
            </FormField>
            <FormField label="Website">
              <input type="url" className={inputCls} value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </FormField>
            <FormField label="UEI">
              <input className={inputCls} value={form.uei ?? ''} onChange={e => setForm(f => ({ ...f, uei: e.target.value }))} />
            </FormField>
            <FormField label="CAGE Code">
              <input className={inputCls} value={form.cage_code ?? ''} onChange={e => setForm(f => ({ ...f, cage_code: e.target.value }))} />
            </FormField>
            <FormField label="Certifications (comma-separated)">
              <input className={inputCls} defaultValue={form.certifications.join(', ')} onBlur={e => handleArrayField('certifications', e.target.value)} placeholder="WOSB, 8a, HUBZone" />
            </FormField>
            <FormField label="NAICS Codes (comma-separated)">
              <input className={inputCls} defaultValue={form.naics_codes.join(', ')} onBlur={e => handleArrayField('naics_codes', e.target.value)} placeholder="561720, 561730" />
            </FormField>
            <FormField label="Teaming Agreement Status">
              <select className={inputCls} value={form.teaming_agreement_status} onChange={e => setForm(f => ({ ...f, teaming_agreement_status: e.target.value }))}>
                <option value="none">None</option>
                <option value="drafting">Drafting</option>
                <option value="executed">Executed</option>
              </select>
            </FormField>
            <FormField label="Geographic Coverage">
              <input className={inputCls} value={form.geographic_coverage ?? ''} onChange={e => setForm(f => ({ ...f, geographic_coverage: e.target.value }))} placeholder="DMV, National" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Services Offered">
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.services_offered ?? ''} onChange={e => setForm(f => ({ ...f, services_offered: e.target.value }))} />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Notes">
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </FormField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-gray-500 text-xs mb-0.5">{label}</div>
      <div className="text-gray-200">{value}</div>
    </div>
  )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition'
