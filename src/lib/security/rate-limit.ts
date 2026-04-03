/**
 * In-memory rate limiter for API routes.
 * Tracks request counts per key (usually IP address) with sliding window reset.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const keys = Array.from(store.keys())
    for (const key of keys) {
      const entry = store.get(key)
      if (entry && entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * Check rate limit for a given key (usually IP address).
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++
  const remaining = Math.max(0, maxRequests - entry.count)
  return { allowed: entry.count <= maxRequests, remaining, resetAt: entry.resetAt }
}

/**
 * Get client IP from request headers.
 * Checks x-forwarded-for (proxy chains), x-real-ip, and falls back to 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
