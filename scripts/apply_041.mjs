import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

// Load DATABASE_URL from .env.local
const envText = fs.readFileSync('.env.local', 'utf8')
let DATABASE_URL = ''
for (const line of envText.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) DATABASE_URL = line.slice('DATABASE_URL='.length).trim()
}
if (!DATABASE_URL) { console.error('DATABASE_URL not found'); process.exit(1) }

const sql = fs.readFileSync('supabase/migrations/041_team_drive_members.sql', 'utf8')

const client = new Client({ connectionString: DATABASE_URL })
await client.connect()
console.log('Connected to Supabase Postgres')

try {
  await client.query('BEGIN')
  await client.query(sql)
  await client.query('COMMIT')
  console.log('Migration 041 applied OK')
} catch (e) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('Migration 041 failed:', e.message)
  process.exit(1)
}

// Verify tables exist
const r1 = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN ('team_drive_members', 'drive_folder_shares')
  ORDER BY table_name
`)
console.log('Tables present:', r1.rows.map(r => r.table_name).join(', '))

const r2 = await client.query(`SELECT email, display_name, role, entities, active FROM team_drive_members ORDER BY email`)
console.log('Seeded members:')
for (const row of r2.rows) {
  console.log(' ', row.email, '|', row.display_name || '(no name)', '|', row.role, '|',
    Array.isArray(row.entities) && row.entities.length > 0 ? row.entities.join(',') : 'all',
    '|', row.active ? 'active' : 'inactive')
}

await client.end()
