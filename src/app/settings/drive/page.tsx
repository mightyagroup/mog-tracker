'use client'

// Per-user Drive settings. Each logged-in user connects their own Drive folder
// per entity. Bid folders auto-create inside the user's connected folder when
// they upload via the tracker. Separate from /admin/entity-drives, which is the
// admin-only entity default.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

type Entity = 'exousia' | 'vitalx' | 'ironhouse'

type UserConfig = {
  entity: Entity
  root_folder_id: string | null
  user_oauth_refresh_token: string | null
  user_oauth_email: string | null
  test_connection_ok: boolean | null
  test_connection_error: string | null
}

const ENTITIES: Entity[] = ['exousia', 'vitalx', 'ironhouse']
const ENTITY_LABELS: Record<Entity, string> = {
  exousia: 'Exousia Solutions',
  vitalx: 'VitalX',
  ironhouse: 'IronHouse J&L',
}

function Inner() {
  const params = useSearchParams()
  const connectedEntity = params?.get('connected')
  const oauthError = params?.get('oauth_error')

  const [configs, setConfigs] = useState<Record<Entity, UserConfig | null>>({ exousia: null, vitalx: null, ironhouse: null })
  const [folderInput, setFolderInput] = useState<Record<Entity, string>>({ exousia: '', vitalx: '', ironhouse: '' })
  const [saving, setSaving] = useState<Entity | null>(null)
  const [testing, setTesting] = useState<Entity | null>(null)
  const [disconnecting, setDisconnecting] = useState<Entity | null>(null)
  const [msg, setMsg] = useState<Record<Entity, string | null>>({ exousia: null, vitalx: null, ironhouse: null })
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')

  async function load() {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (user?.email) setUserEmail(user.email)
    const { data } = await supa.from('user_drive_configs').select('*')
    const next: Record<Entity, UserConfig | null> = { exousia: null, vitalx: null, ironhouse: null }
    const f: Record<Entity, string> = { exousia: '', vitalx: '', ironhouse: '' }
    for (const row of (data as UserConfig[] | null) || []) {
      next[row.entity] = row
      f[row.entity] = row.root_folder_id || ''
    }
    setConfigs(next)
    setFolderInput(f)
    setLoading(false)
  }

  useEffect(() => {
    load()
    if (connectedEntity && ENTITIES.includes(connectedEntity as Entity)) {
      setMsg(m => ({ ...m, [connectedEntity]: 'Drive connected. Now paste your Root folder ID and click Test connection.' }))
    }
    if (oauthError) {
      setMsg({ exousia: 'OAuth error: ' + oauthError, vitalx: 'OAuth error: ' + oauthError, ironhouse: 'OAuth error: ' + oauthError })
    }
  }, [connectedEntity, oauthError])

  async function saveFolderId(entity: Entity) {
    setSaving(entity)
    setMsg(m => ({ ...m, [entity]: null }))
    try {
      const supa = createClient()
      const { data: { user } } = await supa.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { error } = await supa.from('user_drive_configs').upsert({
        user_id: user.id,
        entity,
        root_folder_id: folderInput[entity] || null,
      }, { onConflict: 'user_id,entity' })
      if (error) throw new Error(error.message)
      setMsg(m => ({ ...m, [entity]: 'Folder ID saved.' }))
      await load()
    } catch (e: unknown) {
      setMsg(m => ({ ...m, [entity]: 'Error: ' + (e as Error).message }))
    } finally {
      setSaving(null)
    }
  }

  async function test(entity: Entity) {
    setTesting(entity)
    setMsg(m => ({ ...m, [entity]: null }))
    try {
      const r = await fetch('/api/admin/entity-drives/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, scope: 'user' }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'test failed')
      const auth = j.auth_kind ? ' [' + j.auth_kind + ']' : ''
      setMsg(m => ({ ...m, [entity]: j.ok ? 'Connection OK' + auth + '. Found ' + (j.file_count || 0) + ' files in your folder.' : 'Test failed: ' + (j.error || 'unknown') }))
      await load()
    } catch (e: unknown) {
      setMsg(m => ({ ...m, [entity]: 'Test error: ' + (e as Error).message }))
    } finally {
      setTesting(null)
    }
  }

  async function disconnect(entity: Entity) {
    if (!confirm('Disconnect your Drive for ' + ENTITY_LABELS[entity] + '? You can reconnect anytime.')) return
    setDisconnecting(entity)
    try {
      const supa = createClient()
      const { data: { user } } = await supa.auth.getUser()
      if (!user) return
      await supa.from('user_drive_configs').delete().eq('user_id', user.id).eq('entity', entity)
      setMsg(m => ({ ...m, [entity]: 'Disconnected.' }))
      await load()
    } finally {
      setDisconnecting(null)
    }
  }

  function connectOAuth(entity: Entity) {
    window.location.href = '/api/oauth/google/start?entity=' + entity
  }

  if (loading) return <div className="px-8 py-6 text-white">Loading your Drive settings…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Your Drive Connections</h1>
          <p className="text-sm text-gray-400 mt-1">
            Each user connects their own Drive folder per entity. Bids you start through the tracker land in <span className="text-white">your</span> folder, not anyone else&apos;s.
          </p>
          {userEmail && <p className="text-xs text-gray-500 mt-1">Signed in as {userEmail}</p>}
        </div>
        <Link href="/" className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Home</Link>
      </div>

      <div className="bg-[#1F2937] border border-blue-700 rounded-lg p-4 mb-6 text-sm">
        <div className="text-blue-300 font-semibold mb-1">How this works</div>
        <ol className="text-gray-300 space-y-1 list-decimal list-inside text-xs">
          <li>Click <span className="text-white">Connect Drive</span> for an entity. Sign in with the Google account that owns the Drive folder you want to use.</li>
          <li>In your Drive, find the folder where new bid folders should auto-create (e.g. <span className="text-white">Exousia Proposals/Active</span>). Copy the folder ID from the URL — the part after <code>/folders/</code>.</li>
          <li>Paste that ID below as <span className="text-white">Root folder ID</span>, click Save, then Test connection.</li>
        </ol>
      </div>

      <div className="space-y-4">
        {ENTITIES.map(entity => {
          const cfg = configs[entity]
          const hasOAuth = Boolean(cfg?.user_oauth_refresh_token)
          const testedOk = cfg?.test_connection_ok === true
          const testedFailed = cfg?.test_connection_ok === false
          return (
            <div key={entity} className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold text-white">{ENTITY_LABELS[entity]}</h2>
                  {hasOAuth && <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">Connected</span>}
                  {!hasOAuth && <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">Not connected</span>}
                  {testedOk && <span className="text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-300">Connection OK</span>}
                  {testedFailed && <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-300">Connection failed</span>}
                  {cfg?.user_oauth_email && (
                    <span className="text-xs text-gray-400">as {cfg.user_oauth_email}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => connectOAuth(entity)}
                    className="px-3 py-1.5 rounded bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-semibold"
                  >
                    {hasOAuth ? 'Reconnect Drive' : 'Connect Drive'}
                  </button>
                  {hasOAuth && (
                    <button
                      onClick={() => test(entity)}
                      disabled={testing === entity}
                      className="px-3 py-1.5 rounded bg-[#374151] text-white text-xs disabled:opacity-50"
                    >
                      {testing === entity ? 'Testing…' : 'Test connection'}
                    </button>
                  )}
                  {hasOAuth && (
                    <button
                      onClick={() => disconnect(entity)}
                      disabled={disconnecting === entity}
                      className="px-3 py-1.5 rounded bg-red-900/40 text-red-200 text-xs disabled:opacity-50"
                    >
                      {disconnecting === entity ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Your Root folder ID</label>
                <input
                  className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-white"
                  placeholder="e.g. 1c9cog7Z5jQ56FfrTp4NUjhoAfhqAPUiz"
                  value={folderInput[entity]}
                  onChange={e => setFolderInput(f => ({ ...f, [entity]: e.target.value }))}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Pick a folder in YOUR Drive — bid folders the tracker creates will land inside this folder. Stays separate from anyone else&apos;s Drive setup for this entity.
                </div>
              </div>

              {msg[entity] && (
                <div className={'mt-3 p-2 rounded text-xs ' + (msg[entity]?.startsWith('Error') || msg[entity]?.startsWith('Test error') || msg[entity]?.startsWith('Test failed') || msg[entity]?.startsWith('OAuth error') ? 'bg-red-900/30 border border-red-700 text-red-200' : 'bg-green-900/30 border border-green-700 text-green-200')}>
                  {msg[entity]}
                </div>
              )}

              {cfg?.test_connection_error && !msg[entity] && (
                <div className="mt-3 p-2 rounded text-xs bg-red-900/30 border border-red-700 text-red-200">
                  Last test error: {cfg.test_connection_error}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => saveFolderId(entity)}
                  disabled={saving === entity}
                  className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50"
                >
                  {saving === entity ? 'Saving…' : 'Save folder ID'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DriveSettings() {
  return (
    <Suspense fallback={<div className="px-8 py-6 text-white">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
