'use client'

// Retrospective — post-submission learning log.
// Forced reflection: what worked, what didn't, what to repeat, what to change.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Retro = {
  id?: string
  outcome: string
  went_well: string
  went_poorly: string
  to_repeat: string
  to_change: string
  lessons: string
}

const OUTCOMES = ['pending', 'awarded', 'lost', 'cancelled', 'withdrawn']

export default function RetroPage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [r, setR] = useState<Retro>({
    outcome: 'pending', went_well: '', went_poorly: '', to_repeat: '', to_change: '', lessons: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data } = await supa.from('proposal_retros').select('*').eq('proposal_id', proposalId).maybeSingle()
      if (cancelled) return
      if (data) setR(data as Retro)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [proposalId])

  async function save() {
    setSaving(true); setError(null); setMsg(null)
    const supa = createClient()
    const payload = { ...r, proposal_id: proposalId }
    const { error } = r.id
      ? await supa.from('proposal_retros').update(payload).eq('id', r.id)
      : await supa.from('proposal_retros').insert(payload)
    setSaving(false)
    if (error) { setError(error.message); return }
    setMsg('Retrospective saved.')
  }

  const input = "w-full bg-[#111827] border border-[#374151] rounded p-3 text-sm text-white"
  const label = "block text-xs uppercase tracking-wider text-gray-400 mb-1"

  if (loading) return <div className="px-8 py-6 text-white">Loading retrospective…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Retrospective — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">Log the outcome and what you learned. This feeds future proposals.</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/submit'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Submit</Link>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
      {msg && <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded mb-4">{msg}</div>}

      <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5 space-y-4">
        <div>
          <label className={label}>Outcome</label>
          <select className={input} value={r.outcome} onChange={e => setR({ ...r, outcome: e.target.value })}>
            {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>What went well</label>
          <textarea rows={3} className={input} value={r.went_well} onChange={e => setR({ ...r, went_well: e.target.value })} />
        </div>
        <div>
          <label className={label}>What went poorly</label>
          <textarea rows={3} className={input} value={r.went_poorly} onChange={e => setR({ ...r, went_poorly: e.target.value })} />
        </div>
        <div>
          <label className={label}>Repeat next time</label>
          <textarea rows={3} className={input} value={r.to_repeat} onChange={e => setR({ ...r, to_repeat: e.target.value })} />
        </div>
        <div>
          <label className={label}>Change next time</label>
          <textarea rows={3} className={input} value={r.to_change} onChange={e => setR({ ...r, to_change: e.target.value })} />
        </div>
        <div>
          <label className={label}>Lessons learned</label>
          <textarea rows={4} className={input} value={r.lessons} onChange={e => setR({ ...r, lessons: e.target.value })} />
        </div>
        <div className="pt-3 border-t border-[#374151]">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save retrospective'}
          </button>
        </div>
      </div>
    </div>
  )
}
