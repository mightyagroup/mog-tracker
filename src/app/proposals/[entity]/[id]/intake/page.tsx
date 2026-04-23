'use client'

// Intake wizard — 10 required fields gated before progressing to drafting.
// No skipping. Every proposal must complete intake or sit in "intake" status.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Intake = {
  solicitation_number: string
  agency: string
  submission_deadline: string
  submission_method: string
  submission_portal_url: string
  naics_code: string
  set_aside: string
  place_of_performance: string
  contracting_officer_name: string
  contracting_officer_email: string
  incumbent_contractor: string
  period_of_performance: string
  page_limit: string
  font_requirement: string
  evaluation_factors: string
  technical_volume_required: boolean
  past_performance_count: number
  pricing_format: string
  assigned_va: string
}

const REQUIRED_FIELDS: (keyof Intake)[] = [
  'solicitation_number',
  'agency',
  'submission_deadline',
  'submission_method',
  'naics_code',
  'set_aside',
  'place_of_performance',
  'contracting_officer_email',
  'evaluation_factors',
  'pricing_format',
]

const SUBMISSION_METHODS = [
  'email', 'sam_gov_upload', 'ebuy', 'gsa_eoffer', 'vendor_portal', 'physical_mail', 'in_person',
]

const SET_ASIDES = [
  'wosb', 'edwosb', '8a', 'hubzone', 'sdvosb', 'small_business', 'total_small_business', 'full_and_open', 'sole_source', 'none',
]

const PRICING_FORMATS = [
  'sf1449_clins', 'attachment_b_pricing_sheet', 'narrative_with_totals', 'custom_template', 'hourly_rates_labor_cats',
]

