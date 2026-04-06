'use client'

import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { EntityType, DocumentType } from '@/lib/types'

interface DocumentUploadProps {
  entity: EntityType
  govLeadId?: string | null
  commercialLeadId?: string | null
  subcontractorId?: string | null
  onUploadComplete?: () => void
  accentColor?: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function DocumentUpload({
  entity,
  govLeadId,
  commercialLeadId,
  subcontractorId,
  onUploadComplete,
  accentColor = '#D4AF37',
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<DocumentType>('other')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function validateFiles(filesToValidate: File[]): boolean {
    for (const file of filesToValidate) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds 50MB limit`)
        return false
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`File type ${file.type} not allowed`)
        return false
      }
    }
    return true
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (validateFiles(droppedFiles)) {
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    if (validateFiles(selectedFiles)) {
      setFiles(prev => [...prev, ...selectedFiles])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError('No files selected')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      let _uploadedCount = 0

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('entity', entity)
        if (govLeadId) formData.append('gov_lead_id', govLeadId)
        if (commercialLeadId) formData.append('commercial_lead_id', commercialLeadId)
        if (subcontractorId) formData.append('subcontractor_id', subcontractorId)
        formData.append('document_type', documentType)
        if (description) formData.append('description', description)

        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Failed to upload ${file.name}`)
        }

        _uploadedCount++
      }

      setSuccess(true)
      setFiles([])
      setDescription('')
      setDocumentType('other')
      onUploadComplete?.()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-700">
          Drag and drop files here
        </p>
        <p className="text-xs text-gray-500 mt-1">
          or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:underline"
          >
            select from your computer
          </button>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          PDF, Word, Excel, PowerPoint, Images, or ZIP (max 50MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv,.zip"
        />
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="ml-2 text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Type and Description */}
      {files.length > 0 && (
        <div className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value as DocumentType)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="solicitation">Solicitation</option>
              <option value="proposal">Proposal</option>
              <option value="teaming_agreement">Teaming Agreement</option>
              <option value="capability_statement">Capability Statement</option>
              <option value="pricing">Pricing</option>
              <option value="contract">Contract</option>
              <option value="correspondence">Correspondence</option>
              <option value="certification">Certification</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add notes about these documents..."
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">Files uploaded successfully</p>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{ backgroundColor: accentColor }}
          className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {files.length} File{files.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}
    </div>
  )
}
