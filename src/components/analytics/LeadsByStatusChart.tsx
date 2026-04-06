'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LeadStatus } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'

interface LeadsByStatusChartProps {
  data: Record<string, Record<LeadStatus, number>>
}

export function LeadsByStatusChart({ data }: LeadsByStatusChartProps) {
  // Transform data for recharts
  const chartData = Object.entries(data).map(([entity, statuses]) => ({
    name: entity.charAt(0).toUpperCase() + entity.slice(1),
    ...Object.entries(statuses).reduce((acc, [status, count]) => {
      acc[status] = count
      return acc
    }, {} as Record<string, number>),
  }))

  const statuses: LeadStatus[] = [
    'new',
    'reviewing',
    'bid_no_bid',
    'active_bid',
    'submitted',
    'awarded',
    'lost',
    'no_bid',
    'cancelled',
  ]

  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Leads by Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {statuses.map(status => (
            <Bar key={status} dataKey={status} stackId="a" name={STATUS_LABELS[status]} fill={STATUS_COLORS[status].bg}>
              {/* Bar children for styling if needed */}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
