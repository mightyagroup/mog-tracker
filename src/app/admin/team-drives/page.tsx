'use client'

// Admin-only: configure each team member's Drive folder per entity.
// VAs and other team members never see any OAuth flow — admin connects once
// (at /settings/drive), that token becomes the team-shared OAuth, then admin
// just sets each user's destination folder ID here.

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Entity = 'exousia' | 'vitalx' | 'ironhouse'

type DriveConfig = {
  user_id: string
  entity: Entity
  root_folder_id: string | null
  user_oauth_email: string | null
  test_connection_ok: boolean | null
}

type TeamUser = {
  id: string
  email: string
  last_sign_in_at: string | null
  roles: string[]
  drive_configs: DriveConfig[]
}

const ENTITIES: Entity[] = ['exousia', 'vitalx', 'ironhouse']
const ENTITY_LABELS: Record<Entity, string> = {
  exousia: 'Exousia',
  vitalx: 'VitalX',
  ironhouse: 'IronHouse',
}

export default function TeamDrives() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch('/api/admin/team-drives/list-users')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'load failed')
      setUsers(j.users || [])
      // Seed edits from existing configs
      const seed: Record<string, string> = {}
      for (const u of j.users || []) {
        for (const c of u.drive_configs || []) {
          seed[u.id + ':' + c.entity] = c.root_folder_id || ''
        }
      }
      setEdits(seed)
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function configFor(u: TeamUser, e: Entity): DriveConfig | null {
    return u.drive_configs.find(c => c.entity === e) || null
  }

  function inputKey(userId: string, entity: Entity): string {
    return userId + ':' + entity
  }

  async function save(userId: string, entity: Entity) {
    const key = inputKey(userId, entity)
    setSaving(key)
    try {
      const r = await fetch('/api/admin/team-drives/set-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, entity, root_folder_id: edits[key] || null }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'save failed')
      await load()
    } catch (e: unknown) {
      alert('Save failed: ' + (e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="px-8 py-6 text-white">Loading team Drive configs…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Team Drive Folders</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Set each team member&apos;s destination folder per entity. Team members never need to deal with OAuth — they just sign into the tracker and uploads go to the folder you set here. This works because you (admin) connected your Google account once at <Link href="/settings/drive" className="underline text-[#D4AF37]">/settings/drive</Link>; that token is shared as the team OAuth pool.
          </p>
        </div>
        <Link href="/admin" className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Admin</Link>
      </div>

      {err && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4 text-sm">{err}</div>}

      <div className="bg-[#1F2937] border border-yellow-700 rounded-lg p-4 mb-6 text-sm">
        <div className="text-yellow-300 font-semibold mb-1">How to set up a team member</div>
        <ol className="text-gray-300 space-y-1 list-decimal list-inside text-xs">
          <li>Make sure you (admin) have already connected your Drive at <span className="text-white">/settings/drive</span> for each entity. That puts your OAuth token in the team pool.</li>
          <li>Create the team member&apos;s account in <span className="text-white">Admin → Users</span> (or Supabase Studio). They&apos;ll show up in this table when they exist as auth users.</li>
          <li>In your Drive, find or create the folder where their bid uploads should land (e.g. VA Operations/Active). Copy the folder ID from the URL — the part after <code>/folders/</code>.</li>
          <li>Paste that folder ID into the row below for the right entity, click Save.</li>
          <li>Tell the team member their tracker login. They sign in, do their work, uploads go to the folder you assigned. Done.</li>
        </ol>
      </div>

      <div className="bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#111827] text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Roles</th>
              {ENTITIES.map(e => <th key={e} className="px-4 py-3 text-left">{ENTITY_LABELS[e]} folder ID</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-[#374151]">
                <td className="px-4 py-3">
                  <div className="text-white text-sm">{u.email}</div>
                  {u.last_sign_in_at && <div className="text-xs text-gray-500">last sign-in {new Date(u.last_sign_in_at).toLocaleDateString()}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {(u.roles || []).map(r => <span key={r} className="text-xs px-2 py-0.5 rounded bg-[#374151]">{r}</span>)}
                    {(!u.roles || u.roles.length === 0) && <span className="text-xs text-gray-500">none</span>}
                  </div>
                </td>
                {ENTITIES.map(e => {
                  const cfg = configFor(u, e)
                  const key = inputKey(u.id, e)
                  return (
                    <td key={e} className="px-4 py-3">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-[#111827] border border-[#374151] rounded px-2 py-1 text-xs text-white"
                          placeholder="folder ID"
                          value={edits[key] !== undefined ? edits[key] : (cfg?.root_folder_id || '')}
                          onChange={ev => setEdits(s => ({ ...s, [key]: ev.target.value }))}
                        />
                        <button
                          onClick={() => save(u.id, e)}
                          disabled={saving === key}
                          className="px-2 py-1 rounded bg-[#D4AF37] text-[#111827] text-xs font-semibold disabled:opacity-50"
                        >
                          {saving === key ? '…' : 'Save'}
                        </button>
                      </div>
                      {cfg?.test_connection_ok === true && <div className="text-[10px] text-green-400 mt-1">Test OK</div>}
                      {cfg?.test_connection_ok === false && <div className="text-[10px] text-red-400 mt-1">Test failed</div>}
                      {cfg?.user_oauth_email && <div className="text-[10px] text-blue-300 mt-1">own OAuth: {cfg.user_oauth_email}</div>}
                    </td>
                  )
                })}
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No users yet. Create users in Admin → Users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
