# MOG Tracker Webhook API Documentation

This document describes the three Make.com webhook endpoints for the MOG Tracker application. These endpoints allow external systems (like Make.com automation workflows) to create, update, and query government leads.

## Overview

All webhooks:
- Use **Bearer token authentication** via `Authorization` header
- Are secured with the `WEBHOOK_SECRET` environment variable
- Accept JSON request bodies (POST endpoints)
- Return JSON responses
- Log all calls to the `webhook_logs` table for audit trails
- Are excluded from the standard authentication middleware (routes to `/api/webhooks/*` bypass auth)

## Authentication

All webhook requests must include the Authorization header:

```
Authorization: Bearer {WEBHOOK_SECRET}
```

Where `{WEBHOOK_SECRET}` is the value from the Vercel environment variables.

**Response if missing or invalid:**
```json
{
  "error": "Unauthorized"
}
```
Status: `401 Unauthorized`

## Endpoints

### 1. POST /api/webhooks/new-lead

Create a new government lead from an external trigger (e.g., Make.com SAM.gov feed integration).

#### Request

```bash
curl -X POST https://mog-tracker.vercel.app/api/webhooks/new-lead \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "title": "Cybersecurity Compliance Support RFQ",
    "solicitation_number": "RFQ-GSA-25-001234",
    "notice_id": "SAM-2025-1234567",
    "description": "Seeking vendor for FedRAMP compliance audit and remediation services.",
    "agency": "General Services Administration",
    "sub_agency": "Federal Acquisition Service",
    "naics_code": "541614",
    "set_aside": "small_business",
    "contract_type": "firm_fixed",
    "source": "sam_gov",
    "place_of_performance": "Fairfax County, Virginia",
    "posted_date": "2025-04-03",
    "response_deadline": "2025-05-03T23:59:00Z",
    "estimated_value": 150000,
    "proposal_lead": "John Smith",
    "sam_gov_url": "https://sam.gov/opportunities/1234567",
    "notes": "Watch for amendment regarding evaluation criteria."
  }'
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | One of: `exousia`, `vitalx`, `ironhouse` |
| `title` | string | Yes | Lead title / opportunity name |
| `solicitation_number` | string | No | SAM.gov or procurement identifier |
| `notice_id` | string | No | Notice ID from SAM.gov |
| `description` | string | No | Full opportunity description |
| `agency` | string | No | Federal agency name |
| `sub_agency` | string | No | Sub-agency or bureau |
| `naics_code` | string | No | 6-digit NAICS code |
| `set_aside` | string | No | One of: `wosb`, `edwosb`, `8a`, `hubzone`, `sdvosb`, `small_business`, `total_small_business`, `full_and_open`, `sole_source`, `none` |
| `contract_type` | string | No | One of: `firm_fixed`, `time_materials`, `cost_plus`, `idiq`, `bpa`, `purchase_order` |
| `source` | string | No | One of: `sam_gov`, `govwin`, `eva`, `emma`, `local_gov`, `usaspending`, `manual` (default: `manual`) |
| `place_of_performance` | string | No | Location of work |
| `posted_date` | string | No | Date posted (YYYY-MM-DD format) |
| `response_deadline` | string | No | Response deadline (ISO 8601 format with timezone) |
| `estimated_value` | number | No | Estimated contract value in dollars |
| `proposal_lead` | string | No | Name of proposal lead / assignment |
| `sam_gov_url` | string | No | Direct link to SAM.gov opportunity |
| `notes` | string | No | Internal notes |

#### Response (Success - 201 Created)

```json
{
  "success": true,
  "message": "Lead created successfully",
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entity": "exousia",
    "title": "Cybersecurity Compliance Support RFQ",
    "solicitation_number": "RFQ-GSA-25-001234",
    "agency": "General Services Administration",
    "estimated_value": 150000,
    "fit_score": 78,
    "status": "new",
    "created_at": "2025-04-03T12:34:56.789Z",
    "updated_at": "2025-04-03T12:34:56.789Z"
    // ... full lead object
  }
}
```

#### Response (Duplicate Found - 200 OK)

If a lead with the same `solicitation_number` and `entity` already exists:

```json
{
  "success": true,
  "message": "Lead already exists",
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "isDuplicate": true
}
```

#### Response Errors

**400 Bad Request** - Missing required fields:
```json
{
  "error": "Missing required fields: entity and title"
}
```

**400 Bad Request** - Invalid entity:
```json
{
  "error": "Invalid entity. Must be exousia, vitalx, or ironhouse"
}
```

**400 Bad Request** - Invalid JSON:
```json
{
  "error": "Invalid JSON"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to create lead",
  "details": "database error message"
}
```

#### Features

- **Duplicate Detection**: Checks for existing `solicitation_number + entity` combination before inserting
- **Input Sanitization**: Strips HTML tags, trims whitespace, limits to 5000 chars per field
- **Auto-Scoring**: Calculates fit score based on NAICS code, set-aside, location, value, deadline, and source
- **Logging**: All calls logged to `webhook_logs` table with success status and request body

---

### 2. POST /api/webhooks/update-lead

Update an existing government lead by solicitation number.

#### Request

```bash
curl -X POST https://mog-tracker.vercel.app/api/webhooks/update-lead \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "solicitation_number": "RFQ-GSA-25-001234",
    "status": "active_bid",
    "response_deadline": "2025-05-10T23:59:00Z",
    "bid_decision_notes": "Decision: Proceed with full proposal submission."
  }'
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | One of: `exousia`, `vitalx`, `ironhouse` |
| `solicitation_number` | string | Yes | Identifies which lead to update |
| All other fields | * | No | Same as in new-lead endpoint; updates only specified fields |

