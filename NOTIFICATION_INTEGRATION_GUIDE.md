# Notification System - Integration Guide

This guide shows how to integrate the notification system into existing features that create or update leads.

## Quick Start

### 1. Notify when a new lead is added

```typescript
import { notifyNewLead } from '@/lib/notifications'

// After successfully inserting a lead:
const newLead = await supabase
  .from('gov_leads')
  .insert([leadData])
  .select()
  .single()

if (newLead.data) {
  // Notify all users about the new lead
  await notifyNewLead(
    newLead.data.id,
    newLead.data.title,
    newLead.data.entity,
    newLead.data.solicitation_number
  )
}
```

### 2. Notify when a lead status changes

```typescript
import { notifyStatusChange } from '@/lib/notifications'

// Before updating the lead, capture the old status:
const oldStatus = existingLead.status

// Update the lead:
const updated = await supabase
  .from('gov_leads')
  .update({ status: newStatus })
  .eq('id', leadId)
  .select()
  .single()

if (updated.data) {
  // Notify all users about the status change
  await notifyStatusChange(
    updated.data.id,
    updated.data.title,
    updated.data.entity,
    oldStatus,
    newStatus
  )
}
```

### 3. Manual notification creation (for custom events)

```typescript
import { createNotification } from '@/lib/notifications'

// Get all users
const { data: users } = await supabase.auth.admin.listUsers()

// Create notification for each user
for (const user of users.users) {
  await createNotification(user.id, {
    notificationType: 'system',
    title: 'Important Update',
    message: 'This is an important message for all users',
    link: '/exousia', // Optional: where to navigate to
    entity: 'exousia', // Optional: which entity this relates to
  })
}
```

## Integration Points

### SAM.gov Feed (`src/app/api/cron/sam-feed/route.ts`)

**Add this after leads are successfully inserted:**

```typescript
import { notifyNewLead } from '@/lib/notifications'

// In the main loop where leads are inserted:
for (const lead of newLeads) {
  const { data: insertedLead } = await supabase
    .from('gov_leads')
    .insert([...])
    .select()
    .single()

  if (insertedLead) {
    // Notify users about the new opportunity
    await notifyNewLead(
      insertedLead.id,
      insertedLead.title,
      insertedLead.entity,
      insertedLead.solicitation_number
    )
  }
}
```

### Lead Update API Routes

**In any API route that updates a lead status:**

```typescript
import { notifyStatusChange } from '@/lib/notifications'

export async function PUT(request: NextRequest) {
  const { id, status: newStatus } = await request.json()

  // Get the current lead to capture old status
  const { data: currentLead } = await supabase
    .from('gov_leads')
    .select('status, title, entity')
    .eq('id', id)
    .single()

  if (!currentLead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Update the lead
  const { data: updatedLead } = await supabase
    .from('gov_leads')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (updatedLead && currentLead.status !== newStatus) {
    // Notify about status change
    await notifyStatusChange(
      updatedLead.id,
      updatedLead.title,
      updatedLead.entity,
      currentLead.status,
      newStatus
    )
  }

  return NextResponse.json(updatedLead)
}
```

### Commercial Lead Creation

**When creating commercial leads:**

```typescript
import { notifyNewLead } from '@/lib/notifications'

const { data: newCommercialLead } = await supabase
  .from('commercial_leads')
  .insert([commercialLeadData])
  .select()
  .single()

if (newCommercialLead) {
  await notifyNewLead(
    newCommercialLead.id,
    newCommercialLead.organization_name,
    'vitalx', // Commercial leads are VitalX only
    null // Commercial leads don't have solicitation numbers
  )
}
```

## Notification Preference Checks

The helper functions automatically check user preferences before creating notifications. They only notify users who have that notification type enabled.

For example, `notifyNewLead()` only creates notifications for users who have `new_leads: true` in their preferences.

**If you want to bypass preference checks** (for critical alerts), manually iterate through users:

```typescript
import { createNotification } from '@/lib/notifications'

const { data: users } = await supabase.auth.admin.listUsers()

for (const user of users.users) {
  await createNotification(user.id, {
    notificationType: 'system', // System notifications can't be disabled
    title: 'Critical Alert',
    message: 'This is a critical system message',
  })
}
```

## Testing Notifications Locally

### Create a test notification via cURL:

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "notification_type": "new_lead",
    "title": "Test Lead",
    "message": "This is a test notification",
    "entity": "exousia",
    "link": "/exousia"
  }'
