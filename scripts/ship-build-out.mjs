#!/usr/bin/env node
// Ship the full build-out in one shot.
//
// Order of operations:
//   1. Run migration lint — bail if any migration is not idempotent.
//   2. Apply migration 037 to Supabase via direct pg.
//   3. Verify new schema.
//   4. Commit every changed/new file to origin/main via GitHub REST API.
//   5. Print Vercel deploy link + next verification steps.
//
// Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// DATABASE_URL, GITHUB_TOKEN. Optional: ANTHROPIC_API_KEY, RESEND_API_KEY.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { commitFiles } from './lib/github-commit.mjs'

const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#')) continue
  const i = l.indexOf('='); if (i === -1) continue
  env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, GITHUB_TOKEN } = env
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('missing Supabase creds'); process.exit(1) }
if (!DATABASE_URL) { console.error('missing DATABASE_URL'); process.exit(1) }
if (!GITHUB_TOKEN) { console.error('missing GITHUB_TOKEN (fine-grained PAT)'); process.exit(1) }

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

console.log('\n=== STEP 1/4: Migration lint ===')
try {
  execSync('node scripts/lint-migrations.mjs', { stdio: 'inherit' })
  console.log('lint: OK')
} catch {
  console.error('lint failed — aborting')
  process.exit(1)
}

console.log('\n=== STEP 2/4: Apply migration 037 ===')
const migFile = path.join(process.cwd(), 'supabase/migrations/037_ai_scoring_and_undo.sql')
if (!fs.existsSync(migFile)) { console.error('migration 037 missing'); process.exit(1) }
const pg = await import('pg')
const pgClient = new pg.default.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
try {
  await pgClient.connect()
  await pgClient.query(fs.readFileSync(migFile, 'utf8'))
  console.log('migration 037: applied')
} catch (e) {
  console.error('migration 037 failed:', e.message)
  try { await pgClient.end() } catch {}
  process.exit(1)
}
try { await pgClient.end() } catch {}

{
  const c = new pg.default.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  await c.query("NOTIFY pgrst, 'reload schema'")
  await c.end()
}

console.log('\n=== STEP 3/4: Verify schema ===')
await new Promise(r => setTimeout(r, 3000))
const checks = [
  ['gov_leads', 'ai_fit_score'],
  ['gov_leads', 'ai_reasoning'],
  ['ai_scoring_budget', null],
  ['digest_subscriptions', null],
  ['deleted_audit', 'undone_at'],
]
let allOk = true
for (const [table, col] of checks) {
  const r = await sb.from(table).select(col ?? '*').limit(1)
  const ok = !r.error
  console.log('  ' + (ok ? 'OK  ' : 'FAIL  ') + table + (col ? '.' + col : ''))
  if (!ok) allOk = false
}
if (!allOk) { console.error('schema verification failed'); process.exit(1) }

console.log('\n=== STEP 4/4: Commit everything via GitHub API ===')
const filesToShip = [
  'scripts/lint-migrations.mjs',
  'scripts/lib/github-commit.mjs',
  'scripts/ship-build-out.mjs',
  'scripts/test-rbac.mjs',
  'supabase/migrations/037_ai_scoring_and_undo.sql',
  'src/lib/email.ts',
  'src/lib/clin-templates.ts',
  'src/app/api/cron/feed-health-alert/route.ts',
  'src/app/api/cron/morning-digest/route.ts',
  'src/app/api/leads/ai-score/route.ts',
  'src/app/api/leads/suggest-subs/route.ts',
  'src/app/api/leads/undo-delete/route.ts',
  'src/components/common/BulkActionBar.tsx',
  'src/components/dashboard/PipelineTrendChart.tsx',
  'vercel.json',
  '.github/workflows/lint.yml',
]
const fileEntries = []
for (const rel of filesToShip) {
  const full = path.join(process.cwd(), rel)
  if (!fs.existsSync(full)) { console.error('missing: ' + rel); process.exit(1) }
  fileEntries.push({ path: rel, content: fs.readFileSync(full, 'utf8') })
}
for (const optional of ['LESSONS_LEARNED.md', 'AUDIT_REPORT.md']) {
  const full = path.join(process.cwd(), optional)
  if (fs.existsSync(full)) fileEntries.push({ path: optional, content: fs.readFileSync(full, 'utf8') })
}
console.log('  shipping ' + fileEntries.length + ' files')
const result = await commitFiles({
  branch: 'main',
  message: 'feat: SAM feed alerts, morning digest, AI scoring, bulk actions, sub auto-suggest, pipeline chart, undo, RBAC tests, migration lint',
  files: fileEntries,
})
console.log('  committed: ' + result.htmlUrl)

console.log('\n=== DONE ===')
console.log('')
console.log('Vercel will auto-deploy in ~90 seconds.')
console.log('')
console.log('Next: verify on live site:')
console.log('  1. Log in to https://mog-tracker-app.vercel.app/')
console.log('  2. Navigate to MOG Command to see the new pipeline chart.')
console.log('  3. Open a gov lead, click the new "AI Score" button (requires ANTHROPIC_API_KEY + AI_SCORING_ENABLED=1).')
console.log('  4. /admin/feed-health -> "Run now" on SAM.gov Feed, watch the count of new leads.')
console.log('  5. Run node scripts/test-rbac.mjs to verify RBAC behaviors.')
console.log('')
