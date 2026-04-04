import { useAuth } from '@/lib/auth-context'
import type { EntityType } from '@/lib/types'

/**
 * Hook to check entity access and handle redirects
 */
export function useEntityAccess(entity: EntityType) {
  const { user, loading, canAccessEntity, isAdmin } = useAuth()

  const hasAccess = canAccessEntity(entity)
  const isEntityAdmin = isAdmin()

  return {
    hasAccess,
    isEntityAdmin,
    loading,
    user,
  }
}
