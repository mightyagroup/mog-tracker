import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Security headers to apply to all responses
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.sam.gov https://api.usaspending.gov https://npiregistry.cms.hhs.gov wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Simple in-middleware rate limiter for API routes
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, max: number = 100, windowMs: number = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    const keys = Array.from(rateLimitStore.keys())
    for (const key of keys) {
      const val = rateLimitStore.get(key)
      if (val && val.resetAt < now) rateLimitStore.delete(key)
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count++
  return entry.count <= max
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rate limit API routes (100 req/min for regular, 20 req/min for webhooks)
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(request)
    const isWebhook = pathname.startsWith('/api/webhooks')
    const allowed = checkRateLimit(
      `${ip}:${isWebhook ? 'webhook' : 'api'}`,
      isWebhook ? 20 : 100,
      60_000
    )

    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      })
    }
  }

  // Webhook routes use their own bearer token auth, skip Supabase session
  if (pathname.startsWith('/api/webhooks')) {
    const response = NextResponse.next()
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }

  // All other routes: run Supabase session update (handles auth redirect)
  const response = await updateSession(request)

  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|api/cron|api/leads/backfill-notes|api/auth/create-user).*))',
  ],
}
