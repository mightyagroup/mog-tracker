#!/usr/bin/env node
// Add or modify a MOG Tracker user from the command line.
//
// Usage:
//   node scripts/add-user.mjs --email va1@example.com --role va_entity --entities exousia,ironhouse --password 'StrongPass123!'
//   node scripts/add-user.mjs --email va1@example.com --role va_readonly --entities vitalx
//   node scripts/add-user.mjs --email someone@x.com --disable
//   node scripts/add-user.mjs --email someone@x.com --delete
//   node scripts/add-user.mjs --list
//
// Roles:
//   admin        — full access everywhere, can manage users
//   manager      — full data read/write, no user management
//   va_entity    — read/write only their assigned entities
//   va_readonly  — read-only, only their assigned entities
//   viewer       — read-only across all entities
//
// If --password is omitted, a strong random password is generated and printed.
// The user must change it on first login (you forward the temp password to them securely).

import fs from 'fs'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// ---- Parse args ----
function arg(name) {
  const flag = `--${name}`
  const i = process.argv.indexOf(flag)
  if (i === -1) return null
  return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true
}

const EMAIL    = arg('email')
const ROLE     = arg('role')
const ENTITIES = arg('entities')
const NAME     = arg('name')
const PASSWORD = arg('password')
const DISABLE  = arg('disable') === true
const ENABLE   = arg('enable') === true
const DELETE   = arg('delete') === true
const LIST     = arg('list') === true

const VALID_ROLES = ['admin', 'manager', 'viewer', 'va_entity', 'va_readonly']
const VALID_ENTITIES = ['exousia', 'vitalx', 'ironhouse']

// ---- Load env ----
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const e = l.indexOf('='); return [l.slice(0, e).trim(), l.slice(e + 1).trim()] })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ---- LIST ----
if (LIST) {
  const { data, error } = await sb.from('user_profiles').select('*').order('created_at')
  if (error) { console.error(error); process.exit(1) }
  console.log('\nUser                                         Role          Active   Entities')
  console.log('─'.repeat(95))
  for (const u of data) {
    console.log(`${(u.email || u.user_id).padEnd(45)} ${u.role.padEnd(13)} ${String(u.is_active).padEnd(7)}  ${JSON.stringify(u.entities_access)}`)
  }
  process.exit(0)
}

if (!EMAIL) {
  console.error('--email is required (or pass --list)')
  process.exit(1)
}

// ---- DELETE ----
if (DELETE) {
  const { data: profile } = await sb.from('user_profiles').select('user_id').eq('email', EMAIL).single()
  if (!profile) { console.log('No such user.'); process.exit(0) }
  await sb.from('user_profiles').delete().eq('user_id', profile.user_id)
  await sb.auth.admin.deleteUser(profile.user_id)
  console.log(`Deleted ${EMAIL}`)
  process.exit(0)
}

// ---- DISABLE / ENABLE ----
if (DISABLE || ENABLE) {
  const { error } = await sb.from('user_profiles').update({ is_active: ENABLE }).eq('email', EMAIL)
  if (error) { console.error(error); process.exit(1) }
  console.log(`${EMAIL} is_active=${ENABLE}`)
  process.exit(0)
}

// ---- CREATE / UPDATE ----
if (!ROLE || !VALID_ROLES.includes(ROLE)) {
  console.error(`--role must be one of: ${VALID_ROLES.join(', ')}`)
  process.exit(1)
}

const entitiesArr = ROLE === 'admin' || ROLE === 'viewer'
  ? VALID_ENTITIES
  : (ENTITIES ? ENTITIES.split(',').map(s => s.trim()).filter(Boolean) : [])

if (ROLE !== 'admin' && ROLE !== 'viewer' && entitiesArr.length === 0) {
  console.error(`Role ${ROLE} requires --entities (e.g. --entities exousia,vitalx)`)
  process.exit(1)
}

for (const e of entitiesArr) {
  if (!VALID_ENTITIES.includes(e)) {
    console.error(`Unknown entity: ${e}. Valid: ${VALID_ENTITIES.join(', ')}`)
    process.exit(1)
  }
}

// Generate strong random password if not provided
const pw = PASSWORD || (crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '') + 'A1!')

// Check if user already exists
const { data: existing } = await sb.from('user_profiles').select('user_id').eq('email', EMAIL).maybeSingle()

if (existing) {
  // Update role + entities only (don't reset password unless explicitly requested)
  const { error } = await sb.from('user_profiles').update({
    role: ROLE,
    entities_access: entitiesArr,
    display_name: NAME || undefined,
    is_active: true,
  }).eq('user_id', existing.user_id)
  if (error) { console.error(error); process.exit(1) }
  if (PASSWORD) {
    await sb.auth.admin.updateUserById(existing.user_id, { password: PASSWORD })
  }
  console.log(`Updated ${EMAIL}: role=${ROLE} entities=${JSON.stringify(entitiesArr)}`)
  process.exit(0)
}

// Create new user
const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
  email: EMAIL,
  password: pw,
  email_confirm: true,
})
if (authErr) { console.error('Auth create failed:', authErr); process.exit(1) }

const { error: profileErr } = await sb.from('user_profiles').insert({
  user_id: authUser.user.id,
  email: EMAIL,
  display_name: NAME || EMAIL.split('@')[0],
  role: ROLE,
  entities_access: entitiesArr,
  is_active: true,
})
if (profileErr) {
  // Rollback auth user if profile failed
  await sb.auth.admin.deleteUser(authUser.user.id)
  console.error('Profile create failed:', profileErr); process.exit(1)
}

console.log('\n═══════════════════════════════════════════════')
console.log(`Created user: ${EMAIL}`)
console.log(`Role:         ${ROLE}`)
console.log(`Entities:     ${JSON.stringify(entitiesArr)}`)
if (!PASSWORD) {
  console.log(`Temp password (send securely): ${pw}`)
  console.log('User must change this on first login.')
}
console.log('═══════════════════════════════════════════════\n')
