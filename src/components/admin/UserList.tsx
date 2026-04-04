'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit2, Trash2, Check, X } from 'lucide-react'
import type { UserProfile, EntityType, UserRole } from '@/lib/types'

const ENTITY_OPTIONS: EntityType[] = ['exousia', 'vitalx', 'ironhouse']
const ROLE_OPTIONS: UserRole[] = ['admin', 'manager', 'viewer']

interface UserListProps {
  users: UserProfile[]
  onUserUpdated: () => void
}

export function UserList({ users, onUserUpdated }: UserListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  const startEdit = (user: UserProfile) => {
    setEditingId(user.id)
    setEditForm(user)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setError(null)
  }

  const handleSave = async () => {
    if (!editingId || !editForm) return

    try {
      setError(null)
      const { error: err } = await supabase
        .from('user_profiles')
        .update({
          role: editForm.role,
          entities_access: editForm.entities_access,
          display_name: editForm.display_name,
          is_active: editForm.is_active,
        })
        .eq('id', editingId)

      if (err) throw err

      setEditingId(null)
      setEditForm({})
      onUserUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      setDeleting(id)
      setError(null)
      const { error: err } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id)

      if (err) throw err
      onUserUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  const toggleEntity = (entity: EntityType) => {
    const current = editForm.entities_access || []
    if (current.includes(entity)) {
      setEditForm({
        ...editForm,
        entities_access: current.filter((e) => e !== entity),
      })
    } else {
      setEditForm({
        ...editForm,
        entities_access: [...current, entity],
      })
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No users yet. Add one to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <table className="w-full">
        <thead>
          <tr className="border-b border-[#374151]">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Name / Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Entities
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#374151]">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-[#1F2937]/50 transition-colors">
              {editingId === user.id ? (
                <>
                  {/* Display name input */}
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editForm.display_name || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, display_name: e.target.value })
                      }
                      className="w-full bg-[#1F2937] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                      placeholder="Display name"
                    />
                    <div className="text-xs text-gray-500 mt-1">{editForm.email}</div>
                  </td>

                  {/* Role selector */}
                  <td className="px-6 py-4">
                    <select
                      value={editForm.role || 'viewer'}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          role: e.target.value as UserRole,
                        })
                      }
                      className="bg-[#1F2937] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Entities checkboxes */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {ENTITY_OPTIONS.map((entity) => (
                        <label key={entity} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.entities_access?.includes(entity) || false}
                            onChange={() => toggleEntity(entity)}
                            className="w-4 h-4 bg-[#1F2937] border border-[#374151] rounded"
                          />
                          <span className="text-sm text-gray-300 capitalize">{entity}</span>
                        </label>
                      ))}
                    </div>
                  </td>

                  {/* Status toggle */}
                  <td className="px-6 py-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_active || false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            is_active: e.target.checked,
                          })
                        }
                        className="w-4 h-4 bg-[#1F2937] border border-[#374151] rounded"
                      />
                      <span className="text-sm text-gray-300">Active</span>
                    </label>
                  </td>

                  {/* Save/Cancel */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSave}
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                        title="Save"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 text-gray-400 hover:bg-[#374151] rounded transition-colors"
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  {/* Name/Email (display) */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {user.display_name || 'Unnamed'}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>

                  {/* Role (display) */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-red-500/10 text-red-400'
                          : user.role === 'manager'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>

                  {/* Entities (display) */}
                  <td className="px-6 py-4">
                    {user.role === 'admin' ? (
                      <span className="text-xs text-gray-400">All entities</span>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {user.entities_access?.length === 0 ? (
                          <span className="text-xs text-gray-500">None</span>
                        ) : (
                          user.entities_access?.map((entity) => (
                            <span
                              key={entity}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-[#374151] text-gray-300 capitalize"
                            >
                              {entity}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status (display) */}
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium ${
                        user.is_active ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="p-2 text-gray-400 hover:bg-[#374151] rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deleting === user.id}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