```

### Verify notification appears:

1. Open http://localhost:3000
2. Click the bell icon in sidebar
3. You should see the test notification

### Test preferences:

1. Go to `/settings/notifications`
2. Uncheck "New Lead Notifications"
3. Save preferences
4. Create another test notification with type "new_lead"
5. It should NOT appear in the panel (preference is disabled)

## Best Practices

### 1. Always capture old status before updating

```typescript
// ✓ Good - capture before update
const oldStatus = existingLead.status
const updated = await updateLead()
if (oldStatus !== updated.status) {
  await notifyStatusChange(...)
}

// ✗ Bad - no way to know what changed
const updated = await updateLead()
await notifyStatusChange(...) // What was the old status?
```

### 2. Check for duplicates before notifying

```typescript
// ✓ Good - only notify if something actually changed
if (currentLead.status !== newStatus) {
  await notifyStatusChange(...)
}

// ✗ Bad - notify even if nothing changed
await notifyStatusChange(...) // Always notifies regardless
```

### 3. Use appropriate notification types

```typescript
// ✓ Good - correct type for the event
await notifyNewLead() // For new leads
await notifyStatusChange() // For status changes
await createNotification(userId, {notificationType: 'amendment_detected'}) // For amendments

// ✗ Bad - wrong type for the event
await notifyNewLead() // For status changes? Wrong!
await notifyStatusChange() // For amendments? Wrong!
```

### 4. Provide helpful links

```typescript
// ✓ Good - user can click to view the lead
{
  link: `/exousia?lead=${leadId}`, // Navigate directly to lead
}

// ✗ Bad - no way for user to access the lead
{
  // No link provided
}
```

### 5. Handle errors gracefully

```typescript
// ✓ Good - catch and log errors
try {
  await notifyNewLead(...)
} catch (error) {
  console.error('Failed to create notification:', error)
  // Continue processing lead even if notification fails
}

// ✗ Bad - let notification errors break the flow
const result = await notifyNewLead() // Might throw and stop execution
```

## Common Patterns

### Pattern 1: Notify on successful action

```typescript
const { data: lead, error } = await supabase
  .from('gov_leads')
  .insert([leadData])
  .select()
  .single()

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Notify after success
await notifyNewLead(
  lead.id,
  lead.title,
  lead.entity,
  lead.solicitation_number
)

return NextResponse.json(lead)
```

### Pattern 2: Conditionally notify on update

```typescript
const { data: oldLead } = await supabase
  .from('gov_leads')
  .select('status')
  .eq('id', id)
  .single()

const { data: newLead } = await supabase
  .from('gov_leads')
  .update({ ...updates })
  .eq('id', id)
  .select()
  .single()

// Only notify if status actually changed
if (oldLead.status !== newLead.status) {
  await notifyStatusChange(
    newLead.id,
    newLead.title,
    newLead.entity,
    oldLead.status,
    newLead.status
  )
}

return NextResponse.json(newLead)
```

### Pattern 3: Bulk operations with notifications

```typescript
const leadsToAdd = [...]
const results = []

for (const leadData of leadsToAdd) {
  const { data: lead } = await supabase
    .from('gov_leads')
    .insert([leadData])
    .select()
    .single()

  if (lead) {
    results.push(lead)
    // Notify about each new lead
    await notifyNewLead(...)
  }
}

return NextResponse.json({
  success: true,
  count: results.length,
  leads: results,
})
```

## Troubleshooting Integration

### Notifications not appearing after API call

1. **Check RLS**: User must have SELECT permission on notifications table
2. **Check preferences**: User might have that notification type disabled
3. **Check auth**: API endpoint requires authenticated user
4. **Check logs**: Look for error messages in Vercel logs

### Duplicate notifications

1. **Implement idempotency**: Check if notification already exists before creating
2. **Use unique constraints**: Add unique index on (user_id, gov_lead_id, notification_type, created_at)
3. **Deduplicate**: The deadline-check cron already deduplicates within 24 hours

### Notifications appearing for wrong users

1. **Check RLS policies**: Ensure each user can only see their own notifications
2. **Verify user_id**: Make sure user_id is correctly set when creating notification
3. **Check auth context**: Ensure getUser() is returning correct user

## Migration Path

### Phase 1: Basic Integration (Now)
- [x] Notification system is available
- [ ] Integrate with lead creation (SAM feed, manual entry)
- [ ] Integrate with lead status changes

### Phase 2: Advanced Features (Future)
- [ ] Amendment detection notifications
- [ ] Commercial lead notifications
- [ ] Custom notification types
- [ ] Email digest export

### Phase 3: Optimization (Future)
- [ ] WebSocket real-time updates
- [ ] Smart batching
- [ ] Notification templates
- [ ] User preference profiles

## Support

For issues or questions:
1. Check `NOTIFICATIONS.md` for API documentation
2. Check `NOTIFICATION_SETUP.md` for deployment issues
3. Review this guide for integration patterns
4. Check Vercel logs for runtime errors
5. Check Supabase dashboard for data issues
