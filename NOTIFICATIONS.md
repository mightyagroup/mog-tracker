# MOG Tracker Notification System

This document describes the in-app notification system for the MOG Tracker application.

## Overview

The notification system provides real-time, in-app notifications for:

- **Deadline Reminders**: Customizable alerts when bids are approaching their deadlines
- **New Lead Notifications**: Alerts when new opportunities are added
- **Status Changes**: Notifications when a lead's status is updated
- **Amendment Detected**: Alerts when amendments are found to existing solicitations
- **Daily Digest**: A summary of activity from the previous day
- **System Notifications**: Important system-level alerts

## Database Schema

### Tables

#### `notifications`
Stores individual notifications for users.

Fields:
- `id` (uuid): Primary key
- `user_id` (uuid): Reference to auth.users
- `entity` (entity_type): Nullable reference to MOG entity (exousia, vitalx, ironhouse)
- `notification_type` (notification_type enum): Type of notification
- `title` (text): Short title displayed in the notification panel
- `message` (text): Detailed message content
- `link` (text): Optional URL within the app to navigate to when clicked
- `is_read` (boolean): Whether the notification has been read
- `gov_lead_id` (uuid): Optional reference to a government lead
- `commercial_lead_id` (uuid): Optional reference to a commercial lead
- `created_at` (timestamptz): Timestamp when notification was created
- `updated_at` (timestamptz): Timestamp of last update

#### `notification_preferences`
Per-user notification settings and preferences.

Fields:
- `id` (uuid): Primary key
- `user_id` (uuid): Reference to auth.users (unique)
- `deadline_reminders` (boolean): Enable/disable deadline reminders (default: true)
- `deadline_days_before` (int[]): Array of day thresholds for reminders (default: {7, 3, 1})
- `new_leads` (boolean): Enable/disable new lead notifications (default: true)
- `status_changes` (boolean): Enable/disable status change notifications (default: true)
- `amendment_alerts` (boolean): Enable/disable amendment alerts (default: true)
- `daily_digest` (boolean): Enable/disable daily digest (default: true)
- `created_at` (timestamptz): Timestamp of creation
- `updated_at` (timestamptz): Timestamp of last update

## API Routes

### GET/POST `/api/notifications`
Fetch or create notifications for the current user.

**GET Parameters:**
- `page` (number, default: 0): Pagination page number
- `limit` (number, default: 20): Number of notifications per page

**GET Response:**
```json
{
  "notifications": [...],
  "total": 42,
  "page": 0,
  "limit": 20
}
```

**POST Body:**
```json
{
  "notification_type": "status_change",
  "title": "Lead Updated",
  "message": "Your lead status changed",
  "link": "/exousia?lead=123",
  "entity": "exousia",
  "gov_lead_id": "123",
  "commercial_lead_id": null
}
```

### PATCH/DELETE `/api/notifications/[id]`
Update or delete a specific notification.

**PATCH Body:**
```json
{
  "is_read": true
}
```

### POST `/api/notifications/mark-all-read`
Mark all unread notifications as read for the current user.

### GET/PUT `/api/notifications/preferences`
Fetch or update notification preferences.

**PUT Body:**
```json
{
  "deadline_reminders": true,
  "deadline_days_before": [1, 3, 7],
  "new_leads": true,
  "status_changes": true,
  "amendment_alerts": true,
  "daily_digest": true
}
```

## Cron Jobs

### Deadline Check (`/api/cron/deadline-check`)
**Schedule:** `0 9,12,15,18 * * *` (9 AM, 12 PM, 3 PM, 6 PM UTC)

Checks all government leads for upcoming deadlines and creates notifications based on user preferences. For each user:

1. Fetches their notification preferences
2. Gets all leads with response deadlines in the future
3. For each lead, checks if the days until deadline matches the user's configured reminder days
4. Creates a notification if a match is found and no duplicate exists

Deduplication prevents duplicate notifications for the same lead within 24 hours.

### Daily Digest (`/api/cron/daily-digest`)
**Schedule:** `0 11 * * *` (11 AM UTC = 7 AM EST)

Creates a daily summary notification for each user containing:

- Count of new leads added in the past 24 hours
- Count of deadlines coming up in the next 7 days
- Count of lead status changes in the past 24 hours

Only creates digest if there's at least one summary item to report.

## Components

### NotificationBell
Bell icon in the sidebar that displays unread notification count. Clicking opens the notification panel.

**Location:** `src/components/notifications/NotificationBell.tsx`

Features:
- Real-time unread count
- 30-second polling for new notifications
- Click-to-open panel

### NotificationPanel
Slide-over panel showing all notifications grouped by date.

**Location:** `src/components/notifications/NotificationPanel.tsx`

Features:
- Grouped by date (newest first)
- Click notification to navigate to linked item
- "Mark all as read" button
- Delete individual notifications
- Link to notification settings

### NotificationPreferences
Settings form for managing notification preferences.

**Location:** `src/components/notifications/NotificationPreferences.tsx`

Features:
- Toggle for each notification type
- Multi-select for deadline reminder days
- Save/load preferences
- Real-time validation feedback

## Utility Functions

### `createNotification(userId, options)`
Server-side function to create a notification for a user.

```typescript
import { createNotification } from '@/lib/notifications'

await createNotification(userId, {
  notificationType: 'new_lead',
  title: 'New Opportunity',
  message: 'A new lead has been added',
  link: '/exousia?lead=123',
  entity: 'exousia',
  govLeadId: '123',
})
```

### `notifyNewLead(leadId, leadTitle, entity, solicitation)`
Notify all users about a newly added lead.

```typescript
import { notifyNewLead } from '@/lib/notifications'

await notifyNewLead(leadId, 'Facilities Support RFQ', 'exousia', 'RFQ-2025-001')
```

### `notifyStatusChange(leadId, leadTitle, entity, oldStatus, newStatus)`
Notify all users about a lead status change.

```typescript
import { notifyStatusChange } from '@/lib/notifications'

await notifyStatusChange(
  leadId,
  'Cybersecurity Consulting',
  'exousia',
  'new',
  'active_bid'
)
```

## Integration Points

To integrate notifications into existing features:

### When Adding a New Lead
Call `notifyNewLead()` after successfully inserting a lead into the database.

### When Changing Lead Status
Call `notifyStatusChange()` when updating a lead's status.

### SAM.gov Feed
The deadline check cron automatically monitors all leads. When the SAM feed adds new leads, they'll be picked up by the next deadline-check cron run.

## User Experience Flow

1. **Initial Setup**: When a user logs in, notification preferences are automatically created with defaults
2. **Viewing Notifications**: User clicks the bell icon in the sidebar to open the panel
3. **Reading Notifications**: Clicking a notification marks it as read and navigates to the related item
4. **Managing Preferences**: User clicks "Settings" in the notification panel to customize preferences
5. **Cron Jobs**: Run automatically at scheduled times to create deadline reminders and daily digests

## Security & Privacy

- **Row-Level Security (RLS)**: Users can only view/modify their own notifications and preferences
- **Service Role Required**: Notification creation via cron jobs uses the service role key
- **No External Dependencies**: All notifications stored in Supabase, no external email/SMS providers
- **User Control**: Users can disable any notification type and customize reminder frequency

## Future Enhancements

- Email digest export option
- Real-time WebSocket notifications
- Team/group notifications
- Email integration (when email provider is configured)
- Notification delivery preferences (in-app only, email, SMS)
- Smart notification batching to prevent notification fatigue
- Notification categories/filtering in the panel
- Notification history/archive
- Notification templates for custom notifications

## Troubleshooting

### Notifications not appearing
1. Check that RLS policies allow the user to read notifications
2. Verify the user ID is correctly set in the notification record
3. Check browser console for fetch errors
4. Ensure notification preferences aren't disabling the type

### Cron jobs not running
1. Verify `vercel.json` has the correct routes and schedules
2. Check that `CRON_SECRET` environment variable is set in Vercel
3. Look at Vercel logs for any runtime errors
4. Ensure the service role key has permissions to query users and create notifications

### Preferences not saving
1. Verify the user is authenticated
2. Check RLS policies on `notification_preferences` table
3. Ensure the notification preferences record exists for the user
4. Check network tab for API errors
