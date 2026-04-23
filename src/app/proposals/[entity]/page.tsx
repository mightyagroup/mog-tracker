'use client'

// Per-entity proposal hub. Lists proposals for this entity only with
// entity-branded header and status board.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type EntitySlug = 'exousia' | 'vitalx' | 'ironhouse'

const ENTITY_META: Record<EntitySlug, { name: string; primary: string; accent: string; tagline: string }> = {
  exousia:   { name: 'Exousia Solutions',   primary: '#253A5E', accent: '#D4AF37', tagline: 'Trust. Honor. Execute.' },
  vitalx:    { name: 'VitalX',              primary: '#064E3B', accent: '#06A59A', tagline: 'HIPAA-compliant healthcare logistics.' },
  ironhouse: { name: 'IronHouse J&L',       primary: '#292524', accent: '#B45309', tagline: 'Facilities done right.' },
}

const STATUS_COLUMNS = [
  { key: 'intake',      label: 'Intake' },
  { key: 'drafting',    label: 'Drafting' },
  { key: 'pink_team',   label: 'Pink Team' },
  { key: 'validating',  label: 'Validating' },
  { key: 'ready',       label: 'Ready' },
  { key: 'submitted',   label: 'Submitted' },
]

type ProposalRow = {
  id: string
  status: string
  submission_deadline: string | null
  assigned_va: string | null
  intake_complete: boolean | null
  last_validation_status: string | null
  fatal_flaw_count: number | null
  gov_lead_id: string
  gov_leads?: { title?: string; agency?: string; solicitation_number?: string; estimated_value?: number }
}

function daysUntil(iso: string | null): string {
  if (!iso) return '—'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  return d < 0 ? 'overdue' : (d === 0 ? 'today' : d + 'd')
}

function urgencyColor(iso: string | null): string {
  if (!iso) return '#374151'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  if (d < 0) return '#7F1D1D'
  if (d < 3) return '#DC2626'
  if (d < 7) return '#D97706'
  if (d < 14) return '#059669'
  return '#374151'
}

export default function EntityProposalHub() {
  const params = useParams<{ entity: string }>()
  const entity = (params?.entity || '') as EntitySlug
  const meta = ENTITY_META[entity]
  const [rows, setRows] = useState<ProposalRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!meta) return
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data, error } = await supa.from('proposals')
        .select('id, status, submission_deadline, assigned_va, intake_complete, last_validation_status, fatal_flaw_count, gov_lead_id, gov_leads(title, agency, solicitation_number, estimated_value)')
        .eq('entity', entity)
        .is('archived_at', null)
        .order('submission_deadline', { ascending: true, nullsFirst: false })
      if (cancelled) return
      if (error) setError(error.message)
      else setRows((data as unknown as ProposalRow[]) || [])
    })()
    return () => { cancelled = true }
  }, [entity, meta])

  const byStatus = useMemo(() => {
    const map: Record<string, ProposalRow[]> = {}
    for (const col of STATUS_COLUMNS) map[col.key] = []
    for (const r of rows || []) {
      if (!map[r.status]) map[r.status] = []
      map[r.status].push(r)
    }
    return map
  }, [rows])

  if (!meta) {
    return <div className="px-8 py-6 text-white">Unknown entity: {String(entity)}</div>
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {/* Entity header */}
      <div className="px-8 py-6 border-b border-[#374151]" style={{ background: meta.primary }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: meta.accent }}>{meta.name} — Proposals</h1>
            <p className="text-sm text-gray-300 mt-1">{meta.tagline}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/proposals" className="px-3 py-2 rounded bg-[#1F2937] text-white text-sm border border-[#374151]">All Proposals</Link>
            <Link href={'/' + entity} className="px-3 py-2 rounded text-sm" style={{ background: meta.accent, color: '#111827' }}>Back to {meta.name}</Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
        {!rows && <div className="text-gray-400">Loading…</div>}
        {rows && rows.length === 0 && (
          <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-8 text-center text-gray-400">
            No active proposals for {meta.name}. Start one from a gov lead marked <span className="text-white">active_bid</span>.
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {STATUS_COLUMNS.map(col => (
              <div key={col.key} className="bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-[#374151] flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-400">{col.label}</span>
                  <span className="text-xs text-gray-500">{(byStatus[col.key] || []).length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[60px]">
                  {(byStatus[col.key] || []).map(r => (
                    <Link
                      key={r.id}
                      href={'/proposals/' + entity + '/' + r.id + '/intake'}
                      className="block bg-[#111827] border border-[#374151] rounded p-2 hover:border-[#4B5563] transition-colors"
                    >
                      <div className="text-xs text-white truncate">{r.gov_leads?.title?.slice(0, 60) || '(untitled)'}</div>
                      <div className="text-[10px] text-gray-500 mt-1 truncate">{r.gov_leads?.agency || '—'}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-white" style={{ background: urgencyColor(r.submission_deadline) }}>
                          {daysUntil(r.submission_deadline)}
                        </span>
                        {r.last_validation_status === 'hold_action_required' && (
                          <span className="text-red-400 text-[10px]">⚠ {r.fatal_flaw_count || 0} fatal</span>
                        )}
                        {r.last_validation_status === 'ready_for_review' && (
                          <span className="text-green-400 text-[10px]">✓ ready</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
