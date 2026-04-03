# Webhook Setup Guide

This guide walks through deploying and testing the Make.com webhook endpoints.

## Prerequisites

- Vercel project connected to GitHub
- `WEBHOOK_SECRET` environment variable set in Vercel
- Supabase project with all 27 migrations applied

## Step 1: Run the Database Migration

The `webhook_logs` table must be created before webhooks can log calls.

### Option A: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new
2. Copy and paste the contents of `/supabase/migrations/027_webhook_logs.sql`
3. Click "Run"
4. Verify the table appears in the Table Editor

### Option B: Via Migration Script

```bash
cd /sessions/festive-optimistic-ritchie/mnt/mog-tracker-app
SUPABASE_SERVICE_ROLE_KEY="your-key-here" node scripts/run-migrations.mjs
```

Verify migration ran successfully by checking Supabase Table Editor for `webhook_logs` table.

## Step 2: Set Environment Variable

1. Go to your Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add a new variable:
   - **Name**: `WEBHOOK_SECRET`
   - **Value**: A strong random string (min 32 characters)
     - Example: `sk_webhook_$(openssl rand -hex 16)` generates a secure key
   - **Environment**: Select `Production`, `Preview`, and `Development`
4. Click "Save and Deploy"

Note the `WEBHOOK_SECRET` value - you'll use it to configure Make.com.

## Step 3: Deploy to Vercel

The webhook code is already in the repository. Push to trigger a new deployment:

```bash
git add src/lib/webhook-utils.ts src/app/api/webhooks supabase/migrations/027_webhook_logs.sql src/middleware.ts
git commit -m "Add Make.com webhook endpoints"
git push origin main
```

Wait for Vercel to deploy. Check the deployment log for any build errors.

**Expected behavior**: Build should succeed with no TypeScript errors in the webhook files.

## Step 4: Test Webhooks

### Test via cURL

```bash
# Set your secret
WEBHOOK_SECRET="your-secret-value-here"
WEBHOOK_URL="https://mog-tracker.vercel.app"  # or your custom domain

# Test 1: Create a new lead
curl -X POST "$WEBHOOK_URL/api/webhooks/new-lead" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "title": "Test Opportunity #1",
    "solicitation_number": "TEST-001",
    "agency": "General Services Administration",
    "naics_code": "561720",
    "set_aside": "small_business",
    "estimated_value": 150000,
    "response_deadline": "2025-05-01T23:59:00Z",
    "source": "sam_gov"
  }'

# Expected response (201 Created):
# {
#   "success": true,
#   "message": "Lead created successfully",
#   "leadId": "uuid-here",
#   "lead": { ...full lead object... }
# }
```

### Test 2: Update the lead

```bash
curl -X POST "$WEBHOOK_URL/api/webhooks/update-lead" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "solicitation_number": "TEST-001",
    "status": "active_bid",
    "proposal_lead": "John Smith",
    "notes": "Proceeding with full proposal"
  }'

# Expected response (200 OK):
# {
#   "success": true,
#   "message": "Lead updated successfully",
#   "leadId": "uuid-here",
#   "lead": { ...updated lead object... }
# }
```

### Test 3: Query active bids

```bash
curl "$WEBHOOK_URL/api/webhooks/active-bids?entity=exousia&days=30" \
  -H "Authorization: Bearer $WEBHOOK_SECRET"

# Expected response (200 OK):
# {
#   "success": true,
#   "count": 1,
#   "deadlineDaysWindow": 30,
#   "entity": "exousia",
#   "bids": [ ...array of active bids... ]
# }
```

### Test 4: Authentication error

```bash
curl -X POST "$WEBHOOK_URL/api/webhooks/new-lead" \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{"entity": "exousia", "title": "Test"}'

# Expected response (401 Unauthorized):
# { "error": "Unauthorized" }
```

### Check Webhook Logs

After testing, verify logs were created:

```bash
# Via Supabase SQL Editor or psql:
SELECT endpoint, method, success, response_status, error_message, logged_at
FROM webhook_logs
ORDER BY logged_at DESC
LIMIT 10;
```

You should see 4 entries:
- POST /api/webhooks/new-lead (success=true, status=201)
- POST /api/webhooks/update-lead (success=true, status=200)
- GET /api/webhooks/active-bids (success=true, status=200)
- POST /api/webhooks/new-lead (success=false, status=401)

## Step 5: Configure Make.com

### 5.1: Create a Webhook Trigger Scenario

1. Log into Make.com
2. Create a new scenario
3. Add the **HTTP** module as a trigger (or action, depending on your workflow)
4. Configure:
   - **Method**: POST (for new-lead or update-lead) or GET (for active-bids)
   - **URL**: `https://mog-tracker.vercel.app/api/webhooks/new-lead` (example)
   - **Headers**: `Authorization: Bearer YOUR_WEBHOOK_SECRET`
   - **Content-Type**: `application/json`
   - **Body**: Map fields from your source (SAM.gov, etc.) to the request body

### 5.2: Example: SAM.gov Feed to MOG Tracker

