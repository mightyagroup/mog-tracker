# Phase 8 Deployment Checklist

## Pre-Deployment Verification

- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] All files created with correct syntax
- [x] vercel.json properly formatted (JSON valid)
- [x] LESSONS_LEARNED.md updated
- [x] Documentation complete (PHASE_8_STATE_FEEDS.md, PHASE_8_QUICK_START.md)

## Files to Deploy

### New Files
```
supabase/migrations/032_state_feeds.sql
src/app/api/cron/eva-feed/route.ts
src/app/api/cron/emma-feed/route.ts
src/components/tracker/StateProcurementImport.tsx
PHASE_8_STATE_FEEDS.md
PHASE_8_QUICK_START.md
PHASE_8_DEPLOYMENT.md (this file)
```

### Modified Files
```
vercel.json
LESSONS_LEARNED.md
```

## Deployment Steps

### Step 1: Database Migration (Manual - Required)

1. Go to Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `lqymdyorcwgeesmkvvob`
3. Open SQL Editor
4. Create new query and paste contents of: `supabase/migrations/032_state_feeds.sql`
5. Click "Run"
6. Verify completion (no errors)

**Expected changes**:
- `state_procurement_id` column added to gov_leads table
- `last_eva_check` timestamp column added to gov_leads table
- `last_emma_check` timestamp column added to gov_leads table
- New `state_feed_logs` table created with trigger

### Step 2: Git Push (Automatic)

```bash
cd /sessions/festive-optimistic-ritchie/mnt/mog-tracker-app

# Verify no .env.local or secrets in staged files
git status

# Stage all changes
git add -A

# Commit with message following project convention
git commit -m "Phase 8: State procurement feeds (eVA & eMMA)"

# Push to main
git push origin main
```

**Vercel auto-deploys** (takes 2-3 minutes)

### Step 3: Verification (Manual)

Wait 2-3 minutes for Vercel build to complete, then:

**Test eVA GET endpoint**:
```bash
curl https://mog-tracker.vercel.app/api/cron/eva-feed
```

Expected response: JSON with success=true, feed='eva'

**Test eMMA GET endpoint**:
```bash
curl https://mog-tracker.vercel.app/api/cron/emma-feed
```

Expected response: JSON with success=true, feed='emma'

**Test eVA POST endpoint** (dry run):
```bash
curl -X POST https://mog-tracker.vercel.app/api/cron/eva-feed \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "title": "Test Opportunity",
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

Expected: inserted=1, dryRun=true in response

### Step 4: UI Component Integration (Manual)

Choose where to add the import component in the app. Recommended locations:
- Exousia tracker page (new "Import State Leads" tab)
- VitalX tracker page (new "Import State Leads" tab)
- IronHouse tracker page (new "Import State Leads" tab)

Example integration:

```tsx
// In src/app/exousia/page.tsx or similar tracker page

import StateProcurementImport from '@/components/tracker/StateProcurementImport'

