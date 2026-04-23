import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

// POST /api/admin/apply-migration
// Body: { migration: '039' }  — runs the corresponding SQL file from supabase/migrations/
//
// Requires DATABASE_URL to be set in the Vercel environment. The Supabase connection
// string with pooler works: postgresql://postgres.lqymdyorcwgeesmkvvob:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
//
// Also requires an admin check: the logged-in user must be mighty oak admin.
// For simplicity this uses a shared WEBHOOK_SECRET header; production should
// switch to a proper RBAC check.

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const header = req.headers.get('x-admin-secret')
    if (!header || header !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'unauthorized — set x-admin-secret header to WEBHOOK_SECRET' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const migration = (body.migration as string) || ''
    if (!/^[0-9]{3}_[a-z0-9_]+$/.test(migration) && !/^[0-9]{3}$/.test(migration)) {
      return NextResponse.json({ error: 'migration must be like "039" or "039_proposal_intake_fields"' }, { status: 400 })
    }

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const files = await fs.readdir(migrationsDir)
    const match = files.find(f => f.startsWith(migration) && f.endsWith('.sql'))
    if (!match) {
      return NextResponse.json({ error: 'migration file not found: ' + migration, available: files }, { status: 404 })
    }

    const sql = await fs.readFile(path.join(migrationsDir, match), 'utf8')

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'DATABASE_URL env var not set in Vercel',
        fix: 'Add DATABASE_URL to Vercel env (the Supabase pooler connection string). Or paste the SQL below into Supabase SQL editor.',
        sql,
      }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()
    try {
      await client.query(sql)
      await client.end()
    } catch (e: unknown) {
      await client.end().catch(() => {})
      return NextResponse.json({ error: 'SQL execution failed: ' + (e as Error).message, migration: match }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      migration: match,
      message: 'Migration applied successfully. Schema cache refresh may take up to 30 seconds.',
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}

// GET /api/admin/apply-migration  — list available migrations
export async function GET() {
  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const files = await fs.readdir(migrationsDir)
    return NextResponse.json({ migrations: files.filter(f => f.endsWith('.sql')).sort() })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
