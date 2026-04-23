'use client'

// Compliance matrix — Section L/M requirements tracker.
// Rows are compliance items; columns are status, due date, owner, proposal section,
// evidence pointer. Designed for no-skip enforcement.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Item = {
  id: string
  proposal_id: string
  section: string | null
  requirement: string
  source_reference: string | null
  status: string
  owner: string | null
  due_date: string | null
  evidence_location: string | null
  notes: string | null
  sort_order: number | null
}

const STATUSES = ['not_started', 'in_progress', 'complete', 'na']

export default function ComplianceMatrixPage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  async function load() {
    const supa = createClient()
    const { data, error } = await supa.from('proposal_compliance_items')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('sort_order', { ascending: true })
    if (error) setError(error.message)
    else setItems((data as Item[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId])

  async function updateItem(id: string, patch: Partial<Item>) {
    const supa = createClient()
    const { error } = await supa.from('proposal_compliance_items').update(patch).eq('id', id)
    if (error) { setError(error.message); return }
    setItems(items.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function addRow() {
    const supa = createClient()
    const { data, error } = await supa.from('proposal_compliance_items').insert({
      proposal_id: proposalId, requirement: 'New requirement', status: 'not_started', sort_order: items.length,
    }).select().single()
    if (error) { setError(error.message); return }
    setItems([...items, data as Item])
  }

  async function deleteRow(id: string) {
    const supa = createClient()
    const { error } = await supa.from('proposal_compliance_items').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setItems(items.filter(i => i.id !== id))
  }

  async function parseFromSolicitation() {
    setParsing(true); setError(null)
    try {
      const r = await fetch('/api/proposals/parse-solicitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Parse failed')
      await load()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const completed = items.filter(i => i.status === 'complete').length
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0

  if (loading) return <div className="px-8 py-6 text-white">Loading compliance matrix…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Compliance Matrix — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">{completed}/{items.length} complete ({pct}%)</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/intake'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Intake</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/validate'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Validate</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/pricing'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Pricing</Link>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}

      <div className="flex gap-3 mb-4">
        <button onClick={addRow} className="px-3 py-2 rounded bg-[#374151] text-sm">+ Add requirement</button>
        <button onClick={parseFromSolicitation} disabled={parsing} className="px-3 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
          {parsing ? 'Parsing solicitation…' : 'Parse Section L/M via Claude'}
        </button>
      </div>

      <div className="bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#111827] text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left w-20">Section</th>
              <th className="px-3 py-2 text-left">Requirement</th>
              <th className="px-3 py-2 text-left w-32">Source ref</th>
              <th className="px-3 py-2 text-left w-32">Status</th>
              <th className="px-3 py-2 text-left w-32">Owner</th>
              <th className="px-3 py-2 text-left w-32">Due</th>
              <th className="px-3 py-2 text-left w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No compliance items yet. Click &ldquo;Parse Section L/M&rdquo; after uploading the solicitation text, or add rows manually.</td></tr>
            )}
            {items.map(i => (
              <tr key={i.id} className="border-t border-[#374151]">
                <td className="px-3 py-2">
                  <input className="w-full bg-transparent text-xs text-gray-300" value={i.section || ''} onChange={e => updateItem(i.id, { section: e.target.value })} placeholder="L.3.2" />
                </td>
                <td className="px-3 py-2">
                  <textarea className="w-full bg-transparent text-xs text-white" rows={2} value={i.requirement} onChange={e => updateItem(i.id, { requirement: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full bg-transparent text-xs text-gray-400" value={i.source_reference || ''} onChange={e => updateItem(i.id, { source_reference: e.target.value })} placeholder="page 12" />
                </td>
                <td className="px-3 py-2">
                  <select className="bg-[#111827] text-xs text-white border border-[#374151] rounded px-2 py-1" value={i.status} onChange={e => updateItem(i.id, { status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input className="w-full bg-transparent text-xs text-gray-300" value={i.owner || ''} onChange={e => updateItem(i.id, { owner: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <input type="date" className="w-full bg-transparent text-xs text-gray-300" value={i.due_date || ''} onChange={e => updateItem(i.id, { due_date: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => deleteRow(i.id)} className="text-red-400 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