#### Valid Status Values

One of: `new`, `reviewing`, `bid_no_bid`, `active_bid`, `submitted`, `awarded`, `lost`, `no_bid`, `cancelled`

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "message": "Lead updated successfully",
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entity": "exousia",
    "status": "active_bid",
    "fit_score": 82,
    "updated_at": "2025-04-03T13:00:00.000Z"
    // ... updated lead object
  }
}
```

#### Response Errors

**400 Bad Request** - Missing required fields:
```json
{
  "error": "Missing required fields: entity and solicitation_number"
}
```

**404 Not Found** - Lead does not exist:
```json
{
  "error": "Lead not found",
  "solicitation": "RFQ-GSA-25-001234"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to update lead",
  "details": "database error message"
}
```

#### Features

- **Partial Updates**: Only updates fields that are provided in the request
- **Auto-Recalculation**: Recalculates fit score if scoring-related fields change
- **Input Sanitization**: Sanitizes all string inputs
- **Logging**: Full audit trail in `webhook_logs` table

---

### 3. GET /api/webhooks/active-bids

Retrieve all active bids (or active bids within an entity and/or deadline window).

#### Request

```bash
# Get all active bids
curl https://mog-tracker.vercel.app/api/webhooks/active-bids \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET"

# Get active bids for Exousia only, due within 21 days
curl "https://mog-tracker.vercel.app/api/webhooks/active-bids?entity=exousia&days=21" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET"

# Get VitalX active bids due within next 7 days
curl "https://mog-tracker.vercel.app/api/webhooks/active-bids?entity=vitalx&days=7" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET"
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entity` | string | None (all) | Filter by entity: `exousia`, `vitalx`, or `ironhouse` |
| `days` | integer | 14 | Deadline window: return bids due in next N days (1-365) |

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "count": 3,
  "deadlineDaysWindow": 14,
  "entity": "exousia",
  "bids": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "entity": "exousia",
      "title": "Cybersecurity Compliance Support RFQ",
      "solicitation_number": "RFQ-GSA-25-001234",
      "agency": "General Services Administration",
      "response_deadline": "2025-04-15T23:59:00Z",
      "estimated_value": 150000,
      "status": "active_bid",
      "fit_score": 78,
      "proposal_lead": "John Smith"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "entity": "exousia",
      "title": "Facilities Management - Northern VA",
      "solicitation_number": "RFQ-GSA-25-001235",
      "agency": "General Services Administration",
      "response_deadline": "2025-04-18T23:59:00Z",
      "estimated_value": 250000,
      "status": "active_bid",
      "fit_score": 85,
      "proposal_lead": "Sarah Johnson"
    }
  ]
}
```

#### Response Errors

