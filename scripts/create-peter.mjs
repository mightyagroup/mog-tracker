/**
 * Run this after receiving Peter's password:
 *   PETER_PASSWORD="yourpassword" node scripts/create-peter.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lqymdyorcwgeesmkvvob.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY env var is required')
  process.exit(1)
}

const PETER_EMAIL = 'peter@mightyoakgroup.com'
const PETER_PASSWORD = process.env.PETER_PASSWORD

if (!PETER_PASSWORD) {
  console.error('Error: PETER_PASSWORD env var is required')
  console.error('Usage: PETER_PASSWORD="yourpassword" SUPABASE_SERVICE_ROLE_KEY="..." node scripts/create-peter.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function createPeter() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: PETER_EMAIL,
      password: PETER_PASSWORD,
      email_confirm: true
    })

    if (error) {
      console.error('Failed to create Peter user:', error)
      process.exit(1)
    } else {
      console.log('Peter user created successfully:', data.user.id)
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

createPeter()