'use client'

// Admin page for per-entity Google Drive configuration.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Entity = 'exousia' | 'vitalx' | 'ironhouse'

type Config = {
  entity: Entity
  root_folder_id: string | null
  root_folder_url: string | null
  service_account_email: string | null
  service_account_json: Record<string, unknown> | null
  shared_drive_id: string | null
  default_proposal_subfolder: string | null
  active: boolean
  test_connection_ok: boolean | null
  test_connection_at: string | null
  test_connection_error: string | null
}

const ENTITIES: Entity[] = ['exousia', 'vitalx', 'ironhouse']
const ENTITY_LABELS: Record<Entity, string> = {
  exousia: 'Exousia Solutions',
  vitalx: 'VitalX',
  ironhouse: 'IronHouse J&L',
}

export default function EntityDrivesAdmin() {
  const [configs, setConfigs] = useState<Record<Entity, Config | null>>({ exousia: null, vitalx: null, ironhouse: null })
  const [jsonInput, setJsonInput] = useState<Record<Entity, string>>({ exousia: '', vitalx: '', ironhouse: '' })
  const [folderInput, setFolderInput] = useState<Record<Entity, string>>({ exousia: '', vitalx: '', ironhouse: '' })
  const [saving, setSaving] = useState<Entity | null>(null)
  const [testing, setTesting] = useState<Entity | null>(null)
  const [msg, setMsg] = useState<Record<Entity, string | null>>({ exousia: null, vitalx: null, ironhouse: null })
  const [loading, setLoading] = useState(true)

  async function load() {
    const supa = createClient()
    const { data } = await supa.from('entity_drive_configs').select('*')
    const next: Record<Entity, Config | null> = { exousia: null, vitalx: null, ironhouse: null }
    const f: Record<Entity, string> = { exousia: '', vitalx: '', ironhouse: '' }
    for (const row of (data as Config[] | null) || []) {
      next[row.entity] = row
      f[row.entity] = row.root_folder_id || ''
    }
    setConfigs(next)
    setFolderInput(f)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save(entity: Entity) {
    setSaving(entity)
    setMsg(m => ({ ...m, [entity]: null }))
    try {
      const patch: Record<string, unknown> = {
        root_folder_id: folderInput[entity] || null,
      }
      const jsonRaw = jsonInput[entity].trim()
      if (jsonRaw) {
        let parsed: Record<string, unknown>
        try { parsed = JSON.parse(jsonRaw) }
        catch { throw new Error('Service account JSON is not valid JSON') }
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error('Service account JSON is missing client_email or private_key')
        }
        patch.service_account_json = parsed
        patch.service_account_email = parsed.client_email as string
      }
      const supa = createClient()
      const { error } = await supa.from('entity_drive_configs').update(patch).eq('entity', entity)
      if (error) throw new Error(error.message)
      setMsg(m => ({ ...m, [entity]: 'Saved.' }))
      setJsonInput(j => ({ ...j, [entity]: '' }))
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
        body: JSON.stringify({ entity }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'test failed')
      setMsg(m => ({ ...m, [entity]: j.ok ? 'Connection OK. Found ' + (j.file_count || 0) + ' files in root folder.' : 'Test failed: ' + (j.error || 'unknown') }))
      await load()
    } catch (e: unknown) {
      setMsg(m => ({ ...m, [entity]: 'Test error: ' + (e as Error).message }))
    } finally {
      setTesting(null)
    }
  }

  if (loading) return <div className="px-8 py-6 text-white">Loading Drive configs…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Entity Google Drives</h1>
          <p className="text-sm text-gray-400 mt-1">
            Each entity connects its own Drive. MOG Group is the managing entity but files go into the correct owner&apos;s Drive.
          </p>
        </div>
        <Link href="/admin" className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Admin</Link>
      </div>

      <div className="bg-[#1F2937] border border-yellow-700 rounded-lg p-4 mb-6 text-sm">
        <div className="text-yellow-300 font-semibold mb-1">How to set up a service account</div>
        <ol className="text-gray-300 space-y-1 list-decimal list-inside text-xs">
          <li>Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer" className="text-[#D4AF37] underline">Google Cloud Console → Service Accounts</a>, create one per entity.</li>
          <li>Enable the Google Drive API on that project.</li>
          <li>Create a JSON key for the service account and paste it below.</li>
          <li>In Google Drive, create a root folder (e.g. &ldquo;Exousia Proposals&rdquo;). Share it with the service account&apos;s client_email as Editor. Copy the folder ID from the URL and paste it as Root Folder ID.</li>
          <li>Click Save then Test connection.</li>
        </ol>
      </div>

      <div className="space-y-4">
        {ENTITIES.map(entity => {
          const cfg = configs[entity]
          const hasKey = Boolean(cfg?.service_account_json)
          const testedOk = cfg?.test_connection_ok === true
          const testedFailed = cfg?.test_connection_ok === false
          return (
            <div key={entity} className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-white">{ENTITY_LABELS[entity]}</h2>
                  <span className={'text-xs px-2 py-0.5 rounded ' + (hasKey ? 'bg-green-900/40 text-green-300' : 'bg-gray-700 text-gray-300')}>
                    {hasKey ? 'Service account saved' : 'Not configured'}
                  </span>
                  {testedOk && <span className="text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-300">Connection OK</span>}
                  {testedFailed && <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-300">Connection failed</span>}
                </div>
                {hasKey && (
                  <button
                    onClick={() => test(entity)}
                    disabled={testing === entity}
                    className="px-3 py-1.5 rounded bg-[#374151] text-white text-xs disabled:opacity-50"
                  >
                    {testing === entity ? 'Testing…' : 'Test connection'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Service account JSON</label>
                  <textarea
                    rows={6}
                    className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white font-mono"
                    placeholder={hasKey ? 'Paste a new JSON here to replace the existing one…' : 'Paste the full service account JSON here'}
                    value={jsonInput[entity]}
                    onChange={e => setJsonInput(j => ({ ...j, [entity]: e.target.value }))}
                  />
                  {cfg?.service_account_email && (
                    <div className="text-xs text-gray-500 mt-1">Current: {cfg.service_account_email}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Root folder ID</label>
                  <input
                    className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-white"
                    placeholder="e.g. 1a2B3c4D5e6F..."
                    value={folderInput[entity]}
                    onChange={e => setFolderInput(f => ({ ...f, [entity]: e.target.value }))}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Share this folder with the service account email (Editor access) before saving.
                  </div>
                </div>
              </div>

              {msg[entity] && (
                <div className={'mt-3 p-2 rounded text-xs ' + (msg[entity]?.startsWith('Error') || msg[entity]?.startsWith('Test error') || msg[entity]?.startsWith('Test failed') ? 'bg-red-900/30 border border-red-700 text-red-200' : 'bg-green-900/30 border border-green-700 text-green-200')}>
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
                  onClick={() => save(entity)}
                  disabled={saving === entity}
                  className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50"
                >
                  {saving === entity ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
