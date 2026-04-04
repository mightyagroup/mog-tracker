'use client'

import { useState, useEffect } from 'react'
import { Document, DocumentType } from '@/lib/types'
import {
  FileText, Download, Trash2, File, FileSpreadsheet, FileImage, Loader2, AlertCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface DocumentListProps {
  documents: Document[]
  onRefresh?: () => Promise<void>
  showDeleteConfirm?: boolean
}

function getFileIcon(fileType?: string | null) {
  if (!fileType) return <File className="h-4 w-4" />

  if (fileType.includes('pdf')) return <FileText className="h-4 w-4" />
  if (fileType.includes('image')) return <FileImage className="h-4 w-4" />
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
    return <FileSpreadsheet className="h-4 w-4" />
  }
  if (fileType.includes('word') || fileType.includes('document')) {
    return <FileText className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

function getDocumentTypeColor(type?: DocumentType | null): string {
  const colors: Record<DocumentType, string> = {
    solicitation: 'bg-blue-100 text-blue-800',
    proposal: 'bg-green-100 text-green-800',
    teaming_agreement: 'bg-purple-100 text-purple-800',
    capability_statement: 'bg-orange-100 text-orange-800',
    pricing: 'bg-yellow-100 text-yellow-800',
    contract: 'bg-red-100 text-red-800',
    correspondence: 'bg-gray-100 text-gray-800',
    certification: 'bg-indigo-100 text-indigo-800',
    other: 'bg-gray-100 text-gray-800',
  }

  return type ? colors[type] : colors.other
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return 'Unknown'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIdx = 0
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024
    unitIdx++
  }
  return `${size.toFixed(2)} ${units[unitIdx]}`
}

export function DocumentList({
  documents,
  onRefresh,
  showDeleteConfirm = true,
}: DocumentListProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDownload(doc: Document) {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${doc.id}`)
      if (!response.ok) throw new Error('Failed to get download URL')

      const data = await response.json()
      if (!data.download_url) throw new Error('No download URL returned')

      // Open signed URL in new window to trigger download
      window.open(data.download_url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(doc: Document) {
    try {
      setDeletingId(doc.id)
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete document')

      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No documents uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {/* File Icon */}
            <div className="flex-shrink-0 text-gray-400 mt-0.5">
              {getFileIcon(doc.file_type)}
            </div>

            {/* Document Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFileSize(doc.file_size)} • {format(parseISO(doc.created_at), 'MMM d, yyyy')}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Document Type Badge */}
                {doc.document_type && (
                  <div className="flex-shrink-0">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getDocumentTypeColor(doc.document_type)}`}>
                      {doc.document_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={() => handleDownload(doc)}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title="Download document"
              >
                {loading && deletingId !== doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>

              {showDeleteConfirm ? (
                confirmDeleteId === doc.id ? (
                  <div className="flex items-center gap-1 bg-red-50 rounded px-2 py-1">
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === doc.id ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === doc.id}
                      className="text-xs font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              ) : (
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete document"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