export default function ExousiaTrackerPage() {
  // ... existing tabs and content ...

  return (
    <div className="space-y-6">
      {/* Existing tabs */}
      <div className="flex gap-2 border-b border-gray-600">
        <button>Leads</button>
        <button>Subcontractors</button>
        <button>Active Bids</button>
        <button>Awards</button>
        <button>Pricing</button>
        <button>Import State Leads</button>  {/* NEW TAB */}
      </div>

      {/* Tab content */}
      <StateProcurementImport
        entity="exousia"
        onImportComplete={(result) => {
          console.log(`Imported ${result.inserted} leads`)
          // Refresh leads table or show toast notification
        }}
      />
    </div>
  )
}
```

### Step 5: Test Real Import (Optional but Recommended)

1. Open the app in browser: https://mog-tracker.vercel.app
2. Navigate to entity tracker (Exousia, VitalX, or IronHouse)
3. Find "Import State Leads" section
4. Select eVA tab
5. Paste CSV:
```
Title,Solicitation #,Agency,NAICS Code,Estimated Value,Response Deadline
Virginia IT Services,RFQ-2024-001,Virginia Dept of Health,561110,250000,2024-12-31
```
6. Click "Parse CSV"
7. Click "Dry Run" (should show inserted=1 without saving)
8. Click "Import Leads" (now it saves)
9. Check Exousia tracker - new lead should appear

## Cron Schedule

After deployment, cron jobs run automatically:

- **eVA GET**: Every Monday at 7:00 AM EST (UTC 12:00)
  - Runs: `/api/cron/eva-feed`
  - Action: Logs diagnostic info, no data import
  - Can be manually triggered in Vercel dashboard

- **eMMA GET**: Every Wednesday at 7:00 AM EST (UTC 12:00)
  - Runs: `/api/cron/emma-feed`
  - Action: Logs diagnostic info, no data import
  - Can be manually triggered in Vercel dashboard

To manually trigger via Vercel:
1. Open Vercel dashboard: https://vercel.com/dashboard
2. Select project: mog-tracker
3. Go to "Crons" tab
4. Find eva-feed or emma-feed
5. Click the three dots → "Trigger"

## Environment Variables

No new environment variables required.

Optional enhancement (for API authentication):
```bash
CRON_SECRET=your_secret_token_here
```

If set, all GET/POST requests to feed endpoints must include:
```bash
Authorization: Bearer $CRON_SECRET
```

## Rollback Plan

If anything goes wrong:

**Option 1: Revert code only** (database unchanged):
```bash
git revert HEAD
git push origin main
# Wait 2-3 min for Vercel redeploy
```

**Option 2: Revert database** (if migration was run):
```bash
# In Supabase SQL Editor, run:
DROP TABLE IF EXISTS state_feed_logs;
ALTER TABLE gov_leads DROP COLUMN IF EXISTS state_procurement_id;
ALTER TABLE gov_leads DROP COLUMN IF EXISTS last_eva_check;
ALTER TABLE gov_leads DROP COLUMN IF EXISTS last_emma_check;
DROP INDEX IF EXISTS idx_gov_leads_state_procurement_id;
```

## Monitoring After Deployment

### Check Recent Feed Logs
```sql
SELECT feed_type, run_date, fetched, inserted, updated, errors_count, status
FROM state_feed_logs
ORDER BY run_date DESC
LIMIT 5;
```

### Check for Import Errors
```sql
SELECT
  source, entity, COUNT(*) as count
FROM gov_leads
WHERE source IN ('eva', 'emma')
GROUP BY source, entity;
```

### Check State Procurement IDs
```sql
SELECT state_procurement_id, entity, title
FROM gov_leads
WHERE state_procurement_id IS NOT NULL
LIMIT 10;
```

## Common Issues & Solutions

### Issue: Migration fails with "table already exists"
- Solution: Column/table already added from previous attempt. Run rollback first.

### Issue: POST endpoint returns 401 Unauthorized
- Solution: CRON_SECRET is set but auth header missing. Either remove CRON_SECRET or add header.

### Issue: Leads are being skipped
- Solution: Check NAICS code matches ENTITY_NAICS. Run test with valid NAICS codes.

### Issue: Duplicate key error on state_procurement_id
- Solution: Lead already exists. Use different solicitation_number or check existing leads.

### Issue: CSV not parsing correctly
- Solution: Verify CSV format (comma-separated, valid encoding). Try different column names.

## Success Criteria

Deployment is successful when:
- [x] TypeScript compilation passed (before push)
- [ ] Vercel build completes without errors (after push, 2-3 min)
- [ ] GET /api/cron/eva-feed returns HTTP 200
- [ ] GET /api/cron/emma-feed returns HTTP 200
- [ ] POST with dry run doesn't save data to database
- [ ] POST with real import saves leads to database
- [ ] Imported leads appear in tracker
- [ ] Fit scores calculated and visible
- [ ] Service categories auto-assigned
- [ ] state_feed_logs table shows recent runs

## Post-Deployment

1. **Document integration points** - Note where StateProcurementImport is used
2. **Train users** - Show how to export from eVA/eMMA and import to app
3. **Set calendar reminder** - Check state_feed_logs weekly for import health
4. **Monitor SAM.gov feed** - Ensure previous feed still working
5. **Plan Phase 9** - Consider API integrations if eVA/eMMA release them

## Support Contact

For questions or issues:
- See PHASE_8_STATE_FEEDS.md for detailed documentation
- See PHASE_8_QUICK_START.md for copy-paste examples
- Check LESSONS_LEARNED.md for design rationale
- Review src/lib/utils.ts for fit score and categorization logic

---

**Date Created**: 2026-04-04
**Last Updated**: 2026-04-04
**Status**: Ready for Deployment
