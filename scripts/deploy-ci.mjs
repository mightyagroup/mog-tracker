#!/usr/bin/env node
// Non-interactive version of deploy-all.mjs for scripted runs.
// Requires DATABASE_URL in .env.local (Supabase session-pooler URI).
// No prompts. Exits non-zero on any failure.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

function log(msg) { console.log(msg) }
function die(msg) { console.error('FATAL:', msg); process.exit(1) }

// ---- Load env ----
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) die('.env.local not found. Run from mog-tracker-app directory.')
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

if (!SUPA_URL || !SERVICE_KEY) die('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local')
if (!DB_URL) die('DATABASE_URL must be in .env.local (Supabase session-pooler URI).')

const sb = createClient(SUPA_URL, SERVICE_KEY)

// ================================================================
// STEP 1: Apply migration 036 via direct pg
// ================================================================
log('\n=== STEP 1/4  Apply migration 036 ===')
const migFile = path.join(process.cwd(), 'supabase/migrations/036_schema_fixes_and_audit.sql')
if (!fs.existsSync(migFile)) die(`Migration file missing: ${migFile}`)
const migSql = fs.readFileSync(migFile, 'utf8')

const pg = await import('pg').catch(e => die('pg not installed: ' + e.message))
const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  await client.query(migSql)
  await client.end()
  log('  OK: migration 036 applied via direct pg')
} catch (e) {
  try { await client.end() } catch {}
  die('migration apply failed: ' + e.message)
}

// ================================================================
// STEP 2: Verify schema
// ================================================================
log('\n=== STEP 2/4  Verify schema ===')
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
  log(`  ${ok ? 'OK' : 'FAIL'}  ${t}.${c}`)
  if (!ok) allOk = false
}
for (const t of ['feed_runs', 'deleted_audit']) {
  const r = await sb.from(t).select('*').limit(1)
  const ok = !r.error
  log(`  ${ok ? 'OK' : 'FAIL'}  table ${t}`)
  if (!ok) allOk = false
}
if (!allOk) die('Schema verification failed. Aborting before data changes.')

// ================================================================
// STEP 3: Refresh VitalX commercial prospects
// ================================================================
log('\n=== STEP 3/4  Refresh VitalX prospects ===')
const { data: current, error: curErr } = await sb
  .from('commercial_leads')
  .select('id, organization_name, status, last_contact_date')
  .eq('entity', 'vitalx').is('archived_at', null)
if (curErr) die('fetch current prospects failed: ' + curErr.message)

const stale = (current || []).filter(r => r.status === 'prospect' && !r.last_contact_date)
log(`  Active VitalX prospects: ${current?.length ?? 0}. Stale (prospect + never contacted): ${stale.length}.`)

if (stale.length > 0) {
  const { error: archErr } = await sb.from('commercial_leads')
    .update({ archived_at: new Date().toISOString() })
    .in('id', stale.map(r => r.id))
  if (archErr) die('archive failed: ' + archErr.message)
  log(`  OK: archived ${stale.length} stale prospects`)
}

const FRESH = [
  { organization_name: 'Adventist HealthCare',                service_category: 'Hospital Systems',          website: 'https://www.adventisthealthcare.com',   notes: 'Montgomery County MD. Multi-campus system (Shady Grove, White Oak, Fort Washington). Target: inter-facility specimen and pharmacy transport.' },
  { organization_name: 'Luminis Health',                      service_category: 'Hospital Systems',          website: 'https://www.luminishealth.org',          notes: 'Anne Arundel Medical Center + Doctors Community. Recent system merger; consolidation opportunities.' },
  { organization_name: 'Virginia Hospital Center',            service_category: 'Hospital Systems',          website: 'https://www.virginiahospitalcenter.com', notes: 'Arlington VA, independent. Mayo Clinic Care Network affiliate. Courier contracts through Supply Chain.' },
  { organization_name: 'Howard University Hospital',          service_category: 'Hospital Systems',          website: 'https://huhealthcare.com',                notes: 'NW DC. Now Adventist affiliate. Cross-system specimen routing opportunity.' },
  { organization_name: "Children's National Hospital",        service_category: 'Hospital Systems',          website: 'https://childrensnational.org',           notes: 'DC pediatric specialty + Silver Spring research campus. Pediatric specimens need special handling.' },
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

// No unique constraint on (entity, organization_name), so dedupe in-app:
// skip any org that already has an active (non-archived) VitalX row.
const { data: existing, error: existErr } = await sb.from('commercial_leads')
  .select('organization_name').eq('entity', 'vitalx').is('archived_at', null)
if (existErr) die('fetch existing orgs failed: ' + existErr.message)
const haveActive = new Set((existing || []).map(r => r.organization_name))
const toInsert = FRESH
  .filter(p => !haveActive.has(p.organization_name))
  .map(p => ({ entity: 'vitalx', status: 'prospect', ...p }))
log(`  Will insert ${toInsert.length} of ${FRESH.length} fresh prospects (${FRESH.length - toInsert.length} already active).`)
if (toInsert.length > 0) {
  const { data: seeded, error: seedErr } = await sb.from('commercial_leads')
    .insert(toInsert)
    .select('id, organization_name')
  if (seedErr) die('seed failed: ' + seedErr.message)
  log(`  OK: seeded ${seeded?.length ?? 0} fresh prospects`)
}

// ================================================================
// STEP 4: Commit + push
// ================================================================
log('\n=== STEP 4/4  Commit and push ===')
const status = execSync('git status --short', { encoding: 'utf8' })
log('  Pending changes:\n' + (status || '  (none)'))

if (status.trim()) {
  execSync('git add -A', { stdio: 'inherit' })
  execSync('git commit -m "Fix soft-delete, rebuild SAM feed, amendment review, VA roles, audit trail"', { stdio: 'inherit' })
  execSync('git push origin main', { stdio: 'inherit' })
  log('  OK: pushed. Vercel will auto-deploy.')
} else {
  log('  (nothing to commit)')
}

log('\n=== DONE ===')