**400 Bad Request** - Invalid entity:
```json
{
  "error": "Invalid entity. Must be exousia, vitalx, or ironhouse"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to fetch active bids",
  "details": "database error message"
}
```

#### Features

- **Deadline Filtering**: Returns only bids with deadlines within the specified window and not yet passed
- **Entity Filtering**: Optional filter to return bids for a specific entity
- **Minimal Response**: Returns only essential fields needed for alerts/dashboards
- **Logging**: All requests logged for audit trail

---

## Webhook Logs

All webhook calls are logged to the `webhook_logs` table for audit trails and debugging.

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique log entry ID |
| `endpoint` | text | Webhook endpoint path (e.g., `/api/webhooks/new-lead`) |
| `method` | text | HTTP method (GET, POST) |
| `source_ip` | text | Source IP address of the request |
| `response_status` | int | HTTP response status code |
| `success` | boolean | Whether the request was successful |
| `error_message` | text | Error details if `success=false` |
| `request_body` | jsonb | Full request body (for POST requests) |
| `logged_at` | timestamptz | When the request was logged |
| `created_at` | timestamptz | Record creation time |
| `updated_at` | timestamptz | Record last update time |

### Query Logs

```sql
-- All webhook calls in the last 24 hours
SELECT endpoint, method, success, response_status, logged_at
FROM webhook_logs
WHERE logged_at > now() - interval '24 hours'
ORDER BY logged_at DESC;

-- Failed webhook calls
SELECT endpoint, method, source_ip, error_message, logged_at
FROM webhook_logs
WHERE success = false
ORDER BY logged_at DESC;

-- Call volume by endpoint
SELECT endpoint, COUNT(*) as call_count, COUNT(*) FILTER (WHERE success) as successful
FROM webhook_logs
GROUP BY endpoint;
```

---

## Implementation Files

### Created Files

1. **`/src/lib/webhook-utils.ts`**
   - `validateWebhookAuth(request)` - Bearer token validation
   - `sanitizeInput(input)` - HTML strip, trim, limit to 5000 chars
   - `createWebhookSupabaseClient()` - Service role Supabase client
   - `logWebhookCall(params)` - Insert into webhook_logs table
   - `getSourceIp(request)` - Extract source IP from headers

2. **`/src/app/api/webhooks/new-lead/route.ts`**
   - POST endpoint for creating new government leads
   - Duplicate detection by solicitation_number+entity
   - Auto-calculated fit score
   - Full input validation and sanitization

3. **`/src/app/api/webhooks/update-lead/route.ts`**
   - POST endpoint for updating existing leads
   - Partial updates (only specified fields)
   - Auto-recalculates fit score if relevant fields change
   - 404 if lead not found

4. **`/src/app/api/webhooks/active-bids/route.ts`**
   - GET endpoint for querying active bids
   - Optional entity and deadline filters
   - Returns minimal response for alerts/dashboards

5. **`/supabase/migrations/027_webhook_logs.sql`**
   - Creates `webhook_logs` table
   - Indexes on endpoint, success, logged_at
   - RLS policies for authenticated users and service role

### Modified Files

1. **`/src/middleware.ts`**
   - Updated matcher to exclude `/api/webhooks/*` from auth middleware

---

## Make.com Integration Example

### Scenario: Auto-sync new SAM.gov leads to MOG Tracker

1. **Make.com Scenario Setup:**
   - **Trigger**: SAM.gov API (or polling module) detects new opportunities
   - **Condition**: Filter for Exousia NAICS codes (561720, 561730, etc.)
   - **Action**: Send HTTP POST to MOG Tracker webhook

2. **Make.com Module Configuration:**
   ```
   Method: POST
   URL: https://mog-tracker.vercel.app/api/webhooks/new-lead
   Headers:
     Authorization: Bearer {WEBHOOK_SECRET}
     Content-Type: application/json
   Body (JSON):
   {
     "entity": "exousia",
     "title": {{title}},
     "solicitation_number": {{solicitation_number}},
     "agency": {{agency}},
     "naics_code": {{naics_code}},
     "set_aside": {{set_aside}},
     "estimated_value": {{estimated_value}},
     "response_deadline": {{response_deadline}},
     "source": "sam_gov"
   }
   ```

