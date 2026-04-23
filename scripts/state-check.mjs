// Diagnostic snapshot of the live MOG Tracker database.
// Run: node scripts/state-check.mjs
//
// Prints: row counts, entity breakdown, status breakdown, freshness stats,
// archived_at column health, last 10 feed runs, last 10 gov_leads, user list.

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const e = l.indexOf('='); return [l.slice(0, e).trim(), l.slice(e + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function count(table, filters = {}) {
  let q = sb.from(table).select('*', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filters)) q = q.filter(k, 'eq', v)
  const { count: n, error } = await q
  return error ? `ERR: ${error.message.slice(0, 60)}` : n
}

console.log('=== TABLE ROW COUNTS ===')
for (const t of ['gov_leads', 'commercial_leads', 'contacts', 'subcontractors', 'interactions', 'compliance_items', 'pricing_records', 'service_categories', 'user_profiles', 'feed_runs', 'deleted_audit']) {
  console.log(`  ${t.padEnd(22)} ${await count(t)}`)
}

console.log('\n=== gov_leads BY ENTITY (active only) ===')
for (const e of ['exousia', 'vitalx', 'ironhouse']) {
  const { count: n } = await sb.from('gov_leads').select('*', { count: 'exact', head: true }).eq('entity', e).is('archived_at', null)
  console.log(`  ${e.padEnd(12)} ${n}`)
}

console.log('\n=== gov_leads BY STATUS ===')
for (const s of ['new', 'reviewing', 'bid_no_bid', 'active_bid', 'submitted', 'awarded', 'lost', 'no_bid', 'cancelled']) {
  console.log(`  ${s.padEnd(14)} ${await count('gov_leads', { status: s })}`)
}

console.log('\n=== FRESHNESS ===')
const d7  = new Date(Date.now() -  7 * 864e5).toISOString()
const d30 = new Date(Date.now() - 30 * 864e5).toISOString()
const now = new Date().toISOString()
async function freshCount(filter) {
  const { count: n, error } = await sb.from('gov_leads').select('*', { count: 'exact', head: true }).filter(filter.col, filter.op, filter.val)
  return error ? 'ERR' : n
}
console.log(`  archived:                    ${await freshCount({ col: 'archived_at', op: 'not.is', val: null })}`)
console.log(`  deadline passed:             ${await freshCount({ col: 'response_deadline', op: 'lt', val: now })}`)
console.log(`  created last 7d:             ${await freshCount({ col: 'created_at', op: 'gt', val: d7 })}`)
console.log(`  created last 30d:            ${await freshCount({ col: 'created_at', op: 'gt', val: d30 })}`)
console.log(`  amendment_count > 0:         ${await freshCount({ col: 'amendment_count', op: 'gt', val: 0 })}`)

console.log('\n=== LAST 10 gov_leads ===')
const { data: recentLeads } = await sb.from('gov_leads').select('title,entity,source,created_at,response_deadline,amendment_count,last_reviewed_amendment_count').order('created_at', { ascending: false }).limit(10)
for (const r of recentLeads || []) {
  const unreviewed = (r.amendment_count ?? 0) > (r.last_reviewed_amendment_count ?? 0)
  console.log(`  ${r.created_at?.slice(0, 10)} ${r.entity.padEnd(10)} ${r.source.padEnd(10)} amd=${r.amendment_count || 0}${unreviewed ? '*' : ''}  ${(r.title || '').slice(0, 55)}`)
}

console.log('\n=== LAST 10 FEED RUNS ===')
const { data: runs } = await sb.from('feed_runs').select('*').order('started_at', { ascending: false }).limit(10)
for (const r of runs || []) {
  console.log(`  ${r.started_at.slice(0, 19)} ${r.feed_name.padEnd(20)} ${r.status.padEnd(8)} fetched=${r.fetched_count || 0} inserted=${r.inserted_count || 0} errors=${r.error_count || 0}`)
}

console.log('\n=== USERS ===')
const { data: users } = await sb.from('user_profiles').select('email,role,is_active,entities_access').order('created_at')
for (const u of users || []) {
  console.log(`  ${(u.email || '').padEnd(40)} ${u.role.padEnd(12)} active=${u.is_active}  ${JSON.stringify(u.entities_access)}`)
}

console.log('\nDone.')
