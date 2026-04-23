'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { EntityType, UserRole } from '@/lib/types'

const ENTITY_OPTIONS: EntityType[] = ['exousia', 'vitalx', 'ironhouse']
const ROLE_OPTIONS: UserRole[] = ['admin', 'manager', 'va_entity', 'va_readonly', 'viewer']
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:        'Full access. Manages users. Can permanently delete leads.',
  manager:      'Full data read/write across all entities. Cannot manage users.',
  va_entity:    'Read/write ONLY assigned entities. Cannot delete permanently.',
  va_readonly:  'Read-only for assigned entities. No edits.',
  viewer:       'Read-only across ALL entities.',
}

interface AddUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'viewer' as UserRole,
    entities: [] as EntityType[],
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleEntity = (entity: EntityType) => {
    if (formData.entities.includes(entity)) {
      setFormData({
        ...formData,
        entities: formData.entities.filter((e) => e !== entity),
      })
    } else {
      setFormData({
        ...formData,
        entities: [...formData.entities, entity],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return
    }

    // Admin and viewer roles are global — they see everything.
    // VA and manager roles require explicit entity assignment.
    const isGlobalRole = formData.role === 'admin' || formData.role === 'viewer'
    if (!isGlobalRole && formData.entities.length === 0) {
      setError('Select at least one entity for this role')
      return
    }

    try {
      setLoading(true)

      // Call API route to create user
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          role: formData.role,
          entities: formData.entities,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1F2937] border border-[#374151] rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#374151]">
          <h2 className="text-lg font-bold text-white">Add New User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Temporary Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-gray-500 mt-1">User should change this on first login</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
              placeholder="John Doe"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as UserRole,
                  entities: e.target.value === 'admin' ? [] : formData.entities,
                })
              }
              className="w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role === 'va_entity' ? 'VA (Entity)' : role === 'va_readonly' ? 'VA (Read-only)' : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">{ROLE_DESCRIPTIONS[formData.role]}</p>
          </div>

          {/* Entities — not needed for admin or viewer (both are global) */}
          {formData.role !== 'admin' && formData.role !== 'viewer' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entity Access
              </label>
              <div className="space-y-2">
                {ENTITY_OPTIONS.map((entity) => (
                  <label
                    key={entity}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.entities.includes(entity)}
                      onChange={() => toggleEntity(entity)}
                      className="w-4 h-4 bg-[#111827] border border-[#374151] rounded accent-[#D4AF37]"
                    />
                    <span className="text-sm text-gray-300 capitalize">{entity}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {(formData.role === 'admin' || formData.role === 'viewer') && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 text-xs">
              {formData.role === 'admin' ? 'Admin' : 'Viewer'} users have access to all entities
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#374151] rounded text-gray-300 hover:bg-[#2D3748] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#D4AF37] text-[#111827] rounded font-medium hover:bg-[#E8C547] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
