'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GovLead, ServiceCategory, EntityType, ComplianceItem, Interaction, LeadStatus, SetAsideType, SourceType, Subcontractor } from '@/lib/types'
import {
  LEAD_STATUSES, SET_ASIDE_LABELS, SOURCE_LABELS, CONTRACT_TYPE_LABELS, DEFAULT_COMPLIANCE_ITEMS,
} from '@/lib/constants'
import { formatFullCurrency, validateCategoryNaics, calculateFitScore } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { FitScoreBadge } from './FitScoreBadge'
import { DeadlineCountdown } from './DeadlineCountdown'
import {
  X, ExternalLink, Edit2, Save, Check, Plus, ChevronDown, MessageSquare, Folder, RefreshCw, FileText, Loader2, AlertTriangle, Download,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface LeadDetailPanelProps {
  lead: GovLead
  categories: ServiceCategory[]
  entity: EntityType
  accentColor?: string
  onClose: () => void
  onUpdate: (lead: GovLead) => void
}

export function LeadDetailPanel({ lead, categories, entity, accentColor = '#D4AF37', onClose, onUpdate }: LeadDetailPanelProps) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Partial<GovLead>>({ ...lead })
  const [saving, setSaving] = useState(false)
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loadingCompliance, setLoadingCompliance] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [activeSection, setActiveSection] = useState<'details' | 'compliance' | 'interactions'>('details')
  const [generatingProposals, setGeneratingProposals] = useState(false)
  const [syncingDocs, setSyncingDocs] = useState(false)
  const [usaLoading, setUsaLoading] = useState(false)
  const [usaData, setUsaData] = useState<{
    found: boolean
    previous_award_total?: number
    incumbent_contractor?: string
    award_history_notes?: string
    usaspending_match_method?: string
    usaspending_confidence?: string
    message?: string
  } | null>(null)
  const [suggestedSubs, setSuggestedSubs] = useState<(Subcontractor & { matchScore: number; matchReasons: string[] })[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setForm({ ...lead })
    setEditMode(false)
    setUsaData(null)
    loadCompliance()
    loadInteractions()
    loadSuggestedSubs()
    // Auto-lookup if lead has a solicitation number or NAICS + agency
    if (lead.solicitation_number || (lead.naics_code && lead.agency)) {
      lookupUSASpending(lead)
    }
  }, [lead.id])

  async function loadSuggestedSubs() {
    const supabase = createClient()
    const { data: subs } = await supabase
      .from('subcontractors')
      .select('*')
    if (!subs || subs.length === 0) return

    // Derive relevant service tags from lead category/NAICS
    const categoryName = (lead.service_category?.name ?? '').toLowerCase()
    const NAICS_TO_TAGS: Record<string, string[]> = {
      '561720': ['Janitorial', 'Window Cleaning'],
      '561730': ['Landscaping'],
      '561210': ['HVAC', 'Plumbing', 'Electrical', 'Fire Protection'],
      '541614': ['Staffing'],
      '541990': ['Staffing'],
      '561110': ['Staffing'],
      '237310': ['Environmental', 'Waste Removal'],
      '492110': ['Staffing'],
      '492210': ['Staffing'],
      '621511': ['Staffing'],
      '621610': ['Staffing'],
      '485991': ['Staffing'],
      '485999': ['Staffing'],
      '561990': ['Staffing'],
    }
    const relevantTags = new Set<string>([
      ...(lead.naics_code ? NAICS_TO_TAGS[lead.naics_code] ?? [] : []),
      ...(categoryName.includes('janitorial') || categoryName.includes('cleaning') ? ['Janitorial'] : []),
      ...(categoryName.includes('landscap') ? ['Landscaping'] : []),
      ...(categoryName.includes('facilit') ? ['HVAC', 'Plumbing', 'Electrical'] : []),
      ...(categoryName.includes('construct') ? ['Electrical', 'Plumbing', 'Roofing'] : []),
    ])

    const scored = (subs as Subcontractor[]).map(sub => {
      let score = 0
      const reasons: string[] = []
      if ((sub.entities_associated ?? []).includes(entity)) { score += 20; reasons.push('associated entity') }
      if (lead.naics_code && (sub.naics_codes ?? []).includes(lead.naics_code)) { score += 30; reasons.push(`NAICS ${lead.naics_code}`) }
      // Service tag match
      const tagMatches = (sub.service_tags ?? []).filter(t => relevantTags.has(t))
      if (tagMatches.length > 0) { score += Math.min(tagMatches.length * 15, 30); reasons.push(...tagMatches) }
      if (lead.set_aside && lead.set_aside !== 'none' && (sub.set_asides ?? []).includes(lead.set_aside)) { score += 20; reasons.push((lead.set_aside ?? '').toUpperCase()) }
      if (sub.teaming_agreement_status === 'executed') { score += 10; reasons.push('executed teaming') }
      if ((sub.reputation_rating ?? 0) >= 80) { score += 5; reasons.push('top-rated') }
      return { ...sub, matchScore: score, matchReasons: Array.from(new Set(reasons)) }
    })
    .filter(s => s.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6)
    setSuggestedSubs(scored)
  }

  async function lookupUSASpending(target: Partial<typeof lead> = lead) {
    setUsaLoading(true)
    try {
      if (target.manual_pricing_override) {
        setUsaData({
          found: false,
          message: 'Manual pricing override is enabled; external refresh is skipped',
        })
        setUsaLoading(false)
        return
      }

      const res = await fetch('/api/usaspending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: target.id,
          solicitation_number: target.solicitation_number,
          naics_code: target.naics_code,
          agency: target.agency,
          place_of_performance: target.place_of_performance,
          manual_pricing_override: target.manual_pricing_override,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setUsaData(data)

        if (data.found && !target.manual_pricing_override) {
          setForm(f => ({
            ...f,
            previous_award_total: f.previous_award_total ?? data.previous_award_total,
            incumbent_contractor: f.incumbent_contractor ?? data.incumbent_contractor,
            award_history_notes: f.award_history_notes ?? data.award_history_notes,
            usaspending_match_method: data.usaspending_match_method,
            usaspending_confidence: data.usaspending_confidence,
          }))
        }
      }
    } catch (error) {
      console.error('lookupUSASpending error', error)
      setUsaData({ found: false, message: 'Could not fetch USASpending data' })
    }
    setUsaLoading(false)
  }

  async function loadCompliance() {
    setLoadingCompliance(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('compliance_items')
      .select('*')
      .eq('gov_lead_id', lead.id)
      .order('sort_order')
    setComplianceItems(data ?? [])
    setLoadingCompliance(false)
  }

  async function loadInteractions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('gov_lead_id', lead.id)
      .order('interaction_date', { ascending: false })
      .limit(20)
    setInteractions(data ?? [])
  }

  async function handleSave() {
    // Validate NAICS matches category
    if (form.service_category_id && form.naics_code && !validateCategoryNaics(form.service_category_id, form.naics_code, categories)) {
      alert('The selected NAICS code does not match the service category. Please choose a different category or update the NAICS code.')
      return
    }

    setSaving(true)

    const leadScore = calculateFitScore({
      naics_code: form.naics_code ?? lead.naics_code,
      set_aside: form.set_aside ?? lead.set_aside,
      place_of_performance: form.place_of_performance ?? lead.place_of_performance,
      response_deadline: form.response_deadline ?? lead.response_deadline,
      source: form.source ?? lead.source,
      estimated_value: form.estimated_value ?? lead.estimated_value,
    }, entity)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('gov_leads')
      .update({
        title: form.title,
        solicitation_number: form.solicitation_number,
        status: form.status,
        source: form.source,
        agency: form.agency,
        sub_agency: form.sub_agency,
        office: form.office,
        naics_code: form.naics_code,
        set_aside: form.set_aside,
        contract_type: form.contract_type,
        service_category_id: form.service_category_id,
        estimated_value: form.estimated_value,
        award_amount: form.award_amount,
        response_deadline: form.response_deadline,
        place_of_performance: form.place_of_performance,
        proposal_lead: form.proposal_lead,
        sam_gov_url: form.sam_gov_url,
        solicitation_url: form.solicitation_url,
        drive_folder_url: form.drive_folder_url,
        notes: form.notes,
        bid_decision_notes: form.bid_decision_notes,
        incumbent_contractor: form.incumbent_contractor,
        previous_award_total: form.previous_award_total,
        award_history_notes: form.award_history_notes,
        usaspending_match_method: form.usaspending_match_method,
        usaspending_confidence: form.usaspending_confidence,
        manual_pricing_override: form.manual_pricing_override,
        solicitation_verified: form.solicitation_verified,
        contracting_officer_name: form.contracting_officer_name,
        contracting_officer_email: form.contracting_officer_email,
        contracting_officer_phone: form.contracting_officer_phone,
        fit_score: leadScore,
      })
      .eq('id', lead.id)
      .select('*, service_category:service_categories(*)')
      .single()

    if (!error && data) {
      const updatedLead = data as GovLead
      // Auto-create compliance items when moving to active_bid
      if (updatedLead.status === 'active_bid' && complianceItems.length === 0) {
        await createDefaultComplianceItems(updatedLead.id)
        await loadCompliance()
      }
      onUpdate(updatedLead)
      setEditMode(false)
    }
    setSaving(false)
  }

  async function handleStatusChange(newStatus: LeadStatus) {
    const supabase = createClient()
    const { data } = await supabase
      .from('gov_leads')
      .update({ status: newStatus })
      .eq('id', lead.id)
      .select('*, service_category:service_categories(*)')
      .single()

    if (data) {
      const updatedLead = data as GovLead
      if (newStatus === 'active_bid') {
        // Auto-create compliance items
        if (complianceItems.length === 0) {
          await createDefaultComplianceItems(lead.id)
          await loadCompliance()
        }
        // Auto-create Google Drive bid folder
        if (!updatedLead.drive_folder_url) {
          createDriveBidFolder(lead.id).then(folderUrl => {
            if (folderUrl) {
              setForm(f => ({ ...f, drive_folder_url: folderUrl }))
            }
          })
        }
        setActiveSection('compliance')
      }
      setForm(f => ({ ...f, status: newStatus }))
      onUpdate(updatedLead)
    }
  }

  async function createDriveBidFolder(leadId: string): Promise<string | null> {
    try {
      const resp = await fetch('/api/drive/create-bid-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (!resp.ok) return null
      const result = await resp.json()
      return result.folderUrl || null
    } catch {
      console.error('Failed to create Drive folder')
      return null
    }
  }

  async function createDefaultComplianceItems(leadId: string) {
    const supabase = createClient()
    const items = DEFAULT_COMPLIANCE_ITEMS.map((name, i) => ({
      gov_lead_id: leadId,
      item_name: name,
      is_complete: false,
      sort_order: i,
    }))
    await supabase.from('compliance_items').insert(items)
  }

  async function toggleCompliance(item: ComplianceItem) {
    const supabase = createClient()
    await supabase
      .from('compliance_items')
      .update({ is_complete: !item.is_complete })
      .eq('id', item.id)
    setComplianceItems(prev =>
      prev.map(c => c.id === item.id ? { ...c, is_complete: !c.is_complete } : c)
    )
  }

  async function addInteractionNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('interactions')
      .insert({
        entity,
        gov_lead_id: lead.id,
        interaction_type: 'note',
        subject: 'Note',
        notes: newNote.trim(),
        interaction_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()
    if (data) {
      setInteractions(prev => [data, ...prev])
      setNewNote('')
    }
    setAddingNote(false)
  }

  const completedCount = complianceItems.filter(c => c.is_complete).length
  const cat = categories.find(c => c.id === (form.service_category_id ?? lead.service_category_id))

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-[#1A2233] border-l border-[#374151] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#374151] flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {editMode ? (
              <input
                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-white font-semibold text-base focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                value={form.title ?? ''}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            ) : (
              <h2 className="text-white font-semibold text-base leading-snug">{lead.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusDropdown status={(form.status ?? lead.status) as LeadStatus} onChange={handleStatusChange} />
              {cat && <CategoryBadge name={cat.name} color={cat.color} />}
              <FitScoreBadge score={lead.fit_score} />
              {(lead.amendment_count ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                  <AlertTriangle size={10} />
                  {lead.amendment_count} Amendment{(lead.amendment_count ?? 0) > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editMode ? (
              <>
                <button onClick={() => { setEditMode(false); setForm({ ...lead }) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#111827] transition"
                  style={{ backgroundColor: accentColor }}
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#374151] rounded-lg transition"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#374151]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-[#374151] px-2 flex-shrink-0">
          {[
            { id: 'details', label: 'Details' },
            { id: 'compliance', label: `Checklist${complianceItems.length > 0 ? ` (${completedCount}/${complianceItems.length})` : ''}` },
            { id: 'interactions', label: `Notes (${interactions.length})` },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as typeof activeSection)}
              className={`px-4 py-3 text-sm border-b-2 -mb-px transition ${
                activeSection === s.id
                  ? 'text-white border-current'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
              style={activeSection === s.id ? { color: accentColor, borderColor: accentColor } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'details' && (
            <div className="p-6 space-y-6">
              {/* Key info */}
              <div className="grid grid-cols-2 gap-4">
                <EditableField label="Agency" value={form.agency} editMode={editMode} onChange={v => setForm(f => ({ ...f, agency: v }))} />
                <EditableField label="Sub-Agency" value={form.sub_agency} editMode={editMode} onChange={v => setForm(f => ({ ...f, sub_agency: v }))} />
                <EditableField label="Place of Performance" value={form.place_of_performance} editMode={editMode} onChange={v => setForm(f => ({ ...f, place_of_performance: v }))} />
                <EditableField label="Proposal Lead" value={form.proposal_lead} editMode={editMode} onChange={v => setForm(f => ({ ...f, proposal_lead: v }))} />
                <EditableField label="Solicitation #" value={form.solicitation_number} editMode={editMode} onChange={v => setForm(f => ({ ...f, solicitation_number: v }))} />
                {!editMode && form.solicitation_number && (
                  <div className="text-xs text-gray-400 mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded ${form.solicitation_verified ? 'bg-green-800 text-green-300' : 'bg-yellow-800 text-yellow-300'}`}>
                      {form.solicitation_verified ? 'Verified on SAM.gov' : 'Unverified solicitation' }
                    </span>
                    <a
                      href={`https://sam.gov/opp/${lead.notice_id ?? ''}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-300 hover:text-blue-200"
                    >Verify on SAM.gov</a>
                  </div>
                )}
                <EditableField label="NAICS Code" value={form.naics_code} editMode={editMode} onChange={v => setForm(f => ({ ...f, naics_code: v }))} />
              </div>

              {/* Contracting Officer POC */}
              {(lead.contracting_officer_name || lead.contracting_officer_email || editMode) && (
                <div>
                  <SectionLabel>Contracting Officer</SectionLabel>
                  {editMode ? (
                    <div className="grid grid-cols-2 gap-4">
                      <EditableField label="Name" value={form.contracting_officer_name} editMode onChange={v => setForm(f => ({ ...f, contracting_officer_name: v }))} />
                      <EditableField label="Phone" value={form.contracting_officer_phone} editMode onChange={v => setForm(f => ({ ...f, contracting_officer_phone: v }))} />
                      <div className="col-span-2">
                        <EditableField label="Email" value={form.contracting_officer_email} editMode onChange={v => setForm(f => ({ ...f, contracting_officer_email: v }))} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-3 bg-[#111827] rounded-lg border border-[#374151]">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{lead.contracting_officer_name ?? '—'}</div>
                        {lead.contracting_officer_email && (
                          <a href={`mailto:${lead.contracting_officer_email}`} className="text-xs hover:underline mt-0.5 block" style={{ color: accentColor }}>
                            {lead.contracting_officer_email}
                          </a>
                        )}
                        {lead.contracting_officer_phone && (
                          <div className="text-gray-400 text-xs mt-0.5">{lead.contracting_officer_phone}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Select fields */}
              {editMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Set-Aside</label>
                    <select className={selectCls} value={form.set_aside ?? 'none'} onChange={e => setForm(f => ({ ...f, set_aside: e.target.value as SetAsideType }))}>
                      {(Object.keys(SET_ASIDE_LABELS) as SetAsideType[]).map(s => <option key={s} value={s}>{SET_ASIDE_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Source</label>
                    <select className={selectCls} value={form.source ?? 'manual'} onChange={e => setForm(f => ({ ...f, source: e.target.value as SourceType }))}>
                      {(Object.keys(SOURCE_LABELS) as SourceType[]).map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Service Category</label>
                    <select className={selectCls} value={form.service_category_id ?? ''} onChange={e => setForm(f => ({ ...f, service_category_id: e.target.value }))}>
                      <option value="">— None —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Read-only badges */}
              {!editMode && (
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Set-Aside" value={SET_ASIDE_LABELS[lead.set_aside]} />
                  <InfoRow label="Source" value={SOURCE_LABELS[lead.source]} />
                  {lead.contract_type && <InfoRow label="Contract Type" value={CONTRACT_TYPE_LABELS[lead.contract_type]} />}
                </div>
              )}

              {/* Dates */}
              <div>
                <SectionLabel>Dates</SectionLabel>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className={labelCls}>Posted</div>
                    <div className="text-gray-200 text-sm">{lead.posted_date ? format(parseISO(lead.posted_date), 'MMM d, yyyy') : '—'}</div>
                  </div>
                  <div>
                    <div className={labelCls}>Deadline</div>
                    <DeadlineCountdown deadline={lead.response_deadline} showDate />
                  </div>
                  <div>
                    <div className={labelCls}>Archive</div>
                    <div className="text-gray-200 text-sm">{lead.archive_date ? format(parseISO(lead.archive_date), 'MMM d, yyyy') : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Pricing Intel */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Pricing Intel</SectionLabel>
                  <div className="flex items-center gap-3">
                    {lead.solicitation_number && (
                      <a
                        href={`https://www.usaspending.gov/search/?hash=def6d3a6b5c1e2f3a4b5c6d7e8f9a0b1`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                        title="Search USASpending.gov for this opportunity"
                        onClick={e => {
                          e.preventDefault()
                          window.open(`https://www.usaspending.gov/search/?query=${encodeURIComponent(lead.solicitation_number ?? lead.agency ?? '')}`, '_blank')
                        }}
                      >
                        <ExternalLink size={11} />
                        USASpending.gov
                      </a>
                    )}
                    <button
                      onClick={() => lookupUSASpending(form)}
                      disabled={usaLoading}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={usaLoading ? 'animate-spin' : ''} />
                      {usaLoading ? 'Looking up…' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* USASpending banner */}
                {usaData && !usaLoading && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-xs border ${usaData.found ? 'bg-[#052e16] border-green-900 text-green-300' : 'bg-[#1F2937] border-[#374151] text-gray-500'}`}>
                    {usaData.found
                      ? `✓ Prior award data found on USASpending.gov (Matched by: ${usaData.usaspending_match_method ?? 'N/A'}, Confidence: ${usaData.usaspending_confidence ?? 'N/A'})`
                      : 'No prior award data found on USASpending.gov — enter manually.'}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400">Manual override prevents overwriting pricing intel from USASpending.</div>
                  <label className="inline-flex items-center text-xs text-gray-200 gap-2">
                    <input
                      type="checkbox"
                      checked={form.manual_pricing_override ?? false}
                      onChange={e => setForm(f => ({ ...f, manual_pricing_override: e.target.checked }))}
                      className="h-4 w-4 text-[#D4AF37] rounded"
                    />
                    Override
                  </label>
                </div>

                {/* Key pricing intel at a glance */}
                {!editMode && (form.previous_award_total ?? lead.previous_award_total ?? form.incumbent_contractor ?? lead.incumbent_contractor) && (
                  <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-[#111827] rounded-lg border border-[#374151]">
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">Previous Award Total</div>
                      <div className="text-white font-bold text-sm">{formatFullCurrency(form.previous_award_total ?? lead.previous_award_total) ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">Incumbent Contractor</div>
                      <div className="text-white text-sm font-medium">{form.incumbent_contractor ?? lead.incumbent_contractor ?? '—'}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {editMode ? (
                    <>
                      <EditableField label="Estimated Value ($)" value={form.estimated_value?.toString()} editMode type="number" onChange={v => setForm(f => ({ ...f, estimated_value: v ? parseFloat(v) : null }))} />
                      <EditableField label="Award Amount ($)" value={form.award_amount?.toString()} editMode type="number" onChange={v => setForm(f => ({ ...f, award_amount: v ? parseFloat(v) : null }))} />
                      <EditableField label="Previous Award Total ($)" value={form.previous_award_total?.toString()} editMode type="number" onChange={v => setForm(f => ({ ...f, previous_award_total: v ? parseFloat(v) : null }))} />
                      <EditableField label="Incumbent Contractor" value={form.incumbent_contractor} editMode onChange={v => setForm(f => ({ ...f, incumbent_contractor: v }))} />
                    </>
                  ) : (
                    <>
                      <InfoRow label="Estimated Value" value={formatFullCurrency(lead.estimated_value)} />
                      <InfoRow label="Award Amount" value={formatFullCurrency(lead.award_amount)} />
                    </>
                  )}
                </div>
                {(form.award_history_notes ?? lead.award_history_notes) && !editMode && (
                  <div className="mt-3">
                    <div className={labelCls}>Award History Notes</div>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{form.award_history_notes ?? lead.award_history_notes}</p>
                  </div>
                )}
                {editMode && (
                  <div className="mt-3">
                    <label className={labelCls}>Award History Notes</label>
                    <textarea className={`${selectCls} resize-none text-xs`} rows={3} value={form.award_history_notes ?? ''} onChange={e => setForm(f => ({ ...f, award_history_notes: e.target.value }))} />
                  </div>
                )}
              </div>

              {/* Links */}
              <div>
                <SectionLabel>Links</SectionLabel>
                {editMode ? (
                  <div className="space-y-2">
                    <EditableField label="SAM.gov URL" value={form.sam_gov_url} editMode onChange={v => setForm(f => ({ ...f, sam_gov_url: v }))} />
                    <EditableField label="Solicitation URL" value={form.solicitation_url} editMode onChange={v => setForm(f => ({ ...f, solicitation_url: v }))} />
                    <EditableField label="Drive Folder URL" value={form.drive_folder_url} editMode onChange={v => setForm(f => ({ ...f, drive_folder_url: v }))} />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <LinkButton href={lead.sam_gov_url} label="SAM.gov" />
                    <LinkButton href={lead.solicitation_url} label="Solicitation" />
                    {(lead.drive_folder_url || form.drive_folder_url) ? (
                      <>
                        <LinkButton href={form.drive_folder_url || lead.drive_folder_url} label="Drive Folder" icon={<Folder size={13} />} />
                        <button
                          onClick={async () => {
                            try {
                              setGeneratingProposals(true)
                              const resp = await fetch('/api/drive/generate-proposal-docs', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ leadId: lead.id }),
                              })
                              const data = await resp.json()
                              if (resp.ok) {
                                alert(`Generated ${data.totalUploaded} proposal documents and uploaded to Drive folder.`)
                              } else {
                                alert(`Error: ${data.error}`)
                              }
                            } catch {
                              alert('Failed to generate proposal documents.')
                            } finally {
                              setGeneratingProposals(false)
                            }
                          }}
                          disabled={generatingProposals}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50"
                        >
                          {generatingProposals ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                          {generatingProposals ? 'Generating...' : 'Generate Proposals'}
                        </button>
                        {lead.source === 'sam_gov' && lead.notice_id && (
                          <button
                            onClick={async () => {
                              try {
                                setSyncingDocs(true)
                                const resp = await fetch('/api/drive/sync-sam-docs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ leadId: lead.id }),
                                })
                                const data = await resp.json()
                                if (resp.ok) {
                                  if (data.documents?.found > 0) {
                                    alert(`Synced ${data.documents.uploaded} of ${data.documents.found} document(s) from SAM.gov to your Drive folder.${data.folderCreated ? '\n\nDrive folder was auto-created.' : ''}`)
                                  } else {
                                    alert('No downloadable documents found on SAM.gov for this solicitation. Check the SAM.gov page directly for attachments.')
                                  }
                                  if (data.folderUrl && !lead.drive_folder_url) {
                                    setForm(f => ({ ...f, drive_folder_url: data.folderUrl }))
                                    onUpdate({ ...lead, drive_folder_url: data.folderUrl })
                                  }
                                  // Reload interactions to show the sync note
                                  const supabase = createClient()
                                  const { data: notes } = await supabase
                                    .from('interactions')
                                    .select('*')
                                    .eq('gov_lead_id', lead.id)
                                    .order('interaction_date', { ascending: false })
                                    .order('created_at', { ascending: false })
                                    .limit(50)
                                  if (notes) setInteractions(notes)
                                } else {
                                  alert(`Error: ${data.error}`)
                                }
                              } catch {
                                alert('Failed to sync SAM.gov documents.')
                              } finally {
                                setSyncingDocs(false)
                              }
                            }}
                            disabled={syncingDocs}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                          >
                            {syncingDocs ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            {syncingDocs ? 'Syncing...' : 'Sync SAM.gov Docs'}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          const url = await createDriveBidFolder(lead.id)
                          if (url) {
                            setForm(f => ({ ...f, drive_folder_url: url }))
                            onUpdate({ ...lead, drive_folder_url: url })
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        <Folder size={13} />
                        Create Drive Folder
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Suggested Partners */}
              <div>
                <SectionLabel>Suggested Partners</SectionLabel>
                {suggestedSubs.length === 0 ? (
                  <p className="text-gray-600 text-xs italic">No matching subcontractors found. Add subcontractors with matching service tags or NAICS codes to see suggestions here.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Teaming Partners first */}
                    {suggestedSubs.filter(s => s.sub_type === 'teaming_partner').length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-blue-400 mb-1.5 uppercase tracking-wide">Teaming Partners (SAM-registered)</div>
                        <div className="space-y-2">
                          {suggestedSubs.filter(s => s.sub_type === 'teaming_partner').map(sub => (
                            <SuggestedSubCard key={sub.id} sub={sub} accentColor={accentColor} />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Fulfillment Subs second */}
                    {suggestedSubs.filter(s => s.sub_type !== 'teaming_partner').length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-orange-400 mb-1.5 uppercase tracking-wide">Fulfillment Subs</div>
                        <div className="space-y-2">
                          {suggestedSubs.filter(s => s.sub_type !== 'teaming_partner').map(sub => (
                            <SuggestedSubCard key={sub.id} sub={sub} accentColor={accentColor} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <SectionLabel>Notes</SectionLabel>
                {editMode ? (
                  <textarea
                    className={`${selectCls} resize-none`}
                    rows={4}
                    value={form.notes ?? ''}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                ) : (
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{lead.notes || <span className="text-gray-600 italic">No notes</span>}</p>
                )}
              </div>

              {/* Bid decision notes */}
              {(lead.bid_decision_notes || editMode) && (
                <div>
                  <SectionLabel>Bid Decision Notes</SectionLabel>
                  {editMode ? (
                    <textarea className={`${selectCls} resize-none`} rows={3} value={form.bid_decision_notes ?? ''} onChange={e => setForm(f => ({ ...f, bid_decision_notes: e.target.value }))} />
                  ) : (
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{lead.bid_decision_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'compliance' && (
            <div className="p-6">
              {lead.status !== 'active_bid' && complianceItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Move this lead to <strong className="text-green-400">Active Bid</strong> to auto-generate the compliance checklist.</p>
                  <button
                    onClick={() => handleStatusChange('active_bid')}
                    className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg text-[#111827] transition"
                    style={{ backgroundColor: accentColor }}
                  >
                    Set to Active Bid
                  </button>
                </div>
              ) : loadingCompliance ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">{completedCount} of {complianceItems.length} complete</span>
                    <div className="h-2 w-32 bg-[#374151] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${complianceItems.length ? (completedCount / complianceItems.length) * 100 : 0}%`, backgroundColor: accentColor }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {complianceItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => toggleCompliance(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                          item.is_complete ? 'bg-[#052e16] border border-green-900' : 'bg-[#1F2937] border border-[#374151] hover:border-[#4B5563]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                          item.is_complete ? 'bg-green-500 border-green-500' : 'border-[#4B5563]'
                        }`}>
                          {item.is_complete && <Check size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm ${item.is_complete ? 'text-green-300 line-through opacity-70' : 'text-gray-200'}`}>
                          {item.item_name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'interactions' && (
            <div className="p-6 space-y-4">
              {/* Add note */}
              <div className="flex gap-2">
                <textarea
                  className={`${selectCls} resize-none flex-1`}
                  rows={2}
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                />
                <button
                  onClick={addInteractionNote}
                  disabled={addingNote || !newNote.trim()}
                  className="px-3 py-2 rounded-lg text-[#111827] font-semibold text-sm disabled:opacity-50 transition flex-shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No notes yet.</div>
              ) : (
                <div className="space-y-3">
                  {interactions.map(i => {
                    const isAmendment = i.subject?.toLowerCase().includes('amendment detected')
                    const isDocSync = i.subject?.toLowerCase().includes('document sync')
                    const isSystemUpdate = i.interaction_type === 'system_update'

                    return (
                      <div
                        key={i.id}
                        className={`rounded-lg px-4 py-3 ${
                          isAmendment
                            ? 'bg-red-950/40 border border-red-800/50'
                            : isDocSync
                            ? 'bg-amber-950/30 border border-amber-800/40'
                            : 'bg-[#1F2937] border border-[#374151]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isAmendment ? (
                            <AlertTriangle size={13} className="text-red-400" />
                          ) : isDocSync ? (
                            <Download size={13} className="text-amber-400" />
                          ) : isSystemUpdate ? (
                            <RefreshCw size={13} className="text-blue-400" />
                          ) : (
                            <MessageSquare size={13} className="text-gray-500" />
                          )}
                          <span className={`text-xs ${isAmendment ? 'text-red-400' : isDocSync ? 'text-amber-400' : 'text-gray-500'}`}>
                            {i.interaction_date}
                          </span>
                          {isAmendment && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Amendment</span>
                          )}
                          {isDocSync && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Doc Sync</span>
                          )}
                          {!isAmendment && !isDocSync && i.interaction_type && i.interaction_type !== 'note' && (
                            <span className="text-xs text-gray-500 capitalize">· {i.interaction_type.replace('_', ' ')}</span>
                          )}
                        </div>
                        {i.subject && i.subject !== 'Note' && (
                          <div className={`text-sm font-medium mb-1 ${isAmendment ? 'text-red-300' : isDocSync ? 'text-amber-300' : 'text-gray-300'}`}>
                            {i.subject}
                          </div>
                        )}
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{i.notes}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Status dropdown (inline in header) ──────────────────────────────────────
function StatusDropdown({ status, onChange }: { status: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
        <StatusBadge status={status} size="md" />
        <ChevronDown size={12} className="text-gray-500" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-[#1F2937] border border-[#374151] rounded-lg shadow-xl py-1 min-w-40">
          {LEAD_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className="block w-full text-left px-3 py-2 hover:bg-[#374151] transition"
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function EditableField({ label, value, editMode, onChange, type = 'text' }: {
  label: string; value?: string | null; editMode: boolean
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {editMode ? (
        <input
          type={type}
          className={selectCls}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <div className="text-gray-200 text-sm">{value || '—'}</div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === '—') return null
  return (
    <div>
      <div className={labelCls}>{label}</div>
      <div className="text-gray-200 text-sm">{value}</div>
    </div>
  )
}

function SuggestedSubCard({
  sub, accentColor,
}: {
  sub: Subcontractor & { matchScore: number; matchReasons: string[] }
  accentColor: string
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 bg-[#111827] rounded-lg border border-[#374151]">
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium">{sub.company_name}</div>
        {sub.contact_name && <div className="text-gray-400 text-xs">{sub.contact_name}</div>}
        {sub.contact_phone && <div className="text-gray-500 text-xs">{sub.contact_phone}</div>}
        <div className="flex flex-wrap gap-1 mt-1">
          {sub.matchReasons.map(r => (
            <span key={r} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: accentColor + '22', color: accentColor }}>{r}</span>
          ))}
          {sub.sub_type === 'teaming_partner' && sub.teaming_agreement_status === 'executed' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#052e16] text-green-400">teaming ✓</span>
          )}
        </div>
      </div>
      <div className="text-xs font-bold flex-shrink-0" style={{ color: sub.matchScore >= 60 ? '#4ADE80' : sub.matchScore >= 40 ? '#FCD34D' : '#9CA3AF' }}>
        {sub.matchScore}%
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</div>
}

function LinkButton({ href, label, icon }: { href?: string | null; label: string; icon?: React.ReactNode }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] rounded-lg text-sm text-gray-300 hover:text-white transition"
    >
      {icon ?? <ExternalLink size={13} />}
      {label}
    </a>
  )
}

const labelCls = 'block text-xs text-gray-500 mb-1'
const selectCls = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition'