3. **Alternative: Scheduled Active Bid Alert**
   - **Trigger**: Cron schedule (e.g., daily at 9 AM)
   - **Action**: Call GET `/api/webhooks/active-bids?entity=exousia&days=7`
   - **Output**: Parse JSON response and send Slack/email alert to proposal team

---

## Best Practices

1. **Always include `Authorization` header** with the webhook secret
2. **Use ISO 8601 datetime format** for dates/times (e.g., `2025-04-03T12:00:00Z`)
3. **Sanitization is automatic** - don't pre-process inputs
4. **Check response status** - 201 for create, 200 for update/query, 4xx/5xx for errors
5. **Monitor webhook_logs** - set up alerts if `success=false` rate increases
6. **Validate input data** before sending - missing required fields will return 400
7. **Handle duplicates gracefully** - update-lead endpoint will fail if lead not found; use new-lead for "upsert" logic in Make.com

---

## Troubleshooting

### "Unauthorized" (401)
- Missing or invalid `Authorization` header
- Check that `WEBHOOK_SECRET` matches between Make.com and Vercel environment
- Verify header format: `Authorization: Bearer {SECRET}` (note the space after "Bearer")

### "Invalid JSON" (400)
- Ensure request body is valid JSON
- Check that string values are properly quoted
- Use `Content-Type: application/json` header

### "Lead not found" (404)
- The `solicitation_number + entity` combination doesn't exist
- Double-check entity name spelling (exousia, vitalx, ironhouse)
- Use the `/api/webhooks/active-bids` endpoint to verify leads exist

### "Invalid entity" (400)
- Entity must be exactly: `exousia`, `vitalx`, or `ironhouse`
- Check for typos or case sensitivity

### Webhook call fails silently
- Check `webhook_logs` table for error details
- Query: `SELECT * FROM webhook_logs WHERE success = false ORDER BY logged_at DESC LIMIT 10;`
- Verify Supabase service role key is correct in Vercel environment

---

## Testing

### Using cURL

```bash
# Test authentication
curl -X POST https://mog-tracker.vercel.app/api/webhooks/new-lead \
  -H "Authorization: Bearer wrong-secret" \
  -d '{}'
# Should return 401

# Test new lead creation
WEBHOOK_SECRET="your_actual_secret_here"
curl -X POST https://mog-tracker.vercel.app/api/webhooks/new-lead \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "title": "Test Opportunity",
    "solicitation_number": "TEST-001",
    "estimated_value": 100000
  }'

# Test active bids query
curl "https://mog-tracker.vercel.app/api/webhooks/active-bids?entity=exousia&days=14" \
  -H "Authorization: Bearer $WEBHOOK_SECRET"
```

### Using Make.com

1. Open Make.com scenario editor
2. Add HTTP module with above settings
3. Set webhook secret in environment variable
4. Map SAM.gov/other data source fields to request body
5. Test the module to verify connection

---

## Rate Limiting & Performance

- **No hard rate limits** enforced at webhook level
- **Recommended**: Max 10 requests/second per endpoint
- **Log retention**: Webhook logs stored indefinitely (monitor table size)
- **Indexing**: Queries on `endpoint`, `success`, `logged_at` optimized
- **Timeout**: Vercel serverless function timeout is 10 seconds (should be sufficient for most operations)

---

## Security Considerations

1. **Bearer Token**: Use a strong, randomly-generated `WEBHOOK_SECRET` (min 32 characters)
2. **HTTPS Only**: All webhooks served over HTTPS; plaintext traffic will fail
3. **Input Validation**: All strings sanitized; HTML injection not possible
4. **RLS**: Webhook logs readable only by authenticated users (via Supabase RLS)
5. **Logging**: Full audit trail of all webhook calls for compliance/debugging
6. **Source IP Tracking**: Logged for potential IP-based access controls (future enhancement)

---

## Future Enhancements

- IP whitelist for Make.com servers
- Rate limiting per IP/entity
- Webhook signature verification (HMAC-SHA256)
- Batch operations (create/update multiple leads in one request)
- Webhook callbacks/alerts (POST back to Make.com on lead status change)
- Role-based webhook access (API keys per entity or user)
