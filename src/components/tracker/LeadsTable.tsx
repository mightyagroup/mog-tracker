'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GovLead, ServiceCategory, EntityType, LeadStatus } from '@/lib/types'
import {
  LEAD_STATUSES, STATUS_LABELS, STATUS_COLORS, SET_ASIDE_LABELS, SOURCE_LABELS,
  SOURCE_REGION, REGION_LABELS,
} from '@/lib/constants'
import { formatCurrency, exportLeadsToCSV, isLowFit } from '@/lib/utils'
import { auditGovStatusChange } from '@/lib/audit-notifications'
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns'
import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { DeadlineCountdown } from './DeadlineCountdown'
import { FitScoreBadge } from './FitScoreBadge'
import { LeadDetailPanel } from './LeadDetailPanel'
import { AddLeadModal } from './AddLeadModal'
import { ImportCSVModal } from './ImportCSVModal'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import {
  Download, Search, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronDown, FileSearch, Upload, AlertTriangle, Bell,
} from 'lucide-react'

/** Amendment indicator badge */
function AmendmentBadge({ count, lastDate }: { count: number; lastDate?: string | null }) {
  if (!count || count === 0) return null
  const isRecent = lastDate
    ? (Date.now() - new Date(lastDate).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
        isRecent
          ? 'bg-red-500/20 text-red-400 animate-pulse'
          : 'bg-amber-500/15 text-amber-400'
      }`}
      title={`${count} amendment(s) detected${lastDate ? ` — last: ${new Date(lastDate).toLocaleDateString()}` : ''}`}
    >
      <AlertTriangle size={10} />
      {count > 1 ? `${count} amendments` : 'Amended'}
    </span>
  )
}

/** Renders relative "First Seen" badge with color coding */
function FirstSeenBadge({ createdAt }: { createdAt: string }) {
  const date = parseISO(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let badgeColor = 'text-gray-500'
  let bgColor = ''
  if (diffDays === 0) {
    badgeColor = 'text-emerald-400'
    bgColor = 'bg-emerald-400/10'
  } else if (diffDays <= 2) {
    badgeColor = 'text-blue-400'
    bgColor = 'bg-blue-400/10'
  } else if (diffDays <= 7) {
    badgeColor = 'text-gray-300'
  }

  const relative = diffDays === 0
    ? 'Today'
    : formatDistanceToNowStrict(date, { addSuffix: true })

  const fullDate = format(date, 'MMM d, yyyy')

  return (
    <div className="flex flex-col">
      <span className={`text-xs font-medium ${badgeColor} ${bgColor} ${bgColor ? 'px-1.5 py-0.5 rounded' : ''}`}>
        {relative}
      </span>
      <span className="text-[10px] text-gray-600 mt-0.5">{fullDate}</span>
    </div>
  )
}

interface LeadsTableProps {
  entity: EntityType
  presetStatuses?: LeadStatus[]
  title?: string
  accentColor?: string
  defaultProposalLead?: string
}

type SortField = 'title' | 'agency' | 'response_deadline' | 'estimated_value' | 'fit_score' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

export function LeadsTable({
  entity,
  presetStatuses,
  title,
  accentColor = '#D4AF37',
  defaultProposalLead,
}: LeadsTableProps) {
  const [leads, setLeads] = useState<GovLead[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [complianceProgress, setComplianceProgress] = useState<Map<string, { completed: number; total: number }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState<LeadStatus[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [setAsideFilter, setSetAsideFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [showLowFit, setShowLowFit] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedLead, setSelectedLead] = useState<GovLead | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [merging, setMerging] = useState(false)
  const [recategorizing, setRecategorizing] = useState(false)
  const bulkRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchData() }, [entity])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setBulkStatusOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('gov_leads')
      .select('*, service_category:service_categories(*)')
      .eq('entity', entity)
      .order('created_at', { ascending: false })

    if (presetStatuses?.length) {
      query = query.in('status', presetStatuses)
    }

    const [leadsResult, catsResult] = await Promise.all([
      query,
      supabase.from('service_categories').select('*').eq('entity', entity).order('sort_order'),
    ])

    const fetchedLeads = (leadsResult.data ?? []) as GovLead[]
    setLeads(fetchedLeads)
    setCategories(catsResult.data ?? [])

    // Fetch compliance progress for all leads in one query
    const leadIds = fetchedLeads.map(l => l.id)
    if (leadIds.length > 0) {
      const { data: ciData } = await supabase
        .from('compliance_items')
        .select('gov_lead_id, is_complete')
        .in('gov_lead_id', leadIds)
      if (ciData) {
        const map = new Map<string, { completed: number; total: number }>()
        for (const row of ciData) {
          const p = map.get(row.gov_lead_id) ?? { completed: 0, total: 0 }
          p.total++
          if (row.is_complete) p.completed++
          map.set(row.gov_lead_id, p)
        }
        setComplianceProgress(map)
      }
    }

    setLoading(false)
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let result = leads

    // Hide low-fit leads by default
    if (!showLowFit) result = result.filter(l => !isLowFit(l, entity))

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (l.agency ?? '').toLowerCase().includes(q) ||
        (l.solicitation_number ?? '').toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        (l.place_of_performance ?? '').toLowerCase().includes(q)
      )
    }
    if (statusFilters.length > 0) result = result.filter(l => statusFilters.includes(l.status))
    if (categoryFilter) result = result.filter(l => l.service_category_id === categoryFilter)
    if (setAsideFilter) result = result.filter(l => l.set_aside === setAsideFilter)
    if (sourceFilter) result = result.filter(l => l.source === sourceFilter)
    if (regionFilter) result = result.filter(l => SOURCE_REGION[l.source] === regionFilter)

    return result
  }, [leads, searchQuery, statusFilters, categoryFilter, setAsideFilter, sourceFilter, regionFilter, showLowFit, entity])

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let av: string | number | null = a[sortField] as string | number | null
      let bv: string | number | null = b[sortField] as string | number | null

      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1

      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()

      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredLeads, sortField, sortDir])

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // ── Status change (inline or bulk) ────────────────────────────────────────
  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    const lead = leads.find(l => l.id === leadId)
    const oldStatus = lead?.status || 'unknown'
    const supabase = createClient()
    await supabase.from('gov_leads').update({ status: newStatus }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    // Audit notification for high-stakes status changes
    auditGovStatusChange(leadId, lead?.title || 'Unknown', entity, oldStatus, newStatus)
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null)
    // Refresh compliance progress for this lead after status change (it may have gotten new items)
    if (newStatus === 'active_bid') {
      setTimeout(async () => {
        const { data } = await supabase.from('compliance_items').select('gov_lead_id, is_complete').eq('gov_lead_id', leadId)
        if (data) {
          const p = { completed: data.filter(r => r.is_complete).length, total: data.length }
          setComplianceProgress(prev => new Map(prev).set(leadId, p))
        }
      }, 800)
    }
  }

  async function handleBulkStatus(newStatus: LeadStatus) {
    const supabase = createClient()
    const ids = Array.from(selectedIds)
    // Capture old statuses for audit
    const affectedLeads = leads.filter(l => selectedIds.has(l.id))
    await supabase.from('gov_leads').update({ status: newStatus }).in('id', ids)
    setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status: newStatus } : l))
    setSelectedIds(new Set())
    setBulkStatusOpen(false)
    // Audit each high-stakes change
    affectedLeads.forEach(l => {
      auditGovStatusChange(l.id, l.title, entity, l.status, newStatus)
    })
  }

  function handleLeadUpdate(updated: GovLead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelectedLead(updated)
  }

  function handleLeadAdd(lead: GovLead) {
    setLeads(prev => [lead, ...prev])
    setShowAddModal(false)
    setSelectedLead(lead)
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === sortedLeads.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sortedLeads.map(l => l.id)))
  }

  const lowFitCount = leads.filter(l => isLowFit(l, entity)).length
  const activeFilterCount = (statusFilters.length > 0 ? 1 : 0) + (categoryFilter ? 1 : 0) + (setAsideFilter ? 1 : 0) + (sourceFilter ? 1 : 0) + (regionFilter ? 1 : 0)

  if (loading) return <LoadingPage />

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
            placeholder="Search leads, agencies, solicitation #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
            showFilters || activeFilterCount > 0
              ? 'bg-[#374151] border-[#4B5563] text-white'
              : 'border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151]'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: accentColor, color: '#111827' }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg text-sm transition"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => {
              const count = exportLeadsToCSV(sortedLeads, categories)
              alert(`Exported ${count} leads to CSV`) // basic user feedback
            }}
            className="flex items-center gap-2 px-3 py-2 border border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg text-sm transition"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={async () => {
              setMerging(true)
              try {
                const resp = await fetch('/api/leads/merge-duplicates', { method: 'POST' })
                const data = await resp.json()
                if (resp.ok && data.success) {
                  alert(`Merged ${data.merged} duplicate lead(s)`) 
                  fetchData()
                } else {
                  alert('Merge duplicates failed')
                }
              } catch {
                alert('Merge duplicates failed')
              } finally {
                setMerging(false)
              }
            }}
            disabled={merging}
            className="flex items-center gap-2 px-3 py-2 border border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg text-sm transition"
          >
            <FileSearch size={14} />
            {merging ? 'Merging...' : 'Merge Duplicates'}
          </button>
          <button
            onClick={async () => {
              setRecategorizing(true)
              try {
                const resp = await fetch('/api/leads/recategorize', { method: 'POST' })
                const data = await resp.json()
                if (resp.ok && data.success) {
                  alert(`Recategorized ${data.updated} lead(s)`) 
                  fetchData()
                } else {
                  alert('Recategorize failed: ' + (data.error || 'Unknown error'))
                }
              } catch (e) {
                alert('Recategorize failed: ' + String(e))
              } finally {
                setRecategorizing(false)
              }
            }}
            disabled={recategorizing}
            className="flex items-center gap-2 px-3 py-2 border border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg text-sm transition"
          >
            <FileSearch size={14} />
            {recategorizing ? 'Recategorizing...' : 'Recategorize All'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-5 p-4 bg-[#1F2937] rounded-xl border border-[#374151]">
          {/* Status multi-select */}
          {!presetStatuses && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-gray-500 text-xs self-center mr-1">Status:</span>
              {LEAD_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilters(prev =>
                    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                  )}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                    statusFilters.includes(s) ? 'ring-1 ring-white/30' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].text }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
              {statusFilters.length > 0 && (
                <button onClick={() => setStatusFilters([])} className="text-xs text-gray-500 hover:text-white">Clear</button>
              )}
            </div>
          )}

          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
          />
          <FilterSelect
            label="Set-Aside"
            value={setAsideFilter}
            onChange={setSetAsideFilter}
            options={[{ value: '', label: 'All Set-Asides' }, ...Object.entries(SET_ASIDE_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
          />
          <FilterSelect
            label="Source"
            value={sourceFilter}
            onChange={setSourceFilter}
            options={[{ value: '', label: 'All Sources' }, ...Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
          />
          <FilterSelect
            label="Region"
            value={regionFilter}
            onChange={setRegionFilter}
            options={[{ value: '', label: 'All Regions' }, ...Object.entries(REGION_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
          />

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStatusFilters([]); setCategoryFilter(''); setSetAsideFilter(''); setSourceFilter(''); setRegionFilter('') }}
              className="text-xs text-red-400 hover:text-red-300 self-center"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 px-4 py-3 bg-[#253347] border border-[#374151] rounded-xl">
          <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
          <div className="relative" ref={bulkRef}>
            <button
              onClick={() => setBulkStatusOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] text-white text-sm rounded-lg transition"
            >
              Change Status <ChevronDown size={13} />
            </button>
            {bulkStatusOpen && (
              <div className="absolute top-full left-0 mt-1 z-10 bg-[#1F2937] border border-[#374151] rounded-lg shadow-xl py-1 min-w-40">
                {LEAD_STATUSES.map(s => (
                  <button key={s} onClick={() => handleBulkStatus(s)} className="block w-full text-left px-3 py-2 hover:bg-[#374151] transition">
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white text-sm ml-auto">
            Deselect all
          </button>
        </div>
      )}

      {/* Amendment notification banner */}
      {(() => {
        const recentAmendments = leads.filter(l =>
          (l.amendment_count ?? 0) > 0 &&
          l.last_amendment_date &&
          (Date.now() - new Date(l.last_amendment_date).getTime()) < 7 * 24 * 60 * 60 * 1000
        )
        if (recentAmendments.length === 0) return null
        return (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Bell size={16} className="text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-400 mb-1">
                {recentAmendments.length} Amendment{recentAmendments.length > 1 ? 's' : ''} Detected This Week
              </div>
              <div className="space-y-1">
                {recentAmendments.slice(0, 5).map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    className="block text-xs text-gray-300 hover:text-white transition truncate max-w-full text-left"
                  >
                    <span className="text-red-400 font-mono mr-1">{l.solicitation_number || '—'}</span>
                    {l.title}
                    <span className="text-gray-500 ml-2">
                      ({l.amendment_count} amendment{(l.amendment_count ?? 0) > 1 ? 's' : ''})
                    </span>
                  </button>
                ))}
                {recentAmendments.length > 5 && (
                  <span className="text-xs text-gray-500">+ {recentAmendments.length - 5} more</span>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-gray-500 text-xs">
          {sortedLeads.length} {sortedLeads.length === 1 ? 'lead' : 'leads'}
          {filteredLeads.length !== leads.length && ` (${leads.length} total)`}
        </span>
        {!showLowFit && lowFitCount > 0 && (
          <button
            onClick={() => setShowLowFit(true)}
            className="text-xs text-amber-500 hover:text-amber-400 transition flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            {lowFitCount} low-fit {lowFitCount === 1 ? 'lead' : 'leads'} hidden — Show all
          </button>
        )}
        {showLowFit && lowFitCount > 0 && (
          <button
            onClick={() => setShowLowFit(false)}
            className="text-xs text-gray-500 hover:text-gray-300 transition"
          >
            Hide low-fit leads ({lowFitCount})
          </button>
        )}
      </div>

      {/* Table */}
      {sortedLeads.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={searchQuery || activeFilterCount > 0 ? 'No matches found' : `No ${title?.toLowerCase() ?? 'leads'} yet`}
          description={searchQuery || activeFilterCount > 0
            ? 'Try adjusting your search or filters.'
            : `Add your first ${entity === 'exousia' ? 'Exousia' : entity === 'vitalx' ? 'VitalX' : 'IronHouse'} lead to get started.`}
          action={!searchQuery && activeFilterCount === 0 ? { label: 'Add Lead', onClick: () => setShowAddModal(true) } : undefined}
        />
      ) : (
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#374151] bg-[#161E2E]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === sortedLeads.length && sortedLeads.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#374151] bg-[#111827] accent-[#D4AF37]"
                    />
                  </th>
                  <SortHeader field="title" current={sortField} dir={sortDir} onClick={handleSort}>Title</SortHeader>
                  <SortHeader field="agency" current={sortField} dir={sortDir} onClick={handleSort}>Agency</SortHeader>
                  <SortHeader field="response_deadline" current={sortField} dir={sortDir} onClick={handleSort}>Deadline</SortHeader>
                  <SortHeader field="estimated_value" current={sortField} dir={sortDir} onClick={handleSort}>Value</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Incumbent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Prev. Award</th>
                  <SortHeader field="fit_score" current={sortField} dir={sortDir} onClick={handleSort}>Fit</SortHeader>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Docs</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Source</th>
                  <SortHeader field="created_at" current={sortField} dir={sortDir} onClick={handleSort}>First Seen</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {sortedLeads.map(lead => {
                  const cat = lead.service_category
                    ?? categories.find(c => c.id === lead.service_category_id)
                  return (
                    <tr
                      key={lead.id}
                      className={`group hover:bg-[#253347] transition cursor-pointer ${selectedIds.has(lead.id) ? 'bg-[#1e3a5f]/30' : ''}`}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id) }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-[#374151] bg-[#111827] accent-[#D4AF37]"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-white font-medium truncate leading-snug">{lead.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.solicitation_number && (
                            <span className="text-gray-500 text-xs font-mono truncate">{lead.solicitation_number}</span>
                          )}
                          {(lead.amendment_count ?? 0) > 0 && (
                            <AmendmentBadge count={lead.amendment_count!} lastDate={lead.last_amendment_date} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-[160px]">
                        <div className="truncate">{lead.agency ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <DeadlineCountdown deadline={lead.response_deadline} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs whitespace-nowrap">
                        {formatCurrency(lead.estimated_value)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px]">
                        <span className="truncate block">{lead.incumbent_contractor ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs whitespace-nowrap">
                        {formatCurrency(lead.previous_award_total)}
                      </td>
                      <td className="px-4 py-3">
                        <FitScoreBadge score={lead.fit_score} />
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <InlineStatusSelect
                          status={lead.status}
                          onChange={s => handleStatusChange(lead.id, s)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const p = complianceProgress.get(lead.id)
                          if (!p || p.total === 0) return <span className="text-gray-600 text-xs">—</span>
                          const pct = Math.round((p.completed / p.total) * 100)
                          const barColor = pct === 100 ? '#4ADE80' : accentColor
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-14 bg-[#374151] rounded-full overflow-hidden flex-shrink-0">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">{p.completed}/{p.total}</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {cat ? <CategoryBadge name={cat.name} color={cat.color} /> : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {SOURCE_LABELS[lead.source]}
                      </td>
                      <td className="px-4 py-3">
                        {lead.created_at ? <FirstSeenBadge createdAt={lead.created_at} /> : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          categories={categories}
          entity={entity}
          accentColor={accentColor}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}

      {/* Import CSV modal */}
      {showImportModal && (
        <ImportCSVModal
          entity={entity}
          categories={categories}
          onClose={() => setShowImportModal(false)}
          onImport={() => { setShowImportModal(false); fetchData() }}
        />
      )}

      {/* Add lead modal */}
      {showAddModal && (
        <AddLeadModal
          entity={entity}
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSave={handleLeadAdd}
          defaultProposalLead={defaultProposalLead}
        />
      )}
    </div>
  )
}

// ── Sortable column header ─────────────────────────────────────────────────
function SortHeader({ field, current, dir, onClick, children }: {
  field: SortField; current: SortField; dir: SortDir; onClick: (f: SortField) => void; children: React.ReactNode
}) {
  const active = field === current
  return (
    <th
      className="px-4 py-3 text-left font-medium text-gray-400 hover:text-white cursor-pointer select-none whitespace-nowrap"
      onClick={() => onClick(field)}
    >
      <span className="flex items-center gap-1.5">
        {children}
        {active
          ? dir === 'asc' ? <ArrowUp size={13} className="text-[#D4AF37]" /> : <ArrowDown size={13} className="text-[#D4AF37]" />
          : <ArrowUpDown size={12} className="text-gray-600" />
        }
      </span>
    </th>
  )
}

// ── Inline status select ───────────────────────────────────────────────────
function InlineStatusSelect({ status, onChange }: { status: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1"
      >
        <StatusBadge status={status} />
        <ChevronDown size={11} className="text-gray-600 group-hover:text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-[#1F2937] border border-[#374151] rounded-lg shadow-xl py-1 min-w-36">
          {LEAD_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 hover:bg-[#374151] transition"
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Generic filter select ──────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 text-xs">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[#374151] border border-[#4B5563] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
