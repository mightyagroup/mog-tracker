'use client'

// Files-in-Drive section for the lead detail panel.
// - Lists files in the lead's Drive folder (root + immediate subfolders)
// - Upload zone supports multi-file pick, folder pick, and Mac Finder folder drag-drop
// - Per-file delete with confirmation
// - Refresh button

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Folder, FileText, Upload, RefreshCw, Trash2, ExternalLink, X } from 'lucide-react'

type DriveFile = {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  webViewLink?: string
  parents?: string[]
}

type ListResponse = {
  ok: boolean
  folder_id: string | null
  folder_url: string | null
  files: DriveFile[]
  hint?: string
  error?: string
}

interface Props {
  leadId: string
  driveFolderUrl?: string | null
  className?: string
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function fileIcon(mt: string) {
  if (mt === FOLDER_MIME) return <Folder size={14} className="text-yellow-400" />
  return <FileText size={14} className="text-gray-300" />
}

function formatBytes(s?: string) {
  if (!s) return ''
  const n = parseInt(s, 10)
  if (!n) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB'
  return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatDate(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
  catch { return iso }
}

export function DriveFilesSection({ leadId, driveFolderUrl, className = '' }: Props) {
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folderUrl, setFolderUrl] = useState<string | null>(driveFolderUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [uploadResult, setUploadResult] = useState<null | { uploaded: number; failed: number; files: Array<{ name: string; ok: boolean; error?: string }> }>(null)

  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null); setHint(null)
    try {
      const r = await fetch('/api/leads/' + leadId + '/drive-files')
      const j: ListResponse = await r.json()
      if (j.error) { setError(j.error); setLoading(false); return }
      setFiles(j.files || [])
      setFolderId(j.folder_id)
      setFolderUrl(j.folder_url)
      if (j.hint) setHint(j.hint)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => { refresh() }, [refresh])

  async function uploadFiles(picked: File[]) {
    if (picked.length === 0) return
    setUploading(true)
    setUploadResult(null)
    setUploadProgress({ done: 0, total: picked.length })
    try {
      const fd = new FormData()
      for (const f of picked) fd.append('files', f, f.name)
      const r = await fetch('/api/leads/' + leadId + '/drive-files', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) {
        setUploadResult({ uploaded: 0, failed: picked.length, files: picked.map(f => ({ name: f.name, ok: false, error: j.error || 'upload failed' })) })
        return
      }
      setUploadResult({
        uploaded: j.uploaded || 0,
        failed: j.failed || 0,
        files: (j.files as Array<{ name: string; ok: boolean; error?: string }>) || [],
      })
      await refresh()
    } catch (e) {
      setUploadResult({ uploaded: 0, failed: picked.length, files: picked.map(f => ({ name: f.name, ok: false, error: (e as Error).message })) })
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    uploadFiles(picked)
  }

  function walkEntry(entry: unknown, acc: File[]): Promise<void> {
    const e = entry as {
      isFile?: boolean
      isDirectory?: boolean
      file?: (cb: (f: File) => void) => void
      createReader?: () => { readEntries: (cb: (entries: unknown[]) => void) => void }
    }
    return new Promise<void>(resolve => {
      if (e.isFile && e.file) e.file(f => { acc.push(f); resolve() })
      else if (e.isDirectory && e.createReader) {
        const reader = e.createReader()
        reader.readEntries(entries => { Promise.all(entries.map(c => walkEntry(c, acc))).then(() => resolve()) })
      } else resolve()
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dt = e.dataTransfer
    if (!dt) return
    const items = dt.items
    if (items && items.length > 0) {
      const acc: File[] = []
      const tasks: Promise<void>[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const entry = (item as unknown as { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry?.()
        if (entry) tasks.push(walkEntry(entry, acc))
        else { const f = item.getAsFile(); if (f) acc.push(f) }
      }
      Promise.all(tasks).then(() => uploadFiles(acc))
      return
    }
    uploadFiles(Array.from(dt.files || []))
  }, [leadId])

  async function deleteFile(file: DriveFile) {
    if (!confirm('Delete "' + file.name + '" from the Drive folder? This cannot be undone.')) return
    setDeletingId(file.id)
    // pending name (unused)
    try {
      const r = await fetch('/api/leads/' + leadId + '/drive-files?fileId=' + encodeURIComponent(file.id), { method: 'DELETE' })
      const j = await r.json()
      if (!r.ok) {
        alert('Delete failed: ' + (j.error || j.detail || 'unknown error'))
        return
      }
      await refresh()
    } finally {
      setDeletingId(null)
      // clear pending (unused)
    }
  }

  // Group files by parent (immediate subfolder name) for nicer display
  const root = files.filter(f => f.mimeType !== FOLDER_MIME && (!f.parents || f.parents[0] === folderId))
  const folders = files.filter(f => f.mimeType === FOLDER_MIME)
  const subfolderFiles = files.filter(f => f.mimeType !== FOLDER_MIME && f.parents && f.parents[0] !== folderId)

  return (
    <div className={'border border-[#374151] rounded-lg ' + className}>
      <div className="flex items-center justify-between p-3 border-b border-[#374151] bg-[#0B1220]">
        <div className="flex items-center gap-2">
          <Folder size={14} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">Files in Drive folder</h3>
          {files.length > 0 && <span className="text-xs text-gray-500">({files.filter(f => f.mimeType !== FOLDER_MIME).length} files, {folders.length} subfolders)</span>}
        </div>
        <div className="flex items-center gap-2">
          {folderUrl && (
            <a href={folderUrl} target="_blank" rel="noreferrer" className="text-xs text-yellow-300 hover:text-yellow-200 flex items-center gap-1">
              Open in Drive <ExternalLink size={11} />
            </a>
          )}
          <button onClick={refresh} disabled={loading} className="text-gray-400 hover:text-white p-1 rounded disabled:opacity-50" title="Refresh">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={'border-2 border-dashed rounded p-3 text-center cursor-pointer transition text-xs ' +
            (uploading ? 'opacity-60 cursor-wait ' : 'hover:border-[#4B5563] ') +
            (dragOver ? 'border-yellow-400 bg-yellow-400/5' : 'border-[#374151]')
          }
        >
          {uploading ? (
            <div className="text-blue-300">Uploading{uploadProgress ? ' (' + uploadProgress.total + ' file' + (uploadProgress.total === 1 ? '' : 's') + ')' : ''}…</div>
          ) : (
            <>
              <Upload className="mx-auto mb-1 text-gray-400" size={18} />
              <div className="text-white">Drop files or folder here</div>
              <div className="text-gray-500 mt-0.5">Or click to pick from Finder. Multiple files OK. Drop a folder to upload everything inside.</div>
              <div className="mt-2 flex gap-2 justify-center">
                <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }} className="px-2 py-0.5 rounded bg-[#374151] text-white text-[11px] border border-[#4B5563]">Pick files</button>
                <button onClick={e => { e.stopPropagation(); folderInputRef.current?.click() }} className="px-2 py-0.5 rounded bg-[#374151] text-white text-[11px] border border-[#4B5563]">Pick folder</button>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.csv,.txt"
            onChange={onFilePick}
          />
          <input
            ref={folderInputRef} type="file" className="hidden"
            // @ts-expect-error webkitdirectory non-standard but Chromium/Safari support
            webkitdirectory="true" directory="true"
            onChange={onFilePick}
          />
        </div>

        {uploadResult && (
          <div className={uploadResult.failed === 0 ? 'bg-green-900/20 border border-green-800/40 text-green-200 p-2 rounded text-xs' : 'bg-red-900/30 border border-red-700 text-red-200 p-2 rounded text-xs'}>
            <div className="flex items-center justify-between">
              <span>
                {uploadResult.failed === 0
                  ? '✓ Uploaded ' + uploadResult.uploaded + ' file' + (uploadResult.uploaded === 1 ? '' : 's')
                  : 'Uploaded ' + uploadResult.uploaded + ', failed ' + uploadResult.failed}
              </span>
              <button onClick={() => setUploadResult(null)} className="text-gray-400 hover:text-white"><X size={12} /></button>
            </div>
            {uploadResult.failed > 0 && (
              <ul className="mt-1 ml-2 list-disc">
                {uploadResult.files.filter(f => !f.ok).map((f, i) => (<li key={i}>{f.name}: {f.error}</li>))}
              </ul>
            )}
          </div>
        )}

        {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-2 rounded text-xs">{error}</div>}
        {hint && !error && files.length === 0 && <div className="text-xs text-gray-400 italic">{hint}</div>}

        {/* File list */}
        {loading && files.length === 0 ? (
          <div className="text-xs text-gray-500 italic">Loading…</div>
        ) : files.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No files yet. Drop the solicitation package above.</div>
        ) : (
          <div className="space-y-3">
            {/* Direct files (root of bid folder) */}
            {root.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">In bid folder</div>
                <ul className="space-y-1">
                  {root.map(f => (
                    <li key={f.id} className="flex items-center justify-between text-xs gap-2 px-2 py-1 rounded hover:bg-[#1F2937]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {fileIcon(f.mimeType)}
                        <a href={f.webViewLink} target="_blank" rel="noreferrer" className="truncate text-white hover:text-yellow-200" title={f.name}>{f.name}</a>
                        {f.size && <span className="text-gray-500 text-[10px] flex-shrink-0">{formatBytes(f.size)}</span>}
                        {f.modifiedTime && <span className="text-gray-500 text-[10px] flex-shrink-0 hidden md:inline">{formatDate(f.modifiedTime)}</span>}
                      </div>
                      <button onClick={() => deleteFile(f)} disabled={deletingId === f.id} className="text-gray-500 hover:text-red-400 p-1 rounded disabled:opacity-50" title="Delete from Drive">
                        {deletingId === f.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Subfolder contents grouped */}
            {folders.map(sf => {
              const inSub = subfolderFiles.filter(f => f.parents && f.parents[0] === sf.id)
              return (
                <div key={sf.id}>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                    <Folder size={10} className="text-yellow-400/70" /> {sf.name}
                  </div>
                  {inSub.length === 0 ? (
                    <div className="text-[11px] text-gray-600 italic ml-2">empty</div>
                  ) : (
                    <ul className="space-y-1">
                      {inSub.map(f => (
                        <li key={f.id} className="flex items-center justify-between text-xs gap-2 px-2 py-1 rounded hover:bg-[#1F2937]">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {fileIcon(f.mimeType)}
                            <a href={f.webViewLink} target="_blank" rel="noreferrer" className="truncate text-white hover:text-yellow-200" title={f.name}>{f.name}</a>
                            {f.size && <span className="text-gray-500 text-[10px] flex-shrink-0">{formatBytes(f.size)}</span>}
                            {f.modifiedTime && <span className="text-gray-500 text-[10px] flex-shrink-0 hidden md:inline">{formatDate(f.modifiedTime)}</span>}
                          </div>
                          <button onClick={() => deleteFile(f)} disabled={deletingId === f.id} className="text-gray-500 hover:text-red-400 p-1 rounded disabled:opacity-50" title="Delete from Drive">
                            {deletingId === f.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
