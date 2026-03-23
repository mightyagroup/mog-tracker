/**
 * Run this after receiving Ella's admin password:
 *   ADMIN_PASSWORD="yourpassword" node scripts/create-admin.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lqymdyorcwgeesmkvvob.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY env var is required')
  process.exit(1)
}

const ADMIN_EMAIL = 'admin@mightyoakgroup.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_PASSWORD) {
  console.error('Error: ADMIN_PASSWORD env var is required')
  console.error('Usage: ADMIN_PASSWORD="yourpassword" SUPABASE_SERVICE_ROLE_KEY="..." node scripts/create-admin.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.createUser({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  email_confirm: true,
})

if (error) {
  console.error('Failed to create admin user:', error.message)
  process.exit(1)
}

console.log('Admin user created successfully!')
console.log('Email:', data.user.email)
console.log('User ID:', data.user.id)
