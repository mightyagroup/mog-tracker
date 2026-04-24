'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityType, LeadStatus, SetAsideType, SourceType, ServiceCategory } from '@/lib/types'
import { calculateFitScore } from '@/lib/utils'
import { Modal } from '@/components/common/Modal'
import { Upload, FileText, Check, AlertCircle, X } from 'lucide-react'

interface ImportCSVModalProps {
  entity: EntityType
  categories: ServiceCategory[]
  onClose: () => void
  onImport: (count: number) => void
}

type Step = 'upload' | 'map' | 'done'

interface MappingState {
  [appField: string]: string
}

const APP_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'title',                label: 'Title',                required: true },
  { key: 'solicitation_number',  label: 'Solicitation #' },
  { key: 'agency',               label: 'Agency' },
  { key: 'status',               label: 'Status' },
  { key: 'naics_code',           label: 'NAICS Code' },
  { key: 'set_aside',            label: 'Set-Aside' },
  { key: 'source',               label: 'Source' },
  { key: 'estimated_value',      label: 'Estimated Value ($)' },
  { key: 'response_deadline',    label: 'Response Deadline' },
  { key: 'place_of_performance', label: 'Place of Performance' },
  { key: 'proposal_lead',        label: 'Proposal Lead' },
  { key: 'sam_gov_url',          label: 'SAM.gov URL' },
  { key: 'notes',                label: 'Notes' },
  { key: 'description',          label: 'Description' },
]

const FIELD_KEYWORDS: Record<string, string[]> = {
  title:                ['name', 'title', 'opportunity', 'project', 'bid', 'contract name', 'page'],
  solicitation_number:  ['solicitation', 'sol #', 'rfp', 'rfq', 'contract number', 'sol number', 'solicitation number'],
  agency:               ['agency', 'department', 'contracting agency', 'customer', 'organization', 'client'],
  status:               ['status', 'stage', 'phase', 'state'],
  naics_code:           ['naics', 'naics code', 'naics #'],
  set_aside:            ['set aside', 'set-aside', 'setaside', 'small business type', 'small business set aside'],
  source:               ['source', 'origin', 'found via', 'lead source'],
  estimated_value:      ['value', 'amount', 'estimated value', 'contract value', 'estimated amount', 'price', 'contract amount'],
  response_deadline:    ['deadline', 'due date', 'response deadline', 'due', 'proposal due', 'submission deadline', 'response date'],
  place_of_performance: ['location', 'place of performance', 'pop', 'performance location', 'state', 'city'],
  proposal_lead:        ['lead', 'proposal lead', 'owner', 'assigned to', 'capture lead', 'capture manager'],
  sam_gov_url:          ['sam', 'sam.gov', 'url', 'link', 'opportunity url', 'sam url'],
  notes:                ['notes', 'comments', 'remarks', 'annotation'],
  description:          ['description', 'scope', 'requirements', 'overview', 'summary'],
}

// ââ CSV Parser âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') inQuotes = !inQuotes
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current)
      current = ''
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      current += ch
    }
  }
  if (current.trim()) lines.push(current)
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let cell = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) {
        result.push(cell.trim())
        cell = ''
      } else {
        cell += ch
      }
    }
    result.push(cell.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}

// ââ Auto-detect mapping ââââââââââââââââââââââââââââââââââââââââââââââââââââ
function autoMap(headers: string[]): MappingState {
  const mapping: MappingState = {}
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    const match = headers.find(h =>
      keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
    )
    if (match) mapping[field] = match
  }
  return mapping
}

// ââ Value transformers âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function parseValue(raw: string): number | null {
  if (!raw.trim()) return null
  const cleaned = raw.replace(/[$,\s]/g, '').toLowerCase()
  const suffix = cleaned.slice(-1)
  const base = parseFloat(cleaned.replace(/[kmb]$/, ''))
  if (isNaN(base)) return null
  if (suffix === 'm') return base * 1_000_000
  if (suffix === 'k') return base * 1_000
  if (suffix === 'b') return base * 1_000_000_000
  return base
}

