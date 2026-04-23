#!/usr/bin/env node
// One-command deploy for today's MOG Tracker fixes.
//
// Run:
//   cd ~/Documents/Automation/mog-tracker-app
//   node scripts/deploy-all.mjs
//
// What it does, in order:
//   1. Applies supabase/migrations/036_schema_fixes_and_audit.sql (tries exec_sql RPC,
//      falls back to direct pg connection if DATABASE_URL is set).
//   2. Prints current DB state so you can confirm schema took.
//   3. Archives stale VitalX prospects + seeds 22 fresh DMV healthcare leads.
//   4. Shows a git summary and offers to commit + push on your confirmation.
//
// Reads .env.local for Supabase credentials.
// If DATABASE_URL is present, uses it for raw SQL (most reliable).
// Otherwise falls back to the JS client's rpc('exec_sql') which requires
// the RPC to exist in your Supabase project.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import readline from 'readline'
import { createClient } from '@supabase/supabase-js'

// ---- Load env ----
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env.local not found. Run from the mog-tracker-app directory.')
  process.exit(1)
}
const env = {}
for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
  if (!l || l.startsWith('#')) continue
  const i = l.indexOf('=')
  if (i === -1) continue
  env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
}

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const DB_URL = env.DATABASE_URL || process.env.DATABASE_URL

if (!SUPA_URL || !SERVICE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local')
  process.exit(1)
}

const sb = createClient(SUPA_URL, SERVICE_KEY)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
function ask(q) { return new Promise(r => rl.question(q, a => r(a.trim()))) }

// ================================================================
// STEP 1: Apply migration 036
// ================================================================
console.log('\n======================================================')
console.log('  STEP 1/4  Apply migration 036 (schema fixes + audit)')
console.log('======================================================\n')

const migFile = path.join(process.cwd(), 'supabase/migrations/036_schema_fixes_and_audit.sql')
if (!fs.existsSync(migFile)) {
  console.error('ERROR: Migration file missing:', migFile)
  process.exit(1)
}
const migSql = fs.readFileSync(migFile, 'utf8')

let migApplied = false
let migMethod = ''

// Try 1: direct pg connection (most reliable for DDL)
if (DB_URL) {
  try {
    const pg = await import('pg').catch(() => null)
    if (pg) {
      const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
      await client.connect()
      await client.query(migSql)
      await client.end()
      migApplied = true
      migMethod = 'direct pg'
    }
  } catch (e) {
    console.log('Direct pg failed:', e.message)
  }
}

// Try 2: rpc('exec_sql')
if (!migApplied) {
  try {
    const { error } = await sb.rpc('exec_sql', { sql_text: migSql })
    if (!error) { migApplied = true; migMethod = 'rpc(exec_sql)' }
    else console.log('rpc(exec_sql) failed:', error.message)
  } catch (e) {
    console.log('rpc(exec_sql) threw:', e.message)
  }
}

if (!migApplied) {
  console.log('')
  console.log('Automated migration apply failed. Do this manually (30 seconds):')
  console.log('')
  console.log('  1. Open: https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new')
  console.log('  2. Paste the contents of supabase/migrations/036_schema_fixes_and_audit.sql')
  console.log('  3. Click Run. Wait for "Success."')
  console.log('')
  const ans = await ask('After you have done this, type "done" to continue, or "abort" to stop: ')
  if (ans.toLowerCase() !== 'done') {
    console.log('Aborting.')
    rl.close()
    process.exit(1)
  }
} else {
  console.log(`✓ Migration 036 applied via ${migMethod}`)
}

// ================================================================
// STEP 2: Verify schema took
// ================================================================
console.log('\n======================================================')
console.log('  STEP 2/4  Verify schema')
console.log('======================================================\n')

async function columnExists(table, column) {
  const r = await sb.from(table).select(column).limit(1)
  return !r.error
}

const checks = [
  ['gov_leads', 'archived_at'],
  ['gov_leads', 'last_reviewed_amendment_count'],
  ['gov_leads', 'amendment_reviewed_at'],
  ['commercial_leads', 'archived_at'],
]
let allOk = true
for (const [t, c] of checks) {
  const ok = await columnExists(t, c)
  console.log(`  ${ok ? '✓' : '✗'} ${t}.${c}`)
  if (!ok) allOk = false
}

// Check new tables
for (const t of ['feed_runs', 'deleted_audit']) {
  const r = await sb.from(t).select('*').limit(1)
  const ok = !r.error
  console.log(`  ${ok ? '✓' : '✗'} table ${t}`)
  if (!ok) allOk = false
}

