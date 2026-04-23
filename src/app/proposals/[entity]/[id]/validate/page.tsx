'use client'

// Dedicated validation section — Ella's explicit requirement.
// Runs the 5-pass deterministic validator + optional Claude deep review.
// Shows findings by pass, fatal-flaw count, and humanizer tools inline.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Finding = {
  severity: 'fatal' | 'high' | 'medium' | 'low' | 'info'
  pass: 1 | 2 | 3 | 4 | 5
  category: string
  message: string
  evidence?: string
  suggested_fix?: string
}

type ValidationResult = {
  status: 'ready_for_review' | 'hold_action_required' | 'error'
  summary: string
  findings: Finding[]
  ai_tells?: string[]
  fatal_count: number
  high_count: number
}

type ProposalLite = {
  id: string
  entity: string
  status: string
  intake_complete: boolean
  last_validation_status: string | null
  fatal_flaw_count: number | null
  narrative_draft: string | null
  gov_leads?: { title?: string; agency?: string }
}

function sevColor(s: Finding['severity']): string {
  if (s === 'fatal') return '#DC2626'
  if (s === 'high') return '#D97706'
  if (s === 'medium') return '#CA8A04'
  if (s === 'low') return '#059669'
  return '#6B7280'
}

export default function ValidatePage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [proposal, setProposal] = useState<ProposalLite | null>(null)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [narrative, setNarrative] = useState('')
  const [deepReview, setDeepReview] = useState(false)
  const [humanizing, setHumanizing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data } = await supa.from('proposals')
        .select('id, entity, status, intake_complete, last_validation_status, fatal_flaw_count, narrative_draft, gov_leads(title, agency)')
        .eq('id', proposalId)
        .single()
      if (cancelled) return
      if (data) {
        setProposal(data as unknown as ProposalLite)
        setNarrative(((data as unknown) as { narrative_draft?: string }).narrative_draft || '')
      }
      // Load last validation from proposal_reviews
      const { data: reviews } = await supa.from('proposal_reviews')
        .select('result_json')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      if (reviews && reviews[0]?.result_json) setResult(reviews[0].result_json as ValidationResult)
    })()
    return () => { cancelled = true }
  }, [proposalId])

  async function runValidator() {
    setRunning(true); setError(null)
    try {
      // Save narrative first so validator sees latest content
      const supa = createClient()
      await supa.from('proposals').update({ narrative_draft: narrative }).eq('id', proposalId)

      const r = await fetch('/api/proposals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId, deep_review: deepReview }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Validation failed')
      setResult(j.result)
      // Refresh proposal status
      const { data } = await supa.from('proposals').select('id, entity, status, intake_complete, last_validation_status, fatal_flaw_count, narrative_draft, gov_leads(title, agency)').eq('id', proposalId).single()
      if (data) setProposal(data as unknown as ProposalLite)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  async function runHumanizer() {
    if (!narrative.trim()) { setError('Nothing to humanize.'); return }
    setHumanizing(true); setError(null)
    try {
      const r = await fetch('/api/proposals/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId, text: narrative, entity, mode: 'deterministic' }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Humanizer failed')
      setNarrative(j.text)
      const supa = createClient()
      await supa.from('proposals').update({ narrative_draft: j.text }).eq('id', proposalId)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setHumanizing(false)
    }
  }

  if (!proposal) return <div className="px-8 py-6 text-white">Loading proposal…</div>

  const fatal = result?.findings.filter(f => f.severity === 'fatal') || []
  const high = result?.findings.filter(f => f.severity === 'high') || []
  const other = result?.findings.filter(f => f.severity !== 'fatal' && f.severity !== 'high') || []

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Validation — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {proposal.gov_leads?.title?.slice(0, 80) || '(untitled)'} · {proposal.gov_leads?.agency || '—'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/intake'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Intake</Link>
          <Link href={'/proposals/' + entity} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">All</Link>
        </div>
      </div>

      {!proposal.intake_complete && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 p-3 rounded mb-4">
          Intake is not yet marked complete. Validator will still run, but certain Pass 1 checks may fail.
        </div>
      )}

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Narrative editor + humanizer */}
        <div className="lg:col-span-3 bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white">Proposal narrative</div>
            <div className="flex items-center gap-2">
              <button
                onClick={runHumanizer}
                disabled={humanizing}
                className="px-3 py-1.5 rounded bg-[#374151] text-white text-xs disabled:opacity-50"
              >
                {humanizing ? 'Humanizing…' : 'Run humanizer'}
              </button>
            </div>
          </div>
          <textarea
            className="w-full min-h-[360px] bg-[#111827] border border-[#374151] rounded p-3 text-sm text-white font-mono"
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            placeholder="Paste or write proposal narrative here. The validator checks this alongside intake metadata."
          />
          <div className="text-[11px] text-gray-500 mt-2">
            Humanizer strips AI tells (em dashes, &ldquo;leverage&rdquo;, &ldquo;robust&rdquo;, filler phrases) and enforces your brand voice before submission.
          </div>
        </div>

        {/* Validator controls + results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
            <div className="text-sm font-semibold mb-3">Run validator</div>
            <label className="flex items-center gap-2 text-xs text-gray-300 mb-3">
              <input type="checkbox" checked={deepReview} onChange={e => setDeepReview(e.target.checked)} />
              Include Claude deep review (uses Anthropic API)
            </label>
            <button
              onClick={runValidator}
              disabled={running}
              className="w-full px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50"
            >
              {running ? 'Running 5-pass validator…' : 'Run 5-pass validation'}
            </button>
          </div>

          {result && (
            <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Last result</div>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-semibold"
                  style={{
                    background: result.status === 'ready_for_review' ? '#065F46' : '#7F1D1D',
                    color: 'white',
                  }}
                >
                  {result.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs text-gray-300 mb-2">{result.summary}</div>
              <div className="flex items-center gap-3 text-[11px] mt-3">
                <span className="text-red-400">{result.fatal_count} fatal</span>
                <span className="text-orange-400">{result.high_count} high</span>
              </div>
            </div>
          )}
        </div>

        {/* Findings */}
        {result && (
          <div className="lg:col-span-5 space-y-3">
            {[...fatal, ...high, ...other].length === 0 && (
              <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-8 text-center text-gray-400">
                No findings. Proposal is validated clean.
              </div>
            )}
            {[...fatal, ...high, ...other].map((f, i) => (
              <div key={i} className="bg-[#1F2937] border border-[#374151] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                    style={{ background: sevColor(f.severity) }}
                  >
                    {f.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">Pass {f.pass}</span>
                  <span className="text-xs text-gray-500">{f.category}</span>
                </div>
                <div className="text-sm text-white">{f.message}</div>
                {f.evidence && (
                  <div className="mt-2 text-xs text-gray-400 bg-[#111827] border border-[#374151] rounded p-2 font-mono">
                    {f.evidence}
                  </div>
                )}
                {f.suggested_fix && (
                  <div className="mt-2 text-xs text-green-400">
                    Fix: {f.suggested_fix}
                  </div>
                )}
              </div>
            ))}
            {result.ai_tells && result.ai_tells.length > 0 && (
              <div className="bg-[#1F2937] border border-yellow-700 rounded-xl p-4">
                <div className="text-sm font-semibold text-yellow-400 mb-2">AI tells detected</div>
                <div className="flex flex-wrap gap-2">
                  {result.ai_tells.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-yellow-900/40 text-yellow-200 border border-yellow-700">{t}</span>
                  ))}
                </div>
                <div className="text-[11px] text-gray-400 mt-2">Click &ldquo;Run humanizer&rdquo; above to clean these up.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
