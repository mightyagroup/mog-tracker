import { EntityType } from './types'

/**
 * High-stakes actions that trigger admin notifications.
 * Called client-side after the action succeeds -- fires a POST to the audit API route.
 */

export type AuditAction =
  | 'status_change_high_stakes'
  | 'commercial_status_change_high_stakes'
  | 'pricing_saved'
  | 'subcontractor_added'
  | 'subcontractor_teaming_changed'
  | 'lead_deleted'

// Gov lead statuses that trigger admin notification
export const HIGH_STAKES_GOV_STATUSES = new Set([
  'active_bid',
  'submitted',
  'awarded',
  'lost',
  'no_bid',
])

// Commercial lead statuses that trigger admin notification
export const HIGH_STAKES_COMMERCIAL_STATUSES = new Set([
  'proposal',
  'negotiation',
  'contract',
  'lost',
])

interface AuditEvent {
  action: AuditAction
  entity?: EntityType
  performedBy?: string // user email or display name
  details: Record<string, string | number | null | undefined>
}

/**
 * Send an audit event to the API. This notifies all admin users.
 * Non-blocking -- catches errors silently so it never breaks the main flow.
 */
export async function sendAuditNotification(event: AuditEvent): Promise<void> {
  try {
    await fetch('/api/notifications/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch {
    // Silent fail -- audit notifications should never block operations
    console.warn('Audit notification failed to send')
  }
}

/**
 * Check if a gov lead status change is high-stakes and send audit notification if so.
 */
export function auditGovStatusChange(
  leadId: string,
  leadTitle: string,
  entity: EntityType,
  oldStatus: string,
  newStatus: string,
  performedBy?: string
) {
  if (!HIGH_STAKES_GOV_STATUSES.has(newStatus)) return

  sendAuditNotification({
    action: 'status_change_high_stakes',
    entity,
    performedBy,
    details: {
      leadId,
      leadTitle,
      oldStatus,
      newStatus,
    },
  })
}

/**
 * Check if a commercial lead status change is high-stakes and send audit notification if so.
 */
export function auditCommercialStatusChange(
  leadId: string,
  orgName: string,
  entity: EntityType,
  oldStatus: string,
  newStatus: string,
  performedBy?: string
) {
  if (!HIGH_STAKES_COMMERCIAL_STATUSES.has(newStatus)) return

  sendAuditNotification({
    action: 'commercial_status_change_high_stakes',
    entity,
    performedBy,
    details: {
      leadId,
      orgName,
      oldStatus,
      newStatus,
    },
  })
}

/**
 * Notify admins about a pricing record save.
 */
export function auditPricingSave(
  entity: EntityType,
  leadTitle: string,
  totalPrice: number,
  marginPercent: number,
  performedBy?: string
) {
  sendAuditNotification({
    action: 'pricing_saved',
    entity,
    performedBy,
    details: {
      leadTitle,
      totalPrice,
      marginPercent,
    },
  })
}

/**
 * Notify admins about a new subcontractor.
 */
export function auditSubcontractorAdded(
  companyName: string,
  entities: EntityType[],
  performedBy?: string
) {
  sendAuditNotification({
    action: 'subcontractor_added',
    performedBy,
    details: {
      companyName,
      entities: entities.join(', '),
    },
  })
}

/**
 * Notify admins about a lead deletion.
 */
export function auditLeadDeleted(
  leadTitle: string,
  entity: EntityType,
  leadType: 'government' | 'commercial',
  performedBy?: string
) {
  sendAuditNotification({
    action: 'lead_deleted',
    entity,
    performedBy,
    details: {
      leadTitle,
      leadType,
    },
  })
}