```
Trigger: SAM.gov RSS Feed (or API polling)
  ↓
  Filter: NAICS code matches Exousia codes
  ↓
  HTTP POST to /api/webhooks/new-lead
  ↓
  Mapping:
    entity → "exousia"
    title → {solicitation_title}
    solicitation_number → {notice_id}
    agency → {agency_name}
    naics_code → {naics}
    set_aside → {set_aside_type}
    estimated_value → {estimated_amount}
    response_deadline → {deadline}
    source → "sam_gov"
  ↓
  Success: Log to Slack or email
```

### 5.3: Example: Daily Active Bid Alert

```
Trigger: Cron Schedule (daily at 9 AM)
  ↓
  HTTP GET /api/webhooks/active-bids?entity=exousia&days=7
  ↓
  Parse Response
  ↓
  For Each Bid:
    Post to Slack: "Due in 7 days: {title}"
```

## Step 6: Monitor & Maintain

### Monitor Webhook Health

```sql
-- Daily webhook call volume
SELECT DATE(logged_at) as date, endpoint, COUNT(*) as calls,
       COUNT(*) FILTER (WHERE success) as successful,
       COUNT(*) FILTER (WHERE NOT success) as failed
FROM webhook_logs
GROUP BY DATE(logged_at), endpoint
ORDER BY date DESC;

-- Recent failures
SELECT endpoint, method, error_message, source_ip, logged_at
FROM webhook_logs
WHERE success = false
ORDER BY logged_at DESC
LIMIT 20;

-- Slowest calls (by looking at recent entries)
-- Note: webhook_logs doesn't track response time, but you can add this
SELECT endpoint, COUNT(*) as volume, MIN(logged_at) as earliest
FROM webhook_logs
WHERE logged_at > now() - interval '7 days'
GROUP BY endpoint;
```

### Clean Up Old Logs (Optional)

```sql
-- Delete logs older than 90 days (run occasionally)
DELETE FROM webhook_logs
WHERE logged_at < now() - interval '90 days';
```

## Troubleshooting

### Webhook returns 401 Unauthorized

**Check:**
- `WEBHOOK_SECRET` is set in Vercel Environment Variables
- Authorization header format: `Authorization: Bearer {SECRET}` (space after Bearer)
- Secret matches exactly (no extra spaces or characters)

**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Copy the exact `WEBHOOK_SECRET` value
3. Update Make.com scenario with the correct secret

### Webhook returns 400 Bad Request

**Check:**
- Request body is valid JSON
- Required fields are present:
  - `entity` and `title` for new-lead
  - `entity` and `solicitation_number` for update-lead
- Entity value is one of: `exousia`, `vitalx`, `ironhouse`

**Fix:**
```bash
# Validate JSON with jq
echo '{"entity": "exousia", "title": "Test"}' | jq '.'

# Test with minimal required fields
curl -X POST "https://mog-tracker.vercel.app/api/webhooks/new-lead" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"entity": "exousia", "title": "Test"}'
```

### Webhook returns 500 Internal Server Error

**Check:**
- Database is accessible
- Supabase credentials are correct in environment variables
- Migration 027 has been applied (webhook_logs table exists)

**Debug:**
1. Check Vercel logs: https://vercel.com → Project → Deployments → View Logs
2. Query webhook_logs for the error:
   ```sql
   SELECT * FROM webhook_logs WHERE success = false ORDER BY logged_at DESC LIMIT 1;
   ```

### Duplicate lead created instead of updated

**Scenario:** You called new-lead with same solicitation_number twice

**Expected:** Second call returns `isDuplicate=true` with existing lead ID

**If you got two leads instead:**
- Check that `solicitation_number` is exactly the same (case-sensitive)
- Verify both calls used the same `entity`

**Fix:** Use update-lead endpoint if lead already exists

### Make.com workflow fails silently

**Check:**
1. Go to Make.com scenario → Logs
2. Check if HTTP module shows any response errors
3. Verify Authorization header is being sent (check in HTTP module raw response)
4. Test the webhook directly with cURL to isolate the issue

## Next Steps

1. **Set up alerting**: Create Make.com workflows to notify proposal teams when:
   - New high-fit leads are added (fit_score > 75)
   - Active bids have < 7 days remaining
   - Status changes (e.g., new → active_bid)

2. **Implement batch operations**: Extend webhooks to accept arrays for bulk lead creation

3. **Add webhooks callbacks**: Have MOG Tracker POST back to Make.com when lead status changes

4. **Enable IP whitelisting**: Restrict webhook access to Make.com IPs only (add to webhook-utils.ts)

5. **Rate limiting**: Implement per-IP rate limiting to prevent abuse

---

## Files Reference

| File | Purpose |
|------|---------|
| `/src/lib/webhook-utils.ts` | Shared webhook utilities |
| `/src/app/api/webhooks/new-lead/route.ts` | POST /api/webhooks/new-lead |
| `/src/app/api/webhooks/update-lead/route.ts` | POST /api/webhooks/update-lead |
| `/src/app/api/webhooks/active-bids/route.ts` | GET /api/webhooks/active-bids |
| `/supabase/migrations/027_webhook_logs.sql` | webhook_logs table migration |
| `/src/middleware.ts` | Updated to exclude /api/webhooks from auth |
| `/docs/WEBHOOKS.md` | Complete API documentation |

## Support

For detailed API documentation, see `/docs/WEBHOOKS.md`

For code examples, see the "Testing" section in `/docs/WEBHOOKS.md`
