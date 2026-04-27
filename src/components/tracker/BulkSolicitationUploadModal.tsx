'use client'

// Drag a Mac folder, or pick multiple files, and we'll:
//  1. Identify the primary RFP/SF1449/solicitation file
//  2. Parse it into one gov_lead (status: reviewing)
//  3. Create the entity bid Drive folder, auto-shared with the team
//  4. Upload every file into 01_Solicitation_Docs/
//
// Distinct from ImportCSVModal — that one maps spreadsheet columns. This one
// is for the common case of "I just downloaded a SAM.gov solicitation
// package, here are 4 PDFs, make me a lead."

import { useCallback, useRef, useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'
import type { EntityType } from '@/lib/types'

interface Props {
  entity: EntityType
  onClose: () => void
  onCreated: (leadId: string) => void
}

type FileRow = {
  file: File
  status: 'queued' | 'uploading' | 'done' | 'failed'
  drive_file_id?: string
  error?: string
}

const PRIMARY_HINTS = [
  /sf[\s_-]?1449/i, /\bsolicitation\b/i, /\bcombined[\s_-]?synopsis\b/i,
  /\bRFP\b/i, /\bRFQ\b/i, /\bIFB\b/i, /\bPWS\b/i, /\bSOW\b/i,
]
function guessPrimary(files: File[]): File | null {
  for (const pat of PRIMARY_HINTS) {
    const hit = files.find(f => pat.test(f.name))
    if (hit) return hit
  }
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
  if (pdfs.length > 0) {
    let largest = pdfs[0]
    for (const p of pdfs) if (p.size > largest.size) largest = p
    return largest
  }
  return files[0] || null
}

export function BulkSolicitationUploadModal({ entity, onClose, onCreated }: Props) {
  const [rows, setRows] = useState<FileRow[]>([])
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | {
    ok?: boolean
    lead_id?: string
    drive_folder_url?: string
    primary_file?: { name: string; pick_reason: string }
    summary?: { total_files: number; uploaded: number; failed: number }
    error?: string
    detail?: string
    hint?: string
  }>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Re-pick primary whenever the file list changes
  useEffect(() => {
    const files = rows.map(r => r.file)
    const guess = guessPrimary(files)
    setPrimaryName(guess?.name || null)
  }, [rows])

  function addFiles(newFiles: File[]) {
    if (newFiles.length === 0) return
    const filtered = newFiles.filter(f => f.size > 0)
    setRows(prev => {
      const existing = new Set(prev.map(r => r.file.name + ':' + r.file.size))
      const next: FileRow[] = [...prev]
      for (const f of filtered) {
        const key = f.name + ':' + f.size
        if (!existing.has(key)) {
          next.push({ file: f, status: 'queued' })
          existing.add(key)
        }
      }
      return next
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dt = e.dataTransfer
    if (!dt) return
    // Walk DataTransferItemList to support folder drops (uses webkitGetAsEntry)
    const items = dt.items
    if (items && items.length > 0) {
      const collected: File[] = []
      const promises: Promise<void>[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const entry = (item as unknown as { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry?.()
        if (entry) {
          promises.push(walkEntry(entry, collected))
        } else {
          const f = item.getAsFile()
          if (f) collected.push(f)
        }
      }
      Promise.all(promises).then(() => addFiles(collected))
      return
    }
    addFiles(Array.from(dt.files || []))
  }, [])

  function walkEntry(entry: unknown, acc: File[]): Promise<void> {
    const e = entry as {
      isFile?: boolean
      isDirectory?: boolean
      file?: (cb: (f: File) => void) => void
      createReader?: () => { readEntries: (cb: (entries: unknown[]) => void) => void }
    }
    return new Promise<void>(resolve => {
      if (e.isFile && e.file) {
        e.file(f => { acc.push(f); resolve() })
      } else if (e.isDirectory && e.createReader) {
        const reader = e.createReader()
        reader.readEntries(entries => {
          Promise.all(entries.map(child => walkEntry(child, acc))).then(() => resolve())
        })
      } else {
        resolve()
      }
    })
  }

  function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (rows.length === 0) return
    setRunning(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('entity', entity)
      if (primaryName) fd.append('primary_filename', primaryName)
      for (const r of rows) fd.append('files', r.file, r.file.name)

      // Per-row UI progress is best-effort: we mark all as 'uploading' before
      // the request, then 'done' or 'failed' from the server response.
      setRows(prev => prev.map(r => ({ ...r, status: 'uploading' })))

      const res = await fetch('/api/leads/import-bulk', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) {
        setRows(prev => prev.map(r => ({ ...r, status: 'failed', error: j.error || 'upload failed' })))
        setResult({ error: j.error, detail: j.detail, hint: j.hint })
        return
      }
      // Mark per-file results
      const byName = new Map<string, { ok: boolean; drive_file_id?: string; error?: string }>()
      for (const a of (j.attached_files as Array<{ name: string; ok: boolean; drive_file_id?: string; error?: string }> || [])) {
        byName.set(a.name, a)
      }
      setRows(prev => prev.map(r => {
        const b = byName.get(r.file.name)
        if (!b) return { ...r, status: 'done' }
        return { ...r, status: b.ok ? 'done' : 'failed', drive_file_id: b.drive_file_id, error: b.error }
      }))
      setResult({
        ok: true,
        lead_id: j.lead_id,
        drive_folder_url: j.drive_folder_url,
        primary_file: j.primary_file,
        summary: j.summary,
      })
    } catch (e) {
      setResult({ error: 'network_error', detail: (e as Error).message })
      setRows(prev => prev.map(r => r.status === 'uploading' ? { ...r, status: 'failed', error: 'network' } : r))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal title={'Bulk Solicitation Upload — ' + entity} onClose={onClose} size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Drop a folder or pick multiple files (RFP + amendments + attachments + Q&amp;A). The system identifies the primary solicitation file, creates one lead, and saves every file to the entity&apos;s Drive folder in <code>01_Solicitation_Docs</code>.
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ' +
            (dragOver ? 'border-yellow-400 bg-yellow-400/5' : 'border-[#374151] hover:border-[#4B5563]')
          }
        >
          <Upload className="mx-auto mb-2 text-gray-400" size={28} />
          <div className="text-sm text-white">Drop folder or files here</div>
          <div className="text-xs text-gray-400 mt-1">
            Or click to pick files. PDFs, DOCX, XLSX, PNG, JPG. Drop a Finder folder to upload its full contents.
          </div>
          <input ref={inputRef} type="file" multiple className="hidden"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
            onChange={onFilePick}
          />
          <input
            ref={folderInputRef} type="file" className="hidden"
            // @ts-expect-error webkitdirectory is non-standard but Chromium/Safari support
            webkitdirectory="true" directory="true"
            onChange={onFilePick}
          />
          <div className="mt-3 flex gap-2 justify-center text-xs">
            <button onClick={e => { e.stopPropagation(); inputRef.current?.click() }} className="px-3 py-1 rounded bg-[#374151] text-white border border-[#4B5563]">Pick files</button>
            <button onClick={e => { e.stopPropagation(); folderInputRef.current?.click() }} className="px-3 py-1 rounded bg-[#374151] text-white border border-[#4B5563]">Pick folder</button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="bg-[#0B1220] border border-[#374151] rounded p-3 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">{rows.length} files queued</div>
              {primaryName && (
                <div className="text-xs text-yellow-300">
                  Primary RFP guess: <b>{primaryName}</b>
                </div>
              )}
            </div>
            <ul className="space-y-1">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={12} className="flex-shrink-0 text-gray-400" />
                    <span className="truncate">{r.file.name}</span>
                    {r.file.name === primaryName && <span className="px-1 rounded bg-yellow-500/20 text-yellow-300 text-[10px]">PRIMARY</span>}
                    <span className="text-gray-500">({Math.round(r.file.size / 1024)}KB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'queued' && <span className="text-gray-500">queued</span>}
                    {r.status === 'uploading' && <span className="text-blue-400">uploading…</span>}
                    {r.status === 'done' && <CheckCircle2 size={14} className="text-green-400" />}
                    {r.status === 'failed' && (<><AlertCircle size={14} className="text-red-400" /><span className="text-red-300">{r.error}</span></>)}
                    {!running && r.status !== 'done' && (
                      <button onClick={() => removeRow(i)} className="text-gray-500 hover:text-red-300"><X size={12} /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-xs text-gray-400">
              Override primary: <select className="bg-[#111827] border border-[#374151] rounded px-2 py-1 text-xs" value={primaryName || ''} onChange={e => setPrimaryName(e.target.value || null)}>
                <option value="">(auto-detect)</option>
                {rows.map((r, i) => <option key={i} value={r.file.name}>{r.file.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {result && (
          <div className={result.ok ? 'bg-green-900/20 border border-green-800/40 text-green-200 p-3 rounded text-sm' : 'bg-red-900/30 border border-red-700 text-red-200 p-3 rounded text-sm'}>
            {result.ok ? (
              <>
                <div className="font-semibold mb-1">Lead created.</div>
                <div className="text-xs">
                  Primary: <b>{result.primary_file?.name}</b> ({result.primary_file?.pick_reason}) — uploaded {result.summary?.uploaded}/{result.summary?.total_files} files{result.summary && result.summary.failed > 0 ? ', ' + result.summary.failed + ' failed' : ''}.
                </div>
                <div className="mt-2 flex gap-3">
                  <a href={result.drive_folder_url} target="_blank" rel="noreferrer" className="underline text-yellow-300 text-xs">Open Drive folder →</a>
                  <button onClick={() => result.lead_id && onCreated(result.lead_id)} className="text-xs underline text-yellow-300">Open lead →</button>
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold">{result.error}</div>
                {result.detail && <div className="text-xs mt-1 opacity-80">{result.detail}</div>}
                {result.hint && <div className="text-xs mt-2 italic opacity-80">{result.hint}</div>}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-[#374151]">
          <button onClick={onClose} disabled={running} className="px-3 py-2 rounded bg-[#374151] text-white text-sm border border-[#4B5563] disabled:opacity-50">Close</button>
          <button onClick={submit} disabled={running || rows.length === 0} className="px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
            {running ? 'Uploading…' : 'Create lead from these files'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
