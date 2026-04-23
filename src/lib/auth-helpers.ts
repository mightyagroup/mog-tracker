import type { SupabaseClient } from '@supabase/supabase-js'
import type { EntityType, UserRole, UserProfile } from '@/lib/types'

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Get the current user's profile from Supabase
 */
export async function getUserProfile(
  supabase: SupabaseClient
): Promise<UserProfile | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', authUser.id)
    .single()

  if (error) {
    // Auto-create profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authUser.id,
        email: authUser.email,
        display_name: authUser.email?.split('@')[0] || 'User',
        role: 'viewer',
        entities_access: [],
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return newProfile
  }

  return profile
}

/**
 * Require a specific role - throws AuthorizationError if user doesn't have it
 */
export async function requireRole(
  supabase: SupabaseClient,
  requiredRole: UserRole | UserRole[]
): Promise<UserProfile> {
  const profile = await getUserProfile(supabase)

  if (!profile || !profile.is_active) {
    throw new AuthorizationError('User not authenticated or inactive')
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  if (!roles.includes(profile.role)) {
    throw new AuthorizationError(
      `Requires ${roles.join(' or ')} role, but user has ${profile.role}`
    )
  }

  return profile
}

/**
 * Require access to a specific entity - throws AuthorizationError if user can't access it
 */
export async function requireEntityAccess(
  supabase: SupabaseClient,
  entity: EntityType
): Promise<UserProfile> {
  const profile = await getUserProfile(supabase)

  if (!profile || !profile.is_active) {
    throw new AuthorizationError('User not authenticated or inactive')
  }

  // Admins can access any entity
  if (profile.role === 'admin') {
    return profile
  }

  // Check if user has access to this entity
  if (!profile.entities_access.includes(entity)) {
    throw new AuthorizationError(`User does not have access to ${entity}`)
  }

  return profile
}

/**
 * Require edit permissions - admin, manager, or va_entity (read/write on their entities).
 * viewer and va_readonly are blocked.
 */
export async function requireEditAccess(supabase: SupabaseClient): Promise<UserProfile> {
  return requireRole(supabase, ['admin', 'manager', 'va_entity'])
}

/**
 * Check if user is admin (doesn't throw, returns boolean)
 */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  try {
    const profile = await getUserProfile(supabase)
    return profile?.role === 'admin' && profile?.is_active === true
  } catch {
    return false
  }
}

/**
 * Check if user can edit (doesn't throw, returns boolean).
 * admin, manager, va_entity can edit. viewer and va_readonly cannot.
 */
export async function canEdit(supabase: SupabaseClient): Promise<boolean> {
  try {
    const profile = await getUserProfile(supabase)
    if (!profile?.is_active) return false
    return ['admin', 'manager', 'va_entity'].includes(profile.role)
  } catch {
    return false
  }
}

/**
 * Check if user can access entity (doesn't throw, returns boolean)
 */
export async function canAccessEntity(
  supabase: SupabaseClient,
  entity: EntityType
): Promise<boolean> {
  try {
    const profile = await getUserProfile(supabase)
    if (!profile || !profile.is_active) return false
    if (profile.role === 'admin') return true
    return profile.entities_access.includes(entity)
  } catch {
    return false
  }
}
