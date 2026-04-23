// POST /api/leads/undo-delete
// Body: { deleted_audit_id: string }
// Re-inserts the row from its deleted_audit snapshot and marks the audit row
// as undone. Admin-only.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const ALLOWED_TABLES = new Set(['gov_leads', 'commercial_leads', 'contacts', 'subcontractors', 'interactions', 'compliance_items', 'pricing_records'])

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const auditId = body.deleted_audit_id as string | undefined
  if (!auditId) return NextResponse.json({ error: 'deleted_audit_id required' }, { status: 400 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Role check: admins only
  const { data: profile } = await svc.from('user_profiles').select('role, is_active').eq('user_id', user.id).maybeSingle()
  if (!profile || !profile.is_active || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { data: audit, error: auditErr } = await svc
    .from('deleted_audit')
    .select('id, table_name, record_id, snapshot, undone_at, deleted_at')
    .eq('id', auditId).maybeSingle()
  if (auditErr || !audit) return NextResponse.json({ error: 'Audit record not found' }, { status: 404 })
  if (audit.undone_at)   return NextResponse.json({ error: 'Already restored' }, { status: 400 })
  if (!ALLOWED_TABLES.has(audit.table_name)) {
    return NextResponse.json({ error: 'Table ' + audit.table_name + ' is not restorable' }, { status: 400 })
  }

  // 30-day recovery window
  const ageMs = Date.now() - new Date(audit.deleted_at).getTime()
  if (ageMs > 30 * 24 * 3600 * 1000) {
    return NextResponse.json({ error: 'Recovery window expired (>30 days)' }, { status: 400 })
  }

  // Check the record isn't already present (admin re-ran an undo somehow)
  const { data: existing } = await svc.from(audit.table_name).select('id').eq('id', audit.record_id).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Record already exists — cannot re-insert' }, { status: 409 })
  }

  // Insert the snapshot. id, created_at come back from the snapshot as-is.
  const row = { ...(audit.snapshot as Record<string, unknown>) }
  const { error: insErr } = await svc.from(audit.table_name).insert([row])
  if (insErr) return NextResponse.json({ error: 'Restore failed: ' + insErr.message }, { status: 500 })

  // Mark as undone
  await svc.from('deleted_audit').update({ undone_at: new Date().toISOString(), undone_by: user.id }).eq('id', audit.id)

  return NextResponse.json({ ok: true, table: audit.table_name, id: audit.record_id })
}
