import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { differenceInDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    let notificationsCreated = 0

    // For each user, check their notification preferences and create reminders
    for (const user of users.users) {
      // Get user preferences
      const { data: prefs, error: prefsError } = await supabase
        .rpc('get_or_create_notification_preferences', { p_user_id: user.id })

      if (prefsError) {
        console.error(`Error getting preferences for user ${user.id}:`, prefsError)
        continue
      }

      // Skip if deadline reminders are disabled
      if (!prefs.deadline_reminders) {
        continue
      }

      const deadlineDays = (prefs.deadline_days_before || [7, 3, 1]).sort((a: number, b: number) => a - b)

      // Get all gov leads with upcoming deadlines
      const { data: leads, error: leadsError } = await supabase
        .from('gov_leads')
        .select('id, entity, title, response_deadline, solicitation_number')
        .not('response_deadline', 'is', null)
        .gt('response_deadline', new Date().toISOString())
        .limit(1000)

      if (leadsError) {
        console.error(`Error fetching leads for user ${user.id}:`, leadsError)
        continue
      }

      // Check each lead for upcoming deadlines
      for (const lead of leads || []) {
        const deadline = new Date(lead.response_deadline)
        const daysUntil = differenceInDays(deadline, new Date())

        // Check if this deadline matches one of the user's configured reminder days
        const shouldNotify = deadlineDays.some((day: number) => {
          // Allow 1-hour grace period (daysUntil can be off by ±1 due to time of day)
          return Math.abs(daysUntil - day) <= 1
        })

        if (!shouldNotify) {
          continue
        }

        // Check for duplicate notification (same lead, same day threshold, within 24 hours)
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('gov_lead_id', lead.id)
          .eq('notification_type', 'deadline_reminder')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (existingNotif) {
          // Duplicate notification, skip
          continue
        }

        // Create the notification
        const daysLabel = daysUntil === 1 ? '1 day' : `${daysUntil} days`
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            user_id: user.id,
            entity: lead.entity,
            notification_type: 'deadline_reminder',
            title: `Deadline Approaching: ${daysLabel}`,
            message: `${lead.title} (${lead.solicitation_number || 'No solicitation number'}) is due in ${daysLabel}`,
            link: `/exousia?lead=${lead.id}`, // Basic link, can be improved
            gov_lead_id: lead.id,
            is_read: false,
          },
        ])

        if (!notifError) {
          notificationsCreated += 1
        } else {
          console.error(`Error creating notification for lead ${lead.id}:`, notifError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${notificationsCreated} deadline reminder notifications`,
      count: notificationsCreated,
    })
  } catch (error) {
    console.error('Error in deadline check cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
