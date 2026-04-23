'use client'

// Proposal pricing — CLIN builder saved to pricing_records.
// Reuses the CLIN model from existing gov pricing calculator but scoped to a proposal.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type CLIN = {
  clin: string
  description: string
  qty: number
  unit: string
  unit_cost: number
  margin_pct: number
}

const UNITS = ['each', 'hour', 'month', 'year', 'lot', 'sqft', 'mile', 'trip', 'specimen', 'patient']

function blankClin(): CLIN {
  return { clin: '', description: '', qty: 1, unit: 'each', unit_cost: 0, margin_pct: 15 }
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function ProposalPricingPage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [clins, setClins] = useState<CLIN[]>([blankClin()])
  const [overhead, setOverhead] = useState(10)
  const [ga, setGa] = useState(8)
  const [feePct, setFeePct] = useState(7)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data: prop } = await supa.from('proposals')
        .select('pricing_data')
        .eq('id', proposalId)
        .single()
      if (cancelled) return
      const pd = ((prop as unknown) as { pricing_data?: { clins?: CLIN[]; overhead?: number; ga?: number; fee?: number } })?.pricing_data
      if (pd && pd.clins && pd.clins.length > 0) {
        setClins(pd.clins)
        if (typeof pd.overhead === 'number') setOverhead(pd.overhead)
        if (typeof pd.ga === 'number') setGa(pd.ga)
        if (typeof pd.fee === 'number') setFeePct(pd.fee)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [proposalId])

  const totals = useMemo(() => {
    let baseCost = 0
    let extendedPrice = 0
    for (const c of clins) {
      const ext = c.qty * c.unit_cost
      const withMargin = ext * (1 + c.margin_pct / 100)
      baseCost += ext
      extendedPrice += withMargin
    }
    const overheadAmt = baseCost * (overhead / 100)
    const gaAmt = (baseCost + overheadAmt) * (ga / 100)
    const subtotal = baseCost + overheadAmt + gaAmt
    const feeAmt = subtotal * (feePct / 100)
    const grand = Math.max(extendedPrice, subtotal + feeAmt)
    const margin = grand > 0 ? ((grand - baseCost) / grand) * 100 : 0
    return { baseCost, overheadAmt, gaAmt, feeAmt, subtotal, grand, margin }
  }, [clins, overhead, ga, feePct])

  function updateClin(i: number, patch: Partial<CLIN>) {
    setClins(clins.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }
  function addClin() { setClins([...clins, blankClin()]) }
  function removeClin(i: number) { setClins(clins.filter((_, idx) => idx !== i)) }

  async function save() {
    setSaving(true); setError(null); setMsg(null)
    const supa = createClient()
    const pricing_data = { clins, overhead, ga, fee: feePct, totals }
    const { error } = await supa.from('proposals').update({ pricing_data, pricing_total: totals.grand }).eq('id', proposalId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setMsg('Pricing saved.')
  }

  if (loading) return <div className="px-8 py-6 text-white">Loading pricing…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Pricing — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">Grand total {fmt(totals.grand)} · blended margin {totals.margin.toFixed(1)}%</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/compliance'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Compliance</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/validate'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Validate</Link>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
      {msg && <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded mb-4">{msg}</div>}

      <div className="bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#111827] text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left w-20">CLIN</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right w-20">Qty</th>
              <th className="px-3 py-2 text-left w-24">Unit</th>
              <th className="px-3 py-2 text-right w-28">Unit $</th>
              <th className="px-3 py-2 text-right w-20">Margin %</th>
              <th className="px-3 py-2 text-right w-28">Ext $</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {clins.map((c, i) => {
              const ext = c.qty * c.unit_cost * (1 + c.margin_pct / 100)
              return (
                <tr key={i} className="border-t border-[#374151]">
                  <td className="px-3 py-2"><input className="w-full bg-transparent text-xs" value={c.clin} onChange={e => updateClin(i, { clin: e.target.value })} /></td>
                  <td className="px-3 py-2"><input className="w-full bg-transparent text-xs" value={c.description} onChange={e => updateClin(i, { description: e.target.value })} /></td>
                  <td className="px-3 py-2 text-right"><input type="number" min={0} className="w-full bg-transparent text-xs text-right" value={c.qty} onChange={e => updateClin(i, { qty: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2">
                    <select className="bg-transparent text-xs" value={c.unit} onChange={e => updateClin(i, { unit: e.target.value })}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right"><input type="number" min={0} step="0.01" className="w-full bg-transparent text-xs text-right" value={c.unit_cost} onChange={e => updateClin(i, { unit_cost: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2 text-right"><input type="number" min={0} step="0.1" className="w-full bg-transparent text-xs text-right" value={c.margin_pct} onChange={e => updateClin(i, { margin_pct: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2 text-right text-xs text-gray-300">{fmt(ext)}</td>
                  <td className="px-3 py-2"><button onClick={() => removeClin(i)} className="text-red-400 text-xs">✕</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button onClick={addClin} className="mt-3 px-3 py-2 rounded bg-[#374151] text-sm">+ Add CLIN</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Markups</div>
          <div className="space-y-3">
            <label className="block text-xs text-gray-300">Overhead %
              <input type="number" step="0.1" className="mt-1 w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white" value={overhead} onChange={e => setOverhead(Number(e.target.value))} />
            </label>
            <label className="block text-xs text-gray-300">G&amp;A %
              <input type="number" step="0.1" className="mt-1 w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white" value={ga} onChange={e => setGa(Number(e.target.value))} />
            </label>
            <label className="block text-xs text-gray-300">Fee / Profit %
              <input type="number" step="0.1" className="mt-1 w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white" value={feePct} onChange={e => setFeePct(Number(e.target.value))} />
            </label>
          </div>
        </div>
        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Totals</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Base cost</span><span>{fmt(totals.baseCost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">+ Overhead</span><span>{fmt(totals.overheadAmt)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">+ G&amp;A</span><span>{fmt(totals.gaAmt)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">+ Fee</span><span>{fmt(totals.feeAmt)}</span></div>
            <div className="flex justify-between pt-2 border-t border-[#374151] text-white font-semibold"><span>Grand total</span><span>{fmt(totals.grand)}</span></div>
            <div className="flex justify-between text-xs text-gray-400"><span>Blended margin</span><span>{totals.margin.toFixed(1)}%</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save pricing'}</button>
      </div>
    </div>
  )
}
