# Phase 11: Document Management

## Overview

Phase 11 implements a complete document management system using Supabase Storage. It allows users to upload, organize, and manage documents attached to government leads, commercial leads, and subcontractors.

## What Was Built

### 1. Database Schema (`supabase/migrations/034_documents.sql`)

Created a new `documents` table with:

- **Core Fields:**
  - `id` (UUID PK)
  - `entity` (entity_type)
  - `gov_lead_id`, `commercial_lead_id`, `subcontractor_id` (nullable FKs)

- **File Metadata:**
  - `file_name` (text)
  - `file_type` (MIME type)
  - `file_size` (bytes)
  - `storage_path` (path in Supabase Storage)

- **Classification:**
  - `document_type` (solicitation, proposal, teaming_agreement, capability_statement, pricing, contract, correspondence, certification, other)
  - `description` (text)

- **Tracking:**
  - `uploaded_by` (UUID - references auth.users)
  - `version` (int)
  - `is_archived` (boolean)

- **Timestamps:**
  - `created_at`, `updated_at`

**Indexes:** entity, gov_lead_id, commercial_lead_id, subcontractor_id, document_type, created_at

**RLS:** Authenticated users can CRUD on all documents

### 2. Storage Setup (`scripts/setup-storage.ts`)

Node.js script that:
- Creates a private `documents` bucket in Supabase Storage
- Configures 50MB file size limit
- Whitelists MIME types (PDF, Word, Excel, PowerPoint, images, text, CSV, ZIP)
- Must be run once: `npx ts-node scripts/setup-storage.ts`

### 3. API Routes

#### `POST /api/documents`
**Upload a document**

Request:
```json
POST /api/documents
Content-Type: multipart/form-data

file: <File>
entity: "exousia" | "vitalx" | "ironhouse"
gov_lead_id?: "uuid" (optional)
commercial_lead_id?: "uuid" (optional)
subcontractor_id?: "uuid" (optional)
document_type?: "solicitation" | "proposal" | ... (optional)
description?: "text" (optional)
```

Response (201):
```json
{
  "id": "uuid",
  "entity": "exousia",
  "file_name": "proposal.pdf",
  "file_type": "application/pdf",
  "file_size": 2048000,
  "storage_path": "exousia/lead-id/1712282400000_proposal.pdf",
  "document_type": "proposal",
  "version": 1,
  "created_at": "2026-04-04T15:30:00Z"
}
```

#### `GET /api/documents`
**List documents with optional filters**

Query params:
- `entity` (string)
- `gov_lead_id` (uuid)
- `commercial_lead_id` (uuid)
- `subcontractor_id` (uuid)
- `document_type` (string)
- `limit` (number, default 100)

Response (200):
```json
[
  {
    "id": "uuid",
    "file_name": "proposal.pdf",
    "file_type": "application/pdf",
    ...
  }
]
```

#### `GET /api/documents/[id]`
**Get document with signed download URL**

Response (200):
```json
{
  "id": "uuid",
  "file_name": "proposal.pdf",
  "download_url": "https://...(signed URL, 60min expiry)"
}
```

#### `PATCH /api/documents/[id]`
**Update document metadata**

Request:
```json
{
  "description": "Updated description",
  "document_type": "proposal",
  "is_archived": false
}
```

#### `DELETE /api/documents/[id]`
**Delete document (from storage and database)**

Response (200):
```json
{ "success": true }
```

### 4. React Components

#### `<DocumentUpload />`
Drag-and-drop file uploader with:
- Multi-file selection (drag/drop or file picker)
- File validation (type, size)
- Document type classification dropdown
- Optional description field
- Upload progress with success/error states
- Pre-configured for a specific lead/entity

**Props:**
```typescript
{
  entity: EntityType
  govLeadId?: string | null
  commercialLeadId?: string | null
  subcontractorId?: string | null
  onUploadComplete?: () => void
  accentColor?: string
}
```

#### `<DocumentList />`
Table-like list of documents with:
- File icons (PDF, Word, Excel, Image, etc.)
- File name, size, upload date
- Document type badge (color-coded)
- Download button (generates signed URL)
- Delete button with confirmation
- Search/filter support via parent

**Props:**
```typescript
{
  documents: Document[]
  onRefresh?: () => Promise<void>
  showDeleteConfirm?: boolean
}
```

#### `<LeadDocuments />`
Complete embedded component for lead detail panels:
- Header with "Upload" button
- DocumentUpload form (togglable)
- DocumentList with auto-refresh
- Fetches documents specific to a lead

**Props:**
```typescript
{
  entity: EntityType
  govLeadId?: string | null
  commercialLeadId?: string | null
  accentColor?: string
}
```

#### `<DocumentPreview />`
Modal dialog for previewing documents:
- PDF: inline iframe preview
- Images: full-size image viewer
- Other types: download link
- 60-minute signed download URL

**Props:**
```typescript
{
  document: Document
  onClose: () => void
}
```

### 5. Types (`src/lib/types.ts`)

```typescript
export type DocumentType =
  | 'solicitation'
  | 'proposal'
  | 'teaming_agreement'
  | 'capability_statement'
  | 'pricing'
  | 'contract'
  | 'correspondence'
  | 'certification'
  | 'other'

export interface Document {
  id: string
  entity: EntityType
  gov_lead_id?: string | null
  commercial_lead_id?: string | null
  subcontractor_id?: string | null
  file_name: string
  file_type?: string | null
  file_size?: number | null
  storage_path: string
  document_type?: DocumentType | null
  description?: string | null
  uploaded_by?: string | null
  version: number
  is_archived: boolean
  created_at: string
  updated_at: string
}
```

