#!/usr/bin/env node
// RBAC behavior test. Creates one throwaway user per role, runs a fixed
// battery of operations against the Supabase REST API using that user's JWT,
// asserts each op is allowed or denied per the RBAC matrix, then cleans up.

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#')) continue
  const i = l.indexOf('='); if (i === -1) continue
  env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
}

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const svc = createClient(SUPA_URL, SERVICE_KEY)
const TEST_PREFIX = 'rbactest_'

const ROLES = [
  { role: 'admin',       entities: ['exousia','vitalx','ironhouse'], canRead: true,  canWrite: true,  canManageUsers: true  },
  { role: 'manager',     entities: ['exousia','vitalx','ironhouse'], canRead: true,  canWrite: true,  canManageUsers: false },
  { role: 'viewer',      entities: ['exousia','vitalx','ironhouse'], canRead: true,  canWrite: false, canManageUsers: false },
  { role: 'va_entity',   entities: ['vitalx'],                       canRead: true,  canWrite: true,  canManageUsers: false, onlyOwnEntity: true },
  { role: 'va_readonly', entities: ['exousia'],                      canRead: true,  canWrite: false, canManageUsers: false, onlyOwnEntity: true },
]

let pass = 0, fail = 0
function assert(cond, msg) {
  if (cond) { pass++; console.log('  OK  ' + msg) }
  else { fail++; console.log('  FAIL  ' + msg) }
}

async function createTestUser(cfg) {
  const email = TEST_PREFIX + cfg.role + '_' + Date.now() + '@mogtracker.test'
  const password = 'TestPass123!abc'
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error('createUser failed: ' + error.message)
  const userId = data.user.id
  const { error: profErr } = await svc.from('user_profiles').upsert({
    user_id: userId, email, role: cfg.role,
    entities_access: cfg.entities,
    is_active: true,
  }, { onConflict: 'user_id' })
  if (profErr) throw new Error('user_profiles upsert failed: ' + profErr.message)
  return { userId, email, password }
}

async function loginAs(email, password) {
  const client = createClient(SUPA_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error('signInWithPassword failed: ' + error.message)
  return client
}

async function cleanup(userId) {
  try { await svc.from('user_profiles').delete().eq('user_id', userId) } catch {}
  try { await svc.auth.admin.deleteUser(userId) } catch {}
}

async function testRole(cfg) {
  console.log('\n## Testing role: ' + cfg.role + ' (entities: ' + cfg.entities.join(', ') + ')')

  const u = await createTestUser(cfg)
  try {
    const client = await loginAs(u.email, u.password)

    const read = await client.from('gov_leads').select('id, entity').limit(50)
    if (cfg.canRead) {
      assert(!read.error, cfg.role + ' can read gov_leads')
      if (cfg.onlyOwnEntity && read.data) {
        const outOfScope = read.data.filter(r => !cfg.entities.includes(r.entity))
        assert(outOfScope.length === 0, cfg.role + ' sees only assigned entities (found ' + outOfScope.length + ' out-of-scope rows)')
      }
    } else {
      assert(!!read.error, cfg.role + ' cannot read gov_leads')
    }

    const testTitle = 'RBAC test ' + cfg.role + ' ' + Date.now()
    const ins = await client.from('gov_leads').insert([{ entity: cfg.entities[0] || 'exousia', title: testTitle, status: 'new', source: 'manual' }]).select('id').maybeSingle()
    if (cfg.canWrite) {
      assert(!ins.error && !!ins.data?.id, cfg.role + ' can insert gov_leads')
      if (ins.data?.id) await svc.from('gov_leads').delete().eq('id', ins.data.id)
    } else {
      assert(!!ins.error, cfg.role + ' cannot insert gov_leads (policy denied)')
    }

    if (cfg.onlyOwnEntity) {
      const otherEntity = ['exousia','vitalx','ironhouse'].find(e => !cfg.entities.includes(e))
      if (otherEntity) {
        const crossIns = await client.from('gov_leads').insert([{ entity: otherEntity, title: 'RBAC cross-entity ' + cfg.role, status: 'new', source: 'manual' }]).select('id').maybeSingle()
        assert(!!crossIns.error, cfg.role + ' cannot write to out-of-scope entity ' + otherEntity)
        if (crossIns.data?.id) await svc.from('gov_leads').delete().eq('id', crossIns.data.id)
      }
    }

    const profiles = await client.from('user_profiles').select('user_id, email').limit(100)
    if (cfg.canManageUsers) {
      assert(!profiles.error && (profiles.data?.length ?? 0) >= 1, cfg.role + ' can read user_profiles')
    } else {
      const seen = profiles.data?.length ?? 0
      assert(seen <= 1, cfg.role + ' sees at most own user_profile (saw ' + seen + ')')
    }
  } finally {
    await cleanup(u.userId)
  }
}

async function main() {
  console.log('=== MOG Tracker RBAC behavior tests ===\n')
  for (const cfg of ROLES) {
    try { await testRole(cfg) }
    catch (e) { fail++; console.log('  FAIL  ' + cfg.role + ' threw: ' + e.message) }
  }
  console.log('\n=== Result: ' + pass + ' pass, ' + fail + ' fail ===')
  if (fail > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
