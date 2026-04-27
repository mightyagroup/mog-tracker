'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type EntityHealth = {
  entity: string
  has_root_folder_id_in_db: boolean
  has_user_oauth_refresh_token: boolean
  has_service_account_json: boolean
  last_test_ok: boolean | null
  last_test_at: string | null
  last_test_error: string | null
  has_per_entity_oauth_client_creds: boolean
}
type Verdict = { entity: string; can_upload_via_oauth: boolean; missing: string[] }
type Diag = {
  env_vars: Record<string, boolean>
  root_folder_env: string | null
  entity_health: EntityHealth[]
  upload_readiness: Verdict[]
  summary: {
    service_account_present: boolean
    shared_oauth_creds_present: boolean
    entities_with_oauth_refresh_tokens: number
    entities_ready_to_upload: number
  }
  error?: string
}

function YesNo({ v }: { v: boolean | null | undefined }) {
  if (v === true) return <span className="text-green-400">YES</span>
  if (v === false) return <span className="text-red-400">NO</span>
  return <span className="text-gray-500">—</span>
}

export default function DriveDiagnosticsPage() {
  const [data, setData] = useState<Diag | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/drive-diagnostics').then(r => r.json()).then(j => { setData(j); setLoading(false) })
  }, [])

  if (loading) return <div className="px-8 py-6 text-white">Loading…</div>
  if (data?.error) return <div className="px-8 py-6 text-red-300">{data.error}</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Drive Diagnostics</h1>
          <p className="text-sm text-gray-400 mt-1">Health of every credential the upload pipeline depends on. Use this to debug 403 / quota errors.</p>
        </div>
        <Link href="/admin" className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">← Admin home</Link>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Service account in env: <YesNo v={data.summary.service_account_present} /></div>
              <div>OAuth client creds in env: <YesNo v={data.summary.shared_oauth_creds_present} /></div>
              <div>Entities with OAuth refresh tokens: <b>{data.summary.entities_with_oauth_refresh_tokens}</b> / 3</div>
              <div>Entities ready to upload: <b className={data.summary.entities_ready_to_upload === 3 ? 'text-green-400' : 'text-yellow-300'}>{data.summary.entities_ready_to_upload}</b> / 3</div>
            </div>
          </div>

          {/* Per-entity verdict */}
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">Per-entity upload readiness</h2>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-[#374151]">
                <tr><th className="text-left py-2">Entity</th><th className="text-left">Can upload</th><th className="text-left">Missing</th></tr>
              </thead>
              <tbody>
                {data.upload_readiness.map(v => (
                  <tr key={v.entity} className="border-b border-[#374151]/50">
                    <td className="py-2 font-semibold">{v.entity}</td>
                    <td><YesNo v={v.can_upload_via_oauth} /></td>
                    <td className="text-xs text-yellow-300">
                      {v.missing.length === 0 ? <span className="text-green-400">none</span> : v.missing.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed health */}
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">Detailed health (per entity)</h2>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-gray-400 border-b border-[#374151]">
                <tr>
                  <th className="text-left py-2">Entity</th>
                  <th>OAuth refresh token</th>
                  <th>OAuth client creds</th>
                  <th>SA JSON</th>
                  <th>Root folder ID</th>
                  <th>Last test OK</th>
                  <th>Last test error</th>
                </tr>
              </thead>
              <tbody>
                {data.entity_health.map(e => (
                  <tr key={e.entity} className="border-b border-[#374151]/50">
                    <td className="py-2 font-semibold">{e.entity}</td>
                    <td><YesNo v={e.has_user_oauth_refresh_token} /></td>
                    <td><YesNo v={e.has_per_entity_oauth_client_creds} /></td>
                    <td><YesNo v={e.has_service_account_json} /></td>
                    <td><YesNo v={e.has_root_folder_id_in_db} /></td>
                    <td><YesNo v={e.last_test_ok} /></td>
                    <td className="text-red-300 max-w-md truncate" title={e.last_test_error || ''}>{e.last_test_error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Env vars */}
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">Environment variables</h2>
            <p className="text-xs text-gray-400 mb-3">YES = the variable is set in the running process (Vercel env). NO = not set. Values are not displayed.</p>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(data.env_vars).map(([k, v]) => (
                  <tr key={k} className="border-b border-[#374151]/30">
                    <td className="py-1 font-mono">{k}</td>
                    <td><YesNo v={v} /></td>
                  </tr>
                ))}
                <tr className="border-b border-[#374151]/30">
                  <td className="py-1 font-mono">GOOGLE_DRIVE_ROOT_FOLDER_ID (value)</td>
                  <td className="text-gray-400 text-[11px]">{data.root_folder_env || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* What to do if entity is not ready */}
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">If &quot;Can upload&quot; is NO for an entity</h2>
            <ul className="text-sm space-y-2 list-disc ml-5">
              <li>Missing <b>OAuth refresh token</b> — open <Link className="underline text-yellow-300" href="/admin/entity-drives">/admin/entity-drives</Link> and re-connect that entity&apos;s Drive via the OAuth flow.</li>
              <li>Missing <b>OAuth client credentials</b> — add <code className="bg-black/40 px-1 rounded">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="bg-black/40 px-1 rounded">GOOGLE_OAUTH_CLIENT_SECRET</code> to Vercel env vars (Project Settings → Environment Variables). Use the Google Cloud OAuth client created when you first connected each entity. After adding env vars, redeploy.</li>
              <li>If your Workspace admin uses different OAuth clients per entity, set <code className="bg-black/40 px-1 rounded">GOOGLE_OAUTH_CLIENT_ID_EXOUSIA</code>, <code className="bg-black/40 px-1 rounded">_VITALX</code>, <code className="bg-black/40 px-1 rounded">_IRONHOUSE</code> instead.</li>
              <li>Once both pieces are in place, &quot;Can upload&quot; flips to YES and uploads from the lead detail panel will succeed.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
