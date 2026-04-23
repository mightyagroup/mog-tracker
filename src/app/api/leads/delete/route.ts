import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// DELETE /api/leads/delete
// Body: {
//   leadId: string,
//   table: 'gov_leads' | 'commercial_leads',
//   mode: 'soft' | 'hard',        // soft = archive (auto-purge in 7d), hard = immediate permanent delete
//   confirmToken?: string          // required for hard delete, must equal the leadId
// }
// Non-admins can soft-delete only. Hard delete requires admin OR the user to have created the lead.
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.leadId || !body?.table || !body?.mode) {
      return NextResponse.json({ error: 'leadId, table, and mode are required' }, { status: 400 })
    }
    if (body.table !== 'gov_leads' && body.table !== 'commercial_leads') {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }
    if (body.mode !== 'soft' && body.mode !== 'hard') {
      return NextResponse.json({ error: 'mode must be soft or hard' }, { status: 400 })
    }

    // Get the user's role for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const canManage = ['admin', 'manager'].includes(profile?.role ?? '')

    if (!canManage) {
      return NextResponse.json({ error: 'Your role cannot delete leads' }, { status: 403 })
    }

    // Service client needed for deleted_audit writes (RLS is service-role only)
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // ── SOFT DELETE: just set archived_at ──
    if (body.mode === 'soft') {
      const { error } = await service
        .from(body.table)
        .update({ archived_at: new Date().toISOString() })
        .eq('id', body.leadId)
        .is('archived_at', null)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, mode: 'soft', willPurgeIn: '7 days' })
    }

    // ── HARD DELETE: requires admin + confirm token ──
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can permanently delete' }, { status: 403 })
    }
    if (body.confirmToken !== body.leadId) {
      return NextResponse.json({
        error: 'Permanent delete requires confirmToken = leadId',
      }, { status: 400 })
    }

    // Snapshot to deleted_audit before delete
    const { data: row, error: fetchErr } = await service.from(body.table).select('*').eq('id', body.leadId).single()
    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await service.from('deleted_audit').insert({
      table_name: body.table,
      record_id: body.leadId,
      deleted_by: user.id,
      delete_reason: 'manual',
      snapshot: row,
    })

    const { error: delErr } = await service.from(body.table).delete().eq('id', body.leadId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      mode: 'hard',
      recoverableFor: '30 days',
      auditSnapshotSaved: true,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
