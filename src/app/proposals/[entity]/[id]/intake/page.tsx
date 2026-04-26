'use client'

// Intake wizard — required fields gated before progressing to drafting.
// No skipping. Every proposal must complete intake or sit in "intake" status.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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

type Bag = Record<string, unknown>
const s = (v: unknown): string => (typeof v === 'string' ? v : '')
const b = (v: unknown): boolean => Boolean(v)
const n = (v: unknown, d: number): number => (typeof v === 'number' ? v : d)

export default function IntakePage() {
  const params = useParams<{ entity: string; id: string }>()
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

  // Bid Starter generation state
  type GenResult = {
    ok?: boolean
    folder_name?: string
    folder_url?: string
    docs_generated?: string[]
    errors?: Array<{ template: string; error: string }>
    sub_count?: number
    error?: string
    detail?: string
    missing?: string[]
    hint?: string
  }
  const [bidStarterRunning, setBidStarterRunning] = useState(false)
  const [bidStarterResult, setBidStarterResult] = useState<GenResult | null>(null)
  const [keyServiceLocation, setKeyServiceLocation] = useState('')
  const [agencyShort, setAgencyShort] = useState('')

  async function generateBidStarter(regenerate = false) {
    setBidStarterRunning(true)
    setBidStarterResult(null)
    try {
      const r = await fetch('/api/proposals/' + proposalId + '/generate-bid-starter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerate,
          key_service_location: keyServiceLocation || undefined,
          agency_short: agencyShort || undefined,
        }),
      })
      const j: GenResult = await r.json()
      setBidStarterResult(j)
    } catch (err) {
      setBidStarterResult({ error: 'network_error', detail: (err as Error).message })
    } finally {
      setBidStarterRunning(false)
    }
  }

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
      const d = (data as unknown) as Bag
      const gl = ((d.gov_leads as Bag) || {}) as Bag
      setForm({
        solicitation_number: s(d.solicitation_number) || s(gl.solicitation_number),
        agency: s(d.agency) || s(gl.agency),
        submission_deadline: s(d.submission_deadline) || s(gl.response_deadline),
        submission_method: s(d.submission_method),
        submission_portal_url: s(d.submission_portal_url),
        naics_code: s(d.naics_code) || s(gl.naics_code),
        set_aside: s(d.set_aside) || s(gl.set_aside) || 'none',
        place_of_performance: s(d.place_of_performance) || s(gl.place_of_performance),
        contracting_officer_name: s(d.contracting_officer_name),
        contracting_officer_email: s(d.contracting_officer_email),
        incumbent_contractor: s(d.incumbent_contractor),
        period_of_performance: s(d.period_of_performance),
        page_limit: s(d.page_limit),
        font_requirement: s(d.font_requirement),
        evaluation_factors: s(d.evaluation_factors),
        technical_volume_required: b(d.technical_volume_required),
        past_performance_count: n(d.past_performance_count, 3),
        pricing_format: s(d.pricing_format),
        assigned_va: s(d.assigned_va),
      })
      setIntakeComplete(b(d.intake_complete))
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
    const payload: Record<string, unknown> = { ...form }
    if (markComplete) {
      payload.intake_complete = true
      payload.status = 'drafting'
    }
    const { error } = await supa.from('proposals').update(payload).eq('id', proposalId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setMsg(markComplete ? 'Intake complete. Proposal moved to drafting.' : 'Saved.')
    if (markComplete) setIntakeComplete(true)
  }

  const inputCls = "w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-sm text-white"
  const labelCls = "block text-xs uppercase tracking-wider text-gray-400 mb-1"

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
              <label className={labelCls}>Solicitation Number *</label>
              <input className={inputCls} value={form.solicitation_number} onChange={e => setForm({ ...form, solicitation_number: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Agency *</label>
              <input className={inputCls} value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Submission Deadline *</label>
              <input type="datetime-local" className={inputCls} value={form.submission_deadline?.slice(0, 16) || ''} onChange={e => setForm({ ...form, submission_deadline: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Submission Method *</label>
              <select className={inputCls} value={form.submission_method} onChange={e => setForm({ ...form, submission_method: e.target.value })}>
                <option value="">Select…</option>
                {SUBMISSION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Submission Portal / URL</label>
              <input className={inputCls} value={form.submission_portal_url} onChange={e => setForm({ ...form, submission_portal_url: e.target.value })} placeholder="https://sam.gov/… or email address" />
            </div>
            <div>
              <label className={labelCls}>NAICS Code *</label>
              <input className={inputCls} value={form.naics_code} onChange={e => setForm({ ...form, naics_code: e.target.value })} placeholder="e.g. 561720" />
            </div>
            <div>
              <label className={labelCls}>Set-Aside *</label>
              <select className={inputCls} value={form.set_aside} onChange={e => setForm({ ...form, set_aside: e.target.value })}>
                {SET_ASIDES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Place of Performance *</label>
              <input className={inputCls} value={form.place_of_performance} onChange={e => setForm({ ...form, place_of_performance: e.target.value })} placeholder="City, State" />
            </div>
            <div>
              <label className={labelCls}>Contracting Officer Name</label>
              <input className={inputCls} value={form.contracting_officer_name} onChange={e => setForm({ ...form, contracting_officer_name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>CO Email *</label>
              <input type="email" className={inputCls} value={form.contracting_officer_email} onChange={e => setForm({ ...form, contracting_officer_email: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Incumbent Contractor</label>
              <input className={inputCls} value={form.incumbent_contractor} onChange={e => setForm({ ...form, incumbent_contractor: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Period of Performance</label>
              <input className={inputCls} value={form.period_of_performance} onChange={e => setForm({ ...form, period_of_performance: e.target.value })} placeholder="e.g. 12mo base + 4 option years" />
            </div>
            <div>
              <label className={labelCls}>Page Limit</label>
              <input className={inputCls} value={form.page_limit} onChange={e => setForm({ ...form, page_limit: e.target.value })} placeholder="e.g. 25 pages technical" />
            </div>
            <div>
              <label className={labelCls}>Font Requirement</label>
              <input className={inputCls} value={form.font_requirement} onChange={e => setForm({ ...form, font_requirement: e.target.value })} placeholder="e.g. Times New Roman 12pt" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Evaluation Factors (Section M) *</label>
              <textarea className={inputCls} rows={3} value={form.evaluation_factors} onChange={e => setForm({ ...form, evaluation_factors: e.target.value })} placeholder="e.g. LPTA, Best Value Trade-off, weighted factors…" />
            </div>
            <div>
              <label className={labelCls}>Pricing Format *</label>
              <select className={inputCls} value={form.pricing_format} onChange={e => setForm({ ...form, pricing_format: e.target.value })}>
                <option value="">Select…</option>
                {PRICING_FORMATS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Past Performance Count</label>
              <input type="number" min={0} max={10} className={inputCls} value={form.past_performance_count} onChange={e => setForm({ ...form, past_performance_count: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Technical Volume Required</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="checkbox" checked={form.technical_volume_required} onChange={e => setForm({ ...form, technical_volume_required: e.target.checked })} />
                <span className="text-sm text-gray-300">Separate technical volume</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Assigned VA</label>
              <input className={inputCls} value={form.assigned_va} onChange={e => setForm({ ...form, assigned_va: e.target.value })} placeholder="email or initials" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#374151]">
            <button disabled={saving} onClick={() => save(false)} className="px-4 py-2 rounded bg-[#374151] text-white text-sm disabled:opacity-50">Save draft</button>
            <button disabled={saving || !canComplete} onClick={() => save(true)} className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
              {intakeComplete ? 'Save changes' : 'Complete intake'}
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

      {/* ─── Bid Starter Package Generator ──────────────────────────────── */}
      <div className="mt-8 bg-[#1F2937] border border-[#374151] rounded-xl p-5">
        <div className="flex items-start justify-between mb-3 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Bid Starter Package</h2>
            <p className="text-xs text-gray-400 mt-1">Auto-generates 14 documents in a Drive folder: Contract Intel, USASpending Deep Dive, Wage Determination, Pricing (4a), Technical (4b), Sub-Facing SOW (sanitized), Sub Outreach Email (sanitized), Subcontractor Search, Tracker Workbook, To-Do List, Risk Log, Contract Summary, Game Plan, Submission Checklist.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelCls}>Key Service Location (override)</label>
            <input className={inputCls} value={keyServiceLocation} onChange={e => setKeyServiceLocation(e.target.value)} placeholder="e.g. MowingToronto, WarrenBridgeCleaning" />
          </div>
          <div>
            <label className={labelCls}>Agency Short (override)</label>
            <input className={inputCls} value={agencyShort} onChange={e => setAgencyShort(e.target.value)} placeholder="e.g. DOD, USACE, DOI" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">Leave blank to auto-derive from the parsed solicitation. Folder name pattern: [KSL]-[Agency]-[Sol#].</p>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={bidStarterRunning}
            onClick={() => generateBidStarter(false)}
            className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50"
          >
            {bidStarterRunning ? 'Generating… (1-3 min)' : 'Generate Bid Starter Package'}
          </button>
          <button
            disabled={bidStarterRunning}
            onClick={() => generateBidStarter(true)}
            className="px-4 py-2 rounded bg-[#374151] text-white text-sm border border-[#4B5563] disabled:opacity-50"
            title="Force regenerate even if a folder already exists"
          >
            Regenerate
          </button>
        </div>

        {bidStarterRunning && (
          <div className="mt-4 bg-blue-900/20 border border-blue-800/40 text-blue-200 p-3 rounded text-sm">
            Parsing solicitation, searching subs, generating 14 documents, uploading to Drive… this takes 1–3 minutes.
          </div>
        )}

        {bidStarterResult && (
          <div className="mt-4">
            {bidStarterResult.ok ? (
              <div className="bg-green-900/20 border border-green-800/40 text-green-200 p-4 rounded">
                <div className="font-semibold mb-2">
                  Bid Starter generated.
                  {' '}
                  <a href={bidStarterResult.folder_url} target="_blank" rel="noreferrer" className="underline text-yellow-300">
                    Open Drive folder ({bidStarterResult.folder_name}) →
                  </a>
                </div>
                <div className="text-xs text-green-200/80 mb-2">
                  {bidStarterResult.docs_generated?.length ?? 0} of 14 documents generated.{' '}
                  {bidStarterResult.sub_count ?? 0} subcontractor candidates included.
                </div>
                <ul className="text-xs grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                  {bidStarterResult.docs_generated?.map(d => (
                    <li key={d} className="text-green-200/80">✓ {d}</li>
                  ))}
                </ul>
                {bidStarterResult.errors && bidStarterResult.errors.length > 0 && (
                  <div className="mt-3 text-xs text-yellow-300">
                    Some templates failed:
                    <ul className="ml-4 list-disc">
                      {bidStarterResult.errors.map((e, i) => (
                        <li key={i}>{e.template}: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-900/30 border border-red-700 text-red-200 p-4 rounded text-sm">
                <div className="font-semibold">{bidStarterResult.error || 'Generation failed'}</div>
                {bidStarterResult.detail && <div className="text-xs mt-1 opacity-80">{bidStarterResult.detail}</div>}
                {bidStarterResult.hint && <div className="text-xs mt-2 italic opacity-80">{bidStarterResult.hint}</div>}
                {bidStarterResult.missing && bidStarterResult.missing.length > 0 && (
                  <div className="text-xs mt-2">
                    Missing in Supabase Storage:
                    <ul className="ml-4 list-disc">
                      {bidStarterResult.missing.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {bidStarterResult.error === 'already_generated' && bidStarterResult.folder_url && (
                  <div className="mt-2">
                    Existing folder: <a href={bidStarterResult.folder_url} target="_blank" rel="noreferrer" className="underline text-yellow-300">{bidStarterResult.folder_url}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
