'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { EntityType } from '@/lib/types'

interface Category {
  entity: EntityType
  category: string
  color: string
  count: number
  value: number
}

interface CategoryBreakdownProps {
  data: Category[]
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg flex items-center justify-center h-80">
        <p className="text-gray-400">No category data available</p>
      </div>
    )
  }

  // Group by entity then category
  const groupedData = data.reduce(
    (acc, item) => {
      const key = `${item.entity}-${item.category}`
      acc.push({
        name: item.category,
        entity: item.entity,
        count: item.count,
        value: item.value,
        color: item.color,
      })
      return acc
    },
    [] as Array<{ name: string; entity: EntityType; count: number; value: number; color: string }>
  )

  // Create a grid view instead of bar chart for better readability
  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Service Category Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedData.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#111827] rounded p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            style={{
              borderLeftColor: item.color,
              borderLeftWidth: '4px',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-gray-400 text-xs uppercase font-semibold">{item.entity}</p>
                <p className="text-white font-bold text-sm mt-1">{item.name}</p>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            </div>
            <div className="space-y-1 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Leads:</span>
                <span className="text-white font-semibold">{item.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Value:</span>
                <span className="text-white font-semibold">${(item.value / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
