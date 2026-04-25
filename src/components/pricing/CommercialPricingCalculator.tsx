'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Download, Save } from 'lucide-react'

interface LineItem {
  serviceDescription: string
  frequency: 'per_trip' | 'daily' | 'weekly' | 'monthly' | 'per_specimen' | 'per_test'
  unitCost: number
  numberOfUnits: number
  driverCost: number
  fuelCost: number
  supplyCost: number
  otherCost: number
}

interface CommercialPricingCalculatorProps {
  commercialLeadId?: string
  initialData?: {
    lineItems?: LineItem[]
    overheadPercent?: number
    notes?: string
  }
  onSave?: (data: {
    id: string
    version: number
    pricing_data: Record<string, unknown>
    total_price: number
    total_cost: number
    margin_percent: number
    created_at: string
  }) => void
}

const FREQUENCY_LABELS: Record<string, string> = {
  per_trip: 'Per Trip',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  per_specimen: 'Per Specimen',
  per_test: 'Per Test',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

export function CommercialPricingCalculator({ commercialLeadId, initialData, onSave }: CommercialPricingCalculatorProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems || [
      {
        serviceDescription: '',
        frequency: 'per_trip' as const,
        unitCost: 0,
        numberOfUnits: 1,
        driverCost: 0,
        fuelCost: 0,
        supplyCost: 0,
        otherCost: 0,
      },
    ]
  )

  const [overheadPercent, setOverheadPercent] = useState(initialData?.overheadPercent || 8)
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  // Calculate line item totals
  const lineTotals = useMemo(() => {
    return lineItems.map(item => {
      const revenue = item.unitCost * item.numberOfUnits
      const totalCost = item.driverCost + item.fuelCost + item.supplyCost + item.otherCost
      const grossMarginDollars = revenue - totalCost
      const grossMarginPercent = revenue > 0 ? (grossMarginDollars / revenue) * 100 : 0
      return { revenue, totalCost, grossMarginDollars, grossMarginPercent }
    })
  }, [lineItems])

  // Calculate summary totals
  const { totalRevenue, totalCost, totalGrossMargin, totalGrossMarginPercent, totalOverhead, netMargin, netMarginPercent } = useMemo(() => {
    const revenue = lineTotals.reduce((sum, l) => sum + l.revenue, 0)
    const cost = lineTotals.reduce((sum, l) => sum + l.totalCost, 0)
    const grossMargin = revenue - cost
    const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0

    const overhead = (revenue * overheadPercent) / 100
    const net = grossMargin - overhead
    const netPct = revenue > 0 ? (net / revenue) * 100 : 0

    return {
      totalRevenue: revenue,
      totalCost: cost,
      totalGrossMargin: grossMargin,
      totalGrossMarginPercent: grossMarginPct,
      totalOverhead: overhead,
      netMargin: net,
      netMarginPercent: netPct,
    }
  }, [lineTotals, overheadPercent])

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        serviceDescription: '',
        frequency: 'per_trip' as const,
        unitCost: 0,
        numberOfUnits: 1,
        driverCost: 0,
        fuelCost: 0,
        supplyCost: 0,
        otherCost: 0,
      },
    ])
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/pricing/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commercialLeadId,
          pricingType: 'commercial',
          pricingData: { lineItems, overheadPercent },
          totalPrice: totalRevenue,
          totalCost: totalCost,
          marginPercent: totalGrossMarginPercent,
          notes,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        alert(`Pricing saved (version ${data.data.version})`)
        onSave?.(data.data)
      } else {
        alert('Failed to save pricing')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Error saving pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const rows = [
      ['Commercial Pricing Calculator'],
      [],
      ['Service Description', 'Frequency', 'Unit Cost', 'Number of Units', 'Revenue', 'Driver Cost', 'Fuel Cost', 'Supply Cost', 'Other Cost', 'Total Cost', 'Gross Margin ($)', 'Gross Margin (%)'],
      ...lineItems.map((item, idx) => {
        const total = lineTotals[idx]
        return [
          item.serviceDescription,
          FREQUENCY_LABELS[item.frequency],
          item.unitCost,
          item.numberOfUnits,
          total.revenue,
          item.driverCost,
          item.fuelCost,
          item.supplyCost,
          item.otherCost,
          total.totalCost,
          total.grossMarginDollars,
          total.grossMarginPercent.toFixed(1) + '%',
        ]
      }),
      [],
      ['Summary'],
      ['Total Revenue', totalRevenue],
      ['Total Cost', totalCost],
      ['Total Gross Margin ($)', totalGrossMargin],
      ['Total Gross Margin (%)', totalGrossMarginPercent.toFixed(1) + '%'],
      ['Overhead %', overheadPercent.toFixed(1)],
      ['Total Overhead', totalOverhead],
      ['Net Margin ($)', netMargin],
      ['Net Margin (%)', netMarginPercent.toFixed(1) + '%'],
    ]

    const csv = rows.map(row => row.map(cell => (typeof cell === 'string' ? `"${cell}"` : cell)).join(',')).join('\n')
    // UTF-8 BOM forces Excel to interpret as UTF-8 (prevents â€" / Â mojibake on open)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commercial-pricing-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold text-white">Commercial Pricing Calculator</h2>

      {/* Line Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse text-gray-300">
          <thead>
            <tr className="bg-gray-800 border border-gray-700">
              <th className="px-2 py-2 text-left">Service Description</th>
              <th className="px-2 py-2 text-left">Frequency</th>
              <th className="px-2 py-2 text-right">Unit Cost</th>
              <th className="px-2 py-2 text-right">Units</th>
              <th className="px-2 py-2 text-right">Revenue</th>
              <th className="px-2 py-2 text-right">Gross Margin</th>
              <th className="px-2 py-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {lineItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-800 transition border-b border-gray-700">
                <td className="px-2 py-2">
                  <input
                    value={item.serviceDescription}
                    onChange={e => handleLineChange(idx, 'serviceDescription', e.target.value)}
                    placeholder="e.g., Medical Courier Service"
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={item.frequency}
                    onChange={e => handleLineChange(idx, 'frequency', e.target.value)}
                    className="px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={item.unitCost}
                    onChange={e => handleLineChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-gray-700 text-white rounded text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={item.numberOfUnits}
                    onChange={e => handleLineChange(idx, 'numberOfUnits', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-gray-700 text-white rounded text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs font-bold text-teal-400">
                  {formatCurrency(lineTotals[idx].revenue)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs">
                  <span className={lineTotals[idx].grossMarginPercent >= 30 ? 'text-green-400' : 'text-yellow-400'}>
                    {formatCurrency(lineTotals[idx].grossMarginDollars)}
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleRemoveLineItem(idx)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Line Item Button */}
      <button
        onClick={handleAddLineItem}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition"
      >
        <Plus size={16} />
        Add Line Item
      </button>

      {/* Cost Breakdown Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Cost Breakdown by Line</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lineItems.map((item, idx) => (
            <div key={idx} className="bg-gray-800 p-4 rounded border border-gray-700">
              <h4 className="font-semibold text-white mb-3 text-sm">{item.serviceDescription || 'Untitled Service'}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Driver Cost:</label>
                  <input
                    type="number"
                    value={item.driverCost}
                    onChange={e => handleLineChange(idx, 'driverCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Fuel Cost:</label>
                  <input
                    type="number"
                    value={item.fuelCost}
                    onChange={e => handleLineChange(idx, 'fuelCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Supply Cost:</label>
                  <input
                    type="number"
                    value={item.supplyCost}
                    onChange={e => handleLineChange(idx, 'supplyCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Other Cost:</label>
                  <input
                    type="number"
                    value={item.otherCost}
                    onChange={e => handleLineChange(idx, 'otherCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="text-gray-300 flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-mono">{formatCurrency(lineTotals[idx].revenue)}</span>
                  </div>
                  <div className="text-gray-300 flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-mono">{formatCurrency(lineTotals[idx].totalCost)}</span>
                  </div>
                  <div className="text-white font-semibold flex justify-between">
                    <span>Gross Margin:</span>
                    <span className="font-mono text-teal-400">{formatCurrency(lineTotals[idx].grossMarginDollars)} ({lineTotals[idx].grossMarginPercent.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-gray-800 p-6 rounded border border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-white">Pricing Summary</h3>

        <div>
          <label className="text-gray-400 text-sm">Overhead %:</label>
          <input
            type="number"
            value={overheadPercent}
            onChange={e => setOverheadPercent(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded"
          />
          <p className="text-gray-500 text-xs mt-1">Applied against total revenue</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total Revenue</div>
            <div className="text-white font-mono font-bold text-lg text-teal-400">{formatCurrency(totalRevenue)}</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total Cost</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalCost)}</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Gross Margin</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalGrossMargin)}</div>
            <div className="text-xs mt-1" style={{ color: totalGrossMarginPercent >= 30 ? '#4ade80' : '#eab308' }}>
              {totalGrossMarginPercent.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total Overhead</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalOverhead)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4 rounded">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-teal-100 text-sm">Net Margin</div>
              <div className="text-white text-3xl font-bold font-mono">{formatCurrency(netMargin)}</div>
              <div className="text-teal-200 text-sm mt-1">{netMarginPercent.toFixed(1)}% of revenue</div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm">Notes:</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Service assumptions, volume projections, seasonal adjustments, etc."
            className="w-full h-20 px-3 py-2 bg-gray-700 text-white rounded resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Pricing'}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>
    </div>
  )
}
