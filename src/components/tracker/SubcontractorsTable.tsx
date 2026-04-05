'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subcontractor, EntityType } from '@/lib/types'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import { Building2, Plus, ExternalLink, ChevronDown, ChevronUp, Star, Zap, Trash2 } from 'lucide-react'
import { auditSubcontractorAdded } from '@/lib/audit-notifications'

interface SubcontractorsTableProps {
  entity: EntityType
}

const ALL_SERVICE_TAGS = [
  'Janitorial', 'Landscaping', 'HVAC', 'Electrical', 'Plumbing',
  'Painting', 'Environmental', 'Security', 'Staffing', 'Flooring',
  'Pest Control', 'Locksmith', 'Fire Protection', 'Roofing',
  'Window Cleaning', 'Waste Removal',
]

const EMPTY_SUB: Omit<Subcontractor, 'id' | 'created_at' | 'updated_at'> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  uei: '',
  cage_code: '',
  certifications: [],
  naics_codes: [],
  set_asides: [],
  service_tags: [],
  services_offered: '',
  geographic_coverage: '',
  entities_associated: [],
  sub_type: 'teaming_partner',
  teaming_agreement_status: 'none',
  teaming_agreement_url: '',
  fit_score: 0,
  reputation_rating: 0,
  notes: '',
}

