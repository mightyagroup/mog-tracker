/**
 * Security headers configuration for defense against common web vulnerabilities.
 */

/**
 * Security headers to apply to all responses.
 * These headers help prevent:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME type sniffing
 * - Insecure protocols
 * - Information disclosure
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // Content Security Policy: restricts sources of content to mitigate XSS
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

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Enable XSS protection in older browsers
  'X-XSS-Protection': '1; mode=block',

  // Control how much referrer info is sent
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Disable access to sensitive APIs
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

  // Force HTTPS for secure communication (1 year)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}
