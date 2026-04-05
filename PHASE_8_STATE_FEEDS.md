# Phase 8: State Procurement Feed Integration (eVA & eMMA)

**Date**: 2026-04-04
**Status**: Complete and ready for deployment

## Overview

Phase 8 implements Virginia (eVA) and Maryland (eMMA) state procurement feed integration for the MOG Tracker app. Unlike SAM.gov which has a public API, eVA and eMMA do not expose reliable public APIs. Therefore, this implementation provides:

1. **Manual bulk import capability** — Upload CSV or paste lead data from eVA/eMMA search results
2. **API endpoints** for programmatic imports via POST requests
3. **Deduplication by state_procurement_id** to prevent duplicate entries
4. **Auto-categorization and fit score calculation** for all imported leads
5. **Cron scheduling** (optional manual trigger or weekly automated checks)

## What Was Built

### 1. Database Migration (032_state_feeds.sql)

Added to `supabase/migrations/032_state_feeds.sql`:

- **state_procurement_id** column: Unique identifier for state procurement records (format: `eva_<ID>` or `emma_<ID>`)
- **last_eva_check** and **last_emma_check** timestamp fields: Track when feeds were last processed
- **state_feed_logs table**: Audit trail for all feed runs, including counts and error details

Key features:
- Unique constraint on state_procurement_id prevents duplicate insertions
- Indexed for efficient lookups
- Full audit trail with JSONB details field

### 2. eVA Feed API Route (/api/cron/eva-feed/route.ts)

**Endpoint**: `/api/cron/eva-feed`

**GET Method** (read-only diagnostic):
- Returns summary of recent eVA leads in the system
- Logs a successful feed run to state_feed_logs
- No API key required (informational only)

**POST Method** (bulk import):
- Accepts JSON array of lead objects
- Deduplicates by `state_procurement_id` + entity combination
- Routes leads to correct entity based on NAICS code match
- Auto-calculates fit score using existing `calculateFitScore()` utility
- Auto-categorizes using existing `autoCategorizeLead()` utility
- Supports dry-run mode for testing (`dryRun: true`)
- Returns detailed import results with error log

**Request Schema**:
```typescript
{
  leads: [
    {
      solicitation_number?: string        // Unique identifier on eVA
      state_procurement_id?: string       // Alternative unique ID
      title?: string                      // Opportunity title
      description?: string                // Full description
      agency?: string                     // Virginia agency name
      naics_code?: string                 // 6-digit NAICS code
      set_aside?: string                  // Set-aside type (WOSB, 8A, etc.)
      place_of_performance?: string       // Delivery location
      estimated_value?: number            // Budget estimate in dollars
      response_deadline?: string          // ISO 8601 deadline
      posted_date?: string                // When opportunity was posted
      solicitation_url?: string           // Link to eVA opportunity page
    }
  ],
  dryRun?: boolean                        // If true, preview without saving
}
```

### 3. eMMA Feed API Route (/api/cron/emma-feed/route.ts)

**Endpoint**: `/api/cron/emma-feed`

Identical structure and functionality to eVA, with:
- `state_procurement_id` prefixed with `emma_` for eMMA leads
- Source automatically set to `'emma'`
- last_emma_check timestamp tracking
- Same POST payload schema

### 4. Bulk Import Component (StateProcurementImport.tsx)

**Location**: `src/components/tracker/StateProcurementImport.tsx`

**Features**:

1. **Tab Interface**: Switch between eVA and eMMA feeds
2. **Two Import Methods**:
   - Paste CSV data directly in textarea
   - Upload .csv/.txt files
3. **Automatic Column Detection**:
   - Maps common column names to lead fields
   - Recognizes variations: "Title", "Opportunity", "Sol #", etc.
4. **CSV Preview**:
   - Shows first 5 rows with proper column mapping
   - Displays count of leads to be imported
5. **Dry Run Support**:
   - Preview import results without saving to database
   - Useful for validating data before commit
6. **Full Error Reporting**:
   - Shows detailed error messages for failed records
   - Lists which leads were skipped and why
   - Provides full import summary

**CSV Format Expected**:
```
Title,Solicitation #,State ID,Agency,NAICS Code,Set-Aside,Place of Performance,Estimated Value,Response Deadline,Posted Date,Solicitation URL
Sample Project,RFQ-2024-001,EVA-001,Virginia Dept of Health,561720,WOSB,Richmond VA,150000,2024-12-31,2024-03-01,https://eva.virginia.gov/...
```

