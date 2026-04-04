import { createClient } from '@supabase/supabase-js'
import { EntityType, NotificationType } from './types'

/**
 * Create a notification for a user via service role
 */
export async function createNotification(
  userId: string,
  {
    notificationType,
    title,
    message,
    link,
    entity,
    govLeadId,
    commercialLeadId,
  }: {
    notificationType: NotificationType
    title: string
    message: string
    link?: string
    entity?: EntityType
    govLeadId?: string
    commercialLeadId?: string
  }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          notification_type: notificationType,
          title,
          message,
          link: link || null,
          entity: entity || null,
          gov_lead_id: govLeadId || null,
          commercial_lead_id: commercialLeadId || null,
          is_read: false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createNotification:', error)
    return null
  }
}

/**
 * Notify all users about a new lead
 */
export async function notifyNewLead(
  leadId: string,
  leadTitle: string,
  entity: EntityType,
  solicitation: string | null | undefined
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    // Get each user's preferences
    const results = await Promise.all(
      users.users.map(async (user) => {
        const { data: prefs } = await supabase
          .rpc('get_or_create_notification_preferences', { p_user_id: user.id })

        // Only notify if user wants new lead notifications
        if (prefs?.new_leads) {
          return createNotification(user.id, {
            notificationType: 'new_lead',
            title: `New Lead: ${leadTitle}`,
            message: `A new lead has been added for ${entity} - ${
              solicitation || 'No solicitation number'
            }`,
            link: `/exousia?lead=${leadId}`, // This should be entity-specific
            entity,
            govLeadId: leadId,
          })
        }
      })
    )

    return results.filter(Boolean)
  } catch (error) {
    console.error('Error in notifyNewLead:', error)
  }
}

/**
 * Notify all users about a lead status change
 */
export async function notifyStatusChange(
  leadId: string,
  leadTitle: string,
  entity: EntityType,
  oldStatus: string,
  newStatus: string
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    // Get each user's preferences
    const results = await Promise.all(
      users.users.map(async (user) => {
        const { data: prefs } = await supabase
          .rpc('get_or_create_notification_preferences', { p_user_id: user.id })

        // Only notify if user wants status change notifications
        if (prefs?.status_changes) {
          return createNotification(user.id, {
            notificationType: 'status_change',
            title: `Status Updated: ${leadTitle}`,
            message: `Lead status changed from ${oldStatus} to ${newStatus}`,
            link: `/exousia?lead=${leadId}`, // This should be entity-specific
            entity,
            govLeadId: leadId,
          })
        }
      })
    )

    return results.filter(Boolean)
  } catch (error) {
    console.error('Error in notifyStatusChange:', error)
  }
}