if (!allOk) {
  console.log('\nSchema verification failed. Stopping before data changes.')
  rl.close()
  process.exit(1)
}

// ================================================================
// STEP 3: Refresh VitalX commercial prospects
// ================================================================
console.log('\n======================================================')
console.log('  STEP 3/4  Refresh VitalX commercial prospects')
console.log('======================================================\n')

// Show current
const { data: current } = await sb
  .from('commercial_leads')
  .select('id, organization_name, status, last_contact_date')
  .eq('entity', 'vitalx').is('archived_at', null)

const stale = (current || []).filter(r => r.status === 'prospect' && !r.last_contact_date)
console.log(`Currently ${current?.length ?? 0} active VitalX prospects. ${stale.length} are stale (prospect + never contacted).`)

const proceed = await ask('Archive stale ones and seed 22 fresh DMV healthcare prospects? (y/N) ')
if (proceed.toLowerCase() === 'y' || proceed.toLowerCase() === 'yes') {
  if (stale.length > 0) {
    await sb.from('commercial_leads').update({ archived_at: new Date().toISOString() }).in('id', stale.map(r => r.id))
    console.log(`  ✓ Archived ${stale.length} stale prospects`)
  }

  const FRESH = [
    { organization_name: 'Adventist HealthCare',                service_category: 'Hospital Systems',          website: 'https://www.adventisthealthcare.com',   notes: 'Montgomery County MD. Multi-campus system (Shady Grove, White Oak, Fort Washington). Target: inter-facility specimen and pharmacy transport.' },
    { organization_name: 'Luminis Health',                      service_category: 'Hospital Systems',          website: 'https://www.luminishealth.org',          notes: 'Anne Arundel Medical Center + Doctors Community. Recent system merger; consolidation opportunities.' },
    { organization_name: 'Virginia Hospital Center',            service_category: 'Hospital Systems',          website: 'https://www.virginiahospitalcenter.com', notes: 'Arlington VA, independent. Mayo Clinic Care Network affiliate. Courier contracts through Supply Chain.' },
    { organization_name: 'Howard University Hospital',          service_category: 'Hospital Systems',          website: 'https://huhealthcare.com',                notes: 'NW DC. Now Adventist affiliate. Cross-system specimen routing opportunity.' },
    { organization_name: 'Children\'s National Hospital',       service_category: 'Hospital Systems',          website: 'https://childrensnational.org',           notes: 'DC pediatric specialty + Silver Spring research campus. Pediatric specimens need special handling.' },
    { organization_name: 'NMS Labs',                            service_category: 'Reference Labs',             website: 'https://www.nmslabs.com',                 notes: 'Forensic + clinical. Willow Grove PA HQ, DMV pickup routes. Scheduled specimen pickups.' },
    { organization_name: 'Eurofins Scientific',                 service_category: 'Reference Labs',             website: 'https://www.eurofinsus.com',              notes: 'Global clinical/environmental labs. Multiple DMV sites. Esoteric testing volumes growing.' },
    { organization_name: 'ARUP Laboratories',                   service_category: 'Reference Labs',             website: 'https://www.aruplab.com',                 notes: 'Utah reference lab. Overnight specimen shipment from DMV collection points.' },
    { organization_name: 'BAYADA Home Health Care',             service_category: 'Home Health',                website: 'https://www.bayada.com',                  notes: 'Large national home health, multiple DMV branches. High-frequency same-day medication routes.' },
    { organization_name: 'Aveanna Healthcare',                  service_category: 'Home Health',                website: 'https://www.aveanna.com',                 notes: 'Pediatric + adult home health. Several DMV offices. Specialty drug delivery for chronic patients.' },
    { organization_name: 'Option Care Health',                  service_category: 'Pharmacy/Specialty',         website: 'https://www.optioncarehealth.com',        notes: 'Largest US home infusion provider. Chantilly VA pharmacy. Temperature-controlled = premium pricing.' },
    { organization_name: 'DaVita Kidney Care',                  service_category: 'Home Health',                website: 'https://www.davita.com',                  notes: 'Hundreds of DMV dialysis centers. Scheduled lab pickups multiple times per week.' },
    { organization_name: 'Fresenius Kidney Care',               service_category: 'Home Health',                website: 'https://www.freseniuskidneycare.com',     notes: 'Second-largest dialysis chain. Specimens to Spectra Labs. Predictable volume.' },
    { organization_name: 'US Renal Care',                       service_category: 'Home Health',                website: 'https://www.usrenalcare.com',             notes: 'Plano TX HQ, growing DMV footprint. Dialysis specimen transport.' },
    { organization_name: 'Shady Grove Fertility',               service_category: 'Clinical Research/Biotech',  website: 'https://www.shadygrovefertility.com',     notes: 'Largest DMV fertility practice (Rockville, Fair Oaks, Frederick). Cryogenic embryo transport = premium.' },
    { organization_name: 'CCRM Fertility Northern VA',          service_category: 'Clinical Research/Biotech',  website: 'https://www.ccrmivf.com',                 notes: 'Fairfax. Same-day specimen transport with chain-of-custody.' },
    { organization_name: 'Columbia Fertility Associates',       service_category: 'Clinical Research/Biotech',  website: 'https://columbiafertility.com',           notes: 'DC + Bethesda. Independent practice. Partner lab specimen transport.' },
    { organization_name: 'ModivCare',                           service_category: 'NEMT Brokers',               website: 'https://www.modivcare.com',               notes: 'Largest US NEMT broker. VA + DC Medicaid. Subcontracts to local providers -- best path in.' },
    { organization_name: 'Access2Care (Global Medical Response)', service_category: 'NEMT Brokers',             website: 'https://www.access2care.net',             notes: 'NEMT and hospital transport broker. MD Medicaid network.' },
    { organization_name: 'Patient First',                       service_category: 'Hospital Systems',          website: 'https://www.patientfirst.com',            notes: 'Regional urgent care chain (VA, MD, PA). 80+ clinics. Nightly in-house lab specimen routes.' },
    { organization_name: 'GoHealth Urgent Care',                service_category: 'Hospital Systems',          website: 'https://www.gohealthuc.com',              notes: 'Expanding DMV urgent care. Partners with local health systems.' },
    { organization_name: 'Washington Regional Transplant Community', service_category: 'Clinical Research/Biotech', website: 'https://www.beadonor.org',            notes: 'DC region OPO. Tissue/organ transport time-critical + premium. Mission-aligned.' },
  ]

  const rows = FRESH.map(p => ({ entity: 'vitalx', status: 'prospect', ...p }))
  const { data: seeded, error: seedErr } = await sb.from('commercial_leads')
    .upsert(rows, { onConflict: 'entity,organization_name', ignoreDuplicates: true })
    .select('id, organization_name')

  if (seedErr) {
    console.log(`  ✗ Seed failed: ${seedErr.message}`)
  } else {
    console.log(`  ✓ Seeded ${seeded?.length ?? 0} fresh prospects`)
  }
} else {
  console.log('  (skipped)')
}