export function SubcontractorsTable({ entity }: SubcontractorsTableProps) {
  const [subs, setSubs] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_SUB, entities_associated: [entity] as EntityType[] })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'teaming_partner' | 'fulfillment_sub'>('all')
  const [search, setSearch] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSubs() }, [entity])

  async function fetchSubs() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('subcontractors')
      .select('*')
      .contains('entities_associated', [entity])
      .order('fit_score', { ascending: false })
    setSubs(data ?? [])
    setLoading(false)
  }

  async function handleSave(payload: typeof form) {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('subcontractors')
      .insert({ ...payload })
      .select()
      .single()
    if (!error && data) {
      setSubs(prev => [...prev, data].sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0)))
      setShowModal(false)
      setShowQuickAdd(false)
      // Audit notification for new subcontractor
      auditSubcontractorAdded(payload.company_name, payload.entities_associated || [entity])
      setForm({ ...EMPTY_SUB, entities_associated: [entity] })
    }
    setSaving(false)
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('subcontractors')
      .delete()
      .eq('id', pendingDeleteId)
    if (!error) {
      setSubs(prev => prev.filter(s => s.id !== pendingDeleteId))
      setPendingDeleteId(null)
      setExpandedId(null)
    }
    setDeleting(false)
  }

  function handleArrayField(field: 'certifications' | 'naics_codes' | 'set_asides', value: string) {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    setForm(f => ({ ...f, [field]: arr }))
  }

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      service_tags: f.service_tags.includes(tag)
        ? f.service_tags.filter(t => t !== tag)
        : [...f.service_tags, tag],
    }))
  }

  const displayed = subs.filter(s => {
    if (typeFilter !== 'all' && s.sub_type !== typeFilter) return false
    if (tagFilter && !(s.service_tags ?? []).includes(tagFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.company_name.toLowerCase().includes(q) ||
        (s.contact_name ?? '').toLowerCase().includes(q) ||
        (s.geographic_coverage ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const teamingCount = subs.filter(s => s.sub_type === 'teaming_partner').length
  const fulfillmentCount = subs.filter(s => s.sub_type === 'fulfillment_sub').length

  if (loading) return <LoadingPage />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Subcontractors</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {teamingCount} teaming partner{teamingCount !== 1 ? 's' : ''} · {fulfillmentCount} fulfillment sub{fulfillmentCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setForm({ ...EMPTY_SUB, entities_associated: [entity], sub_type: 'fulfillment_sub' }); setShowQuickAdd(true) }}
            title="Quick-add a local or national fulfillment sub"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1F2937] hover:bg-[#253347] border border-[#374151] text-gray-300 font-medium text-sm rounded-lg transition"
          >
            <Zap size={14} className="text-yellow-400" />
            Quick Add
          </button>
          <button
            onClick={() => { setForm({ ...EMPTY_SUB, entities_associated: [entity] }); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#b8952e] text-[#111827] font-semibold text-sm rounded-lg transition"
          >
            <Plus size={16} />
            Add Teaming Partner
          </button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-1 mb-4 bg-[#111827] border border-[#374151] rounded-lg p-1 self-start inline-flex">
        {([
          { value: 'all', label: `All (${subs.length})` },
          { value: 'teaming_partner', label: `Teaming (${teamingCount})` },
          { value: 'fulfillment_sub', label: `Fulfillment (${fulfillmentCount})` },
        ] as const).map(opt => (
          <button
            key={opt.value}
            onClick={() => setTypeFilter(opt.value)}
            className="px-3 py-1.5 rounded text-xs font-medium transition"
            style={typeFilter === opt.value
              ? { backgroundColor: '#D4AF3722', color: '#D4AF37' }
              : { color: '#9CA3AF' }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search + tag filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, location…"
          className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] w-48"
        />
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none"
        >
          <option value="">All Service Tags</option>
          {ALL_SERVICE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(tagFilter || search) && (
          <button onClick={() => { setTagFilter(''); setSearch('') }} className="text-xs text-gray-500 hover:text-white">
            Clear
          </button>
        )}
        <span className="text-gray-500 text-xs ml-auto">{displayed.length} shown</span>
      </div>

      {/* Delete confirmation bar */}
      {pendingDeleteId && (
        <div className="px-4 py-3 mb-4 bg-red-900/30 border border-red-800/50 rounded-lg flex items-center justify-between">
          <span className="text-red-300 text-sm">
            Delete {subs.find(s => s.id === pendingDeleteId)?.company_name}?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPendingDeleteId(null)}
              className="px-3 py-1 text-xs text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-3 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No subcontractors match"
          description="Try adjusting the filter or add a new subcontractor."
          action={{ label: 'Add Teaming Partner', onClick: () => { setForm({ ...EMPTY_SUB, entities_associated: [entity] }); setShowModal(true) } }}
        />
      ) : (
        <div className="space-y-3">
          {displayed.map(sub => (
            <SubCard
              key={sub.id}
              sub={sub}
              expanded={expandedId === sub.id}
              onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              onDelete={() => setPendingDeleteId(sub.id)}
            />
          ))}
        </div>
      )}

      {/* ── Quick Add modal (minimal) ── */}
      {showQuickAdd && (
        <QuickAddModal
          entity={entity}
          onClose={() => setShowQuickAdd(false)}
          onSave={payload => handleSave({ ...EMPTY_SUB, entities_associated: [entity], ...payload })}
          saving={saving}
        />
      )}

      {/* ── Full Add Teaming Partner modal ── */}
      {showModal && (
        <Modal
          title="Add Teaming Partner"
          onClose={() => setShowModal(false)}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
              <button
                onClick={() => handleSave(form)}
                disabled={saving || !form.company_name}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b8952e] disabled:opacity-50 text-[#111827] font-semibold text-sm rounded-lg transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Company Name *" required>
                <input className={inputCls} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Logistics LLC" />
              </FormField>
            </div>
            <FormField label="Contact Name">
              <input className={inputCls} value={form.contact_name ?? ''} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </FormField>
            <FormField label="Contact Email">
              <input type="email" className={inputCls} value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            </FormField>
            <FormField label="Phone">
              <input className={inputCls} value={form.contact_phone ?? ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
            </FormField>
            <FormField label="Geographic Coverage">
              <input className={inputCls} value={form.geographic_coverage ?? ''} onChange={e => setForm(f => ({ ...f, geographic_coverage: e.target.value }))} placeholder="Northern VA, DMV" />
            </FormField>
            <FormField label="UEI">
              <input className={inputCls} value={form.uei ?? ''} onChange={e => setForm(f => ({ ...f, uei: e.target.value }))} />
            </FormField>
            <FormField label="CAGE Code">
              <input className={inputCls} value={form.cage_code ?? ''} onChange={e => setForm(f => ({ ...f, cage_code: e.target.value }))} />
            </FormField>
            <FormField label="Certifications (comma-separated)">
              <input className={inputCls} defaultValue={form.certifications.join(', ')} onBlur={e => handleArrayField('certifications', e.target.value)} placeholder="WOSB, 8a, HUBZone" />
            </FormField>
            <FormField label="NAICS Codes (comma-separated)">
              <input className={inputCls} defaultValue={form.naics_codes.join(', ')} onBlur={e => handleArrayField('naics_codes', e.target.value)} placeholder="561720, 561730" />
            </FormField>
            <FormField label="Teaming Agreement Status">
              <select className={inputCls} value={form.teaming_agreement_status} onChange={e => setForm(f => ({ ...f, teaming_agreement_status: e.target.value }))}>
                <option value="none">None</option>
                <option value="drafting">Drafting</option>
                <option value="executed">Executed</option>
              </select>
            </FormField>
            <FormField label="Website">
              <input type="url" className={inputCls} value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Service Tags">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_SERVICE_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${form.service_tags.includes(tag) ? 'bg-[#D4AF37] text-[#111827]' : 'bg-[#374151] text-gray-400 hover:text-white'}`}
                    >{tag}</button>
                  ))}
                </div>
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Services Offered">
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.services_offered ?? ''} onChange={e => setForm(f => ({ ...f, services_offered: e.target.value }))} />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Notes">
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </FormField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Quick Add Modal (minimal — for local subs found in the field) ─────────────
function QuickAddModal({
  entity,
  onClose,
  onSave,
  saving,
}: {
  entity: EntityType
  onClose: () => void
  onSave: (payload: Partial<Omit<Subcontractor, 'id' | 'created_at' | 'updated_at'>>) => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [coverage, setCoverage] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [subType, setSubType] = useState<'teaming_partner' | 'fulfillment_sub'>('fulfillment_sub')

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  return (
    <Modal
      title="Quick Add Subcontractor"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button
            onClick={() => onSave({
              company_name: name.trim(),
              contact_phone: phone.trim() || null,
              website: website.trim() || null,
              geographic_coverage: coverage.trim() || null,
              service_tags: tags,
              notes: notes.trim() || null,
              sub_type: subType,
              entities_associated: [entity],
              certifications: [],
              naics_codes: [],
              set_asides: [],
              teaming_agreement_status: 'none',
              fit_score: 0,
              reputation_rating: 0,
            })}
            disabled={saving || !name.trim()}
            className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b8952e] disabled:opacity-50 text-[#111827] font-semibold text-sm rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Add'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={lblCls}>Company Name *</label>
          <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Northern VA Plumbing LLC" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lblCls}>Type</label>
            <select className={inputCls} value={subType} onChange={e => setSubType(e.target.value as typeof subType)}>
              <option value="fulfillment_sub">Fulfillment Sub</option>
              <option value="teaming_partner">Teaming Partner</option>
            </select>
          </div>
          <div>
            <label className={lblCls}>Phone</label>
            <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(703) 555-0000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lblCls}>Website</label>
            <input type="url" className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className={lblCls}>Coverage Area</label>
            <input className={inputCls} value={coverage} onChange={e => setCoverage(e.target.value)} placeholder="Northern VA, DMV" />
          </div>
        </div>
        <div>
          <label className={lblCls}>Service Tags</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ALL_SERVICE_TAGS.map(tag => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${tags.includes(tag) ? 'bg-[#D4AF37] text-[#111827]' : 'bg-[#374151] text-gray-400 hover:text-white'}`}
              >{tag}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={lblCls}>Notes</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Where you found them, any relevant details…" />
        </div>
      </div>
    </Modal>
  )
}

// ── SubCard ───────────────────────────────────────────────────────────────────
function SubCard({ sub, expanded, onToggle, onDelete }: { sub: Subcontractor; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const score = sub.fit_score ?? 0
  const scoreColor = score >= 80 ? '#4ADE80' : score >= 60 ? '#FCD34D' : '#9CA3AF'
  const isTeaming = sub.sub_type === 'teaming_partner'

  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
      <button
        className="w-full group flex items-center justify-between px-5 py-4 text-left hover:bg-[#253347] transition"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#374151] flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-gray-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-medium truncate">{sub.company_name}</span>
              {/* Sub type badge */}
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                isTeaming ? 'bg-[#172554] text-blue-300' : 'bg-[#1c1917] text-orange-300'
              }`}>
                {isTeaming ? 'Teaming' : 'Fulfillment'}
              </span>
            </div>
            <div className="text-gray-400 text-sm truncate">
              {sub.contact_name || sub.geographic_coverage || '—'}
              {sub.contact_name && sub.geographic_coverage ? ` · ${sub.geographic_coverage}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {/* Service tags (up to 2) */}
          {(sub.service_tags ?? []).slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded text-xs bg-[#1e3a5f] text-blue-300 font-medium hidden sm:inline">{tag}</span>
          ))}
          {/* Certifications (up to 2, teaming partners only) */}
          {isTeaming && sub.certifications.slice(0, 2).map(cert => (
            <span key={cert} className="px-2 py-0.5 rounded text-xs bg-[#2e1065] text-purple-300 font-medium hidden md:inline">{cert}</span>
          ))}
          {/* Fit Score */}
          {score > 0 && (
            <div className="flex items-center gap-1">
              <Star size={11} style={{ color: scoreColor }} />
              <span className="text-xs font-semibold" style={{ color: scoreColor }}>{score}</span>
            </div>
          )}
          {/* Teaming status (only for teaming partners) */}
          {isTeaming && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              sub.teaming_agreement_status === 'executed' ? 'bg-[#052e16] text-green-400'
              : sub.teaming_agreement_status === 'drafting' ? 'bg-[#3b2a1a] text-yellow-300'
              : 'bg-[#1F2937] text-gray-500'
            }`}>
              {sub.teaming_agreement_status === 'executed' ? 'Executed'
                : sub.teaming_agreement_status === 'drafting' ? 'Drafting'
                : 'No Agreement'}
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-900/50 transition"
              title="Delete subcontractor"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-[#374151] space-y-4 text-sm">
          {/* Service tags full list */}
          {(sub.service_tags ?? []).length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-1.5">Service Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {(sub.service_tags ?? []).map(tag => (
                  <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs bg-[#1e3a5f] text-blue-300 font-medium">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {sub.contact_name && <Detail label="Contact" value={sub.contact_name} />}
            {sub.contact_email && <Detail label="Email" value={sub.contact_email} />}
            {sub.contact_phone && <Detail label="Phone" value={sub.contact_phone} />}
            {sub.geographic_coverage && <Detail label="Coverage" value={sub.geographic_coverage} />}
            {isTeaming && sub.uei && <Detail label="UEI" value={sub.uei} />}
            {isTeaming && sub.cage_code && <Detail label="CAGE" value={sub.cage_code} />}
            {isTeaming && sub.certifications.length > 0 && (
              <div className="col-span-2">
                <div className="text-gray-500 text-xs mb-1">Certifications</div>
                <div className="flex flex-wrap gap-1">
                  {sub.certifications.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded text-xs bg-[#2e1065] text-purple-300">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {sub.services_offered && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Services</div>
              <div className="text-gray-200">{sub.services_offered}</div>
            </div>
          )}
          {sub.notes && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Notes</div>
              <div className="text-gray-400">{sub.notes}</div>
            </div>
          )}
          {sub.website && (
            <a href={sub.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm">
              <ExternalLink size={13} /> {sub.website}
            </a>
          )}
          {(sub.reputation_rating ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>Reputation:</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11}
                    className={i < Math.round((sub.reputation_rating ?? 0) / 20) ? 'text-yellow-400' : 'text-gray-600'}
                    fill={i < Math.round((sub.reputation_rating ?? 0) / 20) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <span>{sub.reputation_rating}/100</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-gray-500 text-xs mb-0.5">{label}</div>
      <div className="text-gray-200">{value}</div>
    </div>
  )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition'
const lblCls = 'block text-xs font-medium text-gray-400 mb-1.5'
