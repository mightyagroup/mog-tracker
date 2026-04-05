# Notification System - Implementation Checklist

## Phase 1: Pre-Deployment Verification ✓

### Database Migration
- [x] Created `supabase/migrations/031_notifications.sql`
- [x] Includes `notification_type` enum with all 6 types
- [x] Creates `notifications` table with all required fields
- [x] Creates `notification_preferences` table with user settings
- [x] Applies RLS policies for user isolation
- [x] Creates `get_or_create_notification_preferences()` function
- [x] Includes indexes for performance optimization

### API Routes
- [x] Created `/api/notifications/route.ts` - GET/POST notifications
- [x] Created `/api/notifications/[id]/route.ts` - PATCH/DELETE individual notifications
- [x] Created `/api/notifications/mark-all-read/route.ts` - Mark all as read
- [x] Created `/api/notifications/preferences/route.ts` - GET/PUT preferences
- [x] Created `/api/cron/deadline-check/route.ts` - Deadline check cron
- [x] Created `/api/cron/daily-digest/route.ts` - Daily digest cron
- [x] All routes properly handle authentication and authorization
- [x] All routes return proper HTTP status codes and error messages

### UI Components
- [x] Created `NotificationBell.tsx` - Bell icon with unread count
- [x] Created `NotificationPanel.tsx` - Notification list and grouping
- [x] Created `NotificationPreferences.tsx` - Settings form
- [x] Created `/app/settings/notifications/page.tsx` - Settings page
- [x] Updated `Sidebar.tsx` to include NotificationBell
- [x] All components properly styled with MOG color scheme
- [x] All components are responsive (mobile-friendly)

### Library Files
- [x] Updated `src/lib/types.ts` with `Notification` and `NotificationPreference` types
- [x] Created `src/lib/notifications.ts` with helper functions:
  - [x] `createNotification()` - Base notification creation
  - [x] `notifyNewLead()` - New lead notifications
  - [x] `notifyStatusChange()` - Status change notifications
- [x] All utility functions properly typed with TypeScript

### Configuration
- [x] Updated `vercel.json` to include new cron jobs:
  - [x] deadline-check: `0 9,12,15,18 * * *`
  - [x] daily-digest: `0 11 * * *`

### Documentation
- [x] Created `NOTIFICATIONS.md` - Full API and component documentation
- [x] Created `NOTIFICATION_SETUP.md` - Step-by-step deployment guide
- [x] Created `NOTIFICATION_SYSTEM_SUMMARY.md` - High-level overview
- [x] Created `NOTIFICATION_IMPLEMENTATION_CHECKLIST.md` - This checklist

### TypeScript Verification
- [x] Ran `npx tsc --noEmit` - No notification-related errors
- [x] All type definitions are complete and correct
- [x] No `any` types used (fully typed)
- [x] All imports use correct paths

## Phase 2: Pre-Production Setup

### Environment Variables
- [ ] Generate CRON_SECRET: `openssl rand -hex 32`
- [ ] Add CRON_SECRET to Vercel: `npx vercel env add CRON_SECRET`
- [ ] Verify other env vars are set:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY

### Database Deployment
- [ ] Copy contents of `supabase/migrations/031_notifications.sql`
- [ ] Go to https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new
- [ ] Paste and run the SQL
- [ ] Verify tables exist in Supabase Table Editor:
  - [ ] notifications table
  - [ ] notification_preferences table
- [ ] Verify RLS policies are enabled on both tables
- [ ] Verify function `get_or_create_notification_preferences` exists

### Code Review
- [ ] Review `src/components/notifications/NotificationBell.tsx`
- [ ] Review `src/components/notifications/NotificationPanel.tsx`
- [ ] Review `src/components/notifications/NotificationPreferences.tsx`
- [ ] Review `/api/notifications/route.ts` for security
- [ ] Review `/api/notifications/[id]/route.ts` for ownership validation
- [ ] Review `/api/cron/deadline-check/route.ts` for correctness
- [ ] Review `/api/cron/daily-digest/route.ts` for correctness
- [ ] Review `src/lib/notifications.ts` for error handling

## Phase 3: Local Testing

### Build and Run
- [ ] Run `npm run build` - Should succeed (only pre-existing docx errors)
- [ ] Run `npm run dev` - Dev server starts without errors
- [ ] Navigate to http://localhost:3000 - Login page loads
- [ ] Log in with test credentials - Dashboard loads successfully

### UI Testing
- [ ] Bell icon appears in sidebar header
- [ ] Bell has red unread count badge (starts at 0)
- [ ] Click bell opens notification panel from right
- [ ] Panel shows "No notifications yet" message
- [ ] Click settings gear icon - Navigates to settings page
- [ ] Settings page loads with all toggle switches
- [ ] Close button (X) closes the notification panel

### API Testing
- [ ] Test creating a notification with curl:
  ```bash
  curl -X POST http://localhost:3000/api/notifications \
    -H "Content-Type: application/json" \
    -d '{"notification_type":"system","title":"Test","message":"Test message"}'
  ```
- [ ] Bell unread count updates to 1
- [ ] Notification appears in panel with correct title and message
- [ ] Click notification - marks as read
- [ ] Unread count updates back to 0
- [ ] Delete button removes notification

### Preferences Testing
- [ ] On settings page, toggle "New Lead Notifications"
- [ ] Click "Save Preferences" button
- [ ] Success message appears
- [ ] Refresh page - Preference is still unchecked (persisted)
- [ ] Toggle "Deadline Reminders" on
- [ ] Check multiple day options (1, 3, 7)
- [ ] Click save - All changes persist

