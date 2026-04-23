'use client'

// Submit page — final gated checklist before marking proposal submitted.
// All required gates must pass: intake complete, validation ready, compliance matrix complete,
// pink team run, pricing saved, address protocol verified.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProposalState = {
  id: string
  status: string
  intake_complete: boolean
  last_validation_status: string | null
  fatal_flaw_count: number | null
  pricing_data: unknown
  pricing_total: number | null
  submission_method: string | null
  submission_deadline: string | null
  assigned_va: string | null
  submitted_at: string | null
  gov_leads?: { title?: string; agency?: string; solicitation_number?: string }
}

type Gate = {
  key: string
  label: string
  pass: boolean
  detail?: string
}

export default function SubmitPage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [p, setP] = useState<ProposalState | null>(null)
  const [compliancePct, setCompliancePct] = useState(0)
  const [pinkTeamDone, setPinkTeamDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [packaging, setPackaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packageUrl, setPackageUrl] = useState<string | null>(null)

  async function load() {
    const supa = createClient()
    const { data } = await supa.from('proposals')
      .select('id, status, intake_complete, last_validation_status, fatal_flaw_count, pricing_data, pricing_total, submission_method, submission_deadline, assigned_va, submitted_at, gov_leads(title, agency, solicitation_number)')
      .eq('id', proposalId)
      .single()
    if (data) setP(data as unknown as ProposalState)

    const { data: ci } = await supa.from('proposal_compliance_items')
      .select('status')
      .eq('proposal_id', proposalId)
    const total = (ci || []).length
    const complete = (ci || []).filter(i => (i as { status: string }).status === 'complete').length
    setCompliancePct(total > 0 ? Math.round((complete / total) * 100) : 0)

    const { data: pt } = await supa.from('proposal_reviews')
      .select('id')
      .eq('proposal_id', proposalId)
      .eq('review_type', 'pink_team')
      .limit(1)
    setPinkTeamDone(((pt || []).length) > 0)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [proposalId])

  const gates: Gate[] = p ? [
    { key: 'intake', label: 'Intake complete', pass: Boolean(p.intake_complete) },
    { key: 'validation', label: 'Validation ready', pass: p.last_validation_status === 'ready_for_review', detail: (p.fatal_flaw_count || 0) > 0 ? (p.fatal_flaw_count + ' fatal flaw(s) open') : undefined },
    { key: 'compliance', label: 'Compliance matrix', pass: compliancePct === 100, detail: compliancePct + '% complete' },
    { key: 'pink_team', label: 'Pink team review run', pass: pinkTeamDone },
    { key: 'pricing', label: 'Pricing saved', pass: (p.pricing_total || 0) > 0 },
    { key: 'deadline', label: 'Before deadline', pass: !p.submission_deadline || new Date(p.submission_deadline) > new Date() },
    { key: 'method', label: 'Submission method set', pass: Boolean(p.submission_method) },
  ] : []

  const allPass = gates.every(g => g.pass)

  async function markSubmitted() {
    setSubmitting(true); setError(null)
    const supa = createClient()
    const { error } = await supa.from('proposals').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', proposalId)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    await load()
  }

  async function buildPackage() {
    setPackaging(true); setError(null); setPackageUrl(null)
    try {
      const r = await fetch('/api/proposals/generate-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Package build failed')
      setPackageUrl(j.url || null)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setPackaging(false)
    }
  }

  if (!p) return <div className="px-8 py-6 text-white">Loading proposal…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Submit — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">{p.gov_leads?.title?.slice(0, 80) || '(untitled)'} · {p.gov_leads?.agency || '—'}</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/pink-team'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Pink Team</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/retrospective'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Retrospective</Link>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
      {p.submitted_at && (
        <div className="bg-green-900/30 border border-green-700 text-green-200 p-3 rounded mb-4">
          Submitted on {new Date(p.submitted_at).toLocaleString()}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="text-sm font-semibold mb-3">Submission gates</div>
          <ul className="space-y-2">
            {gates.map(g => (
              <li key={g.key} className="flex items-center justify-between py-2 border-b border-[#374151] last:border-0">
                <div className="flex items-center gap-3">
                  <span className={g.pass ? 'text-green-400' : 'text-red-400'}>{g.pass ? '✓' : '✕'}</span>
                  <span className="text-sm text-white">{g.label}</span>
                </div>
                {g.detail && <span className="text-xs text-gray-400">{g.detail}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Package</div>
            <button onClick={buildPackage} disabled={packaging} className="w-full px-4 py-2 rounded bg-[#374151] text-sm disabled:opacity-50">
              {packaging ? 'Building package…' : 'Generate submission package'}
            </button>
            {packageUrl && (
              <a href={packageUrl} target="_blank" rel="noreferrer" className="block mt-2 text-xs text-[#D4AF37] underline">Download package</a>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Mark as submitted</div>
            <button onClick={markSubmitted} disabled={!allPass || submitting || Boolean(p.submitted_at)} className="w-full px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
              {p.submitted_at ? 'Already submitted' : (submitting ? 'Submitting…' : 'Mark submitted')}
            </button>
            {!allPass && <div className="text-[11px] text-red-400 mt-2">Pass all gates before marking submitted.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
