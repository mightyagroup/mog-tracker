'use client'

// Admin UI: manage who automatically gets Editor access on every Drive folder
// the system creates. Adding a new email here + clicking "Backfill all
// existing folders" closes the "Request access" loophole for all past bids.

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Member = {
  id: string
  email: string
  display_name: string | null
  role: 'editor' | 'commenter' | 'reader'
  entities: string[]
  active: boolean
  notes: string | null
  created_at: string
}

const ENTITIES = ['exousia', 'vitalx', 'ironhouse'] as const

export default function TeamDriveMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // Add form state
  const [newEmail, setNewEmail] = useState('')
  const [newDisplay, setNewDisplay] = useState('')
  const [newRole, setNewRole] = useState<'editor' | 'commenter' | 'reader'>('editor')
  const [newEntities, setNewEntities] = useState<string[]>([])
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)

  // Backfill state — runs across multiple paginated batches so it fits in
  // the Vercel serverless timeout regardless of folder count.
  const [backfilling, setBackfilling] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number; shared: number; skipped: number; errors: number } | null>(null)
  const [backfillResult, setBackfillResult] = useState<{ folders_processed?: number; total_emails_newly_shared?: number; total_emails_skipped_already_had_access?: number; total_errors?: number; total_folders_in_db?: number; error?: string } | null>(null)

  async function load() {
    setLoading(true); setError(null)
    const r = await fetch('/api/admin/team-drive-members')
    const j = await r.json()
    setLoading(false)
    if (j.error) { setError(j.error); return }
    setMembers(j.members || [])
  }

  useEffect(() => { load() }, [])

  async function add() {
    setAdding(true); setError(null); setMsg(null)
    const r = await fetch('/api/admin/team-drive-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail.trim().toLowerCase(),
        display_name: newDisplay || null,
        role: newRole,
        entities: newEntities,
        notes: newNotes || null,
      }),
    })
    const j = await r.json()
    setAdding(false)
    if (j.error) { setError(j.error); return }
    setMsg('Added ' + j.member.email + '. Click "Backfill" to grant access to existing folders.')
    setNewEmail(''); setNewDisplay(''); setNewEntities([]); setNewNotes('')
    load()
  }

  async function toggleActive(m: Member) {
    await fetch('/api/admin/team-drive-members?id=' + m.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !m.active }),
    })
    load()
  }

  async function remove(m: Member) {
    if (!confirm('Deactivate ' + m.email + '? They will lose access to NEW folders. Existing access on old folders remains until you remove it in Drive directly.')) return
    await fetch('/api/admin/team-drive-members?id=' + m.id, { method: 'DELETE' })
    load()
  }

  async function backfill(dryRun: boolean) {
    setBackfilling(true)
    setBackfillResult(null)
    setBackfillProgress(null)
    setError(null)

    if (dryRun) {
      const r = await fetch('/api/admin/drive/backfill-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      })
      const j = await r.json()
      setBackfilling(false)
      setBackfillResult(j)
      return
    }

    // Real run — paginate in batches of 25 folders so each request fits in
    // the serverless timeout. Loop until has_more is false.
    const PAGE = 25
    let offset = 0
    let totalShared = 0
    let totalSkipped = 0
    let totalErrors = 0
    let totalFolders = 0
    while (true) {
      const r = await fetch('/api/admin/drive/backfill-shares?limit=' + PAGE + '&offset=' + offset, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await r.json()
      if (j.error) {
        setError(j.error + (j.detail ? ': ' + j.detail : ''))
        setBackfilling(false)
        return
      }
      totalShared += j.total_emails_newly_shared || 0
      totalSkipped += j.total_emails_skipped_already_had_access || 0
      totalErrors += j.total_errors || 0
      totalFolders = j.total_folders_in_db || totalFolders
      const done = (j.slice_offset || 0) + (j.slice_size || 0)
      setBackfillProgress({ done, total: totalFolders, shared: totalShared, skipped: totalSkipped, errors: totalErrors })
      if (!j.has_more || j.next_offset == null) break
      offset = j.next_offset
    }

    setBackfillResult({
      folders_processed: totalFolders,
      total_folders_in_db: totalFolders,
      total_emails_newly_shared: totalShared,
      total_emails_skipped_already_had_access: totalSkipped,
      total_errors: totalErrors,
    })
    setBackfilling(false)
  }

  const inputCls = "w-full bg-[#111827] border border-[#374151] rounded px-3 py-2 text-sm text-white"
  const labelCls = "block text-xs uppercase tracking-wider text-gray-400 mb-1"

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Team Drive Members</h1>
          <p className="text-sm text-gray-400 mt-1">Anyone listed here gets Editor access automatically when the system creates a new Drive folder. Adding a new email here does not grant access to existing folders — click <b>Backfill</b> after.</p>
        </div>
        <Link href="/admin" className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Admin home</Link>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
      {msg && <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded mb-4">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Active members</h2>
          {loading ? <div>Loading…</div> : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-[#374151]">
                <tr>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Role</th>
                  <th className="text-left">Entities</th>
                  <th className="text-left">Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-[#374151]/50">
                    <td className="py-2"><b>{m.email}</b></td>
                    <td className="text-gray-300">{m.display_name || '—'}</td>
                    <td className="text-gray-300">{m.role}</td>
                    <td className="text-gray-300">{m.entities.length === 0 ? 'all' : m.entities.join(', ')}</td>
                    <td>
                      <button onClick={() => toggleActive(m)} className={"px-2 py-1 rounded text-xs " + (m.active ? "bg-green-900/40 text-green-200" : "bg-red-900/40 text-red-200")}>
                        {m.active ? 'active' : 'inactive'}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => remove(m)} className="text-xs text-red-300 hover:underline">remove</button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && <tr><td colSpan={6} className="text-gray-500 py-4 text-center">No members yet — add one to the right.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Add member</h2>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Email *</label>
              <input className={inputCls} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="va.name@example.com" />
            </div>
            <div>
              <label className={labelCls}>Display name</label>
              <input className={inputCls} value={newDisplay} onChange={e => setNewDisplay(e.target.value)} placeholder="VA Name" />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select className={inputCls} value={newRole} onChange={e => setNewRole(e.target.value as 'editor' | 'commenter' | 'reader')}>
                <option value="editor">editor (read+write)</option>
                <option value="commenter">commenter</option>
                <option value="reader">reader</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Entities (leave empty = all)</label>
              <div className="flex gap-2">
                {ENTITIES.map(e => (
                  <label key={e} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={newEntities.includes(e)} onChange={ev => {
                      if (ev.target.checked) setNewEntities([...newEntities, e])
                      else setNewEntities(newEntities.filter(x => x !== e))
                    }} />
                    <span>{e}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input className={inputCls} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="optional" />
            </div>
            <button disabled={adding || !newEmail} onClick={add} className="w-full px-3 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
              {adding ? 'Adding…' : 'Add member'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#1F2937] border border-[#374151] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-2">Backfill existing folders</h2>
        <p className="text-sm text-gray-400 mb-4">When you add a new member above, they only get access to <i>new</i> folders going forward. Click <b>Backfill</b> to grant access on every Drive folder we already created (gov_lead bid folders, commercial proposal folders, entity roots).</p>
        <div className="flex gap-3">
          <button disabled={backfilling} onClick={() => backfill(true)} className="px-3 py-2 rounded bg-[#374151] text-white text-sm border border-[#4B5563] disabled:opacity-50">
            Dry run (count only)
          </button>
          <button disabled={backfilling} onClick={() => backfill(false)} className="px-3 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
            {backfilling ? 'Backfilling…' : 'Backfill all existing folders'}
          </button>
        </div>
        {backfilling && backfillProgress && (
          <div className="mt-4 bg-blue-900/20 border border-blue-800/40 text-blue-200 p-3 rounded text-sm">
            Processing batch... <b>{backfillProgress.done}</b> / <b>{backfillProgress.total}</b> folders done · shared so far: <b>{backfillProgress.shared}</b> · skipped: <b>{backfillProgress.skipped}</b> · errors: <b>{backfillProgress.errors}</b>
          </div>
        )}
        {backfillResult && (
          <div className="mt-4 text-sm">
            {backfillResult.error ? (
              <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded">{backfillResult.error}</div>
            ) : (
              <div className="bg-green-900/20 border border-green-800/40 text-green-200 p-3 rounded">
                Folders processed: <b>{backfillResult.folders_processed}</b> ·
                Newly shared: <b>{backfillResult.total_emails_newly_shared}</b> ·
                Skipped (already had access): <b>{backfillResult.total_emails_skipped_already_had_access}</b> ·
                Errors: <b>{backfillResult.total_errors}</b>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
