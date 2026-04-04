'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { UserList } from '@/components/admin/UserList'
import { AddUserModal } from '@/components/admin/AddUserModal'
import { Plus } from 'lucide-react'
import type { UserProfile } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !isAdmin()) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (!isAdmin()) return

    const fetchUsers = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (err) throw err
        setUsers(data || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isAdmin])

  const handleUserAdded = async () => {
    setShowAddModal(false)
    // Refetch users
    try {
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setUsers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh users')
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAdmin()) {
    return null
  }

  return (
    <div className="flex h-screen bg-[#111827]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Admin Panel" entity={undefined} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Manage user roles and entity access
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#D4AF37] text-[#111827] px-4 py-2 rounded-lg font-medium hover:bg-[#E8C547] transition-colors"
              >
                <Plus size={18} />
                Add User
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Users table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <UserList users={users} onUserUpdated={() => handleUserAdded()} />
            )}
          </div>
        </main>
      </div>

      {/* Add user modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => handleUserAdded()}
        />
      )}
    </div>
  )
}
