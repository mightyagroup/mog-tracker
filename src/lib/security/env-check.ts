/**
 * Startup environment variable validation.
 * Ensures all required credentials and secrets are configured before the app starts.
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const OPTIONAL_ENV_VARS = [
  'SAMGOV_API_KEY',
  'WEBHOOK_SECRET',
  'CRON_SECRET',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  'NOTION_API_KEY',
]

export interface EnvCheckResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Check that all required environment variables are set.
 * Call at application startup (e.g., in a root layout or API route wrapper).
 */
export function checkEnvironment(): EnvCheckResult {
  const missing: string[] = []
  const warnings: string[] = []

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(`Optional: ${key} not set`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

// Run check on module load (server-side only)
if (typeof window === 'undefined') {
  const result = checkEnvironment()
  if (!result.valid) {
    console.error('[ENV CHECK] Missing required environment variables:', result.missing.join(', '))
  }
  if (result.warnings.length > 0) {
    console.warn('[ENV CHECK] Warnings:', result.warnings.join('; '))
  }
}
