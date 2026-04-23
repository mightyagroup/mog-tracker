'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'

interface FeedRun {
  id: string
  feed_name: string
  started_at: string
  finished_at: string | null
  status: 'running' | 'success' | 'partial' | 'failed'
  trigger_source: string | null
  fetched_count: number
  inserted_count: number
  updated_count: number
  skipped_count: number
  amendment_count: number
  error_count: number
  errors: unknown[]
  run_notes: string | null
  duration_ms: number | null
}

const FEED_LABELS: Record<string, string> = {
  sam_gov: 'SAM.gov Feed',
  eva: 'eVA (Virginia) Feed',
  emma: 'eMMA (Maryland) Feed',
  auto_archive_stale: 'Auto-archive Stale Leads',
  purge_archived: 'Permanent Purge (7d archived)',
  daily_digest: 'Daily Digest',
  deadline_check: 'Deadline Check',
}

const STATUS_STYLE: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircle2 size={14} />, color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
  partial: { icon: <AlertCircle size={14} />, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  failed:  { icon: <XCircle size={14} />,      color: 'text-red-400',   bg: 'bg-red-500/15 border-red-500/30' },
  running: { icon: <Clock size={14} />,        color: 'text-blue-400',  bg: 'bg-blue-500/15 border-blue-500/30' },
}

export default function FeedHealthPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()
  const [runs, setRuns] = useState<FeedRun[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !isAdmin()) router.push('/')
  }, [authLoading, isAdmin, router])

  const fetchRuns = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('feed_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50)
    setRuns((data as FeedRun[]) || [])
    setLoading(false)
  }

  useEffect(() => { if (isAdmin()) fetchRuns() }, [isAdmin])

  const triggerFeed = async (path: string) => {
    setTriggering(path)
    try {
      const res = await fetch(`/api/cron/${path}`)
      const body = await res.json()
      alert(res.ok ? `Triggered successfully: ${JSON.stringify(body).slice(0, 300)}` : `Failed: ${body.error}`)
      await fetchRuns()
    } catch (e) {
      alert(`Error: ${e}`)
    } finally {
      setTriggering(null)
    }
  }

  if (authLoading || !isAdmin()) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>

  // Group latest run per feed
  const latestByFeed: Record<string, FeedRun> = {}
  for (const r of runs) if (!latestByFeed[r.feed_name]) latestByFeed[r.feed_name] = r

  return (
    <div className="flex h-screen bg-[#111827]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Feed Health" entity={undefined} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Cron + Feed Health</h2>
                <p className="text-gray-400 text-sm mt-1">Last 50 runs across all scheduled jobs. Click any feed name to force a manual run.</p>
              </div>
              <button onClick={fetchRuns} className="flex items-center gap-2 px-3 py-2 rounded bg-[#374151] text-gray-300 text-sm hover:bg-[#4B5563]">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Latest status per feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {Object.entries(FEED_LABELS).map(([key, label]) => {
                const r = latestByFeed[key]
                const style = r ? STATUS_STYLE[r.status] : { icon: <Clock size={14} />, color: 'text-gray-500', bg: 'bg-gray-500/15 border-gray-500/30' }
                return (
                  <div key={key} className={`rounded-lg border p-4 ${style.bg}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {r ? `Last run ${new Date(r.started_at).toLocaleString()}` : 'Never run'}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-semibold uppercase ${style.color}`}>
                        {style.icon}
                        {r?.status ?? 'no data'}
                      </div>
                    </div>
                    {r && (
                      <div className="text-xs text-gray-300 mt-2 space-y-0.5">
                        {r.fetched_count > 0 && <div>Fetched: {r.fetched_count}</div>}
                        {r.inserted_count > 0 && <div>Inserted: {r.inserted_count}</div>}
                        {r.updated_count > 0 && <div>Updated: {r.updated_count}</div>}
                        {r.amendment_count > 0 && <div className="text-orange-400">Amendments: {r.amendment_count}</div>}
                        {r.error_count > 0 && <div className="text-red-400">Errors: {r.error_count}</div>}
                        {r.duration_ms && <div>Duration: {(r.duration_ms / 1000).toFixed(1)}s</div>}
                      </div>
                    )}
                    <button
                      onClick={() => triggerFeed(key.replace('_', '-'))}
                      disabled={triggering === key.replace('_', '-')}
                      className="mt-3 w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#374151] text-gray-200 hover:bg-[#4B5563] disabled:opacity-50"
                    >
                      {triggering === key.replace('_', '-') ? 'Running...' : 'Run now'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Full run history */}
            <h3 className="text-lg font-semibold text-white mb-3">Run History</h3>
            {loading ? <LoadingSpinner /> : (
              <div className="bg-[#1F2937] rounded-lg border border-[#374151] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#111827] text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">Feed</th>
                      <th className="text-left px-3 py-2">Started</th>
                      <th className="text-left px-3 py-2">Duration</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-right px-3 py-2">Fetched</th>
                      <th className="text-right px-3 py-2">Inserted</th>
                      <th className="text-right px-3 py-2">Updated</th>
                      <th className="text-right px-3 py-2">Amend.</th>
                      <th className="text-right px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {runs.map(r => {
                      const style = STATUS_STYLE[r.status]
                      return (
                        <tr key={r.id} className="border-t border-[#374151]">
                          <td className="px-3 py-2 font-medium">{FEED_LABELS[r.feed_name] || r.feed_name}</td>
                          <td className="px-3 py-2 text-xs text-gray-400">{new Date(r.started_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-xs text-gray-400">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                          <td className={`px-3 py-2 ${style.color} text-xs font-semibold uppercase`}>{r.status}</td>
                          <td className="px-3 py-2 text-right">{r.fetched_count || '—'}</td>
                          <td className="px-3 py-2 text-right">{r.inserted_count || '—'}</td>
                          <td className="px-3 py-2 text-right">{r.updated_count || '—'}</td>
                          <td className="px-3 py-2 text-right">{r.amendment_count || '—'}</td>
                          <td className="px-3 py-2 text-right">{r.error_count > 0 ? <span className="text-red-400">{r.error_count}</span> : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
