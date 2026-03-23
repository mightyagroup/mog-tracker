'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GovLead, EntityType, ServiceCategory, LeadStatus, SourceType, SetAsideType, ContractType } from '@/lib/types'
import {
  LEAD_STATUSES, STATUS_LABELS, SET_ASIDE_LABELS, SOURCE_LABELS, CONTRACT_TYPE_LABELS,
} from '@/lib/constants'
import { calculateFitScore, isLowFit } from '@/lib/utils'
import { Modal } from '@/components/common/Modal'
import { FitScoreBadge } from '@/components/tracker/FitScoreBadge'

interface AddLeadModalProps {
  entity: EntityType
  categories: ServiceCategory[]
  onClose: () => void
  onSave: (lead: GovLead) => void
  defaultProposalLead?: string
}

type FormState = {
  title: string
  solicitation_number: string
  notice_id: string
  status: LeadStatus
  source: SourceType
  agency: string
  sub_agency: string
  office: string
  naics_code: string
  set_aside: SetAsideType
  contract_type: ContractType | ''
  service_category_id: string
  estimated_value: string
  response_deadline: string
  posted_date: string
  place_of_performance: string
  proposal_lead: string
  sam_gov_url: string
  solicitation_url: string
  drive_folder_url: string
  description: string
  notes: string
  bid_decision_notes: string
  incumbent_contractor: string
  previous_award_total: string
}

const INIT: FormState = {
  title: '', solicitation_number: '', notice_id: '',
  status: 'new', source: 'manual',
  agency: '', sub_agency: '', office: '',
  naics_code: '', set_aside: 'none', contract_type: '',
  service_category_id: '',
  estimated_value: '', response_deadline: '', posted_date: '',
  place_of_performance: '', proposal_lead: '',
  sam_gov_url: '', solicitation_url: '', drive_folder_url: '',
  description: '', notes: '', bid_decision_notes: '',
  incumbent_contractor: '', previous_award_total: '',
}

