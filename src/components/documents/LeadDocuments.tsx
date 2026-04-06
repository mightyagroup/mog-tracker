'use client'

import { useState, useEffect } from 'react'
import { Document } from '@/lib/types'
import { DocumentUpload } from './DocumentUpload'
import { DocumentList } from './DocumentList'
import { Plus, Loader2 } from 'lucide-react'
import { EntityType } from '@/lib/types'

interface LeadDocumentsProps {
  entity: EntityType
  govLeadId?: string | null
  commercialLeadId?: string | null
  accentColor?: string
}

export function LeadDocuments({
  entity,
  govLeadId,
  commercialLeadId,
  accentColor = '#D4AF37',
}: LeadDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  async function loadDocuments() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('entity', entity)
      if (govLeadId) params.append('gov_lead_id', govLeadId)
      if (commercialLeadId) params.append('commercial_lead_id', commercialLeadId)

      const response = await fetch(`/api/documents?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load documents')

      const data = await response.json()
      setDocuments(data)
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [govLeadId, commercialLeadId, entity])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{ backgroundColor: accentColor }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <DocumentUpload
            entity={entity}
            govLeadId={govLeadId}
            commercialLeadId={commercialLeadId}
            onUploadComplete={() => {
              setShowUpload(false)
              loadDocuments()
            }}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <DocumentList documents={documents} onRefresh={loadDocuments} />
      )}
    </div>
  )
}
