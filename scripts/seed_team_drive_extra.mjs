import fs from 'fs'
import { Client } from 'pg'

let DATABASE_URL = ''
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (line.startsWith('DATABASE_URL=')) DATABASE_URL = line.slice('DATABASE_URL='.length).trim()
}

const c = new Client({ connectionString: DATABASE_URL })
await c.connect()

// First inspect user_profiles columns + entity_type so I know what to cast
const cols = await c.query(`
  SELECT column_name, data_type, udt_name FROM information_schema.columns
  WHERE table_name='user_profiles' ORDER BY ordinal_position
`)
console.log('user_profiles columns:')
for (const r of cols.rows) console.log(' ', r.column_name, r.data_type, r.udt_name)

// Existing rows
const existing = await c.query(`SELECT email, role, entities_access, is_active FROM user_profiles`)
console.log('\nExisting user_profiles rows:', existing.rows.length)
for (const r of existing.rows) console.log(' ', r.email, '|', r.role, '|', JSON.stringify(r.entities_access), '|', r.is_active)

// Insert each missing one explicitly with parameterized query — avoids CASE type-mixing
let added = 0
for (const u of existing.rows) {
  const exists = await c.query(`SELECT 1 FROM team_drive_members WHERE email = LOWER($1)`, [u.email])
  if (exists.rows.length > 0) continue
  const role = u.role === 'va_readonly' ? 'reader' : 'editor'
  const entities = u.role === 'admin' ? [] : (u.entities_access || [])
  await c.query(
    `INSERT INTO team_drive_members (email, display_name, role, entities, active, notes)
     VALUES (LOWER($1), $2, $3, $4::entity_type[], $5, $6)`,
    [u.email, u.email, role, entities, !!u.is_active, 'Backfilled from user_profiles on ' + new Date().toISOString().slice(0,10)]
  )
  added++
  console.log('  Added:', u.email)
}
console.log('\nBackfilled', added, 'user(s).')

// Show final list
const all = await c.query(`SELECT email, role, entities, active FROM team_drive_members ORDER BY email`)
console.log('\nFull team_drive_members list (' + all.rows.length + '):')
for (const row of all.rows) {
  console.log(' ', row.email.padEnd(35),
    row.role.padEnd(10),
    (Array.isArray(row.entities) && row.entities.length > 0 ? row.entities.join(',') : 'all').padEnd(15),
    row.active ? 'active' : 'inactive')
}

await c.end()
