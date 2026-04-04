'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PipelineSummaryCards } from '@/components/analytics/PipelineSummaryCards'
import { LeadsByStatusChart } from '@/components/analytics/LeadsByStatusChart'
import { LeadsBySourceChart } from '@/components/analytics/LeadsBySourceChart'
import { MonthlyTrendChart } from '@/components/analytics/MonthlyTrendChart'
import { FitScoreDistribution } from '@/components/analytics/FitScoreDistribution'
import { WinRateCards } from '@/components/analytics/WinRateCards'
import { DeadlineTimeline } from '@/components/analytics/DeadlineTimeline'
import { TopAgenciesTable } from '@/components/analytics/TopAgenciesTable'
import { CategoryBreakdown } from '@/components/analytics/CategoryBreakdown'
import { CommercialPipeline } from '@/components/analytics/CommercialPipeline'
import { EntityType } from '@/lib/types'
import { Filter, Download, RefreshCw } from 'lucide-react'

interface AnalyticsData {
  pipelinesSummary: {
    totalLeads: number
    activeBids: number
    awards: number
    pipelineValue: number
    byEntity: Record<EntityType, { leads: number; bids: number; awards: number; value: number }>
  }
  statusDistribution: Record<EntityType, Record<string, number>>
  sourceDistribution: Record<string, number>
  monthlyTrends: Array<{ month: string; exousia: number; vitalx: number; ironhouse: number }>
  fitScoreDistribution: Array<{ bucket: string; count: number }>
  winRates: Record<EntityType, { awarded: number; lost: number; rate: number }>
  avgTimeToAward: Record<EntityType, number>
  deadlineProximity: {
    overdue: number
    sevenDays: number
    fourteenDays: number
    thirtyDays: number
    sixtyPlus: number
  }
  topAgencies: Array<{ agency: string; count: number; value: number; avgFitScore: number }>
  categoryBreakdown: Array<{
    entity: EntityType
    category: string
    color: string
    count: number
    value: number
  }>
  commercialPipeline: {
    prospect: number
    outreach: number
    proposal: number
    negotiation: number
    contract: number
    lost: number
    inactive: number
    totalValue: number
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'all'>('all')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/analytics')
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    fetch('/api/analytics')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  if (loading || !data) {
    return (
      <div className="flex h-screen bg-[#111827]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="space-y-4">
              <div className="h-12 bg-[#374151] rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-40 bg-[#374151] rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#111827]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-gray-400 mt-1">Comprehensive bid tracking analytics and insights</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F2937] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#374151] transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#1F2937] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#374151] transition-colors">
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="mb-8 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-gray-400 text-sm font-medium">Entity:</span>
              <select
                value={selectedEntity}
                onChange={e => setSelectedEntity(e.target.value as EntityType | 'all')}
                className="px-3 py-2 bg-[#1F2937] border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-gray-500"
              >
                <option value="all">All Entities</option>
                <option value="exousia">Exousia Solutions</option>
                <option value="vitalx">VitalX</option>
                <option value="ironhouse">IronHouse</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <PipelineSummaryCards
            totalLeads={data.pipelinesSummary.totalLeads}
            activeBids={data.pipelinesSummary.activeBids}
            awards={data.pipelinesSummary.awards}
            pipelineValue={data.pipelinesSummary.pipelineValue}
            selectedEntity={selectedEntity}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <LeadsByStatusChart data={data.statusDistribution} />
            <LeadsBySourceChart data={data.sourceDistribution} />
          </div>

          {/* Trend Chart - Full Width */}
          <div className="mb-8">
            <MonthlyTrendChart data={data.monthlyTrends} />
          </div>

          {/* Score & Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <FitScoreDistribution data={data.fitScoreDistribution} />
            <div>
              <DeadlineTimeline
                overdue={data.deadlineProximity.overdue}
                sevenDays={data.deadlineProximity.sevenDays}
                fourteenDays={data.deadlineProximity.fourteenDays}
                thirtyDays={data.deadlineProximity.thirtyDays}
                sixtyPlus={data.deadlineProximity.sixtyPlus}
              />
            </div>
          </div>

          {/* Win Rate Cards */}
          <WinRateCards data={data.winRates} />

          {/* Agency & Category Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TopAgenciesTable data={data.topAgencies} />
            <div className="flex flex-col gap-6">
              <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
                <h3 className="text-white text-lg font-bold mb-4">Key Metrics</h3>
                <div className="space-y-4">
                  {Object.entries(data.avgTimeToAward).map(([entity, days]) => (
                    <div key={entity} className="flex justify-between items-center">
                      <span className="text-gray-400 capitalize">{entity} Avg Time to Award</span>
                      <span className="text-white font-bold">{days} days</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown - Full Width */}
          <div className="mb-8">
            <CategoryBreakdown data={data.categoryBreakdown} />
          </div>

          {/* Commercial Pipeline */}
          <div className="mb-8">
            <CommercialPipeline data={data.commercialPipeline} />
          </div>
        </div>
      </main>
    </div>
  )
}
