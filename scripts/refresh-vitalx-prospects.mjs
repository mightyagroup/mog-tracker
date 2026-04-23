// Refresh VitalX commercial prospects:
//   1. Soft-delete ('prospect' status with no outreach activity) — they'll auto-purge in 7 days
//   2. Seed 22 fresh DMV-area healthcare logistics prospects with real contact starting points
//
// Usage (local): node scripts/refresh-vitalx-prospects.mjs
// Usage (dry run): node scripts/refresh-vitalx-prospects.mjs --dry-run
//
// Reads credentials from .env.local

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const e = l.indexOf('='); return [l.slice(0, e).trim(), l.slice(e + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ================================================================
// STEP 1: Show what's currently there
// ================================================================
console.log('\n=== CURRENT VITALX COMMERCIAL LEADS ===\n')

const { data: current, error: currentErr } = await supabase
  .from('commercial_leads')
  .select('id, organization_name, status, service_category, last_contact_date, created_at, archived_at')
  .eq('entity', 'vitalx')
  .is('archived_at', null)
  .order('organization_name')

if (currentErr) {
  console.error('FATAL: Could not read commercial_leads:', currentErr)
  process.exit(1)
}

console.log(`Total active: ${current.length}\n`)
for (const row of current) {
  const flag = row.status === 'prospect' && !row.last_contact_date ? '→ STALE (will archive)' : '   keep'
  console.log(`  ${flag}  ${row.organization_name.padEnd(45)} ${row.status.padEnd(12)} last=${row.last_contact_date || 'never'}`)
}

// ================================================================
// STEP 2: Soft-delete stale prospects (prospect status + never contacted)
// ================================================================
const stale = current.filter(r => r.status === 'prospect' && !r.last_contact_date)
console.log(`\n=== STEP 2: Archiving ${stale.length} stale prospects ===`)

if (stale.length > 0 && !DRY_RUN) {
  const { error: archiveErr } = await supabase
    .from('commercial_leads')
    .update({ archived_at: new Date().toISOString() })
    .in('id', stale.map(r => r.id))

  if (archiveErr) {
    console.error('FATAL: Could not archive:', archiveErr)
    process.exit(1)
  }
  console.log(`Archived ${stale.length} rows. They will be permanently deleted in 7 days by the purge-archived cron.`)
} else if (DRY_RUN) {
  console.log(`(dry run — would have archived ${stale.length})`)
}

// ================================================================
// STEP 3: Seed fresh DMV healthcare logistics prospects
// ================================================================
const FRESH_PROSPECTS = [
  // Hospital Systems — DMV
  { organization_name: 'Adventist HealthCare', service_category: 'Hospital Systems', website: 'https://www.adventisthealthcare.com', notes: 'Montgomery County MD. Multiple hospitals (Shady Grove, White Oak, Fort Washington). Target: inter-facility specimen transport and pharmacy delivery between campuses.' },
  { organization_name: 'Luminis Health', service_category: 'Hospital Systems', website: 'https://www.luminishealth.org', notes: 'Anne Arundel Medical Center + Doctors Community Medical Center (Lanham MD). Recent system formation. Target: consolidated courier routes between their two campuses.' },
  { organization_name: 'Virginia Hospital Center', service_category: 'Hospital Systems', website: 'https://www.virginiahospitalcenter.com', notes: 'Arlington VA, independent. Now affiliated with Mayo Clinic Care Network. Courier contracts usually go through Operations/Supply Chain.' },
  { organization_name: 'Howard University Hospital', service_category: 'Hospital Systems', website: 'https://huhealthcare.com', notes: 'NW DC. Academic medical center. Transferred ownership to Adventist HealthCare. Opportunity: specimen routing between HU and Adventist labs.' },
  { organization_name: 'Children\'s National Hospital', service_category: 'Hospital Systems', website: 'https://childrensnational.org', notes: 'DC pediatric specialty. Research campus in Silver Spring. Pediatric specimens often need special handling — differentiator.' },

  // Reference Labs — DMV presence
  { organization_name: 'NMS Labs', service_category: 'Reference Labs', website: 'https://www.nmslabs.com', notes: 'Forensic toxicology and clinical testing. Willow Grove PA HQ with regional pickup routes in DMV. Target: scheduled specimen pickup from regional hospitals/clinics.' },
  { organization_name: 'Eurofins Scientific', service_category: 'Reference Labs', website: 'https://www.eurofinsus.com', notes: 'Global clinical/environmental labs. Multiple DMV sites (Lancaster PA, Baltimore). Clinical diagnostics and esoteric testing volumes growing.' },
  { organization_name: 'ARUP Laboratories', service_category: 'Reference Labs', website: 'https://www.aruplab.com', notes: 'Utah-based national reference lab. Ships specimens nationwide. Opportunity: DMV collection/consolidation for overnight shipment to Salt Lake City.' },

  // Home Health / Pharmacy Delivery
  { organization_name: 'BAYADA Home Health Care', service_category: 'Home Health', website: 'https://www.bayada.com', notes: 'Large national home health with multiple DMV branches. Regular medication delivery to home patients. High-frequency same-day routes.' },
  { organization_name: 'Aveanna Healthcare', service_category: 'Home Health', website: 'https://www.aveanna.com', notes: 'Pediatric + adult home health. Several DMV offices. Specialty drug delivery for chronic patients.' },
  { organization_name: 'Option Care Health', service_category: 'Pharmacy/Specialty', website: 'https://www.optioncarehealth.com', notes: 'Largest US home + alternate-site infusion provider. Chantilly VA pharmacy. Temperature-controlled infusion deliveries — premium pricing.' },

  // Dialysis — high-frequency recurring routes
  { organization_name: 'DaVita Kidney Care', service_category: 'Home Health', website: 'https://www.davita.com', notes: 'Hundreds of DMV dialysis centers. Lab specimen pickup scheduled multiple times per week. Corporate contracts go through Regional Operations.' },
  { organization_name: 'Fresenius Kidney Care', service_category: 'Home Health', website: 'https://www.freseniuskidneycare.com', notes: 'Second-largest dialysis chain. Lab specimens to Spectra Labs (their in-network lab). Scheduled routes, predictable volume.' },
  { organization_name: 'US Renal Care', service_category: 'Home Health', website: 'https://www.usrenalcare.com', notes: 'Plano TX HQ, growing DMV footprint. Dialysis specimen transport and supply delivery.' },

  // Fertility — high-value, time-sensitive specimen transport
  { organization_name: 'Shady Grove Fertility', service_category: 'Clinical Research/Biotech', website: 'https://www.shadygrovefertility.com', notes: 'Largest fertility practice in the DMV. Multiple locations (Rockville, Fair Oaks, Frederick). Embryo/sperm transport between clinics and storage — cryogenic, premium service.' },
  { organization_name: 'CCRM Fertility Northern VA', service_category: 'Clinical Research/Biotech', website: 'https://www.ccrmivf.com', notes: 'National fertility network. DMV clinics in Fairfax. Same-day specimen transport with chain-of-custody documentation.' },
  { organization_name: 'Columbia Fertility Associates', service_category: 'Clinical Research/Biotech', website: 'https://columbiafertility.com', notes: 'Washington DC + Bethesda. Independent practice. Specimen transport to partner labs.' },

  // NEMT Brokers — subcontracting opportunities
  { organization_name: 'ModivCare', service_category: 'NEMT Brokers', website: 'https://www.modivcare.com', notes: 'Largest NEMT broker in the country. Virginia Medicaid and DC Medicaid contracts. Subcontracts transportation to local providers — best path in.' },
  { organization_name: 'Access2Care (Global Medical Response)', service_category: 'NEMT Brokers', website: 'https://www.access2care.net', notes: 'NEMT and hospital transport broker. Maryland Medicaid presence. Subcontractor network.' },

  // Urgent Care — growing specimen volume
  { organization_name: 'Patient First', service_category: 'Hospital Systems', website: 'https://www.patientfirst.com', notes: 'Regional urgent care chain, Virginia + Maryland + PA. 80+ clinics. In-house lab specimens picked up nightly — scheduled routes.' },
  { organization_name: 'GoHealth Urgent Care', service_category: 'Hospital Systems', website: 'https://www.gohealthuc.com', notes: 'Partners with local health systems (including Inova in some markets). Expanding urgent care footprint in DC/MD/VA.' },

  // Organ procurement — high-value, niche
  { organization_name: 'Washington Regional Transplant Community', service_category: 'Clinical Research/Biotech', website: 'https://www.beadonor.org', notes: 'Federally-designated OPO for the DC region. Tissue and organ transport is time-critical, premium service. Small but mission-aligned.' },
]

// Attach defaults
const seedRows = FRESH_PROSPECTS.map(p => ({
  entity: 'vitalx',
  status: 'prospect',
  ...p,
  created_at: new Date().toISOString(),
}))

console.log(`\n=== STEP 3: Seeding ${seedRows.length} fresh prospects ===`)

if (!DRY_RUN) {
  // Upsert on (entity, organization_name) to avoid dupes if script runs twice
  const { data: seeded, error: seedErr } = await supabase
    .from('commercial_leads')
    .upsert(seedRows, { onConflict: 'entity,organization_name', ignoreDuplicates: true })
    .select('id, organization_name')

  if (seedErr) {
    console.error('FATAL: Could not seed:', seedErr)
    process.exit(1)
  }
  console.log(`Seeded ${seeded?.length ?? 0} fresh prospects (duplicates skipped):`)
  for (const r of seeded || []) console.log(`  + ${r.organization_name}`)
} else {
  console.log(`(dry run — would have seeded ${seedRows.length})`)
  for (const r of seedRows) console.log(`  + ${r.organization_name}  [${r.service_category}]`)
}

console.log('\nDone. Review the VitalX tracker to assign leads to yourself or a VA.')
