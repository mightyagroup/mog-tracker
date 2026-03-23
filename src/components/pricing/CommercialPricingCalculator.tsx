'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Download, Save } from 'lucide-react'

interface LineRow {
  id: string
  service: string
  frequency: string
  unit_cost: string
  units: string
  driver_cost: string
  fuel_cost: string
  supply_cost: string
  other_cost: string
}

interface CommercialPricingCalculatorProps {
  accentColor?: string
  commercialLeadId?: string
}

const FREQUENCIES = [
  'Per Trip', 'Daily', 'Weekly', 'Monthly', 'Per Specimen', 'Per Test',
  'Per Patient', 'Per Delivery', 'Hourly', 'Annually',
]

function newRow(): LineRow {
  return {
    id: Math.random().toString(36).slice(2),
    service: '',
    frequency: 'Per Trip',
    unit_cost: '',
    units: '1',
    driver_cost: '',
    fuel_cost: '',
    supply_cost: '',
    other_cost: '',
  }
}

function parseNum(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function rowTotals(row: LineRow) {
  const unitCost = parseNum(row.unit_cost)
  const units = parseNum(row.units)
  const driver = parseNum(row.driver_cost)
  const fuel = parseNum(row.fuel_cost)
  const supply = parseNum(row.supply_cost)
  const other = parseNum(row.other_cost)

  const revenue = unitCost * units
  const totalCost = (driver + fuel + supply + other) * units
  const grossMargin = revenue - totalCost

  return { revenue, totalCost, grossMargin }
}

export function CommercialPricingCalculator({ accentColor = '#06A59A', commercialLeadId }: CommercialPricingCalculatorProps) {
  const [lines, setLines] = useState<LineRow[]>([newRow()])
  const [overheadPct, setOverheadPct] = useState('20')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const addLine = useCallback(() => setLines(prev => [...prev, newRow()]), [])
  const removeLine = useCallback((id: string) => setLines(prev => prev.filter(r => r.id !== id)), [])
  const updateLine = useCallback((id: string, field: keyof LineRow, value: string) => {
    setLines(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  const lineSums = lines.map(rowTotals)
  const totalRevenue = lineSums.reduce((s, r) => s + r.revenue, 0)
  const totalDirectCost = lineSums.reduce((s, r) => s + r.totalCost, 0)
  const totalGrossMargin = totalRevenue - totalDirectCost
  const grossMarginPct = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0
  const overheadAmount = totalRevenue * (parseNum(overheadPct) / 100)
  const netMargin = totalGrossMargin - overheadAmount
  const netMarginPct = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const pricingData = {
      lines: lines.map((r, i) => ({ ...r, ...lineSums[i] })),
      summary: { totalRevenue, totalDirectCost, totalGrossMargin, grossMarginPct, overheadPct, overheadAmount, netMargin, netMarginPct },
    }
    await supabase.from('pricing_records').insert({
      entity: 'vitalx',
      pricing_type: 'commercial',
      commercial_lead_id: commercialLeadId ?? null,
      pricing_data: pricingData,
      total_price: totalRevenue,
      total_cost: totalDirectCost + overheadAmount,
      margin_percent: netMarginPct,
      notes: notes || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function exportCSV() {
    const headers = ['Service', 'Frequency', 'Unit Cost', 'Units', 'Revenue', 'Driver Cost', 'Fuel Cost', 'Supply Cost', 'Other Cost', 'Total Cost', 'Gross Margin']
    const rows = lines.map((r, i) => {
      const t = lineSums[i]
      return [r.service, r.frequency, r.unit_cost, r.units, fmt(t.revenue), r.driver_cost, r.fuel_cost, r.supply_cost, r.other_cost, fmt(t.totalCost), fmt(t.grossMargin)]
    })
    const summary = [
      [], ['', '', '', '', '', '', '', '', 'Total Revenue', fmt(totalRevenue)],
      ['', '', '', '', '', '', '', '', 'Total Direct Cost', fmt(totalDirectCost)],
      ['', '', '', '', '', '', '', '', 'Gross Margin', `${grossMarginPct.toFixed(1)}%`],
      ['', '', '', '', '', '', '', '', `Overhead (${overheadPct}%)`, fmt(overheadAmount)],
      ['', '', '', '', '', '', '', '', 'Net Margin', `${netMarginPct.toFixed(1)}%`],
    ]
    const csv = [headers, ...rows, ...summary]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commercial-pricing-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inp = 'w-full bg-[#111827] border border-[#374151] rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition text-right'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Commercial Pricing Calculator</h2>
          <p className="text-gray-500 text-xs mt-0.5">Per-service pricing for commercial contracts</p>
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

      {/* Line items table */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151] bg-[#161E2E]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400">Service Description</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 w-28">Frequency</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-28">Unit Revenue ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-20">Units</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Driver ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Fuel ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Supply ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Other ($)</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Revenue</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 w-24">Gross Margin</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]">
              {lines.map((row, i) => {
                const t = lineSums[i]
                const marginPct = t.revenue > 0 ? (t.grossMargin / t.revenue) * 100 : 0
                return (
                  <tr key={row.id} className="hover:bg-[#253347]">
                    <td className="px-3 py-2">
                      <input className={`${inp} text-left`} value={row.service} onChange={e => updateLine(row.id, 'service', e.target.value)} placeholder="e.g., Specimen courier — hospital to lab" />
                    </td>
                    <td className="px-3 py-2">
                      <select className={`${inp} text-left`} value={row.frequency} onChange={e => updateLine(row.id, 'frequency', e.target.value)}>
                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.unit_cost} onChange={e => updateLine(row.id, 'unit_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" value={row.units} onChange={e => updateLine(row.id, 'units', e.target.value)} /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.driver_cost} onChange={e => updateLine(row.id, 'driver_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.fuel_cost} onChange={e => updateLine(row.id, 'fuel_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.supply_cost} onChange={e => updateLine(row.id, 'supply_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2"><input className={inp} type="number" min="0" step="0.01" value={row.other_cost} onChange={e => updateLine(row.id, 'other_cost', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-200 whitespace-nowrap">{fmt(t.revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">
                      <span className={marginPct >= 20 ? 'text-green-400' : marginPct >= 10 ? 'text-yellow-400' : 'text-red-400'}>
                        {fmt(t.grossMargin)} ({marginPct.toFixed(0)}%)
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeLine(row.id)} className="text-gray-600 hover:text-red-400 transition"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#374151]">
          <button onClick={addLine} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
            <Plus size={14} /> Add Service Line
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overhead + notes */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <h3 className="text-white font-medium text-sm mb-4">Overhead &amp; Settings</h3>
          <div className="flex items-center justify-between gap-4 mb-4">
            <label className="text-gray-400 text-sm">Overhead / Admin (%)</label>
            <input
              type="number" min="0" max="100" step="0.5"
              className="w-24 bg-[#111827] border border-[#374151] rounded px-3 py-1.5 text-sm text-white text-right focus:outline-none"
              value={overheadPct}
              onChange={e => setOverheadPct(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Version Notes</label>
            <textarea
              className="w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
              rows={2}
              placeholder="e.g., Proposal pricing for Quest Diagnostics, Q2 2025"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Totals */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <h3 className="text-white font-medium text-sm mb-4">Pricing Summary</h3>
          <div className="space-y-2">
            <SRow label="Total Revenue" value={fmt(totalRevenue)} />
            <SRow label="Total Direct Cost" value={fmt(totalDirectCost)} />
            <SRow label="Gross Margin" value={`${fmt(totalGrossMargin)} (${grossMarginPct.toFixed(1)}%)`} highlight={grossMarginPct >= 20 ? 'green' : grossMarginPct >= 10 ? 'yellow' : 'red'} />
            <SRow label={`Overhead (${overheadPct}%)`} value={fmt(overheadAmount)} />
            <div className="border-t border-[#374151] pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Net Margin</span>
                <span className="font-bold text-lg font-mono" style={{ color: netMarginPct >= 15 ? '#4ADE80' : netMarginPct >= 5 ? '#FCD34D' : '#FCA5A5' }}>
                  {fmt(netMargin)} ({netMarginPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SRow({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'yellow' | 'red' }) {
  const color = highlight === 'green' ? '#4ADE80' : highlight === 'yellow' ? '#FCD34D' : highlight === 'red' ? '#FCA5A5' : undefined
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#374151] last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-sm font-mono" style={color ? { color } : { color: '#E5E7EB' }}>{value}</span>
    </div>
  )
}