function parseDate(raw: string): string | null {
  if (!raw.trim()) return null
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  const notionDate = raw.match(/^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (notionDate) {
    const months: Record<string, string> = { January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12' }
    return `${notionDate[3]}-${months[notionDate[1]] ?? '01'}-${notionDate[2].padStart(2, '0')}`
  }
  return null
}

function mapStatus(raw: string): LeadStatus {
  const v = raw.toLowerCase().trim()
  if (!v) return 'new'
  if (v.includes('active bid') || v === 'active') return 'active_bid'
  if (v.includes('review') || v.includes('evaluat')) return 'reviewing'
  if (v.includes('submit')) return 'submitted'
  if (v.includes('award')) return 'awarded'
  if (v.includes('lost') || v.includes('declin') || v.includes('not award')) return 'lost'
  if (v.includes('no bid') || v.includes('no-bid') || v.includes('nobid')) return 'no_bid'
  if (v.includes('cancel') || v.includes('withdrawn')) return 'cancelled'
  if (v.includes('bid/no') || v.includes('bid no bid') || v.includes('decision') || v.includes('go/no')) return 'bid_no_bid'
  return 'new'
}

function mapSetAside(raw: string): SetAsideType {
  const v = raw.toLowerCase().trim()
  if (!v || v === 'none' || v === 'n/a' || v === 'full and open') return 'none'
  if (v.includes('edwosb')) return 'edwosb'
  if (v.includes('wosb') || v.includes('women')) return 'wosb'
  if (v.includes('8(a)') || v === '8a' || v.includes('8a ')) return '8a'
  if (v.includes('hubzone')) return 'hubzone'
  if (v.includes('sdvosb') || v.includes('service-disabled') || v.includes('veteran')) return 'sdvosb'
  if (v.includes('total small') || v.includes('total sb')) return 'total_small_business'
  if (v.includes('small bus') || v.includes(' sb') || v.includes('small business')) return 'small_business'
  if (v.includes('full') && v.includes('open')) return 'full_and_open'
  if (v.includes('sole source') || v.includes('j&a')) return 'sole_source'
  return 'none'
}

function mapSource(raw: string): SourceType {
  const v = raw.toLowerCase().trim()
  if (!v) return 'manual'
  if (v.includes('sam')) return 'sam_gov'
  if (v.includes('govwin') || v.includes('bgov')) return 'govwin'
  if (v.includes('eva') || v.includes('virginia')) return 'eva'
  if (v.includes('emma') || v.includes('maryland')) return 'emma'
  if (v.includes('local') || v.includes('county') || v.includes('city')) return 'local_gov'
  if (v.includes('usaspending')) return 'usaspending'
  return 'manual'
}

// ââ Main component âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export function ImportCSVModal({ entity, onClose, onImport }: ImportCSVModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<MappingState>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const processFile = useCallback(async (file: File) => {
    setUploadErr(null)
    const nm = file.name.toLowerCase()

    if (nm.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string
        const { headers, rows } = parseCSV(text)
        if (headers.length === 0) { setUploadErr('CSV has no rows'); return }
        setCsvHeaders(headers)
        setCsvRows(rows)
        setMapping(autoMap(headers))
        setStep('map')
      }
      reader.readAsText(file)
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', entity)
      fd.append('mode', 'extract_leads')
      const r = await fetch('/api/leads/import-file', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'upload failed')

      if (j.csv_rows && j.headers) {
        setCsvHeaders(j.headers)
        setCsvRows(j.csv_rows)
        setMapping(autoMap(j.headers))
        setStep('map')
        return
      }

      const leads = j.leads || []
      if (leads.length === 0) {
        setUploadErr('Claude could not extract any opportunities from this file. Try a clearer scan or different format.')
        return
      }
      const hdrs = ['title', 'solicitation_number', 'agency', 'naics_code', 'set_aside', 'response_deadline', 'estimated_value', 'place_of_performance', 'description', 'sam_gov_url', 'incumbent_contractor']
      const rs = leads.map((l: Record<string, unknown>) => {
        const row: Record<string, string> = {}
        hdrs.forEach(h => { row[h] = l[h] == null ? '' : String(l[h]) })
        return row
      })
      setCsvHeaders(hdrs)
      setCsvRows(rs)
      const autoMapping: MappingState = {}
      hdrs.forEach(h => { autoMapping[h] = h })
      setMapping(autoMapping)
      setStep('map')
    } catch (e: unknown) {
      setUploadErr((e as Error).message)
    } finally {
      setUploading(false)
    }
  }, [entity])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  async function handleImport() {
    setImporting(true)
    const supabase = createClient()
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    const BATCH = 50
    const toInsert: Record<string, unknown>[] = []

    for (const row of csvRows) {
      const title = mapping.title ? row[mapping.title]?.trim() : ''
      if (!title) { skipped++; continue }

      const estimatedValue = mapping.estimated_value ? parseValue(row[mapping.estimated_value] ?? '') : null
      const responseDeadline = mapping.response_deadline ? parseDate(row[mapping.response_deadline] ?? '') : null
      const setAside = mapping.set_aside ? mapSetAside(row[mapping.set_aside] ?? '') : 'none'
      const naicsCode = mapping.naics_code ? (row[mapping.naics_code] ?? '').trim().replace(/\D/g, '').slice(0, 6) || null : null
      const popRaw = mapping.place_of_performance ? (row[mapping.place_of_performance] ?? '').trim() : ''

      const partial = {
        naics_code: naicsCode,
        set_aside: setAside,
        estimated_value: estimatedValue,
        place_of_performance: popRaw || null,
        response_deadline: responseDeadline,
      }

      toInsert.push({
        entity,
        title,
        solicitation_number: mapping.solicitation_number ? (row[mapping.solicitation_number] ?? '').trim() || null : null,
        agency: mapping.agency ? (row[mapping.agency] ?? '').trim() || null : null,
        status: mapping.status ? mapStatus(row[mapping.status] ?? '') : 'new',
        source: mapping.source ? mapSource(row[mapping.source] ?? '') : 'manual',
        naics_code: partial.naics_code,
        set_aside: partial.set_aside,
        estimated_value: partial.estimated_value,
        response_deadline: partial.response_deadline,
        place_of_performance: partial.place_of_performance,
        proposal_lead: mapping.proposal_lead ? (row[mapping.proposal_lead] ?? '').trim() || null : null,
        sam_gov_url: mapping.sam_gov_url ? (row[mapping.sam_gov_url] ?? '').trim() || null : null,
        notes: mapping.notes ? (row[mapping.notes] ?? '').trim() || null : null,
        description: mapping.description ? (row[mapping.description] ?? '').trim() || null : null,
        fit_score: calculateFitScore(partial, entity),
        solicitation_verified: false,
      })
    }

    // Batch upsert (dedupe on entity + solicitation_number)
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH)
      const { error } = await supabase.from('gov_leads').upsert(batch, { onConflict: 'entity,solicitation_number' })
      if (error) {
        errors.push(error.message)
        skipped += batch.length
      } else {
        imported += batch.length
      }
    }

    setResult({ imported, skipped, errors })
    setImporting(false)
    setStep('done')
    if (imported > 0) onImport(imported)
  }

  const canImport = !!mapping.title && csvRows.length > 0

  return (
    <Modal
      title="Import Leads"
      onClose={onClose}
      size="lg"
      footer={
        step === 'map' ? (
          <>
            <span className="text-gray-500 text-sm mr-auto">{csvRows.length} rows detected</span>
            <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Back</button>
            <button
              onClick={handleImport}
              disabled={!canImport || importing}
              className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b8952e] disabled:opacity-50 text-[#111827] font-semibold text-sm rounded-lg transition"
            >
              {importing ? 'Importing...' : `Import ${csvRows.length} rows`}
            </button>
          </>
        ) : step === 'done' ? (
          <button onClick={onClose} className="px-5 py-2 bg-[#374151] hover:bg-[#4B5563] text-white text-sm rounded-lg transition">Close</button>
        ) : undefined
      }
    >
      {step === 'upload' && (
        <div className="space-y-5">
          <p className="text-gray-400 text-sm">Upload any format — CSV, Excel, PDF solicitation, Word doc, screenshot, or photo. The tool parses structured files directly and uses Claude to extract opportunities from unstructured ones.</p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition ${
              dragOver ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#374151] hover:border-[#4B5563] hover:bg-[#374151]/20'
            }`}
          >
            <Upload size={32} className="text-gray-500 mb-3" />
            <p className="text-white font-medium mb-1">
              {uploading ? 'Parsing file with Claude…' : 'Drop file here or click to browse'}
            </p>
            <p className="text-gray-500 text-sm">
              CSV, Excel (.xlsx), PDF, Word (.docx), PNG, JPG — solicitations, Notion exports, scans, or photos all work
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp,.txt,.md"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
          </div>

          {uploadErr && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
              {uploadErr}
            </div>
          )}

          <div className="bg-[#111827] rounded-lg border border-[#374151] p-4 text-sm">
            <p className="text-gray-400 font-medium mb-2">What works well:</p>
            <ul className="text-gray-500 space-y-1 list-disc list-inside text-xs">
              <li><span className="text-gray-300">CSV / Excel</span> — straight to the mapping screen</li>
              <li><span className="text-gray-300">PDF solicitation</span> — Claude reads it and extracts title, solicitation #, agency, NAICS, set-aside, deadline</li>
              <li><span className="text-gray-300">Word (.docx)</span> — text extracted and parsed same way</li>
              <li><span className="text-gray-300">PNG / JPG</span> — photo of a printed notice or a screenshot</li>
              <li><span className="text-gray-300">Notion export</span> — use the ••• menu → Export → CSV</li>
            </ul>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Map your CSV columns to app fields. Fields marked <span className="text-red-400">*</span> are required. Auto-detected mappings are pre-filled â adjust as needed.</p>

          <div className="border border-[#374151] rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-[#161E2E] px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#374151]">
              <div>App Field</div>
              <div>Your CSV Column</div>
            </div>
            <div className="divide-y divide-[#374151]">
              {APP_FIELDS.map(field => (
                <div key={field.key} className="grid grid-cols-2 items-center px-4 py-2.5 gap-3">
                  <div className="text-sm text-gray-300">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    {mapping[field.key] && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block" title="Mapped" />
                    )}
                  </div>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}
                    className="bg-[#111827] border border-[#374151] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] w-full"
                  >
                    <option value="">â Skip â</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {csvRows.length > 0 && (
            <div className="bg-[#111827] rounded-lg border border-[#374151] p-3">
              <p className="text-gray-500 text-xs mb-2 font-medium">Preview (first row):</p>
              <div className="text-xs text-gray-300 space-y-1">
                {Object.entries(mapping).filter(([, col]) => col).slice(0, 5).map(([field, col]) => (
                  <div key={field} className="flex gap-2">
                    <span className="text-gray-500 w-40 flex-shrink-0">{APP_FIELDS.find(f => f.key === field)?.label}:</span>
                    <span className="text-gray-300 truncate">{csvRows[0][col] || 'â'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4 text-center py-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${result.imported > 0 ? 'bg-green-900' : 'bg-red-900'}`}>
            {result.imported > 0 ? <Check size={28} className="text-green-400" /> : <AlertCircle size={28} className="text-red-400" />}
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-1">Import Complete</h3>
            <p className="text-gray-400 text-sm">
              {result.imported > 0 && <span className="text-green-400 font-medium">{result.imported} leads imported successfully</span>}
              {result.imported > 0 && result.skipped > 0 && <span className="text-gray-500"> Â· </span>}
              {result.skipped > 0 && <span className="text-yellow-400">{result.skipped} rows skipped</span>}
            </p>
          </div>
          {result.skipped > 0 && (
            <p className="text-gray-500 text-xs">Rows are skipped when the Title field is empty.</p>
          )}
          {result.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-left">
              <div className="flex items-center gap-2 mb-2">
                <X size={14} className="text-red-400" />
                <span className="text-red-400 text-sm font-medium">Import errors</span>
              </div>
              {result.errors.slice(0, 3).map((e, i) => (
                <p key={i} className="text-red-300 text-xs">{e}</p>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 justify-center mt-4">
            <FileText size={14} className="text-gray-500" />
            <span className="text-gray-500 text-sm">Your imported leads are now visible in the Leads tab.</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
