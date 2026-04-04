'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlyTrendData {
  month: string
  exousia: number
  vitalx: number
  ironhouse: number
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Monthly Trends (Last 12 Months)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line type="monotone" dataKey="exousia" stroke="#D4AF37" strokeWidth={2} dot={{ r: 4 }} name="Exousia" />
          <Line type="monotone" dataKey="vitalx" stroke="#06A59A" strokeWidth={2} dot={{ r: 4 }} name="VitalX" />
          <Line type="monotone" dataKey="ironhouse" stroke="#B45309" strokeWidth={2} dot={{ r: 4 }} name="IronHouse" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
