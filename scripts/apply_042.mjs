import fs from 'fs'
import { Client } from 'pg'

let DATABASE_URL = ''
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (line.startsWith('DATABASE_URL=')) DATABASE_URL = line.slice('DATABASE_URL='.length).trim()
}

const sql = fs.readFileSync('supabase/migrations/042_drive_folder_id_columns.sql', 'utf8')
const c = new Client({ connectionString: DATABASE_URL })
await c.connect()

try {
  await c.query('BEGIN'); await c.query(sql); await c.query('COMMIT')
  console.log('042 applied')
} catch (e) {
  await c.query('ROLLBACK').catch(() => {})
  console.error('042 failed:', e.message)
  process.exit(1)
}

// Verify backfill worked
const r1 = await c.query(`SELECT count(*) FROM gov_leads WHERE drive_folder_id IS NOT NULL`)
console.log('gov_leads.drive_folder_id populated rows:', r1.rows[0].count)
const r2 = await c.query(`SELECT count(*) FROM gov_leads WHERE drive_folder_url IS NOT NULL`)
console.log('gov_leads.drive_folder_url populated rows (for comparison):', r2.rows[0].count)
const r3 = await c.query(`SELECT id, drive_folder_id, drive_folder_url FROM gov_leads WHERE drive_folder_id IS NOT NULL LIMIT 3`)
console.log('Sample rows with both columns:')
for (const r of r3.rows) console.log(' ', r.drive_folder_id.slice(0,28), '|', r.drive_folder_url.slice(0,80))

await c.end()