### 6. Constants (`src/lib/constants.ts`)

```typescript
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  solicitation: 'Solicitation',
  proposal: 'Proposal',
  teaming_agreement: 'Teaming Agreement',
  capability_statement: 'Capability Statement',
  pricing: 'Pricing',
  contract: 'Contract',
  correspondence: 'Correspondence',
  certification: 'Certification',
  other: 'Other',
}
```

## Setup Instructions

### Step 1: Run Database Migration

Execute migration 034 in Supabase SQL Editor:
```sql
-- Copy from supabase/migrations/034_documents.sql and run in dashboard
```

Or use Supabase CLI:
```bash
supabase migration list
supabase migration up
```

### Step 2: Create Storage Bucket

```bash
npx ts-node scripts/setup-storage.ts
```

This creates the private 'documents' bucket with proper configuration.

### Step 3: Update LeadDetailPanel (Optional Integration)

To integrate into existing lead detail panels, add to the panel's tabs or sections:

```typescript
import { LeadDocuments } from '@/components/documents/LeadDocuments'

// In your LeadDetailPanel component:
<LeadDocuments
  entity={entity}
  govLeadId={lead.id}
  commercialLeadId={undefined}
  accentColor={accentColor}
/>
```

### Step 4: Add Documents Tab (Optional)

Create a standalone documents page at `/documents` or as a tab within entity trackers:

```typescript
// src/app/exousia/documents/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Document } from '@/lib/types'
import { DocumentList } from '@/components/documents/DocumentList'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/documents?entity=exousia&limit=500')
      const data = await res.json()
      setDocuments(data)
    }
    load()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">All Documents</h1>
      <DocumentList documents={documents} />
    </div>
  )
}
```

## File Storage Path Format

Files are stored in a structured hierarchy:

```
documents/
  {entity}/
    {lead_id or 'general'}/
      {timestamp}_{filename}.{ext}

Example:
documents/exousia/lead-abc-123/1712282400000_proposal.pdf
documents/vitalx/general/1712282400001_capability_statement.docx
```

This structure allows:
- Easy organization by entity and lead
- Prevention of naming conflicts (timestamp prefix)
- Easy cleanup/archival by entity or lead

## Security Considerations

1. **Storage Bucket:** Private (not public) - all downloads require signed URLs
2. **Signed URLs:** 60-minute expiry - re-generate on each download
3. **RLS Policies:** All authenticated users can access documents
4. **File Validation:**
   - Type whitelist (no .exe, .sh, etc.)
   - 50MB size limit
   - MIME type validation on client and server
5. **Cleanup:** Deleted documents removed from both storage and database

## Error Handling

All components include error states:
- `DocumentUpload`: file validation, upload errors, success feedback
- `DocumentList`: download/delete failures, retry prompts
- `LeadDocuments`: load failures with retry capability
- API routes: proper HTTP status codes and error messages

## Performance Notes

- Documents fetched per-lead (not bulk loaded)
- List pagination via `limit` parameter (default 100)
- Signed URLs generated on-demand (no pre-generation)
- File icons determined by MIME type, not extension
- Lazy loading of DocumentUpload form

## Future Enhancements

1. **Version Control:** Track document versions with diff capability
2. **OCR:** Searchable PDF text extraction
3. **Virus Scanning:** Integrate with antivirus API
4. **Audit Log:** Track who accessed/modified documents
5. **Permissions:** Role-based access control per document
6. **Collaboration:** Comments/annotations on documents
7. **Templates:** Pre-made document templates for proposals, pricing, etc.
8. **Batch Operations:** Download multiple docs as ZIP, bulk delete/archive
9. **Integration:** DeepRFP document import, Google Drive sync

## Files Created

### Database
- `supabase/migrations/034_documents.sql` - Documents table schema

### Scripts
- `scripts/setup-storage.ts` - Storage bucket setup

### API Routes
- `src/app/api/documents/route.ts` - POST (upload), GET (list)
- `src/app/api/documents/[id]/route.ts` - GET (download), PATCH (update), DELETE

### Components
- `src/components/documents/DocumentUpload.tsx` - File uploader
- `src/components/documents/DocumentList.tsx` - Document list/table
- `src/components/documents/LeadDocuments.tsx` - Complete lead documents section
- `src/components/documents/DocumentPreview.tsx` - Modal preview viewer

### Types & Constants
- Updated `src/lib/types.ts` - Document interface and DocumentType
- Updated `src/lib/constants.ts` - DOCUMENT_TYPE_LABELS

## Testing Checklist

- [ ] Run migration 034 successfully
- [ ] Run `npx ts-node scripts/setup-storage.ts` without errors
- [ ] Upload a PDF to a lead
- [ ] Upload a Word document
- [ ] Upload an image
- [ ] Download uploaded file (verify signed URL works)
- [ ] Delete a document (verify from both storage and DB)
- [ ] Set document type and description
- [ ] View documents for a specific lead
- [ ] Mobile responsiveness of upload/list
- [ ] Error handling (invalid file type, oversized file)
- [ ] Multiple concurrent uploads
- [ ] Preview modal for PDF
- [ ] Preview modal for image

## Rollback Instructions

If needed to remove Phase 11:

```sql
-- In Supabase SQL Editor:
DROP TABLE IF EXISTS documents CASCADE;

-- In browser:
-- Manually delete 'documents' bucket from Supabase Storage dashboard
-- Or via CLI: supabase storage delete-bucket documents
```

Delete the component files and API routes:
```bash
rm -rf src/components/documents/
rm -rf src/app/api/documents/
rm scripts/setup-storage.ts
```

Revert type changes in `src/lib/types.ts` and `src/lib/constants.ts`.