Flexible parsing — column order doesn't matter, unrecognized columns ignored.

### 5. Vercel Cron Configuration (vercel.json)

Added two new cron jobs:

```json
{
  "path": "/api/cron/eva-feed",
  "schedule": "0 12 * * 1"    // Mondays 7 AM EST
},
{
  "path": "/api/cron/emma-feed",
  "schedule": "0 12 * * 3"    // Wednesdays 7 AM EST
}
```

**Note**: These weekly GET endpoints are informational only. The actual data import happens via POST requests, which are triggered by:
1. The bulk import component in the UI, or
2. Manual POST requests from external systems (GovWin, Make.com, etc.)

## Integration with Existing System

### Entity Routing
Leads are routed to entities using the same ENTITY_NAICS constants:
- **Exousia**: 561210, 561720, 561730, 562111, 541614
- **VitalX**: 492110, 492210, 621511, 621610, 485991, 485999, 561990
- **IronHouse**: 561720, 561730, 561210, 562111

If a lead's NAICS matches multiple entities (e.g., 561720 matches both Exousia and IronHouse), it's inserted for all matching entities.

### Fit Score Calculation
Uses the existing `calculateFitScore()` function from `src/lib/utils.ts`, which weights:
- Set-aside type (0-30 points)
- NAICS code match (0-25 points)
- Location/place of performance (0-20 points)
- Value range (0-15 points)
- Time to respond (0-10 points)
- Source bias (0-5 points for state feeds = 3 points)

### Service Category Auto-Assignment
Uses the existing `autoCategorizeLead()` function which:
1. Tries exact NAICS match to category NAICS codes
2. Falls back to keyword matching in title/description
3. Defaults to "General Support" category if no match

### Master Contacts Integration
Currently not implemented for state feeds (unlike SAM.gov feed). Contracting officers are optional for state procurement. Can be added in future phase if needed.

## How to Use

### Manual Import via UI

1. Navigate to any entity tracker page (Exousia, VitalX, or IronHouse)
2. Look for "Import State Leads" or similar tab/section
3. Select eVA or eMMA tab
4. Choose import method:
   - Paste CSV data into textarea, or
   - Click "Upload CSV" and select a file
5. Click "Parse CSV" to preview
6. (Optional) Click "Dry Run" to preview results without saving
7. Click "Import Leads" to save to database
8. Check results for any errors

### Programmatic Import via API

**cURL Example**:
```bash
curl -X POST https://your-app.vercel.app/api/cron/eva-feed \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "title": "IT Support Services",
        "solicitation_number": "RFQ-2024-001",
        "agency": "Virginia Department of Education",
        "naics_code": "561110",
        "set_aside": "WOSB",
        "estimated_value": 200000,
        "response_deadline": "2024-12-31T23:59:59Z"
      }
    ]
  }'
```

**Authentication**: If CRON_SECRET is set in environment, include:
```bash
-H "Authorization: Bearer $CRON_SECRET"
```

### Weekly Cron Check

The `/api/cron/eva-feed` GET and `/api/cron/emma-feed` GET endpoints run weekly and:
- Log diagnostic information to state_feed_logs table
- Return summary JSON showing recent leads count
- Don't modify any data (read-only)

To manually trigger via Vercel dashboard:
1. Go to Vercel project → Cron Jobs
2. Click the three dots on eva-feed or emma-feed
3. Click "Trigger"

## Response Format

**Success Response**:
```json
{
  "success": true,
  "feed": "eva",
  "dryRun": false,
  "fetched": 5,
  "inserted": 3,
  "updated": 2,
  "skipped": 0,
  "errorCount": 0,
  "errors": [],
  "timestamp": "2024-04-04T15:30:00Z"
}
```

**Partial Success (some errors)**:
```json
{
  "success": true,
  "feed": "eva",
  "dryRun": false,
  "fetched": 5,
  "inserted": 3,
  "updated": 1,
  "skipped": 1,
  "errorCount": 1,
  "errors": [
    "insert(eva/exousia/RFQ-2024-001): duplicate key value violates unique constraint"
  ],
  "timestamp": "2024-04-04T15:30:00Z"
}
```

