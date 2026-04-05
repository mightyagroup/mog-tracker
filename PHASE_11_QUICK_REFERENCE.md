# Phase 11: Document Management — Quick Reference

## What Was Built

A complete document management system for the MOG Tracker app using Supabase Storage. Users can upload, organize, and manage documents attached to government leads, commercial leads, and subcontractors.

## Files to Review

1. **Database Schema**
   - `supabase/migrations/034_documents.sql` - Documents table definition

2. **Setup Script**
   - `scripts/setup-storage.ts` - Creates Supabase Storage bucket

3. **API Routes**
   - `src/app/api/documents/route.ts` - POST upload, GET list
   - `src/app/api/documents/[id]/route.ts` - GET download, PATCH update, DELETE

4. **Components**
   - `src/components/documents/DocumentUpload.tsx` - Drag-drop uploader
   - `src/components/documents/DocumentList.tsx` - Document table
   - `src/components/documents/LeadDocuments.tsx` - Embedded lead documents
   - `src/components/documents/DocumentPreview.tsx` - Modal viewer

5. **Types**
   - `src/lib/types.ts` - DocumentType union + Document interface
   - `src/lib/constants.ts` - DOCUMENT_TYPE_LABELS

6. **Documentation**
   - `PHASE_11_DOCUMENT_MANAGEMENT.md` - Complete setup guide
   - `PHASE_11_DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment
   - `LESSONS_LEARNED.md` - Design decisions and patterns

## Key Features

- **Drag-and-drop upload** with multi-file support
- **File validation** (MIME type, 50MB limit)
- **Secure downloads** with signed URLs (60min expiry)
- **Document classification** (solicitation, proposal, teaming_agreement, etc.)
- **Mobile responsive** UI
- **Error handling** with user-friendly messages
- **Private storage** bucket (not public)
- **Soft delete** with is_archived flag

## Quick Start

### 1. Run Migration
```sql
-- Copy entire content of supabase/migrations/034_documents.sql
-- Paste into Supabase SQL editor and run
```

### 2. Create Storage Bucket
```bash
npx ts-node scripts/setup-storage.ts
```

### 3. Test Upload/Download
- Visit a lead page
- Upload a PDF (drag-drop or click)
- Download file (verify signed URL works)
- Delete file (verify from storage and database)

## API Reference

### Upload Document
```bash
POST /api/documents
Content-Type: multipart/form-data

Parameters:
- file: File object
- entity: "exousia" | "vitalx" | "ironhouse"
- gov_lead_id?: uuid (optional)
- commercial_lead_id?: uuid (optional)
- subcontractor_id?: uuid (optional)
- document_type?: string (optional)
- description?: string (optional)

Response: 201 Created
{
  "id": "uuid",
  "file_name": "proposal.pdf",
  "storage_path": "exousia/lead-id/1712282400000_proposal.pdf",
  ...
}
```

### List Documents
```bash
GET /api/documents?entity=exousia&gov_lead_id=uuid&limit=100

Query Parameters:
- entity?: string
- gov_lead_id?: uuid
- commercial_lead_id?: uuid
- subcontractor_id?: uuid
- document_type?: string
- limit?: number (default 100)

Response: 200 OK
[{ id, file_name, file_type, file_size, created_at, ... }]
```

### Download Document
```bash
GET /api/documents/{id}

Response: 200 OK
{
  "id": "uuid",
  "file_name": "proposal.pdf",
  "download_url": "https://...signedurl..." (expires in 60min)
}
```

### Update Document Metadata
```bash
PATCH /api/documents/{id}

Body:
{
  "description": "Updated notes",
  "document_type": "proposal",
  "is_archived": false
}

Response: 200 OK
{ updated document object }
```

### Delete Document
```bash
DELETE /api/documents/{id}

Response: 200 OK
{ "success": true }
```

## Component Usage

### LeadDocuments (Embedded in Lead Detail Panel)
```typescript
import { LeadDocuments } from '@/components/documents/LeadDocuments'

<LeadDocuments
  entity="exousia"
  govLeadId={lead.id}
  commercialLeadId={undefined}
  accentColor="#D4AF37"
/>
```

### DocumentUpload (Standalone)
```typescript
import { DocumentUpload } from '@/components/documents/DocumentUpload'

<DocumentUpload
  entity="exousia"
  govLeadId={lead.id}
  onUploadComplete={() => refreshDocuments()}
  accentColor="#D4AF37"
/>
```

### DocumentList (Standalone)
```typescript
import { DocumentList } from '@/components/documents/DocumentList'