export default function IntakePage() {
  const params = useParams<{ entity: string; id: string }>()
  const router = useRouter()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [form, setForm] = useState<Intake>({
    solicitation_number: '', agency: '', submission_deadline: '', submission_method: '',
    submission_portal_url: '', naics_code: '', set_aside: 'none', place_of_performance: '',
    contracting_officer_name: '', contracting_officer_email: '', incumbent_contractor: '',
    period_of_performance: '', page_limit: '', font_requirement: '',
    evaluation_factors: '', technical_volume_required: false, past_performance_count: 3,
    pricing_format: '', assigned_va: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [intakeComplete, setIntakeComplete] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data, error } = await supa.from('proposals')
        .select('*, gov_leads(title, agency, solicitation_number, naics_code, set_aside, estimated_value, response_deadline, place_of_performance)')
        .eq('id', proposalId)
        .single()
      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }
      // Seed intake from gov_leads if proposal intake fields empty
      const gl = (data as any).gov_leads || {}
      setForm(prev => ({
        ...prev,
        solicitation_number: data.solicitation_number || gl.solicitation_number || '',
        agency: data.agency || gl.agency || '',
        submission_deadline: data.submission_deadline || gl.response_deadline || '',
        submission_method: data.submission_method || '',
        submission_portal_url: data.submission_portal_url || '',
        naics_code: data.naics_code || gl.naics_code || '',
        set_aside: data.set_aside || gl.set_aside || 'none',
        place_of_performance: data.place_of_performance || gl.place_of_performance || '',
        contracting_officer_name: data.contracting_officer_name || '',
        contracting_officer_email: data.contracting_officer_email || '',
        incumbent_contractor: data.incumbent_contractor || '',
        period_of_performance: data.period_of_performance || '',
        page_limit: data.page_limit || '',
        font_requirement: data.font_requirement || '',
        evaluation_factors: data.evaluation_factors || '',
        technical_volume_required: Boolean(data.technical_volume_required),
        past_performance_count: data.past_performance_count ?? 3,
        pricing_format: data.pricing_format || '',
        assigned_va: data.assigned_va || '',
      }))
      setIntakeComplete(Boolean(data.intake_complete))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [proposalId])

  const missing = useMemo(() => {
    return REQUIRED_FIELDS.filter(f => {
      const v = form[f]
      if (typeof v === 'string') return !v.trim()
      if (typeof v === 'number') return Number.isNaN(v)
      return !v
    })
  }, [form])

  const canComplete = missing.length === 0

  async function save(markComplete: boolean) {
    setSaving(true); setError(null); setMsg(null)
    const supa = createClient()
    const payload: any = { ...form }
    if (markComplete) payload.intake_complete = true
    if (markComplete && payload.status === 'intake') payload.status = 'drafting'
    const { error } = await supa.from('proposals').update(payload).eq('id', proposalId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setMsg(markComplete ? 'Intake complete — proposal moved to drafting.' : 'Saved.')
    if (markComplete) setIntakeComplete(true)
  }

  const input = "w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-sm text-white"
  const label = "block text-xs uppercase tracking-wider text-gray-400 mb-1"

  if (loading) return <div className="px-8 py-6 text-white">Loading intake…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Intake — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">All {REQUIRED_FIELDS.length} required fields must be completed before drafting begins.</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Back</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/validate'} className="px-3 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold">Validate →</Link>
        </div>
      </div>

      {intakeComplete && (
        <div className="bg-green-900/30 border border-green-700 text-green-200 p-3 rounded mb-4">Intake complete. You can still edit, but the proposal has moved to drafting.</div>
      )}
      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
      {msg && <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded mb-4">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1F2937] border border-[#374151] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Solicitation Number *</label>
              <input className={input} value={form.solicitation_number} onChange={e => setForm({ ...form, solicitation_number: e.target.value })} />
            </div>
            <div>
              <label className={label}>Agency *</label>
              <input className={input} value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} />
            </div>
            <div>
              <label className={label}>Submission Deadline *</label>
              <input type="datetime-local" className={input} value={form.submission_deadline?.slice(0, 16) || ''} onChange={e => setForm({ ...form, submission_deadline: e.target.value })} />
            </div>
            <div>
              <label className={label}>Submission Method *</label>
              <select className={input} value={form.submission_method} onChange={e => setForm({ ...form, submission_method: e.target.value })}>
                <option value="">Select…</option>
                {SUBMISSION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={label}>Submission Portal / URL</label>
              <input className={input} value={form.submission_portal_url} onChange={e => setForm({ ...form, submission_portal_url: e.target.value })} placeholder="https://sam.gov/… or email address" />
            </div>
            <div>
              <label className={label}>NAICS Code *</label>
              <input className={input} value={form.naics_code} onChange={e => setForm({ ...form, naics_code: e.target.value })} placeholder="e.g. 561720" />
            </div>
            <div>
              <label className={label}>Set-Aside *</label>
              <select className={input} value={form.set_aside} onChange={e => setForm({ ...form, set_aside: e.target.value })}>
                {SET_ASIDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={label}>Place of Performance *</label>
              <input className={input} value={form.place_of_performance} onChange={e => setForm({ ...form, place_of_performance: e.target.value })} placeholder="City, State" />
            </div>
            <div>
              <label className={label}>Contracting Officer Name</label>
              <input className={input} value={form.contracting_officer_name} onChange={e => setForm({ ...form, contracting_officer_name: e.target.value })} />
            </div>
            <div>
              <label className={label}>CO Email *</label>
              <input type="email" className={input} value={form.contracting_officer_email} onChange={e => setForm({ ...form, contracting_officer_email: e.target.value })} />
            </div>
            <div>
              <label className={label}>Incumbent Contractor</label>
              <input className={input} value={form.incumbent_contractor} onChange={e => setForm({ ...form, incumbent_contractor: e.target.value })} />
            </div>
            <div>
              <label className={label}>Period of Performance</label>
              <input className={input} value={form.period_of_performance} onChange={e => setForm({ ...form, period_of_performance: e.target.value })} placeholder="e.g. 12mo base + 4 option years" />
            </div>
            <div>
              <label className={label}>Page Limit</label>
              <input className={input} value={form.page_limit} onChange={e => setForm({ ...form, page_limit: e.target.value })} placeholder="e.g. 25 pages technical" />
            </div>
            <div>
              <label className={label}>Font Requirement</label>
              <input className={input} value={form.font_requirement} onChange={e => setForm({ ...form, font_requirement: e.target.value })} placeholder="e.g. Times New Roman 12pt" />
            </div>
            <div className="col-span-2">
              <label className={label}>Evaluation Factors (Section M) *</label>
              <textarea className={input} rows={3} value={form.evaluation_factors} onChange={e => setForm({ ...form, evaluation_factors: e.target.value })} placeholder="e.g. LPTA, Best Value Trade-off, weighted factors…" />
            </div>
            <div>
              <label className={label}>Pricing Format *</label>
              <select className={input} value={form.pricing_format} onChange={e => setForm({ ...form, pricing_format: e.target.value })}>
                <option value="">Select…</option>
                {PRICING_FORMATS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Past Performance Count</label>
              <input type="number" min={0} max={10} className={input} value={form.past_performance_count} onChange={e => setForm({ ...form, past_performance_count: Number(e.target.value) })} />
            </div>
            <div>
              <label className={label}>Technical Volume Required</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="checkbox" checked={form.technical_volume_required} onChange={e => setForm({ ...form, technical_volume_required: e.target.checked })} />
                <span className="text-sm text-gray-300">Separate technical volume</span>
              </div>
            </div>
            <div>
              <label className={label}>Assigned VA</label>
              <input className={input} value={form.assigned_va} onChange={e => setForm({ ...form, assigned_va: e.target.value })} placeholder="email or initials" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#374151]">
            <button disabled={saving} onClick={() => save(false)} className="px-4 py-2 rounded bg-[#374151] text-white text-sm disabled:opacity-50">Save draft</button>
            <button disabled={saving || !canComplete} onClick={() => save(true)} className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
              {intakeComplete ? 'Save changes' : 'Complete intake → move to drafting'}
            </button>
          </div>
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Required checklist</div>
          <ul className="space-y-2">
            {REQUIRED_FIELDS.map(f => {
              const v = form[f]
              const done = typeof v === 'string' ? v.trim().length > 0 : Boolean(v)
              return (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className={done ? 'text-green-400' : 'text-gray-500'}>{done ? '✓' : '○'}</span>
                  <span className={done ? 'text-gray-300' : 'text-gray-500'}>{f}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 pt-4 border-t border-[#374151] text-xs text-gray-400">
            {canComplete ? 'All required fields complete.' : (missing.length + ' field(s) still required')}
          </div>
        </div>
      </div>
    </div>
  )
}
