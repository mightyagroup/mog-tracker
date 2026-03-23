import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://lqymdyorcwgeesmkvvob.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
const files = fs.readdirSync(migrationsDir).sort()

for (const file of files) {
  if (!file.endsWith('.sql')) continue
  console.log(`Running ${file}...`)
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

  // Split on statement boundaries and run each
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql }).catch(() => ({ error: 'rpc_unavailable' }))

  if (error) {
    // Fallback: try via raw REST
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    if (!res.ok) {
      console.error(`  ERROR in ${file}:`, error)
      console.error('  Fallback also failed. Please run this migration manually in the Supabase SQL Editor.')
      console.error(`  URL: https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new`)
    } else {
      console.log(`  ✓ ${file} (via fallback)`)
    }
  } else {
    console.log(`  ✓ ${file}`)
  }
}

console.log('\nDone. Verify tables at:')
console.log('https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/editor')
