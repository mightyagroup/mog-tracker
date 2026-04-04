'use client'

import { EntityType } from '@/lib/types'
import { ENTITY_BRANDING } from '@/lib/constants'

interface WinRateData {
  awarded: number
  lost: number
  rate: number
}

interface WinRateCardsProps {
  data: Record<EntityType, WinRateData>
}

export function WinRateCards({ data }: WinRateCardsProps) {
  const entities: EntityType[] = ['exousia', 'vitalx', 'ironhouse']

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {entities.map(entity => {
        const stats = data[entity]
        const branding = ENTITY_BRANDING[entity]
        const total = stats.awarded + stats.lost

        return (
          <div
            key={entity}
            className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg"
            style={{
              borderLeftColor: branding.accent,
              borderLeftWidth: '4px',
            }}
          >
            <h4 className="text-white font-bold text-sm mb-4">{branding.name}</h4>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-xs font-medium mb-1">Win Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-white text-3xl font-bold">{stats.rate.toFixed(0)}%</p>
                  <p className="text-gray-500 text-sm">({stats.awarded}/{total})</p>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${stats.rate}%`,
                    backgroundColor: branding.accent,
                  }}
                />
              </div>
              <div className="flex gap-4 text-sm mt-3">
                <div>
                  <p className="text-gray-400">Awarded</p>
                  <p className="text-green-400 font-bold">{stats.awarded}</p>
                </div>
                <div>
                  <p className="text-gray-400">Lost</p>
                  <p className="text-red-400 font-bold">{stats.lost}</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
