'use client'

import { useState, useEffect } from 'react'
import { Document } from '@/lib/types'
import { Download, X, AlertCircle, Loader2 } from 'lucide-react'

interface DocumentPreviewProps {
  document: Document
  onClose: () => void
}

export function DocumentPreview({ document, onClose }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true)
        const response = await fetch(`/api/documents/${document.id}`)
        if (!response.ok) throw new Error('Failed to load document')

        const data = await response.json()
        setDownloadUrl(data.download_url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [document.id])

  const isPdf = document.file_type?.includes('pdf')
  const isImage = document.file_type?.includes('image')

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {document.file_name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : downloadUrl ? (
            <>
              {isPdf ? (
                <iframe
                  src={downloadUrl}
                  className="w-full h-full"
                  title={document.file_name}
                />
              ) : isImage ? (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={downloadUrl}
                    alt={document.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-gray-600 mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={downloadUrl}
                    download={document.file_name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </a>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {document.file_type && (
              <span>{document.file_type}</span>
            )}
          </div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={document.file_name}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
