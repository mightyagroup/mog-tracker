'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const ENTITY_COLORS: Record<string, string> = {
  exousia: '#D4AF37',
  vitalx:  '#06A59A',
  ironhouse: '#B45309',
}

const SOURCE_COLORS: Record<string, string> = {
  sam_gov:     '#3B82F6',
  govwin:      '#6366F1',
  eva:         '#8B5CF6',
  emma:        '#EC4899',
  local_gov:   '#F59E0B',
  usaspending: '#06B6D4',
  manual:      '#6B7280',
  commercial:  '#10B981',
}

interface PipelineChartsProps {
  pipelineData: Array<{ entity: string; value: number }>
  statusData: Array<{ name: string; value: number }>
  categoryData: Array<{ name: string; value: number }>
  sourceData: Array<{ name: string; value: number }>
  formatPipeline: (value: number) => string
}

export function PipelineCharts({ pipelineData, statusData, categoryData, sourceData, formatPipeline }: PipelineChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Pipeline Value by Entity */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pipeline Value by Entity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pipelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="entity" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#FFFFFF' }}
              formatter={(value) => [value ? formatPipeline(Number(value)) : '$0', 'Value']}
            />
            <Bar dataKey="value" fill="#D4AF37" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lead Status Distribution */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Lead Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(ENTITY_COLORS)[index % Object.values(ENTITY_COLORS).length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Leads by Category */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Leads by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" />
            <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={120} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#FFFFFF' }}
            />
            <Bar dataKey="value" fill="#06A59A" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leads by Source */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sourceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#FFFFFF' }}
            />
            <Bar dataKey="value">
              {sourceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry.name as keyof typeof SOURCE_COLORS] || '#6B7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}