### Notification Panel Testing
- [ ] Create multiple notifications
- [ ] Panel groups by date
- [ ] Most recent date appears first
- [ ] Can scroll through notifications
- [ ] Hover over notification - delete button appears
- [ ] Click delete - notification is removed
- [ ] "Mark all as read" button works
- [ ] Unread badge disappears after mark all as read

## Phase 4: Pre-Deployment Checks

### File Structure Verification
- [ ] All required files exist:
  ```
  src/components/notifications/NotificationBell.tsx
  src/components/notifications/NotificationPanel.tsx
  src/components/notifications/NotificationPreferences.tsx
  src/app/api/notifications/route.ts
  src/app/api/notifications/[id]/route.ts
  src/app/api/notifications/mark-all-read/route.ts
  src/app/api/notifications/preferences/route.ts
  src/app/api/cron/deadline-check/route.ts
  src/app/api/cron/daily-digest/route.ts
  src/app/settings/notifications/page.tsx
  src/lib/notifications.ts
  supabase/migrations/031_notifications.sql
  ```

### Git Status Check
- [ ] All new files are staged: `git status`
- [ ] No uncommitted changes remain
- [ ] `.env.local` is in `.gitignore` (verify: `git check-ignore .env.local`)

### Configuration Verification
- [ ] `vercel.json` includes both notification crons
- [ ] Cron schedules are correct (deadline-check: 4x daily, daily-digest: once daily)
- [ ] `src/components/layout/Sidebar.tsx` imports NotificationBell
- [ ] `src/lib/types.ts` includes all notification types

## Phase 5: Deployment

### Commit and Push
- [ ] Run: `git add -A`
- [ ] Run: `git commit -m "Add comprehensive notification system with in-app panel, preferences, and scheduled crons"`
- [ ] Run: `git push origin main`

### Monitor Deployment
- [ ] Go to Vercel dashboard
- [ ] Watch deployment progress
- [ ] All build steps complete successfully
- [ ] Deployment preview URL is generated
- [ ] Click preview URL to test production build

### Verify Production
- [ ] Log in at production URL
- [ ] Bell icon appears in sidebar
- [ ] Click bell to open panel
- [ ] Navigate to `/settings/notifications` directly
- [ ] Notification preferences page loads
- [ ] Test creating a notification via API
- [ ] Verify cron jobs appear in Vercel dashboard:
  - [ ] `/api/cron/deadline-check`
  - [ ] `/api/cron/daily-digest`

## Phase 6: Post-Deployment

### Cron Job Verification
- [ ] Wait for next scheduled deadline-check run (should execute 4x daily)
- [ ] Check Vercel logs for execution results
- [ ] Verify no error messages
- [ ] Create a test lead with deadline 3 days from now
- [ ] Verify notification is created after deadline-check runs
- [ ] Check Vercel logs for daily-digest cron execution

### Database Monitoring
- [ ] Connect to production Supabase
- [ ] Check notifications table for records
- [ ] Verify RLS policies are working (can only see own notifications)
- [ ] Check notification_preferences table for user records

### User Testing (with Ella)
- [ ] Show Ella the bell icon in sidebar
- [ ] Demonstrate opening notification panel
- [ ] Show notification settings page
- [ ] Verify her preference changes save correctly
- [ ] Ask for any UX feedback or changes

## Phase 7: Maintenance Tasks

### Week 1 Post-Deployment
- [ ] Monitor Vercel logs for any errors
- [ ] Watch for notification creation patterns
- [ ] Check database growth
- [ ] Collect user feedback on notification experience
- [ ] Fix any reported issues

### Monthly Maintenance
- [ ] Review notification volume in database
- [ ] Check cron job execution times
- [ ] Monitor for any RLS policy issues
- [ ] Plan any UI/UX improvements

### Integration with Existing Features
- [ ] When adding new lead feature is added, integrate `notifyNewLead()`
- [ ] When lead status update is added, integrate `notifyStatusChange()`
- [ ] When SAM.gov feed is updated, integrate notification creation for new leads

## Known Limitations & Future Work

### Current Version (v1.0)
- [x] In-app notifications only (no email/SMS)
- [x] Polling-based updates (not real-time WebSocket)
- [x] No notification templates (hardcoded messages)
- [x] No notification history/archive

### Planned for Future Phases
- [ ] Email digest export option
- [ ] Real-time WebSocket notifications
- [ ] Customizable notification templates
- [ ] Notification history and search
- [ ] Team/group notifications
- [ ] Smart batching to prevent fatigue
- [ ] Integration with Slack/Teams
- [ ] Mobile push notifications

## Sign-off

- [ ] **Developer**: All code reviewed and tested locally
- [ ] **QA**: All functionality verified in production
- [ ] **Product Owner**: All requirements met and approved

### Reviewer Notes:
```
Date: ___________
Reviewed by: ___________
Status: [APPROVED / NEEDS CHANGES / BLOCKED]
Comments: ___________
```

## Quick Reference Links

- **Supabase Project**: https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob
- **Vercel Project**: https://vercel.com/mightyagroup/mog-tracker
- **GitHub Repo**: https://github.com/mightyagroup/mog-tracker
- **Documentation**: See `NOTIFICATIONS.md`
- **Setup Guide**: See `NOTIFICATION_SETUP.md`
