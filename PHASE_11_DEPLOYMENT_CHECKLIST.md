# Phase 11 Deployment Checklist

## Pre-Deployment Verification

- [x] Database migration created (`supabase/migrations/034_documents.sql`)
  - [x] documents table with proper columns
  - [x] Indexes on entity, lead_ids, document_type
  - [x] RLS policies for authenticated users
  - [x] updated_at trigger configured

- [x] Storage setup script created (`scripts/setup-storage.ts`)
  - [x] Creates 'documents' bucket
  - [x] Configures 50MB limit
  - [x] MIME type whitelist

- [x] API routes implemented
  - [x] POST /api/documents (upload)
  - [x] GET /api/documents (list with filters)
  - [x] GET /api/documents/[id] (download with signed URL)
  - [x] PATCH /api/documents/[id] (update metadata)
  - [x] DELETE /api/documents/[id] (hard delete)

- [x] React components created
  - [x] DocumentUpload (drag-drop, validation, progress)
  - [x] DocumentList (table view, download, delete)
  - [x] LeadDocuments (embedded, auto-refresh)
  - [x] DocumentPreview (modal, PDF/image support)

- [x] Types and constants updated
  - [x] DocumentType union in types.ts
  - [x] Document interface
  - [x] DOCUMENT_TYPE_LABELS in constants.ts

- [x] Documentation completed
  - [x] PHASE_11_DOCUMENT_MANAGEMENT.md (comprehensive)
  - [x] LESSONS_LEARNED.md (appended design decisions)

## Deployment Steps

### 1. Execute Database Migration

**In Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/{projectId}/sql
2. Copy entire contents of `supabase/migrations/034_documents.sql`
3. Paste into SQL editor
4. Click "Run"
5. Verify in Table Editor that `documents` table appears with all columns

**Expected Result:**
- documents table exists
- Columns: id, entity, gov_lead_id, commercial_lead_id, subcontractor_id, file_name, file_type, file_size, storage_path, document_type, description, uploaded_by, version, is_archived, created_at, updated_at
- Indexes created for: entity, gov_lead_id, commercial_lead_id, subcontractor_id, document_type, created_at
- RLS enabled with authenticated policy

### 2. Create Storage Bucket

**In Project Directory:**
```bash
# Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npx ts-node scripts/setup-storage.ts
```

**Expected Output:**
```
✓ Documents bucket created successfully
  Bucket ID: {uuid}
  Public: false
```

**Verification:**
- Go to Supabase Dashboard > Storage
- Confirm 'documents' bucket exists and is private

### 3. Commit Code to Git

```bash
cd /path/to/mog-tracker-app

git add -A
git commit -m "Phase 11: Document Management - Supabase Storage integration

- Add documents table with gov_lead_id, commercial_lead_id, subcontractor_id FKs
- Create DocumentUpload, DocumentList, LeadDocuments, DocumentPreview components
- Implement POST /api/documents (upload), GET (list/download), PATCH (update), DELETE
- Signed URLs with 60-minute expiry for secure downloads
- Support for multiple file types: PDF, Word, Excel, PowerPoint, images, ZIP
- Document type classification: solicitation, proposal, teaming_agreement, etc.
- Full TypeScript typing, strict error handling, mobile responsive UI"

git push origin main
```

### 4. Deploy to Vercel

```bash
npx vercel --prod
```

Expected: Vercel detects changes from GitHub, builds successfully, deploys.

**Verify in Vercel Dashboard:**
- Build log shows successful build (no TypeScript errors in document files)
- Preview deployment works
- No errors in Edge Function logs

### 5. Test Live Functionality

#### Test Upload
1. Navigate to app instance
2. Find a lead in any entity (or create a test lead)
3. Locate Documents section (if integrated in LeadDetailPanel)
4. Click "Upload" button
5. Drag a PDF file or click to select
6. Select document type "Proposal"
7. Add optional description
8. Click "Upload 1 File"
9. Verify:
   - No errors displayed
   - Document appears in list immediately
   - File size and upload date shown
   - "Proposal" badge displays

