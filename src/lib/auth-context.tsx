'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EntityType, UserRole, UserProfile } from '@/lib/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: Error | null
  hasRole: (role: UserRole | UserRole[]) => boolean
  canAccessEntity: (entity: EntityType) => boolean
  canEdit: () => boolean
  isAdmin: () => boolean
  refetch: () => Promise<void>
}

interface AuthUser extends UserProfile {
  authId: string
  authEmail: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (profileError) {
        // Profile doesn't exist yet, create it with viewer role
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

        setUser({
          ...newProfile,
          authId: authUser.id,
          authEmail: authUser.email || '',
        })
      } else {
        setUser({
          ...profile,
          authId: authUser.id,
          authEmail: authUser.email || '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user profile'))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserProfile()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile()
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const hasRole = (roleOrRoles: UserRole | UserRole[]): boolean => {
    if (!user) return false
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
    return roles.includes(user.role)
  }

  const canAccessEntity = (entity: EntityType): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    return user.entities_access.includes(entity)
  }

  const canEdit = (): boolean => {
    if (!user) return false
    return user.role === 'admin' || user.role === 'manager'
  }

  const isAdmin = (): boolean => {
    return hasRole('admin')
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    hasRole,
    canAccessEntity,
    canEdit,
    isAdmin,
    refetch: fetchUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
