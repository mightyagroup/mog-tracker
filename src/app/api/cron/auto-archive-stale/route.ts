import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Daily cron. Archives gov_leads whose deadline has passed AND were never acted on.
// Paired with purge-archived (which hard-deletes 7 days after archive), this gives
// total "7 days past deadline" auto-cleanup with a 7-day recovery window.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const triggerSource = request.headers.get('user-agent')?.toLowerCase().includes('vercel')
    ? 'vercel_cron' : 'manual'

  const startTs = Date.now()
  const { data: runRow } = await supabase
    .from('feed_runs')
    .insert({ feed_name: 'auto_archive_stale', status: 'running', trigger_source: triggerSource })
    .select('id').single()

  try {
    // Call the SQL function defined in migration 036
    const { data, error } = await supabase.rpc('auto_archive_stale_leads')

    if (error) {
      if (runRow?.id) {
        await supabase.from('feed_runs').update({
          status: 'failed', finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startTs, error_count: 1, errors: [error.message],
        }).eq('id', runRow.id)
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const archivedCount = data?.[0]?.archived_count ?? 0
    const ids = data?.[0]?.ids ?? []

    if (runRow?.id) {
      await supabase.from('feed_runs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTs,
        updated_count: archivedCount,
        run_notes: `Archived ${archivedCount} stale leads (deadline passed, never acted on)`,
      }).eq('id', runRow.id)
    }

    return NextResponse.json({ success: true, archived: archivedCount, ids })
  } catch (e) {
    if (runRow?.id) {
      await supabase.from('feed_runs').update({
        status: 'failed', finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTs, error_count: 1, errors: [String(e)],
      }).eq('id', runRow.id)
    }
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