<DocumentList
  documents={documents}
  onRefresh={loadDocuments}
  showDeleteConfirm={true}
/>
```

### DocumentPreview (Modal)
```typescript
import { DocumentPreview } from '@/components/documents/DocumentPreview'

{showPreview && (
  <DocumentPreview
    document={selectedDocument}
    onClose={() => setShowPreview(false)}
  />
)}
```

## Document Types

Available document types for classification:

- `solicitation` - RFP, RFQ, solicitation document
- `proposal` - Our response/bid
- `teaming_agreement` - Subcontractor teaming agreement
- `capability_statement` - Company capability statement
- `pricing` - Pricing worksheet/response
- `contract` - Signed contract/award
- `correspondence` - Email, letters, communications
- `certification` - Certifications (small business, WOSB, etc.)
- `other` - Miscellaneous documents

## File Type Support

**Allowed MIME types:**
- PDF: `application/pdf`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PowerPoint: `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- Images: `image/jpeg`, `image/png`
- Text: `text/plain`
- CSV: `text/csv`
- ZIP: `application/zip`, `application/x-zip-compressed`

**Max file size:** 50MB

## Storage Path Format

Files are organized in Supabase Storage as:

```
documents/
  {entity}/
    {lead_id or 'general'}/
      {timestamp}_{filename}.{ext}
```

Example paths:
```
documents/exousia/lead-123-abc/1712282400000_proposal.pdf
documents/vitalx/general/1712282400001_capability_statement.docx
documents/ironhouse/sub-456-def/1712282400002_teaming_agreement.pdf
```

This structure enables:
- Easy organization by entity and lead
- Bulk operations (delete all docs for a lead)
- Prevention of filename collisions
- Clear ownership/relationship tracking

## Security Notes

1. **Storage is PRIVATE** — not publicly accessible
2. **Downloads use SIGNED URLs** — expire after 60 minutes
3. **RLS enabled** — authenticated users can CRUD documents
4. **Validation** — MIME type and file size checked client and server
5. **Cleanup** — deleted files removed from both storage and database
6. **Future enhancement** — fine-grained RBAC per document

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
- Run `npm install`

### Storage bucket not created
- Verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
- Run `npx ts-node scripts/setup-storage.ts` again

### 401 Unauthorized on upload
- Check that user is logged in
- Verify auth token is valid

### Signed URL expires before download completes
- Default expiry is 60 minutes
- Can be adjusted in `src/app/api/documents/[id]/route.ts` line with `createSignedUrl`

### File appears in database but not in storage
- Likely upload to storage failed after DB record created
- Delete the orphaned record and retry upload

### MIME type validation failing
- Check that file type is in ALLOWED_TYPES in DocumentUpload.tsx
- Verify server isn't rejecting a legitimate type (check API logs)

## Performance Tips

1. **Lazy-load DocumentUpload** — only show form when user clicks "Upload"
2. **Paginate document lists** — use `limit` parameter for large lead files
3. **Cache file type icons** — determined by MIME type, not extension
4. **Generate signed URLs on-demand** — don't pre-generate and store

## Testing Checklist

- [ ] Upload a PDF file
- [ ] Upload a Word document
- [ ] Upload an image
- [ ] Download each file type
- [ ] Verify file content matches original
- [ ] Delete a document
- [ ] Verify it's gone from list and storage
- [ ] Set document type and description
- [ ] View documents for specific lead
- [ ] Mobile: drag-drop works on touch
- [ ] Mobile: buttons are 44px minimum
- [ ] Error: try uploading .exe file
- [ ] Error: try uploading 100MB file
- [ ] Concurrent: upload 5 files simultaneously

## Next Steps

1. **Run deployment checklist** — `PHASE_11_DEPLOYMENT_CHECKLIST.md`
2. **Integrate into LeadDetailPanel** — add LeadDocuments component
3. **Create documents tab** — optional per-entity documents page
4. **Test with real files** — upload actual proposals, solicitations, etc.
5. **Gather user feedback** — ask users about UX, file types, features

## Additional Resources

- `PHASE_11_DOCUMENT_MANAGEMENT.md` - Comprehensive setup guide
- `PHASE_11_DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment instructions
- `LESSONS_LEARNED.md` - Design decisions and patterns (search "Phase 11")

---

**Status:** Phase 11 Complete — Ready for deployment
**Last Updated:** 2026-04-04
**Build Time:** ~1 hour
**Lines of Code:** 1,000+ (components) + 300+ (API routes) + 170 (migration)
