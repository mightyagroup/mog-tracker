# Notification System - Quick Reference Card

## File Locations

### Database
```
supabase/migrations/031_notifications.sql
```

### API Routes
```
src/app/api/notifications/
├── route.ts                    # GET/POST
├── [id]/route.ts               # PATCH/DELETE
├── mark-all-read/route.ts      # POST
└── preferences/route.ts        # GET/PUT

src/app/api/cron/
├── deadline-check/route.ts     # GET (4x daily)
└── daily-digest/route.ts       # GET (1x daily)
```

### Components
```
src/components/notifications/
├── NotificationBell.tsx        # Bell icon + badge
├── NotificationPanel.tsx       # Popup panel
└── NotificationPreferences.tsx # Settings form
```

### Pages
```
src/app/settings/notifications/page.tsx
```

### Utilities
```
src/lib/notifications.ts        # Helper functions
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications` | GET | Fetch notifications (paginated) |
| `/api/notifications` | POST | Create notification |
| `/api/notifications/[id]` | PATCH | Update notification |
| `/api/notifications/[id]` | DELETE | Delete notification |
| `/api/notifications/mark-all-read` | POST | Mark all as read |
| `/api/notifications/preferences` | GET | Get user preferences |
| `/api/notifications/preferences` | PUT | Update preferences |
| `/api/cron/deadline-check` | GET | Check deadlines (4x daily) |
| `/api/cron/daily-digest` | GET | Create digest (1x daily) |

## Notification Types

| Type | Icon | When | Example |
|------|------|------|---------|
| deadline_reminder | ⏰ | Before deadline | "Facilities RFQ due in 3 days" |
| new_lead | ✨ | Lead added | "New opportunity: Cybersecurity Consulting" |
| status_change | 🔄 | Status updated | "Lead moved to active_bid" |
| amendment_detected | 📝 | Amendment found | "Amendment to existing RFQ" |
| daily_digest | 📊 | Every morning | "Daily summary: 2 new leads, 3 deadlines" |
| system | ℹ️ | Important alerts | "System maintenance notice" |

## Quick Integration Examples

### Notify on new lead
```typescript
import { notifyNewLead } from '@/lib/notifications'

await notifyNewLead(leadId, title, entity, solicitation)
```

### Notify on status change
```typescript
import { notifyStatusChange } from '@/lib/notifications'

await notifyStatusChange(leadId, title, entity, oldStatus, newStatus)
```

### Create custom notification
```typescript
import { createNotification } from '@/lib/notifications'

await createNotification(userId, {
  notificationType: 'system',
  title: 'Alert',
  message: 'Your message here',
  link: '/path/to/item'
})
```

## Environment Variables

**Required for cron jobs:**
```
CRON_SECRET=<random_hex_string>
```

**Generate:**
```bash
openssl rand -hex 32
```

**Add to Vercel:**
```bash
npx vercel env add CRON_SECRET
```

## Cron Job Schedules

| Job | Schedule | Timezone | Time EST |
|-----|----------|----------|----------|
| deadline-check | `0 9,12,15,18 * * *` | UTC | 4 AM, 7 AM, 10 AM, 1 PM |
| daily-digest | `0 11 * * *` | UTC | 7 AM |

## Database Schema Summary

### notifications
- `id`, `user_id`, `entity`, `notification_type`
- `title`, `message`, `link`
- `is_read`, `gov_lead_id`, `commercial_lead_id`
- `created_at`, `updated_at`

### notification_preferences
- `id`, `user_id`
- `deadline_reminders`, `deadline_days_before`
- `new_leads`, `status_changes`, `amendment_alerts`, `daily_digest`
- `created_at`, `updated_at`

## RLS Policies

**notifications table:**
- Users can SELECT/UPDATE/DELETE their own notifications
- Service role can INSERT

**notification_preferences table:**
- Users can SELECT/UPDATE their own preferences
- Service role can INSERT

## Testing Commands

### Create test notification
```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "system",
    "title": "Test",
    "message": "Test notification"
  }'
```

### Mark as read
```bash
curl -X PATCH http://localhost:3000/api/notifications/[id] \
  -H "Content-Type: application/json" \
  -d '{"is_read": true}'
```

### Mark all as read
```bash
curl -X POST http://localhost:3000/api/notifications/mark-all-read
```

### Get preferences
```bash
curl http://localhost:3000/api/notifications/preferences
```

