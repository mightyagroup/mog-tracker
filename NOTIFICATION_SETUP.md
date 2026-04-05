# Notification System Setup Guide

## Step-by-Step Implementation

### 1. Run Database Migration

The notification system requires a new database migration file: `supabase/migrations/031_notifications.sql`

This migration creates:
- `notification_type` enum with values: deadline_reminder, new_lead, status_change, amendment_detected, daily_digest, system
- `notifications` table with RLS policies
- `notification_preferences` table with RLS policies
- `get_or_create_notification_preferences()` helper function

**To apply the migration:**

Option A: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new
2. Copy the entire contents of `supabase/migrations/031_notifications.sql`
3. Paste into the SQL editor
4. Click "Run"
5. Verify success in the Supabase dashboard (check Table Editor for new tables)

Option B: Using CLI (if Supabase CLI is configured)
```bash
supabase db push
```

### 2. Environment Variables

Ensure these are set in Vercel (for cron jobs to work):
- `NEXT_PUBLIC_SUPABASE_URL` - Already set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Already set
- `SUPABASE_SERVICE_ROLE_KEY` - Already set
- `CRON_SECRET` - Set to a secure random string (used to verify cron job calls)

To add `CRON_SECRET`:
```bash
# Generate a random secret
openssl rand -hex 32

# Add to Vercel
npx vercel env add CRON_SECRET

# Paste the generated secret when prompted
```

Then update `vercel.json` to include the cron header:
```json
{
  "crons": [
    {
      "path": "/api/cron/sam-feed",
      "schedule": "0 11 * * *"
    },
    {
      "path": "/api/cron/deadline-check",
      "schedule": "0 9,12,15,18 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 11 * * *"
    }
  ]
}
```

### 3. Verify Component Installation

Check that these files exist:
```
src/components/notifications/
  ├── NotificationBell.tsx
  ├── NotificationPanel.tsx
  └── NotificationPreferences.tsx

src/app/api/notifications/
  ├── route.ts
  ├── [id]/route.ts
  ├── mark-all-read/route.ts
  └── preferences/route.ts

src/app/api/cron/
  ├── deadline-check/route.ts
  └── daily-digest/route.ts

src/app/settings/notifications/
  └── page.tsx

src/lib/
  ├── notifications.ts
  └── types.ts (updated)
```

### 4. Verify Sidebar Integration

Check that `src/components/layout/Sidebar.tsx` includes:
```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell'

// In the header section, add the bell to the right of the logo:
<NotificationBell />
```

### 5. Build and Test

```bash
# Build the app to check for TypeScript errors
npm run build

# Start the development server
npm run dev

# Test locally:
# 1. Navigate to http://localhost:3000
# 2. Log in with your credentials
# 3. You should see a bell icon in the top left of the sidebar
# 4. Click the bell to open the notification panel
# 5. The panel should show "No notifications yet" initially
```

### 6. Test Notification Creation (Local)

Create a test notification manually:

```bash
# From your terminal
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "system",
    "title": "Test Notification",
    "message": "This is a test notification"
  }'
```

Refresh the browser - you should see the notification appear in the panel.

### 7. Test Notification Settings

1. Click the bell icon to open notifications
2. Click "Settings" (gear icon)
3. You should see the settings page with toggles for each notification type
4. Toggle some settings and click "Save Preferences"
5. Verify success message appears
6. Refresh and verify the settings persisted

### 8. Deploy to Vercel

```bash
git add -A
git commit -m "Add comprehensive notification system

- Database tables for notifications and preferences
- API routes for notification management
- Cron jobs for deadline checks and daily digests
- UI components: bell, panel, and preferences
- Notification utility functions
- Full documentation and setup guide"

git push origin main
```

Once pushed, Vercel will automatically deploy.

### 9. Verify Cron Jobs (After Deployment)

In Vercel dashboard:
1. Go to your project
2. Navigate to "Deployments"
3. Click on the latest deployment
4. Go to "Cron" tab
5. You should see three cron jobs listed:
   - `/api/cron/sam-feed` - 11 AM UTC
   - `/api/cron/deadline-check` - 9 AM, 12 PM, 3 PM, 6 PM UTC
   - `/api/cron/daily-digest` - 11 AM UTC

Note: Cron jobs may show as "pending" until the next scheduled run.

### 10. Test with Real Data

To test the deadline check cron:

