'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Download, Save } from 'lucide-react'

interface ClinRow {
  clinNumber: string
  description: string
  quantity: number
  unit: 'each' | 'hour' | 'month' | 'lot' | 'sqft'
  unitCost: number
  laborCost: number
  materialsCost: number
  equipmentCost: number
  subcontractorCost: number
  overheadCost: number
  otherCost: number
  marginPercent: number
}

interface GovPricingCalculatorProps {
  govLeadId?: string
  initialData?: {
    clins?: ClinRow[]
    overheadPercent?: number
    gaPercent?: number
    profitPercent?: number
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

const UNIT_LABELS: Record<string, string> = {
  each: 'Each',
  hour: 'Hour',
  month: 'Month',
  lot: 'Lot',
  sqft: 'Sq Ft',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

export function GovPricingCalculator({ govLeadId, initialData, onSave }: GovPricingCalculatorProps) {
  const [clins, setClins] = useState<ClinRow[]>(
    initialData?.clins || [
      {
        clinNumber: 'CLIN-001',
        description: '',
        quantity: 1,
        unit: 'month' as const,
        unitCost: 0,
        laborCost: 0,
        materialsCost: 0,
        equipmentCost: 0,
        subcontractorCost: 0,
        overheadCost: 0,
        otherCost: 0,
        marginPercent: 15,
      },
    ]
  )

  const [overheadPercent, setOverheadPercent] = useState(initialData?.overheadPercent || 10)
  const [gaPercent, setGaPercent] = useState(initialData?.gaPercent || 12)
  const [profitPercent, setProfitPercent] = useState(initialData?.profitPercent || 15)
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  // Calculate CLIN totals
  const clinTotals = useMemo(() => {
    return clins.map(clin => {
      const extendedPrice = clin.quantity * clin.unitCost
      const subCosts = clin.laborCost + clin.materialsCost + clin.equipmentCost + clin.subcontractorCost + clin.overheadCost + clin.otherCost
      const totalCost = Math.max(extendedPrice, subCosts) || 0
      const marginAmount = (totalCost * clin.marginPercent) / 100
      const totalPrice = totalCost + marginAmount
      return { totalCost, marginAmount, totalPrice }
    })
  }, [clins])

  // Calculate grand totals
  const { totalBaseCost, totalMargin, subtotal, totalOverhead, totalGa, totalProfit, grandTotal } = useMemo(() => {
    const sumBaseCost = clinTotals.reduce((sum, c) => sum + c.totalCost, 0)
    const sumMargin = clinTotals.reduce((sum, c) => sum + c.marginAmount, 0)
    const sub = sumBaseCost + sumMargin

    const overhead = (sub * overheadPercent) / 100
    const ga = ((sub + overhead) * gaPercent) / 100
    const profit = ((sub + overhead + ga) * profitPercent) / 100

    const grand = sub + overhead + ga + profit

    return {
      totalBaseCost: sumBaseCost,
      totalMargin: sumMargin,
      subtotal: sub,
      totalOverhead: overhead,
      totalGa: ga,
      totalProfit: profit,
      grandTotal: grand,
    }
  }, [clinTotals, overheadPercent, gaPercent, profitPercent])

  const handleAddClin = () => {
    const newClinNum = `CLIN-${String(clins.length + 1).padStart(3, '0')}`
    setClins([
      ...clins,
      {
        clinNumber: newClinNum,
        description: '',
        quantity: 1,
        unit: 'month' as const,
        unitCost: 0,
        laborCost: 0,
        materialsCost: 0,
        equipmentCost: 0,
        subcontractorCost: 0,
        overheadCost: 0,
        otherCost: 0,
        marginPercent: 15,
      },
    ])
  }

  const handleRemoveClin = (index: number) => {
    setClins(clins.filter((_, i) => i !== index))
  }

  const handleClinChange = (index: number, field: keyof ClinRow, value: string | number) => {
    const updated = [...clins]
    updated[index] = { ...updated[index], [field]: value }
    setClins(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/pricing/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          govLeadId,
          pricingType: 'government',
          pricingData: { clins, overheadPercent, gaPercent, profitPercent },
          totalPrice: grandTotal,
          totalCost: totalBaseCost,
          marginPercent: totalBaseCost > 0 ? ((grandTotal - totalBaseCost) / totalBaseCost) * 100 : 0,
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
      ['Government Pricing Calculator'],
      [],
      ['CLIN Number', 'Description', 'Quantity', 'Unit', 'Unit Cost', 'Extended Price', 'Labor Cost', 'Materials Cost', 'Equipment Cost', 'Subcontractor Cost', 'Overhead Cost', 'Other Cost', 'Total Cost', 'Margin %', 'Margin Amount', 'Total Price'],
      ...clins.map((clin, idx) => {
        const total = clinTotals[idx]
        return [
          clin.clinNumber,
          clin.description,
          clin.quantity,
          UNIT_LABELS[clin.unit],
          clin.unitCost,
          clin.quantity * clin.unitCost,
          clin.laborCost,
          clin.materialsCost,
          clin.equipmentCost,
          clin.subcontractorCost,
          clin.overheadCost,
          clin.otherCost,
          total.totalCost,
          clin.marginPercent,
          total.marginAmount,
          total.totalPrice,
        ]
      }),
      [],
      ['Summary'],
      ['Total Base Cost', totalBaseCost],
      ['Total Margin', totalMargin],
      ['Subtotal', subtotal],
      ['Overhead %', overheadPercent],
      ['Total Overhead', totalOverhead],
      ['G&A %', gaPercent],
      ['Total G&A', totalGa],
      ['Profit %', profitPercent],
      ['Total Profit/Fee', totalProfit],
      ['Grand Total Price', grandTotal],
    ]

    const csv = rows.map(row => row.map(cell => (typeof cell === 'string' ? `"${cell}"` : cell)).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gov-pricing-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const blendedMargin = totalBaseCost > 0 ? ((grandTotal - totalBaseCost) / totalBaseCost) * 100 : 0

  return (
    <div className="space-y-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold text-white">Government CLIN Pricing Calculator</h2>

      {/* CLIN Rows Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse text-gray-300">
          <thead>
            <tr className="bg-gray-800 border border-gray-700">
              <th className="px-2 py-2 text-left">CLIN #</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-left">Unit</th>
              <th className="px-2 py-2 text-right">Unit Cost</th>
              <th className="px-2 py-2 text-right">Extended</th>
              <th className="px-2 py-2 text-right">Margin %</th>
              <th className="px-2 py-2 text-right">Total Price</th>
              <th className="px-2 py-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {clins.map((clin, idx) => (
              <tr key={idx} className="hover:bg-gray-800 transition border-b border-gray-700">
                <td className="px-2 py-2">
                  <input
                    value={clin.clinNumber}
                    onChange={e => handleClinChange(idx, 'clinNumber', e.target.value)}
                    className="w-20 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={clin.description}
                    onChange={e => handleClinChange(idx, 'description', e.target.value)}
                    placeholder="Service description"
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={clin.quantity}
                    onChange={e => handleClinChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-gray-700 text-white rounded text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={clin.unit}
                    onChange={e => handleClinChange(idx, 'unit', e.target.value)}
                    className="px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  >
                    {Object.entries(UNIT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={clin.unitCost}
                    onChange={e => handleClinChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-gray-700 text-white rounded text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs">
                  {formatCurrency(clin.quantity * clin.unitCost)}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={clin.marginPercent}
                    onChange={e => handleClinChange(idx, 'marginPercent', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-gray-700 text-white rounded text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs font-bold text-blue-400">
                  {formatCurrency(clinTotals[idx].totalPrice)}
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleRemoveClin(idx)}
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

      {/* Add CLIN Button */}
      <button
        onClick={handleAddClin}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
      >
        <Plus size={16} />
        Add CLIN
      </button>

      {/* Sub-cost Breakdown Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Sub-Cost Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clins.map((clin, idx) => (
            <div key={idx} className="bg-gray-800 p-4 rounded border border-gray-700">
              <h4 className="font-semibold text-white mb-3 text-sm">{clin.clinNumber}: {clin.description || 'Untitled'}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Labor Cost:</label>
                  <input
                    type="number"
                    value={clin.laborCost}
                    onChange={e => handleClinChange(idx, 'laborCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Materials:</label>
                  <input
                    type="number"
                    value={clin.materialsCost}
                    onChange={e => handleClinChange(idx, 'materialsCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Equipment:</label>
                  <input
                    type="number"
                    value={clin.equipmentCost}
                    onChange={e => handleClinChange(idx, 'equipmentCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Subcontractor:</label>
                  <input
                    type="number"
                    value={clin.subcontractorCost}
                    onChange={e => handleClinChange(idx, 'subcontractorCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Overhead:</label>
                  <input
                    type="number"
                    value={clin.overheadCost}
                    onChange={e => handleClinChange(idx, 'overheadCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="text-gray-400 w-32">Other:</label>
                  <input
                    type="number"
                    value={clin.otherCost}
                    onChange={e => handleClinChange(idx, 'otherCost', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  />
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="text-gray-300 flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-mono">{formatCurrency(clinTotals[idx].totalCost)}</span>
                  </div>
                  <div className="text-gray-300 flex justify-between">
                    <span>Margin Amount:</span>
                    <span className="font-mono">{formatCurrency(clinTotals[idx].marginAmount)}</span>
                  </div>
                  <div className="text-white font-semibold flex justify-between">
                    <span>Total Price:</span>
                    <span className="font-mono text-blue-400">{formatCurrency(clinTotals[idx].totalPrice)}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 text-sm">Overhead %:</label>
            <input
              type="number"
              value={overheadPercent}
              onChange={e => setOverheadPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">G&A %:</label>
            <input
              type="number"
              value={gaPercent}
              onChange={e => setGaPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Profit/Fee %:</label>
            <input
              type="number"
              value={profitPercent}
              onChange={e => setProfitPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total Base Cost</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalBaseCost)}</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total Overhead</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalOverhead)}</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total G&A</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalGa)}</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 text-xs">Total Profit/Fee</div>
            <div className="text-white font-mono font-bold">{formatCurrency(totalProfit)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-blue-100 text-sm">Grand Total Price</div>
              <div className="text-white text-3xl font-bold font-mono">{formatCurrency(grandTotal)}</div>
              <div className="text-blue-200 text-sm mt-1">Blended Margin: {blendedMargin.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm">Notes:</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Internal notes, assumptions, pricing methodology..."
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
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>
    </div>
  )
}
