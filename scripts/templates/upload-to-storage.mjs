#!/usr/bin/env node
// Upload tokenized templates from src/lib/bid-templates/tokenized/ to Supabase
// Storage at bid-templates/tokenized/. Run once after regenerating templates.
//
// Reads SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL from .env.local.
// Auto-creates the `bid-templates` bucket if missing (private).
//
//   node scripts/templates/upload-to-storage.mjs

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'bid-templates'
const STORAGE_PREFIX = 'tokenized'
const LOCAL_DIR = path.join(process.cwd(), 'src', 'lib', 'bid-templates', 'tokenized')

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) throw new Error('.env.local missing')
  const env = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

async function main() {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')

  const supabase = createClient(url, key)

  // Ensure bucket exists.
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets()
  if (bErr) throw bErr
  if (!buckets.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false })
    if (error) throw error
    console.log('Created bucket:', BUCKET)
  }

  if (!fs.existsSync(LOCAL_DIR)) {
    throw new Error('Local templates dir missing: ' + LOCAL_DIR)
  }

  const files = fs.readdirSync(LOCAL_DIR).filter(f => f.endsWith('.docx') || f.endsWith('.xlsx'))
  console.log('Found ' + files.length + ' templates to upload.')

  for (const f of files) {
    const buf = fs.readFileSync(path.join(LOCAL_DIR, f))
    const remote = STORAGE_PREFIX + '/' + f
    const contentType = f.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const { error } = await supabase.storage.from(BUCKET).upload(remote, buf, {
      contentType,
      upsert: true,
    })
    if (error) console.error('FAIL', f, error.message)
    else console.log('OK  ', f, '(' + buf.length + ' bytes)')
  }
  console.log('\nDone. Templates available at supabase://' + BUCKET + '/' + STORAGE_PREFIX + '/')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