### Update preferences
```bash
curl -X PUT http://localhost:3000/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "deadline_reminders": true,
    "deadline_days_before": [1, 3, 7],
    "new_leads": true
  }'
```

## Deployment Checklist

- [ ] Run migration in Supabase
- [ ] Add CRON_SECRET to Vercel
- [ ] `git push` to GitHub
- [ ] Verify Vercel deployment
- [ ] Test bell icon appears
- [ ] Test settings page loads
- [ ] Test create notification manually
- [ ] Monitor cron job logs

## Documentation Files

| File | Purpose |
|------|---------|
| `NOTIFICATIONS.md` | Complete API documentation |
| `NOTIFICATION_SETUP.md` | Deployment guide |
| `NOTIFICATION_SYSTEM_SUMMARY.md` | Architecture overview |
| `NOTIFICATION_IMPLEMENTATION_CHECKLIST.md` | Implementation phases |
| `NOTIFICATION_INTEGRATION_GUIDE.md` | How to integrate into features |
| `NOTIFICATION_QUICK_REFERENCE.md` | This file |

## TypeScript Types

```typescript
type NotificationType =
  | 'deadline_reminder'
  | 'new_lead'
  | 'status_change'
  | 'amendment_detected'
  | 'daily_digest'
  | 'system'

interface Notification {
  id: string
  user_id: string
  entity?: EntityType
  notification_type: NotificationType
  title: string
  message: string
  link?: string
  is_read: boolean
  gov_lead_id?: string
  commercial_lead_id?: string
  created_at: string
  updated_at: string
}

interface NotificationPreference {
  id: string
  user_id: string
  deadline_reminders: boolean
  deadline_days_before: number[]
  new_leads: boolean
  status_changes: boolean
  amendment_alerts: boolean
  daily_digest: boolean
  created_at: string
  updated_at: string
}
```

## Component Props

### NotificationBell
```typescript
// No props - uses hooks internally
// Fetches notifications from API
// Displays unread count badge
```

### NotificationPanel
```typescript
interface NotificationPanelProps {
  notifications: Notification[]
  isLoading: boolean
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onMarkAllAsRead: () => void
}
```

### NotificationPreferences
```typescript
// No props - fetches and manages its own state
// Displays toggle switches and settings
// Saves to API on button click
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Bell icon missing | Import NotificationBell in Sidebar |
| No notifications | Check RLS policies, check preferences |
| Cron not running | Set CRON_SECRET in Vercel env |
| Type errors | Verify imports, check file paths |
| Preferences not saving | Check UPDATE policy on preferences table |
| Duplicate notifications | Cron has dedup for 24 hours |

## Performance Notes

- **Pagination**: 20 notifications per page (default)
- **Polling**: 30 seconds between unread count checks
- **Indexes**: On user_id, created_at, lead IDs
- **Cron Duration**: 5-30 seconds depending on data volume
- **Database Size**: ~1KB per notification

## Security Checklist

- [x] RLS policies enforce user isolation
- [x] No external API keys needed
- [x] CRON_SECRET required for cron endpoints
- [x] All endpoints require authentication
- [x] Service role key never exposed to client
- [x] No sensitive data in notification messages

## Mobile Responsiveness

- Bell icon and badge: ✓ Mobile-friendly
- Notification panel: ✓ Full-screen on mobile
- Settings form: ✓ Responsive layout
- Touch targets: ✓ 44px minimum

## Browser Support

- Chrome/Edge: ✓ Full support
- Firefox: ✓ Full support
- Safari: ✓ Full support
- Mobile browsers: ✓ Full support

## Next Integration Points

When adding new features, integrate notifications:

1. **New lead creation**: Call `notifyNewLead()`
2. **Lead status update**: Call `notifyStatusChange()`
3. **Amendment detection**: Call `createNotification()` with 'amendment_detected'
4. **User actions**: Create custom notifications as needed

See `NOTIFICATION_INTEGRATION_GUIDE.md` for detailed examples.

## Support

- **Questions?** See the NOTIFICATIONS.md documentation
- **Setup issues?** See NOTIFICATION_SETUP.md
- **Want to integrate?** See NOTIFICATION_INTEGRATION_GUIDE.md
- **Implementation flow?** See NOTIFICATION_IMPLEMENTATION_CHECKLIST.md
- **System overview?** See NOTIFICATION_SYSTEM_SUMMARY.md
