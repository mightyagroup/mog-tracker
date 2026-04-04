'use client'

import { EntityType } from '@/lib/types'
import { TrendingUp } from 'lucide-react'

interface PipelineSummaryCardsProps {
  totalLeads: number
  activeBids: number
  awards: number
  pipelineValue: number
  selectedEntity?: EntityType | 'all'
}

export function PipelineSummaryCards({
  totalLeads,
  activeBids,
  awards,
  pipelineValue,
  selectedEntity = 'all',
}: PipelineSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Leads',
      value: totalLeads.toLocaleString(),
      trend: '+12%',
      icon: '📋',
      bgGradient: 'from-blue-900 to-blue-700',
    },
    {
      label: 'Active Bids',
      value: activeBids.toLocaleString(),
      trend: '+5%',
      icon: '🎯',
      bgGradient: 'from-green-900 to-green-700',
    },
    {
      label: 'Awards',
      value: awards.toLocaleString(),
      trend: '+8%',
      icon: '🏆',
      bgGradient: 'from-amber-900 to-amber-700',
    },
    {
      label: 'Pipeline Value',
      value: `$${(pipelineValue / 1000000).toFixed(1)}M`,
      trend: '+15%',
      icon: '💰',
      bgGradient: 'from-purple-900 to-purple-700',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-gradient-to-br ${card.bgGradient} rounded-lg p-6 border border-gray-700 shadow-lg`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-300 text-sm font-medium">{card.label}</p>
              <p className="text-white text-3xl font-bold mt-2">{card.value}</p>
            </div>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <div className="flex items-center gap-2 text-green-300 text-sm font-medium">
            <TrendingUp size={16} />
            <span>{card.trend}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
