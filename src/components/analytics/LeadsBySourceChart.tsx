'use client'

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { SourceType } from '@/lib/types'
import { SOURCE_LABELS } from '@/lib/constants'

interface LeadsBySourceChartProps {
  data: Record<SourceType, number>
}

const SOURCE_COLORS: Record<SourceType, string> = {
  sam_gov: '#3B82F6',
  govwin: '#6366F1',
  eva: '#8B5CF6',
  emma: '#EC4899',
  local_gov: '#F59E0B',
  usaspending: '#06B6D4',
  manual: '#6B7280',
  commercial: '#10B981',
}

export function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
  // Filter out zero-value sources
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => ({
      name: SOURCE_LABELS[source as SourceType],
      value: count,
    }))

  if (chartData.length === 0) {
    return (
      <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg flex items-center justify-center h-80">
        <p className="text-gray-400">No lead source data available</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Leads by Source</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => {
              const sources = Object.keys(data) as SourceType[]
              const source = sources[
                sources.findIndex(s => SOURCE_LABELS[s] === entry.name)
              ]
              return <Cell key={`cell-${index}`} fill={SOURCE_COLORS[source]} />
            })}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