// ================================================================
// STEP 4: Commit + push
// ================================================================
console.log('\n======================================================')
console.log('  STEP 4/4  Commit and push to trigger Vercel deploy')
console.log('======================================================\n')

try {
  const status = execSync('git status --short', { encoding: 'utf8' })
  console.log('Pending changes:')
  console.log(status || '(none)')

  if (status.trim()) {
    const pushOk = await ask('Commit everything and push to main? Vercel will auto-deploy. (y/N) ')
    if (pushOk.toLowerCase() === 'y' || pushOk.toLowerCase() === 'yes') {
      execSync('git add -A', { stdio: 'inherit' })
      execSync('git commit -m "Fix soft-delete, rebuild SAM feed, amendment review, VA roles, audit trail"', { stdio: 'inherit' })
      execSync('git push origin main', { stdio: 'inherit' })
      console.log('\n✓ Pushed. Check Vercel dashboard for deploy status.')
    } else {
      console.log('  (skipped commit/push)')
    }
  } else {
    console.log('  (nothing to commit)')
  }
} catch (e) {
  console.log('Git step error:', e.message)
}

console.log('\n======================================================')
console.log('  DONE')
console.log('======================================================')
console.log('')
console.log('Next:')
console.log('  1. Wait ~90 sec for Vercel deploy')
console.log('  2. Log in at https://mog-tracker-app.vercel.app/')
console.log('  3. Sidebar → Feed Health → click "Run now" on SAM.gov Feed')
console.log('  4. Watch it pull 1000+ opportunities (vs. the old 300 cap)')
console.log('  5. Add a VA: node scripts/add-user.mjs --email x@y.com --role va_entity --entities vitalx')
console.log('')

rl.close()
