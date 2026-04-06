'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface FitScoreData {
  bucket: string
  count: number
}

interface FitScoreDistributionProps {
  data: FitScoreData[]
}

export function FitScoreDistribution({ data }: FitScoreDistributionProps) {
  const colors = ['#DC2626', '#F97316', '#EAB308', '#22C55E']

  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Fit Score Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="bucket" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="count" name="Number of Leads" fill="#3B82F6">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
