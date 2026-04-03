import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export interface WebhookLogParams {
  endpoint: string
  method: string
  sourceIp: string
  success: boolean
  errorMessage?: string
  requestBody?: Record<string, unknown> | object
  responseStatus?: number
}

/**
 * Create a Supabase client with service role key for webhook operations.
 * Webhooks don't have authenticated user context.
 */
export function createWebhookSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Validate webhook Authorization header against WEBHOOK_SECRET.
 * Returns true if header matches "Bearer {WEBHOOK_SECRET}", false otherwise.
 */
export function validateWebhookAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`
  return authHeader === expectedAuth
}

/**
 * Sanitize a string input: strip HTML tags, trim whitespace, limit length.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''

  // Strip HTML tags
  let cleaned = input.replace(/<[^>]*>/g, '')

  // Trim whitespace
  cleaned = cleaned.trim()

  // Limit to 5000 characters
  if (cleaned.length > 5000) {
    cleaned = cleaned.substring(0, 5000)
  }

  return cleaned
}

/**
 * Log a webhook call to the webhook_logs table.
 * This table should exist in Supabase (created via migration).
 */
export async function logWebhookCall(params: WebhookLogParams): Promise<void> {
  try {
    const supabase = createWebhookSupabaseClient()

    await supabase.from('webhook_logs').insert({
      endpoint: params.endpoint,
      method: params.method,
      source_ip: params.sourceIp,
      success: params.success,
      error_message: params.errorMessage ?? null,
      request_body: params.requestBody ?? null,
      response_status: params.responseStatus ?? null,
      logged_at: new Date().toISOString(),
    })
  } catch (error) {
    // Silently fail if logging fails - don't break the webhook
    console.error('Failed to log webhook call:', error)
  }
}

/**
 * Extract the source IP from the request headers.
 * Works with both local and reverse-proxied environments.
 */
export function getSourceIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.ip || 'unknown'
}