## Deduplication Strategy

Prevents duplicate leads using unique constraint on state_procurement_id:

```sql
state_procurement_id = "eva_<solicitation_number_or_id>"
```

Example:
- eVA RFQ-2024-001 stored as: `eva_RFQ-2024-001`
- eMMA Contract-12345 stored as: `emma_Contract-12345`

On duplicate:
- Existing lead is **updated** with new values (title, deadline, value, etc.)
- last_eva_check or last_emma_check timestamp is updated
- No amendment tracking (unlike SAM.gov feed)

## Audit Trail

All feed runs logged to `state_feed_logs` table with:
- feed_type: 'eva' or 'emma'
- run_date: When the feed ran
- fetched / inserted / updated / skipped counts
- status: 'success' or 'partial'
- error_message: If status is error
- details: JSONB field with additional metadata

Query recent runs:
```sql
SELECT feed_type, run_date, fetched, inserted, updated, skipped, error_message
FROM state_feed_logs
ORDER BY run_date DESC
LIMIT 20;
```

## Environment Setup

No additional environment variables required beyond existing:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET (optional, for authentication on cron endpoints)

## TypeScript

All code is fully typed and passes strict TypeScript compilation:
```bash
npx tsc --noEmit
```

## Future Enhancements

1. **Official eVA API**: If Virginia releases an API, integrate it similar to SAM.gov feed
2. **Official eMMA API**: Same for Maryland
3. **Amendment Detection**: Track changes to state procurement opportunities
4. **Email Notifications**: Alert on new high-fit state leads
5. **Contact Extraction**: Auto-create contracting officer contacts from state solicitations
6. **Document Sync**: Download solicitation documents to Drive folders (if feasible with state systems)
7. **Scheduled UI Check**: Web scraper to periodically check eVA/eMMA search results

## Testing

**Dry Run Test**:
```bash
curl -X POST http://localhost:3000/api/cron/eva-feed \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "title": "Test Lead",
        "solicitation_number": "TEST-001",
        "agency": "Test Agency",
        "naics_code": "561720",
        "estimated_value": 100000,
        "response_deadline": "2024-12-31T23:59:59Z"
      }
    ],
    "dryRun": true
  }'
```

Expected: Returns inserted=1 without saving to database.

**Real Import Test**:
Remove `"dryRun": true` and verify lead appears in the Exousia tracker.

## Files Created/Modified

**Created**:
1. `/supabase/migrations/032_state_feeds.sql` — Database schema
2. `/src/app/api/cron/eva-feed/route.ts` — Virginia feed API
3. `/src/app/api/cron/emma-feed/route.ts` — Maryland feed API
4. `/src/components/tracker/StateProcurementImport.tsx` — UI import component
5. `/PHASE_8_STATE_FEEDS.md` — This documentation

**Modified**:
1. `/vercel.json` — Added eva-feed and emma-feed cron schedules

## Deployment Checklist

- [x] All TypeScript types validated
- [x] Migration SQL tested for syntax
- [x] API endpoints handle both GET and POST
- [x] Component displays properly with Tailwind styling
- [x] Error handling comprehensive
- [x] Vercel cron configuration updated
- [x] Documentation complete
- [ ] Database migration run on Supabase (manual step)
- [ ] Environment variables set on Vercel (CRON_SECRET if needed)
- [ ] Test import via UI after deployment

## Questions & Support

**How do I get eVA opportunities into MOG Tracker?**

1. Visit eVA.virginia.gov, search for relevant opportunities
2. Copy results to CSV or export from eVA
3. Use the Import component in the app to upload the CSV
4. Leads are instantly categorized and scored

**Can this auto-run like SAM.gov?**

Not yet — eVA and eMMA don't expose public APIs. The weekly cron GET endpoints are placeholders. Once eVA/eMMA release APIs, we can switch to automated fetching. Until then, manual import is the recommended approach.

**What if I have a custom procurement system?**

POST to `/api/cron/eva-feed` or `/api/cron/emma-feed` with your lead data. The API accepts JSON, so any system can integrate.

**Why are leads sometimes skipped?**

Common reasons:
1. No NAICS code — can't route to an entity
2. Missing title or solicitation number
3. Entity's NAICS codes don't match the opportunity's NAICS

Check the errors array in the response for details.
