'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityType } from '@/lib/types'
import { Plus, Trash2, Download, Save } from 'lucide-react'

interface ClinRow {
  id: string
  clin_number: string
  description: string
  qty: string
  unit: string
  unit_cost: string
  labor_cost: string
  materials_cost: string
  equipment_cost: string
  subcontractor_cost: string
  overhead_pct: string
  margin_pct: string
}

interface GovPricingCalculatorProps {
  entity: EntityType
  accentColor?: string
  govLeadId?: string
}

const UNITS = ['Each', 'Hour', 'Month', 'Year', 'Lot', 'Sq Ft', 'Linear Ft', 'Day', 'Visit', 'Task']

function newRow(clinNum: string): ClinRow {
  return {
    id: Math.random().toString(36).slice(2),
    clin_number: clinNum,
    description: '',
    qty: '1',
    unit: 'Month',
    unit_cost: '',
    labor_cost: '',
    materials_cost: '',
    equipment_cost: '',
    subcontractor_cost: '',
    overhead_pct: '15',
    margin_pct: '12',
  }
}

function parseNum(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function clinTotals(row: ClinRow) {
  const qty = parseNum(row.qty)
  const unitCost = parseNum(row.unit_cost)
  const labor = parseNum(row.labor_cost)
  const materials = parseNum(row.materials_cost)
  const equipment = parseNum(row.equipment_cost)
  const sub = parseNum(row.subcontractor_cost)
  const overheadPct = parseNum(row.overhead_pct) / 100
  const marginPct = parseNum(row.margin_pct) / 100

  const directCost = labor + materials + equipment + sub
  const overhead = directCost * overheadPct
  const totalCost = directCost + overhead
  const extendedPrice = unitCost > 0 ? qty * unitCost : totalCost / (1 - marginPct)
  const margin = extendedPrice - totalCost

  return { directCost, overhead, totalCost, extendedPrice: qty * (unitCost || (extendedPrice / (qty || 1))), margin }
}

export function GovPricingCalculator({ entity, accentColor = '#D4AF37', govLeadId }: GovPricingCalculatorProps) {
  const [clins, setClins] = useState<ClinRow[]>([newRow('0001')])
  const [gaPercent, setGaPercent] = useState('8')
  const [feePercent, setFeePercent] = useState('5')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const addClin = useCallback(() => {
    setClins(prev => {
      const last = prev[prev.length - 1]?.clin_number ?? '0000'
      const next = String(parseInt(last) + 1).padStart(4, '0')
      return [...prev, newRow(next)]
    })
  }, [])

  const removeClin = useCallback((id: string) => {
    setClins(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateClin = useCallback((id: string, field: keyof ClinRow, value: string) => {
    setClins(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  // ── Totals ──────────────────────────────────────────────────────────────────
  const clinSums = clins.map(clinTotals)
  const totalDirectCost = clinSums.reduce((s, c) => s + c.directCost, 0)
  const totalOverhead = clinSums.reduce((s, c) => s + c.overhead, 0)
  const totalCost = clinSums.reduce((s, c) => s + c.totalCost, 0)
  const basePrice = clinSums.reduce((s, c) => s + c.extendedPrice, 0)
  const gaAmount = basePrice * (parseNum(gaPercent) / 100)
  const feeAmount = (basePrice + gaAmount) * (parseNum(feePercent) / 100)
  const grandTotal = basePrice + gaAmount + feeAmount
  const blendedMargin = grandTotal > 0 ? ((grandTotal - totalCost) / grandTotal) * 100 : 0

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const pricingData = {
      clins: clins.map(r => ({ ...r, ...clinTotals(r) })),
      summary: { totalDirectCost, totalOverhead, totalCost, basePrice, gaPercent, gaAmount, feePercent, feeAmount, grandTotal, blendedMargin },
    }
    await supabase.from('pricing_records').insert({
      entity,
      pricing_type: 'government',
      gov_lead_id: govLeadId ?? null,
      pricing_data: pricingData,
      total_price: grandTotal,
      total_cost: totalCost,
      margin_percent: blendedMargin,
      notes: notes || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ['CLIN', 'Description', 'Qty', 'Unit', 'Unit Cost', 'Direct Cost', 'Overhead', 'Total Cost', 'Extended Price', 'Margin']
    const rows = clins.map((r, i) => {
      const t = clinSums[i]
      return [r.clin_number, r.description, r.qty, r.unit, r.unit_cost, fmt(t.directCost), fmt(t.overhead), fmt(t.totalCost), fmt(t.extendedPrice), fmt(t.margin)]
    })
    const summaryRows = [
      [], ['', '', '', '', '', '', '', 'Base Price', '', fmt(basePrice)],
      ['', '', '', '', '', '', '', `G&A (${gaPercent}%)`, '', fmt(gaAmount)],
      ['', '', '', '', '', '', '', `Fee (${feePercent}%)`, '', fmt(feeAmount)],
      ['', '', '', '', '', '', '', 'GRAND TOTAL', '', fmt(grandTotal)],
      ['', '', '', '', '', '', '', 'Blended Margin', '', `${blendedMargin.toFixed(1)}%`],
    ]
    const csv = [headers, ...rows, ...summaryRows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gov-pricing-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition text-right'

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Government CLIN Pricing</h2>
          <p className="text-gray-500 text-xs mt-0.5">CLIN-based pricing for government proposals</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg text-sm transition">
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 font-semibold text-sm rounded-lg text-[#111827] disabled:opacity-50 transition"
            style={{ backgroundColor: accentColor }}
          >
            <Save size={14} />
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Version'}
          </button>
        </div>
      </div>

      {/* CLIN table */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151] bg-[#161E2E]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 w-20">CLIN</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400">Description</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-16">Qty</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 w-24">Unit</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-28">Unit Cost ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Labor ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Materials ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Equip ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Sub ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-20">OH%</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-20">Margin%</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-28">Ext. Price</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]">
              {clins.map((row, i) => {
                const t = clinSums[i]
                return (
                  <tr key={row.id} className="hover:bg-[#253347]">
                    <td className="px-3 py-2">
                      <input className={`${inp} text-center font-mono`} value={row.clin_number} onChange={e => updateClin(row.id, 'clin_number', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input className={`${inp} text-left`} value={row.description} onChange={e => updateClin(row.id, 'description', e.target.value)} placeholder="Line item description" />
                    </td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" value={row.qty} onChange={e => updateClin(row.id, 'qty', e.target.value)} /></td>
                    <td className="px-3 py-2">
                      <select className={`${inp} text-left`} value={row.unit} onChange={e => updateClin(row.id, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.unit_cost} onChange={e => updateClin(row.id, 'unit_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.labor_cost} onChange={e => updateClin(row.id, 'labor_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.materials_cost} onChange={e => updateClin(row.id, 'materials_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.equipment_cost} onChange={e => updateClin(row.id, 'equipment_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.subcontractor_cost} onChange={e => updateClin(row.id, 'subcontractor_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={`${inp} w-16`} type="number" min="0" max="100" step="0.5" value={row.overhead_pct} onChange={e => updateClin(row.id, 'overhead_pct', e.target.value)} /></td>
                    <td className="px-3 py-2"><input className={`${inp} w-16`} type="number" min="0" max="100" step="0.5" value={row.margin_pct} onChange={e => updateClin(row.id, 'margin_pct', e.target.value)} /></td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-200 whitespace-nowrap">{fmt(t.extendedPrice)}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeClin(row.id)} className="text-gray-600 hover:text-red-400 transition"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#374151]">
          <button onClick={addClin} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
            <Plus size={14} /> Add CLIN
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* G&A / Fee */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <h3 className="text-white font-medium text-sm mb-4">Contract-Level Rates</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className="text-gray-400 text-sm">G&amp;A (%)</label>
              <input
                type="number" min="0" max="100" step="0.5"
                className="w-24 bg-[#111827] border border-[#374151] rounded px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:ring-1 transition"
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                value={gaPercent}
                onChange={e => setGaPercent(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-gray-400 text-sm">Profit / Fee (%)</label>
              <input
                type="number" min="0" max="100" step="0.5"
                className="w-24 bg-[#111827] border border-[#374151] rounded px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:ring-1 transition"
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                value={feePercent}
                onChange={e => setFeePercent(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1.5">Version Notes</label>
            <textarea
              className="w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
              rows={2}
              placeholder="e.g., Base year pricing, v1.0"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Summary totals */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <h3 className="text-white font-medium text-sm mb-4">Pricing Summary</h3>
          <div className="space-y-2">
            <SummaryRow label="Total Direct Cost" value={fmt(totalDirectCost)} />
            <SummaryRow label="Total Overhead" value={fmt(totalOverhead)} />
            <SummaryRow label="Base Price (CLINs)" value={fmt(basePrice)} />
            <SummaryRow label={`G&A (${gaPercent}%)`} value={fmt(gaAmount)} />
            <SummaryRow label={`Profit / Fee (${feePercent}%)`} value={fmt(feeAmount)} />
            <div className="border-t border-[#374151] pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Grand Total</span>
                <span className="text-white font-bold text-lg font-mono" style={{ color: accentColor }}>{fmt(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-500 text-xs">Blended Margin</span>
                <span className={`text-sm font-semibold ${blendedMargin >= 15 ? 'text-green-400' : blendedMargin >= 8 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {blendedMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#374151] last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-200 text-sm font-mono">{value}</span>
    </div>
  )
}
