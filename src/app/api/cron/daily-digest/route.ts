import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { subDays, format } from 'date-fns'

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

    let digestsCreated = 0
    const yesterday = subDays(new Date(), 1)

    for (const user of users.users) {
      // Get user preferences
      const { data: prefs, error: prefsError } = await supabase
        .rpc('get_or_create_notification_preferences', { p_user_id: user.id })

      if (prefsError) {
        console.error(`Error getting preferences for user ${user.id}:`, prefsError)
        continue
      }

      // Skip if daily digest is disabled
      if (!prefs.daily_digest) {
        continue
      }

      const summaryParts: string[] = []

      // 1. New leads from yesterday
      if (prefs.new_leads) {
        const { data: newLeads, error: newLeadsError } = await supabase
          .from('gov_leads')
          .select('id, title, entity, solicitation_number')
          .is('archived_at', null)
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', new Date().toISOString())
          .limit(10)

        if (!newLeadsError && newLeads && newLeads.length > 0) {
          summaryParts.push(
            `${newLeads.length} new lead${newLeads.length !== 1 ? 's' : ''} added`
          )
        }
      }

      // 2. Upcoming deadlines (next 7 days)
      const { data: upcomingLeads, error: upcomingError } = await supabase
        .from('gov_leads')
        .select('id, title, response_deadline')
        .is('archived_at', null)
        .not('response_deadline', 'is', null)
        .gte('response_deadline', new Date().toISOString())
        .lt('response_deadline', subDays(new Date(), -7).toISOString())
        .limit(10)

      if (!upcomingError && upcomingLeads && upcomingLeads.length > 0) {
        summaryParts.push(`${upcomingLeads.length} deadline${upcomingLeads.length !== 1 ? 's' : ''} in next 7 days`)
      }

      // 3. Status changes from yesterday
      if (prefs.status_changes) {
        const { data: changedLeads, error: changedError } = await supabase
          .from('notifications')
          .select('gov_lead_id')
          .eq('user_id', user.id)
          .eq('notification_type', 'status_change')
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', new Date().toISOString())

        if (!changedError && changedLeads && changedLeads.length > 0) {
          const uniqueLeads = new Set(changedLeads.map((n) => n.gov_lead_id).filter(Boolean))
          if (uniqueLeads.size > 0) {
            summaryParts.push(`${uniqueLeads.size} lead status change${uniqueLeads.size !== 1 ? 's' : ''}`)
          }
        }
      }

      // Only create digest if there's something to report
      if (summaryParts.length === 0) {
        continue
      }

      const message = `Daily Summary: ${summaryParts.join('. ')}. Click to view details.`

      const { error: digestError } = await supabase.from('notifications').insert([
        {
          user_id: user.id,
          notification_type: 'daily_digest',
          title: `Daily Digest - ${format(yesterday, 'MMM d')}`,
          message,
          link: '/',
          is_read: false,
        },
      ])

      if (!digestError) {
        digestsCreated += 1
      } else {
        console.error(`Error creating digest for user ${user.id}:`, digestError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${digestsCreated} daily digest notifications`,
      count: digestsCreated,
    })
  } catch (error) {
    console.error('Error in daily digest cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
