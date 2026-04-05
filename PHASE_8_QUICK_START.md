# Phase 8 Quick Start Guide

## What's New

State procurement lead importing for Virginia (eVA) and Maryland (eMMA) without relying on public APIs.

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/032_state_feeds.sql` | Database schema for state feeds |
| `src/app/api/cron/eva-feed/route.ts` | Virginia eVA API endpoint (GET/POST) |
| `src/app/api/cron/emma-feed/route.ts` | Maryland eMMA API endpoint (GET/POST) |
| `src/components/tracker/StateProcurementImport.tsx` | UI component for bulk CSV import |

## Files Modified

| File | Change |
|------|--------|
| `vercel.json` | Added eva-feed (Mon 7am EST) and emma-feed (Wed 7am EST) cron schedules |
| `LESSONS_LEARNED.md` | Added Phase 8 entry |

## Deployment Steps

1. **Run migration**:
   ```bash
   # In Supabase Dashboard → SQL Editor, paste and run:
   # supabase/migrations/032_state_feeds.sql
   ```

2. **Push to GitHub**:
   ```bash
   git add -A
   git commit -m "Phase 8: State procurement feeds (eVA & eMMA)"
   git push origin main
   ```

3. **Vercel deploys automatically** (wait 2-3 minutes)

4. **Verify endpoints**:
   ```bash
   # Check eVA feed is live
   curl https://your-app.vercel.app/api/cron/eva-feed

   # Check eMMA feed is live
   curl https://your-app.vercel.app/api/cron/emma-feed
   ```

## Using the Component

In any tracker page (Exousia, VitalX, IronHouse), add:

```tsx
import StateProcurementImport from '@/components/tracker/StateProcurementImport'

export default function TrackerPage() {
  return (
    <div>
      {/* ... existing tabs ... */}
      <StateProcurementImport
        entity="exousia"
        onImportComplete={(result) => {
          console.log(`Imported ${result.inserted} leads`)
        }}
      />
    </div>
  )
}
```

## Manual Import Workflow

1. Navigate to entity tracker
2. Find "Import State Leads" section
3. Select eVA or eMMA
4. Paste CSV or upload file
5. Click "Parse CSV" to preview
6. (Optional) Click "Dry Run" to test
7. Click "Import Leads"

## CSV Format

```
Title,Solicitation #,State ID,Agency,NAICS Code,Set-Aside,Place of Performance,Estimated Value,Response Deadline,Posted Date,Solicitation URL
Sample Project,RFQ-2024-001,,Virginia Dept of Health,561720,WOSB,Richmond VA,150000,2024-12-31,2024-03-01,https://eva.virginia.gov/...
```

Column order doesn't matter. Unrecognized columns ignored. All fields optional except Title or Solicitation #.

## API Examples

**Import via curl**:
```bash
curl -X POST https://your-app.vercel.app/api/cron/eva-feed \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "title": "IT Support",
        "solicitation_number": "RFQ-2024-001",
        "agency": "Virginia Dept of Health",
        "naics_code": "561110",
        "estimated_value": 200000,
        "response_deadline": "2024-12-31T23:59:59Z"
      }
    ]
  }'
```

**Dry run test** (no data saved):
```bash
curl -X POST https://your-app.vercel.app/api/cron/eva-feed \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [/*...*/],
    "dryRun": true
  }'
```

## Key Features

- **Deduplication**: state_procurement_id prevents duplicate entries
- **Auto-routing**: NAICS code determines which entity(ies) get the lead
- **Auto-scoring**: Fit score calculated using existing algorithm
- **Auto-categorizing**: Service category assigned based on NAICS + keywords
- **Audit trail**: All imports logged to state_feed_logs table
- **Dry run**: Preview results before committing

## Cron Schedule

- **eVA**: Mondays at 7:00 AM EST (0 12 * * 1 UTC)
  - Runs GET endpoint to log diagnostic info
  - No data import (manual via UI or POST only)

- **eMMA**: Wednesdays at 7:00 AM EST (0 12 * * 3 UTC)
  - Runs GET endpoint to log diagnostic info
  - No data import (manual via UI or POST only)

## Troubleshooting

**Import fails with "invalid JSON"**: Ensure CSV can be parsed as standard format (comma-separated, quoted fields)

**Leads skipped**: Check that NAICS code matches one of the entity's codes (see ENTITY_NAICS in src/lib/constants.ts)

**Duplicate errors**: state_procurement_id already exists. Run with different ID or check existing leads.

**No service category**: If not auto-assigned, check NAICS code. If invalid, manually assign after import.

## For Developers

TypeScript passes strict compilation:
```bash
npx tsc --noEmit
```

All code uses existing patterns from SAM.gov feed (src/app/api/cron/sam-feed/route.ts).

Utilities leveraged:
- `calculateFitScore()` — Fit score algorithm
- `autoCategorizeLead()` — Service category assignment
- `ServiceCategory[]` — Type-safe category data

## Next Steps (Future Phases)

1. Integrate official eVA API (if released)
2. Integrate official eMMA API (if released)
3. Add amendment detection for state opportunities
4. Email notifications for new high-fit state leads
5. Document sync to Drive folders (if feasible)

---

**Questions?** See PHASE_8_STATE_FEEDS.md for complete documentation.
