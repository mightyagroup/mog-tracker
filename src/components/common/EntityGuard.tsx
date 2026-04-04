'use client'

import { useAuth } from '@/lib/auth-context'
import { LoadingSpinner } from './LoadingSpinner'
import { AccessDenied } from './AccessDenied'
import type { EntityType } from '@/lib/types'

interface EntityGuardProps {
  entity: EntityType
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function EntityGuard({ entity, children, fallback }: EntityGuardProps) {
  const { loading, canAccessEntity } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!canAccessEntity(entity)) {
    return (
      fallback || (
        <AccessDenied
          resource={entity}
          message={`You don't have permission to access the ${entity} tracker.`}
        />
      )
    )
  }

  return <>{children}</>
}