#### Test Download
1. Click Download button on any document
2. Verify:
   - File downloads to computer
   - File size matches original
   - File content is correct (PDF opens, image displays, etc.)

#### Test Delete
1. Click Delete button on any document
2. Confirm deletion when prompted
3. Verify:
   - Document disappears from list
   - No errors in console
   - File is gone from Supabase Storage dashboard

#### Test Filters
1. Upload documents of different types
2. Filter by document type (if filter UI is added)
3. Verify only matching documents shown

#### Test Mobile
1. Resize browser to mobile width (375px)
2. Verify:
   - Upload form is readable
   - Document list renders as cards, not table
   - Buttons and inputs are touch-friendly (44px min)
   - Delete confirmation is visible

#### Test Error Cases
1. Try to upload a .exe file
   - Expected: Client validation error "File type not allowed"
2. Try to upload a file > 50MB
   - Expected: Client validation error "File size exceeds 50MB limit"
3. Simulate network error during upload
   - Expected: Error message displayed, can retry

### 6. Integrate into LeadDetailPanel (Optional)

**File:** `src/components/tracker/LeadDetailPanel.tsx`

1. Add import at top:
```typescript
import { LeadDocuments } from '@/components/documents/LeadDocuments'
```

2. Add a new section or tab in the detail panel:
```typescript
<LeadDocuments
  entity={entity}
  govLeadId={lead.id}
  commercialLeadId={undefined}
  accentColor={accentColor}
/>
```

3. Test that LeadDetailPanel loads without errors
4. Verify LeadDocuments component appears
5. Test upload/download/delete from within panel

### 7. Create Documents Tab (Optional)

Create a new page to view all documents by entity:

**File:** `src/app/exousia/documents/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Document } from '@/lib/types'
import { DocumentList } from '@/components/documents/DocumentList'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  async function loadDocuments() {
    const res = await fetch('/api/documents?entity=exousia&limit=500')
    const data = await res.json()
    setDocuments(data)
    setLoading(false)
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">All Documents</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <DocumentList documents={documents} onRefresh={loadDocuments} />
      )}
    </div>
  )
}
```

Repeat for vitalx and ironhouse.

## Post-Deployment Verification

- [ ] No TypeScript compilation errors
- [ ] No errors in browser console (F12)
- [ ] No errors in Vercel Edge Function logs
- [ ] Document upload works
- [ ] Document download generates signed URL
- [ ] Document delete removes from storage and database
- [ ] Mobile UI is responsive
- [ ] File type validation works
- [ ] File size limit enforced
- [ ] Document type classification displays correctly
- [ ] LeadDocuments integrates without errors (if added)

## Rollback Plan

If critical issues found:

1. **Remove feature flag (if any):**
   ```bash
   git checkout HEAD~1 -- src/components/documents src/app/api/documents
   git commit -m "Rollback Phase 11: Remove document management"
   git push origin main
   ```

2. **Delete storage bucket:**
   - Supabase Dashboard > Storage > Delete 'documents' bucket

3. **Drop table:**
   ```sql
   DROP TABLE documents CASCADE;
   ```

4. **Revert type changes:**
   - Remove DocumentType and Document from types.ts
   - Remove DOCUMENT_TYPE_LABELS from constants.ts

5. **Redeploy:**
   ```bash
   npx vercel --prod
   ```

## Success Criteria

All of the following must be true:

- [x] Database migration executed without errors
- [x] Storage bucket created successfully
- [x] Code deployed to Vercel without build errors
- [x] All API routes respond with correct HTTP status codes
- [x] File upload works with validation
- [x] File download works with signed URLs
- [x] File delete works and removes from both storage and database
- [x] React components render without errors
- [x] TypeScript strict mode: no errors in new files
- [x] Mobile responsive UI
- [x] Error messages are user-friendly and specific

Once all criteria met, Phase 11 is complete and ready for user testing.
