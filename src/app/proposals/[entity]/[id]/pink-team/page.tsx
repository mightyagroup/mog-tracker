'use client'

// Pink-team review — Claude scores the narrative against Section M evaluation factors.
// Produces a rubric score (0-10 per factor), strengths, weaknesses, and rewrite suggestions.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Review = {
  id: string
  created_at: string
  result_json: {
    overall_score?: number
    factor_scores?: { factor: string; score: number; rationale: string }[]
    strengths?: string[]
    weaknesses?: string[]
    rewrites?: { section: string; original: string; suggested: string }[]
  }
}

export default function PinkTeamPage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [reviews, setReviews] = useState<Review[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const supa = createClient()
    const { data } = await supa.from('proposal_reviews')
      .select('id, created_at, result_json')
      .eq('proposal_id', proposalId)
      .eq('review_type', 'pink_team')
      .order('created_at', { ascending: false })
    setReviews((data as Review[]) || [])
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [proposalId])

  async function runReview() {
    setRunning(true); setError(null)
    try {
      const r = await fetch('/api/proposals/pink-team-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Pink team failed')
      await load()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const latest = reviews[0]

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Pink Team Review — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">Claude scores your narrative against Section M evaluation factors.</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/validate'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Validate</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/submit'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Submit</Link>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}

      <button onClick={runReview} disabled={running} className="mb-4 px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
        {running ? 'Claude scoring…' : 'Run pink team review'}
      </button>

      {!latest && !running && (
        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-8 text-center text-gray-400">
          No pink team reviews yet. Run one after the narrative is drafted.
        </div>
      )}

      {latest && (
        <div className="space-y-4">
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Latest review</div>
              <div className="text-2xl font-bold text-[#D4AF37]">{latest.result_json.overall_score ?? '—'}/10</div>
            </div>
            <div className="text-xs text-gray-500">{new Date(latest.created_at).toLocaleString()}</div>
          </div>

          {(latest.result_json.factor_scores || []).length > 0 && (
            <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">Factor scores</div>
              <div className="space-y-3">
                {(latest.result_json.factor_scores || []).map((f, i) => (
                  <div key={i} className="border-b border-[#374151] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white">{f.factor}</div>
                      <div className="text-sm font-semibold">{f.score}/10</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{f.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(latest.result_json.strengths || []).length > 0 && (
            <div className="bg-[#1F2937] border border-green-700 rounded-xl p-5">
              <div className="text-sm font-semibold text-green-400 mb-3">Strengths</div>
              <ul className="space-y-1 text-sm">
                {(latest.result_json.strengths || []).map((s, i) => <li key={i} className="text-gray-300">· {s}</li>)}
              </ul>
            </div>
          )}

          {(latest.result_json.weaknesses || []).length > 0 && (
            <div className="bg-[#1F2937] border border-red-700 rounded-xl p-5">
              <div className="text-sm font-semibold text-red-400 mb-3">Weaknesses</div>
              <ul className="space-y-1 text-sm">
                {(latest.result_json.weaknesses || []).map((w, i) => <li key={i} className="text-gray-300">· {w}</li>)}
              </ul>
            </div>
          )}

          {(latest.result_json.rewrites || []).length > 0 && (
            <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">Rewrite suggestions</div>
              <div className="space-y-4">
                {(latest.result_json.rewrites || []).map((r, i) => (
                  <div key={i} className="border border-[#374151] rounded p-3">
                    <div className="text-xs text-gray-400 mb-2">{r.section}</div>
                    <div className="text-xs text-red-300 line-through mb-1">{r.original}</div>
                    <div className="text-xs text-green-300">{r.suggested}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
