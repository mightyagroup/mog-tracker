'use client'

// Solicitation upload panel for the proposal intake page.
// Accepts PDF/DOCX/XLSX/PNG/JPG. Sends to /api/proposals/upload-solicitation,
// which stores the file in Supabase Storage and runs Claude to produce a clean
// summary of services, sub needs, and incumbent search keys.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, ExternalLink, RefreshCw } from 'lucide-react'

type Row = {
  solicitation_file_url: string | null
  solicitation_file_name: string | null
  solicitation_summary: string | null
  solicitation_services: string | null
  solicitation_sub_needs: string | null
  incumbent_search_keys: string | null
}

export function SolicitationPanel({ proposalId }: { proposalId: string }) {
  const [row, setRow] = useState<Row | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const supa = createClient()
    const { data } = await supa.from('proposals')
      .select('solicitation_file_url, solicitation_file_name, solicitation_summary, solicitation_services, solicitation_sub_needs, incumbent_search_keys')
      .eq('id', proposalId)
      .single()
    if (data) setRow(data as unknown as Row)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [proposalId])

  async function handleFile(file: File) {
    setError(null); setMsg(null); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('proposal_id', proposalId)
      const r = await fetch('/api/proposals/upload-solicitation', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'upload failed')
      setMsg('Uploaded and summarized. Claude extracted services, sub needs, and incumbent search keys.')
      await load()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const hasFile = Boolean(row?.solicitation_file_url)

  return (
    <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText size={16} className="text-[#D4AF37]" />
            Solicitation document
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Upload the solicitation PDF (or any file type). Claude produces a real summary, extracts services and sub needs, and gives you incumbent search phrases.
          </div>
        </div>
        {hasFile && (
          <button onClick={load} className="p-2 rounded hover:bg-[#374151]" title="Refresh">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-3 text-sm">{error}</div>}
      {msg && <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded mb-3 text-sm">{msg}</div>}

      {hasFile && (
        <div className="mb-4 bg-[#111827] border border-[#374151] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-white">{row?.solicitation_file_name || 'solicitation'}</div>
            {row?.solicitation_file_url && (
              <a href={row.solicitation_file_url} target="_blank" rel="noreferrer" className="text-xs text-[#D4AF37] hover:underline inline-flex items-center gap-1">
                View <ExternalLink size={11} />
              </a>
            )}
          </div>
          {row?.solicitation_summary && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Summary</div>
              <div className="text-sm text-gray-200">{row.solicitation_summary}</div>
            </div>
          )}
          {row?.solicitation_services && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Services requested</div>
              <div className="text-sm text-gray-200">{row.solicitation_services}</div>
            </div>
          )}
          {row?.solicitation_sub_needs && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Sub needs</div>
              <div className="text-sm text-gray-200">{row.solicitation_sub_needs}</div>
            </div>
          )}
          {row?.incumbent_search_keys && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Incumbent search keys</div>
              <div className="text-sm text-gray-200 font-mono">{row.incumbent_search_keys}</div>
              <div className="mt-2 flex gap-2">
                <a
                  href={'https://www.usaspending.gov/search?keywords=' + encodeURIComponent(row.incumbent_search_keys)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 rounded bg-[#374151] text-white hover:bg-[#4B5563] inline-flex items-center gap-1"
                >
                  Search USASpending <ExternalLink size={10} />
                </a>
                <a
                  href={'https://sam.gov/search/?index=opp&keywords=' + encodeURIComponent(row.incumbent_search_keys)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 rounded bg-[#374151] text-white hover:bg-[#4B5563] inline-flex items-center gap-1"
                >
                  Search SAM.gov <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => fileRef.current?.click()}
        className={'border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ' + (dragOver ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#374151] hover:border-[#4B5563]')}
      >
        <Upload size={22} className="text-gray-500 mb-2" />
        <p className="text-sm text-white">
          {uploading ? 'Uploading and parsing with Claude…' : (hasFile ? 'Replace solicitation' : 'Drop file or click to browse')}
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX, PNG, JPG — any format</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp,.txt"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
    </div>
  )
}
