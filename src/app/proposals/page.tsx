'use client'

// Proposals hub — pipeline board across all three entities.
// Filter by entity, status, assigned VA. Sort by deadline urgency.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type ProposalRow = {
  id: string
  entity: 'exousia' | 'vitalx' | 'ironhouse'
  gov_lead_id: string
  status: string
  submission_deadline: string | null
  submission_method: string | null
  assigned_va: string | null
  last_validation_status: string | null
  fatal_flaw_count: number | null
  intake_complete: boolean | null
  gov_leads?: { title?: string; agency?: string; naics_code?: string; estimated_value?: number }
}

const STATUS_ORDER = ['intake', 'drafting', 'pink_team', 'validating', 'ready', 'submitted', 'awarded', 'lost']

const ENTITY_COLORS: Record<string, { primary: string; accent: string }> = {
  exousia:   { primary: '#253A5E', accent: '#D4AF37' },
  vitalx:    { primary: '#064E3B', accent: '#06A59A' },
  ironhouse: { primary: '#292524', accent: '#B45309' },
}

function daysUntil(iso: string | null): string {
  if (!iso) return '—'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  return d < 0 ? 'overdue' : (d === 0 ? 'today' : d + 'd')
}

function urgencyBg(iso: string | null): string {
  if (!iso) return '#374151'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  if (d < 0) return '#7F1D1D'
  if (d < 3) return '#DC2626'
  if (d < 7) return '#D97706'
  if (d < 14) return '#059669'
  return '#374151'
}

export default function ProposalsHub() {
  const [rows, setRows] = useState<ProposalRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data, error } = await supa.from('proposals')
        .select('id, entity, gov_lead_id, status, submission_deadline, submission_method, assigned_va, last_validation_status, fatal_flaw_count, intake_complete, gov_leads(title, agency, naics_code, estimated_value)')
        .is('archived_at', null)
        .order('submission_deadline', { ascending: true, nullsFirst: false })
      if (!cancelled) {
        if (error) setError(error.message)
        else setRows((data as unknown as ProposalRow[]) || [])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter(r =>
      (entityFilter === 'all' || r.entity === entityFilter) &&
      (statusFilter === 'all' || r.status === statusFilter)
    )
  }, [rows, entityFilter, statusFilter])

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-gray-400 text-sm mt-1">Production pipeline across Exousia, VitalX, and IronHouse.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/proposals/exousia" className="px-3 py-2 rounded bg-[#253A5E] text-white text-sm">Exousia</Link>
          <Link href="/proposals/vitalx" className="px-3 py-2 rounded bg-[#064E3B] text-white text-sm">VitalX</Link>
          <Link href="/proposals/ironhouse" className="px-3 py-2 rounded bg-[#292524] text-white text-sm">IronHouse</Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="bg-[#1F2937] text-white text-sm rounded px-3 py-2 border border-[#374151]">
          <option value="all">All entities</option>
          <option value="exousia">Exousia</option>
          <option value="vitalx">VitalX</option>
          <option value="ironhouse">IronHouse</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#1F2937] text-white text-sm rounded px-3 py-2 border border-[#374151]">
          <option value="all">All statuses</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded">{error}</div>}
      {!rows && <div className="text-gray-400">Loading proposals…</div>}
      {rows && filtered.length === 0 && (
        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-8 text-center text-gray-400">
          No proposals yet. Create a proposal from any gov lead marked active_bid.
        </div>
      )}
      {filtered.length > 0 && (
        <div className="bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#111827] text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Entity</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Agency</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Deadline</th>
                <th className="px-4 py-3 text-left">Validation</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const ec = ENTITY_COLORS[r.entity] || { primary: '#374151', accent: '#D4AF37' }
                return (
                  <tr key={r.id} className="border-t border-[#374151]">
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 rounded text-xs font-semibold text-white" style={{ background: ec.primary }}>
                        {r.entity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.gov_leads?.title?.slice(0, 60) || '(untitled)'}
                      {r.gov_leads?.naics_code && <span className="ml-2 text-xs text-gray-500">NAICS {r.gov_leads.naics_code}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{r.gov_leads?.agency?.slice(0, 40) || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-[#374151] capitalize">{r.status}</span>
                      {!r.intake_complete && <span className="ml-2 text-xs text-yellow-400">intake pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs text-white" style={{ background: urgencyBg(r.submission_deadline) }}>
                        {daysUntil(r.submission_deadline)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.last_validation_status === 'ready_for_review' && <span className="text-green-400 text-xs">✓ ready</span>}
                      {r.last_validation_status === 'hold_action_required' && (
                        <span className="text-red-400 text-xs">⚠ hold ({r.fatal_flaw_count || 0} fatal)</span>
                      )}
                      {!r.last_validation_status && <span className="text-gray-500 text-xs">not validated</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={'/proposals/' + r.entity + '/' + r.id + '/intake'} className="text-[#D4AF37] text-xs hover:underline">open →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
