'use client'

import { useAuth } from '@/lib/auth-context'
import type { EntityType } from '@/lib/types'

interface HeaderProps {
  title: string
  entity?: EntityType
}

const ENTITY_INFO: Record<EntityType, { name: string; color: string }> = {
  exousia: { name: 'Exousia Solutions', color: '#D4AF37' },
  vitalx: { name: 'VitalX', color: '#06A59A' },
  ironhouse: { name: 'IronHouse', color: '#B45309' },
}

export function Header({ title, entity }: HeaderProps) {
  const { user } = useAuth()

  const entityInfo = entity ? ENTITY_INFO[entity] : null

  return (
    <header className="border-b border-[#374151] bg-[#1F2937] px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {entityInfo && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entityInfo.color }}
              />
            )}
            <h1 className="text-2xl font-bold text-white">{title}</h1>
          </div>
          {entityInfo && (
            <p className="text-sm text-gray-400 mt-1">{entityInfo.name}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-300">{user?.display_name || user?.email}</p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{user?.role} role</p>
        </div>
      </div>
    </header>
  )
}
