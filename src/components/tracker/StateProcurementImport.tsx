'use client'

import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { EntityType } from '@/lib/types'

interface ImportedLead {
  solicitation_number?: string
  state_procurement_id?: string
  title?: string
  description?: string
  agency?: string
  naics_code?: string
  set_aside?: string
  place_of_performance?: string
  estimated_value?: number
  response_deadline?: string
  posted_date?: string
  solicitation_url?: string
}

interface ImportResult {
  success: boolean
  feed: 'eva' | 'emma'
  dryRun: boolean
  fetched: number
  inserted: number
  updated: number
  skipped: number
  errorCount: number
  errors: string[]
}

export interface StateProcurementImportProps {
  entity: EntityType
  onImportComplete?: (result: ImportResult) => void
}

export default function StateProcurementImport({
  entity: _entity,
  onImportComplete,
}: StateProcurementImportProps) {
  const [activeTab, setActiveTab] = useState<'eva' | 'emma'>('eva')
  const [input, setInput] = useState('')
  const [importedLeads, setImportedLeads] = useState<ImportedLead[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(true)

  // ── Parse CSV from textarea ──────────────────────────────────────────────
  const parseCSV = (csv: string): ImportedLead[] => {
    const lines = csv.trim().split('\n')
    if (lines.length < 1) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    const leads: ImportedLead[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.every(v => !v)) continue // Skip empty rows

      const lead: ImportedLead = {}
      headers.forEach((header, idx) => {
        const value = values[idx]
        if (value) {
          // Map CSV column names to lead fields
          if (header.includes('title') || header.includes('opportunity')) lead.title = value
          else if (header.includes('solicitation') || header.includes('sol #')) lead.solicitation_number = value
          else if (header.includes('state id') || header.includes('state procurement')) lead.state_procurement_id = value
          else if (header.includes('description')) lead.description = value
          else if (header.includes('agency')) lead.agency = value
          else if (header.includes('naics')) lead.naics_code = value
          else if (header.includes('set aside') || header.includes('set-aside')) lead.set_aside = value
          else if (header.includes('place') || header.includes('performance')) lead.place_of_performance = value
          else if (header.includes('value') || header.includes('estimated')) {
            const num = parseFloat(value)
            if (!isNaN(num)) lead.estimated_value = num
          }
          else if (header.includes('deadline') || header.includes('response')) lead.response_deadline = value
          else if (header.includes('posted')) lead.posted_date = value
          else if (header.includes('url') || header.includes('link')) lead.solicitation_url = value
        }
      })

      if (lead.title || lead.solicitation_number) {
        leads.push(lead)
      }
    }

    return leads
  }

  // ── Handle CSV paste ────────────────────────────────────────────────────
  const handlePaste = () => {
    const leads = parseCSV(input)
    if (leads.length === 0) {
      setError('No valid leads found in CSV. Check the format.')
      return
    }
    setImportedLeads(leads)
    setError(null)
  }

  // ── Handle file upload ──────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setInput(content)
      const leads = parseCSV(content)
      if (leads.length === 0) {
        setError('No valid leads found in file. Check the format.')
        return
      }
      setImportedLeads(leads)
      setError(null)
    }
    reader.readAsText(file)
  }

  // ── Submit import to API ────────────────────────────────────────────────
  const handleImport = async (dryRun: boolean = false) => {
    if (importedLeads.length === 0) {
      setError('No leads to import')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const feedPath = activeTab === 'eva' ? '/api/cron/eva-feed' : '/api/cron/emma-feed'
      const res = await fetch(feedPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: importedLeads, dryRun }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const importResult = (await res.json()) as ImportResult
      setResult(importResult)

      if (importResult.errorCount > 0) {
        setError(`Import completed with ${importResult.errorCount} error(s). Check the results below.`)
      }

      if (onImportComplete) {
        onImportComplete(importResult)
      }

      // Reset form on success
      if (!dryRun && importResult.success) {
        setImportedLeads([])
        setInput('')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex gap-2 border-b border-gray-600">
        <button
          onClick={() => {
            setActiveTab('eva')
            setResult(null)
            setImportedLeads([])
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'eva'
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          eVA (Virginia)
        </button>
        <button
          onClick={() => {
            setActiveTab('emma')
            setResult(null)
            setImportedLeads([])
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'emma'
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          eMMA (Maryland)
        </button>
      </div>

      {/* Info section */}
      <div className="rounded-lg bg-blue-900 bg-opacity-30 border border-blue-700 p-4">
        <h3 className="font-semibold text-blue-200 mb-2">
          Import {activeTab === 'eva' ? 'eVA (Virginia)' : 'eMMA (Maryland)'} Procurement Leads
        </h3>
        <p className="text-sm text-blue-100">
          Paste CSV data or upload a file with columns: Title, Solicitation #, State ID, Agency, NAICS Code, Set-Aside,
          Place of Performance, Estimated Value, Response Deadline, Posted Date, Solicitation URL
        </p>
      </div>

      {/* CSV Input Area */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          CSV Data or Upload File
        </label>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Upload size={16} />
            Upload CSV
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste CSV data here (with headers). Example:&#10;Title,Solicitation #,Agency,NAICS Code,Estimated Value,Response Deadline&#10;Sample Project,RFQ-2024-001,Virginia Dept of Health,561720,150000,2024-12-31"
          className="w-full h-32 bg-gray-800 border border-gray-600 rounded p-3 text-sm text-gray-100 placeholder-gray-500 font-mono"
        />

        <button
          onClick={handlePaste}
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
        >
          Parse CSV
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-900 bg-opacity-30 border border-red-700 p-4 flex gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-200">Error</h4>
            <p className="text-sm text-red-100 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Preview section */}
      {importedLeads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-200">
              Preview ({importedLeads.length} lead{importedLeads.length !== 1 ? 's' : ''})
            </h3>
            <button
              onClick={() => setPreview(!preview)}
              className="text-sm px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              {preview ? 'Hide' : 'Show'} Preview
            </button>
          </div>

          {preview && (
            <div className="overflow-x-auto rounded-lg border border-gray-600">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-600">
                    <th className="px-4 py-2 text-left font-medium text-gray-300">Title</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-300">Solicitation #</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-300">Agency</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-300">NAICS</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-300">Est. Value</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-300">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {importedLeads.slice(0, 5).map((lead, idx) => (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-2 text-gray-100 truncate">{lead.title ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-100 truncate">{lead.solicitation_number ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-100 truncate">{lead.agency ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-100">{lead.naics_code ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-100">
                        {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-100 truncate">{lead.response_deadline ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importedLeads.length > 5 && (
                <div className="px-4 py-2 bg-gray-800 text-sm text-gray-400 text-center">
                  +{importedLeads.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import buttons */}
      {importedLeads.length > 0 && !result && (
        <div className="flex gap-3">
          <button
            onClick={() => handleImport(true)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Clock size={18} />
            Dry Run (Preview)
          </button>
          <button
            onClick={() => handleImport(false)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {loading ? 'Importing...' : 'Import Leads'}
          </button>
        </div>
      )}

      {/* Results section */}
      {result && (
        <div className="space-y-4">
          <div
            className={`rounded-lg border p-4 ${
              result.success
                ? 'bg-green-900 bg-opacity-30 border-green-700'
                : 'bg-red-900 bg-opacity-30 border-red-700'
            }`}
          >
            <div className="flex gap-3">
              {result.success ? (
                <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className={`font-semibold ${result.success ? 'text-green-200' : 'text-red-200'}`}>
                  {result.dryRun ? 'Dry Run Complete' : 'Import Complete'}
                </h4>
                <div className="text-sm mt-2 space-y-1">
                  <p className={result.success ? 'text-green-100' : 'text-red-100'}>
                    Processed: {result.fetched} | Inserted: {result.inserted} | Updated: {result.updated} |
                    Skipped: {result.skipped}
                  </p>
                  {result.errorCount > 0 && (
                    <p className="text-red-100">
                      Errors: {result.errorCount}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg bg-gray-800 border border-gray-600 p-4">
              <h4 className="font-semibold text-gray-200 mb-2">Errors</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                {result.errors.map((err, idx) => (
                  <li key={idx} className="font-mono text-red-300">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setResult(null)
                setImportedLeads([])
                setInput('')
              }}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