export function AddLeadModal({ entity, categories, onClose, onSave, defaultProposalLead }: AddLeadModalProps) {
  const [form, setForm] = useState<FormState>({ ...INIT, proposal_lead: defaultProposalLead ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const previewPartial = {
    naics_code: form.naics_code || undefined,
    set_aside: form.set_aside,
    estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
    place_of_performance: form.place_of_performance || undefined,
    response_deadline: form.response_deadline || undefined,
  }
  const previewScore = calculateFitScore(previewPartial, entity)
  const previewLowFit = isLowFit(previewPartial, entity)

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      entity,
      title: form.title.trim(),
      solicitation_number: form.solicitation_number || null,
      notice_id: form.notice_id || null,
      status: form.status,
      source: form.source,
      agency: form.agency || null,
      sub_agency: form.sub_agency || null,
      office: form.office || null,
      naics_code: form.naics_code || null,
      set_aside: form.set_aside,
      contract_type: form.contract_type || null,
      service_category_id: form.service_category_id || null,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      response_deadline: form.response_deadline || null,
      posted_date: form.posted_date || null,
      place_of_performance: form.place_of_performance || null,
      proposal_lead: form.proposal_lead || null,
      sam_gov_url: form.sam_gov_url || null,
      solicitation_url: form.solicitation_url || null,
      drive_folder_url: form.drive_folder_url || null,
      description: form.description || null,
      notes: form.notes || null,
      bid_decision_notes: form.bid_decision_notes || null,
      incumbent_contractor: form.incumbent_contractor || null,
      previous_award_total: form.previous_award_total ? parseFloat(form.previous_award_total) : null,
      fit_score: previewScore,
    }

    const { data, error: err } = await supabase.from('gov_leads').insert(payload).select(`*, service_category:service_categories(*)`).single()
    if (err) { setError(err.message); setSaving(false); return }
    onSave(data as GovLead)
  }

  return (
    <Modal
      title="Add New Lead"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b8952e] disabled:opacity-50 text-[#111827] font-semibold text-sm rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Save Lead'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="space-y-6">
        {/* Fit score preview */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${previewLowFit ? 'bg-[#1c1008] border-amber-900/60' : 'bg-[#111827] border-[#374151]'}`}>
          <span className="text-gray-400 text-sm">Fit Score Preview:</span>
          <FitScoreBadge score={previewScore} />
          {previewLowFit ? (
            <span className="text-amber-400 text-xs font-medium">⚠ Low fit — meets fewer than 2 quality criteria. Will be hidden by default.</span>
          ) : (
            <span className="text-gray-500 text-xs">NAICS · set-aside · value · location · deadline</span>
          )}
        </div>

        {/* Basic */}
        <Section title="Opportunity">
          <div className="col-span-2">
            <Field label="Title *">
              <input autoFocus className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g., Janitorial Services at USDA HQ" />
            </Field>
          </div>
          <Field label="Status">
            <select className={inp} value={form.status} onChange={e => set('status', e.target.value as LeadStatus)}>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select className={inp} value={form.source} onChange={e => set('source', e.target.value as SourceType)}>
              {(Object.keys(SOURCE_LABELS) as SourceType[]).map(s => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Solicitation Number">
            <input className={inp} value={form.solicitation_number} onChange={e => set('solicitation_number', e.target.value)} placeholder="e.g., 36C24623R0014" />
          </Field>
          <Field label="Notice ID">
            <input className={inp} value={form.notice_id} onChange={e => set('notice_id', e.target.value)} />
          </Field>
        </Section>

        {/* Agency */}
        <Section title="Agency">
          <Field label="Agency">
            <input className={inp} value={form.agency} onChange={e => set('agency', e.target.value)} placeholder="e.g., Department of Veterans Affairs" />
          </Field>
          <Field label="Sub-Agency">
            <input className={inp} value={form.sub_agency} onChange={e => set('sub_agency', e.target.value)} />
          </Field>
          <Field label="Office">
            <input className={inp} value={form.office} onChange={e => set('office', e.target.value)} />
          </Field>
          <Field label="Place of Performance">
            <input className={inp} value={form.place_of_performance} onChange={e => set('place_of_performance', e.target.value)} placeholder="e.g., Washington, DC" />
          </Field>
        </Section>

        {/* Classification */}
        <Section title="Classification">
          <Field label="NAICS Code">
            <input className={inp} value={form.naics_code} onChange={e => set('naics_code', e.target.value)} placeholder="e.g., 561720" />
          </Field>
          <Field label="Set-Aside">
            <select className={inp} value={form.set_aside} onChange={e => set('set_aside', e.target.value as SetAsideType)}>
              {(Object.keys(SET_ASIDE_LABELS) as SetAsideType[]).map(s => (
                <option key={s} value={s}>{SET_ASIDE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Contract Type">
            <select className={inp} value={form.contract_type} onChange={e => set('contract_type', e.target.value as ContractType | '')}>
              <option value="">— Select —</option>
              {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map(c => (
                <option key={c} value={c}>{CONTRACT_TYPE_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="Service Category">
            <select className={inp} value={form.service_category_id} onChange={e => set('service_category_id', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </Section>

        {/* Dates & Financials */}
        <Section title="Dates & Financials">
          <Field label="Posted Date">
            <input type="date" className={inp} value={form.posted_date} onChange={e => set('posted_date', e.target.value)} />
          </Field>
          <Field label="Response Deadline">
            <input type="datetime-local" className={inp} value={form.response_deadline} onChange={e => set('response_deadline', e.target.value)} />
          </Field>
          <Field label="Estimated Value ($)">
            <input type="number" className={inp} value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} placeholder="250000" />
          </Field>
          <Field label="Proposal Lead">
            <input className={inp} value={form.proposal_lead} onChange={e => set('proposal_lead', e.target.value)} />
          </Field>
        </Section>

        {/* Intelligence */}
        <Section title="Incumbent Intelligence">
          <Field label="Incumbent Contractor">
            <input className={inp} value={form.incumbent_contractor} onChange={e => set('incumbent_contractor', e.target.value)} />
          </Field>
          <Field label="Previous Award Total ($)">
            <input type="number" className={inp} value={form.previous_award_total} onChange={e => set('previous_award_total', e.target.value)} />
          </Field>
        </Section>

        {/* Links */}
        <Section title="Links">
          <Field label="SAM.gov URL">
            <input type="url" className={inp} value={form.sam_gov_url} onChange={e => set('sam_gov_url', e.target.value)} placeholder="https://sam.gov/opp/..." />
          </Field>
          <Field label="Solicitation URL">
            <input type="url" className={inp} value={form.solicitation_url} onChange={e => set('solicitation_url', e.target.value)} />
          </Field>
          <Field label="Drive Folder URL">
            <input type="url" className={inp} value={form.drive_folder_url} onChange={e => set('drive_folder_url', e.target.value)} />
          </Field>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <div className="col-span-2">
            <Field label="Notes">
              <textarea className={inp + ' resize-none'} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Description">
              <textarea className={inp + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </Field>
          </div>
        </Section>
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent transition'
