# Webhook Quick Reference Card

## Three Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/webhooks/new-lead` | POST | Create new lead | Bearer token |
| `/api/webhooks/update-lead` | POST | Update lead | Bearer token |
| `/api/webhooks/active-bids` | GET | Query active bids | Bearer token |

## Authorization

All requests require:
```
Authorization: Bearer {WEBHOOK_SECRET}
```

Set `WEBHOOK_SECRET` in Vercel environment variables.

## POST /api/webhooks/new-lead

Create a new government lead.

**Required fields:**
- `entity` (exousia | vitalx | ironhouse)
- `title` (string)

**Optional fields:**
- `solicitation_number`, `notice_id`, `description`, `agency`, `sub_agency`
- `naics_code`, `set_aside`, `contract_type`, `source`, `place_of_performance`
- `posted_date`, `response_deadline`, `estimated_value`, `proposal_lead`, `sam_gov_url`, `notes`

**Response:**
- `201 Created`: Lead created successfully
- `200 OK`: Duplicate found (returns existing lead ID)
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid/missing auth
- `500 Internal Server Error`: Database error

**Example:**
```bash
curl -X POST https://mog-tracker.vercel.app/api/webhooks/new-lead \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "title": "Cybersecurity RFQ",
    "solicitation_number": "RFQ-GSA-001",
    "agency": "GSA",
    "estimated_value": 100000,
    "response_deadline": "2025-05-01T23:59:00Z"
  }'
```

## POST /api/webhooks/update-lead

Update an existing lead.

**Required fields:**
- `entity` (exousia | vitalx | ironhouse)
- `solicitation_number` (identifies the lead)

**Optional fields:**
- Any field from new-lead endpoint (title, agency, status, etc.)

**Response:**
- `200 OK`: Lead updated successfully
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid/missing auth
- `404 Not Found`: Lead doesn't exist
- `500 Internal Server Error`: Database error

**Example:**
```bash
curl -X POST https://mog-tracker.vercel.app/api/webhooks/update-lead \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "exousia",
    "solicitation_number": "RFQ-GSA-001",
    "status": "active_bid",
    "proposal_lead": "John Smith"
  }'
```

## GET /api/webhooks/active-bids

Query active bids with optional filters.

**Query parameters:**
- `entity` (exousia | vitalx | ironhouse) - optional, filter by entity
- `days` (1-365) - optional, deadline window in days (default 14)

**Response:**
- `200 OK`: Array of active bids
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid/missing auth
- `500 Internal Server Error`: Database error

**Response fields per bid:**
- id, entity, title, solicitation_number, agency, response_deadline
- estimated_value, status, fit_score, proposal_lead

**Examples:**
```bash
# All active bids
curl "https://mog-tracker.vercel.app/api/webhooks/active-bids" \
  -H "Authorization: Bearer YOUR_SECRET"

# Exousia only, due within 7 days
curl "https://mog-tracker.vercel.app/api/webhooks/active-bids?entity=exousia&days=7" \
  -H "Authorization: Bearer YOUR_SECRET"

# VitalX, due within 30 days
curl "https://mog-tracker.vercel.app/api/webhooks/active-bids?entity=vitalx&days=30" \
  -H "Authorization: Bearer YOUR_SECRET"
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET or successful update) |
| 201 | Created (new lead successfully created) |
| 400 | Bad Request (invalid input or query params) |
| 401 | Unauthorized (missing/invalid auth) |
| 404 | Not Found (lead doesn't exist for update) |
| 500 | Internal Server Error (database issue) |

## Make.com Example

Create a lead when SAM.gov has a new opportunity:

```
Trigger: SAM.gov Feed Updated
Filter: NAICS code in [561720, 561730, ...]
Action: HTTP POST
  URL: https://mog-tracker.vercel.app/api/webhooks/new-lead
  Headers:
    Authorization: Bearer {{webhook_secret}}
    Content-Type: application/json
  Body:
    {
      "entity": "exousia",
      "title": {{title}},
      "solicitation_number": {{solicitation_number}},
      "agency": {{agency}},
      "naics_code": {{naics}},
      "estimated_value": {{estimated_amount}},
      "response_deadline": {{deadline}},
      "source": "sam_gov"
    }
Success: Log to Slack / Email notification
```

## Webhook Logs

All calls logged to `webhook_logs` table. Query:

```sql
SELECT endpoint, method, success, response_status, error_message, logged_at
FROM webhook_logs
ORDER BY logged_at DESC
LIMIT 20;
```

## Deployment Checklist

- [ ] Migration 027 applied to Supabase
- [ ] `WEBHOOK_SECRET` set in Vercel (32+ random chars)
- [ ] Code deployed to Vercel (git push)
- [ ] Test new-lead endpoint (201)
- [ ] Test duplicate detection (200 with isDuplicate)
- [ ] Test bad auth (401)
- [ ] Test update-lead endpoint (200)
- [ ] Test active-bids endpoint (200)
- [ ] Make.com scenario configured
- [ ] webhook_logs table has entries

## Key Points

✓ Webhooks bypass auth middleware (routes to `/api/webhooks/*`)
✓ Fit score auto-calculated on new leads
✓ Fit score auto-recalculated on updates to NAICS/set-aside/value/deadline
✓ Duplicates detected by solicitation_number + entity
✓ All inputs sanitized (HTML strip, trim, 5000 char limit)
✓ All calls logged for audit trail
✓ Source IP tracked for security

## Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

## Success Response Format (new-lead 201)

```json
{
  "success": true,
  "message": "Lead created successfully",
  "leadId": "uuid",
  "lead": { ...full lead object... }
}
```

## Duplicate Response Format (new-lead 200)

```json
{
  "success": true,
  "message": "Lead already exists",
  "leadId": "uuid",
  "isDuplicate": true
}
```

## Success Response Format (update-lead 200)

```json
{
  "success": true,
  "message": "Lead updated successfully",
  "leadId": "uuid",
  "lead": { ...updated lead object... }
}
```

## Success Response Format (active-bids 200)

```json
{
  "success": true,
  "count": 5,
  "deadlineDaysWindow": 14,
  "entity": "exousia",
  "bids": [
    {
      "id": "uuid",
      "entity": "exousia",
      "title": "...",
      "solicitation_number": "...",
      "agency": "...",
      "response_deadline": "2025-04-15T23:59:00Z",
      "estimated_value": 100000,
      "status": "active_bid",
      "fit_score": 78,
      "proposal_lead": "John Smith"
    }
  ]
}
```

## Documentation

Full docs: `/docs/WEBHOOKS.md`
Setup guide: `/WEBHOOK_SETUP.md`
