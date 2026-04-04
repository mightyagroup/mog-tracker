#!/usr/bin/env node
/**
 * Seed script to create the initial admin user
 * Run: npx ts-node scripts/seed-admin.ts
 *
 * This creates an admin user with email admin@mightyoakgroup.com
 * You will be prompted for the password
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Missing environment variables')
  console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function promptPassword(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question('Enter admin password: ', (password) => {
      rl.close()
      resolve(password)
    })
  })
}

async function seedAdmin() {
  try {
    const email = 'admin@mightyoakgroup.com'
    console.log(`Creating admin user: ${email}`)

    const password = await promptPassword()

    if (!password || password.length < 6) {
      console.error('Password must be at least 6 characters')
      process.exit(1)
    }

    // Create auth user
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError.message)
      process.exit(1)
    }

    if (!authData.user) {
      console.error('Failed to create user')
      process.exit(1)
    }

    console.log(`Auth user created: ${authData.user.id}`)

    // Create user profile
    console.log('Creating user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email,
        display_name: 'Admin',
        role: 'admin',
        entities_access: ['exousia', 'vitalx', 'ironhouse'],
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError.message)
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      process.exit(1)
    }

    console.log('✓ Admin user created successfully!')
    console.log(`  Email: ${email}`)
    console.log(`  Role: admin`)
    console.log(`  Access: All entities`)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

seedAdmin()