1. Add a test government lead with a response deadline 3 days from now
2. Set your notification preferences to include 3-day reminders
3. Wait for the next scheduled cron run (or manually trigger if you have access)
4. Check your notifications panel - you should see a deadline reminder

To manually test crons (if you know the CRON_SECRET):

```bash
curl -X GET https://yourdomain.com/api/cron/deadline-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Integration with Existing Features

### Adding to Lead Creation

When a lead is created (in an API route that adds a lead):

```typescript
import { notifyNewLead } from '@/lib/notifications'

// After successfully creating the lead:
await notifyNewLead(
  leadData.id,
  leadData.title,
  leadData.entity,
  leadData.solicitation_number
)
```

### Adding to Lead Status Updates

When a lead status changes:

```typescript
import { notifyStatusChange } from '@/lib/notifications'

// After successfully updating the lead:
await notifyStatusChange(
  leadData.id,
  leadData.title,
  leadData.entity,
  oldStatus,
  newStatus
)
```

### Integration Points in SAM Feed

In `src/app/api/cron/sam-feed/route.ts`, after inserting new leads:

```typescript
import { notifyNewLead } from '@/lib/notifications'

// After successfully inserting a new lead:
if (insertedLead) {
  await notifyNewLead(
    insertedLead.id,
    insertedLead.title,
    insertedLead.entity,
    insertedLead.solicitation_number
  )
}
```

## Troubleshooting Setup Issues

### Issue: "Cannot find module 'notifications'" when building

**Solution:** Verify the path is correct in imports:
```typescript
import { createNotification } from '@/lib/notifications' // ✓ Correct
import { createNotification } from '@/lib/notification' // ✗ Wrong
```

### Issue: Notification bell doesn't appear in sidebar

**Cause:** NotificationBell component not imported in Sidebar.tsx

**Solution:** Check that Sidebar.tsx has:
```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell'
```

And that it's rendered in the header.

### Issue: "CRON_SECRET required" when testing crons

**Solution:** Ensure the environment variable is set:
```bash
npx vercel env pull # Pulls environment variables locally
npx vercel env add CRON_SECRET # Adds the variable to Vercel
```

### Issue: RLS prevents reading/updating notifications

**Solution:** Check that RLS policies are enabled. In Supabase dashboard:
1. Go to "Authentication" > "Policies"
2. Verify policies for `notifications` and `notification_preferences` tables
3. Each should have SELECT, UPDATE, DELETE policies for authenticated users
4. Service role should be able to INSERT

### Issue: Notifications table is empty despite crons running

**Check:**
1. Navigate to `/api/cron/deadline-check` manually to see error messages
2. Check Vercel logs for cron job execution
3. Verify that leads exist with future response_deadline dates
4. Verify that notification_preferences records exist for users

## Performance Considerations

- **Pagination:** Notifications are paginated (20 per page by default) to keep page load fast
- **Polling:** Bell icon polls every 30 seconds for new notifications - adjust interval if needed in NotificationBell.tsx
- **Indexes:** Migration includes indexes on user_id, created_at, and lead IDs for fast queries
- **Cron Frequency:** Deadline check runs 4 times daily (adjust in vercel.json if needed)

## Security Checklist

- [x] RLS policies prevent users from seeing other users' notifications
- [x] Service role key only stored in Vercel, never committed
- [x] Cron jobs verified with CRON_SECRET header
- [x] API routes check authentication before returning user data
- [x] No sensitive data stored in notification messages
- [x] Notification links use relative paths (no external redirects)

## Next Steps

1. After setup, monitor the first few notification cycles for any issues
2. Adjust cron schedules based on user feedback
3. Customize notification messages to match MOG branding
4. Consider adding email export feature in future phases
5. Monitor database growth - consider archiving old notifications periodically

## Support & Maintenance

### Regular Maintenance Tasks

- **Weekly:** Check Vercel logs for any cron errors
- **Monthly:** Review notification creation patterns in database
- **Quarterly:** Audit RLS policies and access patterns

### Database Cleanup (Optional)

After a few months, you may want to archive old notifications:

```sql
-- Archive notifications older than 90 days
DELETE FROM notifications
WHERE created_at < now() - interval '90 days'
AND is_read = true;
```

### Scaling Considerations

If notification volume becomes high:
- Consider batching deadline checks (query leads in chunks)
- Implement notification cleanup jobs
- Consider Redis caching for notification counts
- Scale read frequency or implement WebSocket for real-time updates
