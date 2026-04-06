import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NotificationType } from '@/lib/types'

const ENTITY_LABELS: Record<string, string> = {
  exousia: 'Exousia Solutions',
  vitalx: 'VitalX',
  ironhouse: 'IronHouse',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  bid_no_bid: 'Bid/No-Bid',
  active_bid: 'Active Bid',
  submitted: 'Submitted',
  awarded: 'Awarded',
  lost: 'Lost',
  no_bid: 'No Bid',
  cancelled: 'Cancelled',
  prospect: 'Prospect',
  outreach: 'Active Outreach',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  contract: 'Contract',
  inactive: 'Inactive',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] || s
}

function entityLabel(e?: string): string {
  return e ? ENTITY_LABELS[e] || e : ''
}

function formatCurrency(val: number | string | null | undefined): string {
  const num = typeof val === 'string' ? parseFloat(val) : val
  if (!num && num !== 0) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
}

/**
 * POST /api/notifications/audit
 *
 * Receives audit events from the client and creates notifications
 * for all admin-role users. Uses the service role key to bypass RLS.
 */
export async function POST(request: Request) {
  try {
    // Verify the requesting user is authenticated
    const userSupabase = await createServerSupabaseClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, entity, performedBy, details } = body

    if (!action || !details) {
      return NextResponse.json({ error: 'Missing action or details' }, { status: 400 })
    }

    // Use service role to read user_profiles and insert notifications
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the performer's display name from user_profiles if not provided
    let actor = performedBy
    if (!actor) {
      const { data: profile } = await adminSupabase
        .from('user_profiles')
        .select('display_name, email')
        .eq('user_id', user.id)
        .single()
      actor = profile?.display_name || profile?.email || user.email || 'Unknown user'
    }

    // Get all admin users (excluding the person who performed the action)
    const { data: admins } = await adminSupabase
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'admin')
      .eq('is_active', true)
      .neq('user_id', user.id)

    if (!admins || admins.length === 0) {
      // No other admins to notify -- still return success
      return NextResponse.json({ success: true, notified: 0 })
    }

    // Build notification title and message based on action type
    let title = ''
    let message = ''
    let notificationType: NotificationType = 'status_change'
    let link: string | null = null
    let govLeadId: string | null = null
    let commercialLeadId: string | null = null

    const ent = entityLabel(entity)

    switch (action) {
      case 'status_change_high_stakes': {
        const oldS = statusLabel(details.oldStatus)
        const newS = statusLabel(details.newStatus)
        title = `[${ent}] Lead moved to ${newS}`
        message = `${actor} changed "${details.leadTitle}" from ${oldS} to ${newS}`
        link = `/${entity}`
        govLeadId = details.leadId || null
        break
      }

      case 'commercial_status_change_high_stakes': {
        const oldS = statusLabel(details.oldStatus)
        const newS = statusLabel(details.newStatus)
        title = `[${ent}] Commercial lead moved to ${newS}`
        message = `${actor} changed "${details.orgName}" from ${oldS} to ${newS}`
        link = `/${entity}`
        commercialLeadId = details.leadId || null
        break
      }

      case 'pricing_saved': {
        title = `[${ent}] Pricing updated`
        message = `${actor} saved pricing for "${details.leadTitle}" -- ${formatCurrency(details.totalPrice)} at ${details.marginPercent}% margin`
        notificationType = 'system'
        link = `/${entity}`
        break
      }

      case 'subcontractor_added': {
        title = 'New subcontractor added'
        message = `${actor} added "${details.companyName}" (${details.entities || 'no entities'})`
        notificationType = 'system'
        break
      }

      case 'subcontractor_teaming_changed': {
        title = 'Teaming agreement status changed'
        message = `${actor} updated teaming status for "${details.companyName}" to ${details.newStatus}`
        notificationType = 'system'
        break
      }

      case 'lead_deleted': {
        title = `[${ent}] Lead deleted`
        message = `${actor} deleted ${details.leadType} lead "${details.leadTitle}"`
        notificationType = 'system'
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown audit action' }, { status: 400 })
    }

    // Insert notification for each admin
    const notifications = admins.map(admin => ({
      user_id: admin.user_id,
      notification_type: notificationType,
      title,
      message,
      link,
      entity: entity || null,
      gov_lead_id: govLeadId,
      commercial_lead_id: commercialLeadId,
      is_read: false,
    }))

    const { error } = await adminSupabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Failed to insert audit notifications:', error)
      return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true, notified: admins.length })
  } catch (error) {
    console.error('Audit notification error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
