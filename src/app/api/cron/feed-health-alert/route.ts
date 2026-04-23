// Runs daily. Scans feed_runs for the past 24 h. If any cron ended with
// status='error' or inserted=0 despite being expected to produce leads, sends
// an alert email so Ella notices a broken feed before a week goes by.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailLayout } from '@/lib/email'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== 'Bearer ' + cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString()
  const { data: runs, error } = await supabase
    .from('feed_runs')
    .select('id, feed_name, status, started_at, finished_at, inserted, updated, verified, failed_verification, error_message')
    .gte('started_at', since)
    .order('started_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const runsByFeed = new Map<string, typeof runs>()
  for (const r of runs || []) {
    if (!runsByFeed.has(r.feed_name)) runsByFeed.set(r.feed_name, [])
    runsByFeed.get(r.feed_name)!.push(r)
  }

  const alerts: Array<{ feed: string; reason: string; detail: string }> = []
  for (const [feed, rs] of runsByFeed) {
    const last = rs[0]
    if (!last) continue
    if (last.status === 'error') {
      alerts.push({ feed, reason: 'last run errored', detail: last.error_message || '(no message)' })
    } else if (last.status === 'ok' && (last.inserted ?? 0) === 0 && (last.updated ?? 0) === 0) {
      alerts.push({
        feed,
        reason: 'last run produced 0 new and 0 updated leads',
        detail: 'verified=' + (last.verified ?? 0) + '  failed_verification=' + (last.failed_verification ?? 0),
      })
    }
  }

  // Also warn if a feed hasn't run at all in 24 h (scheduled feeds only)
  const expectedDaily = ['sam_gov', 'eva', 'emma', 'daily_digest']
  for (const feed of expectedDaily) {
    if (!runsByFeed.has(feed)) {
      alerts.push({ feed, reason: 'no runs in last 24 h', detail: 'cron may not have triggered' })
    }
  }

  let sent = 0
  if (alerts.length > 0) {
    const rows = alerts.map(a =>
      '<tr><td style="padding:8px;border:1px solid #E5E7EB"><code>' + a.feed + '</code></td>' +
      '<td style="padding:8px;border:1px solid #E5E7EB">' + a.reason + '</td>' +
      '<td style="padding:8px;border:1px solid #E5E7EB;color:#6B7280;font-size:12px">' + escapeHtml(a.detail).slice(0, 300) + '</td></tr>'
    ).join('')

    const body =
      '<p><strong>Feed health check flagged ' + alerts.length + ' issue' + (alerts.length === 1 ? '' : 's') + '.</strong></p>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:12px">' +
      '<thead><tr style="background:#F3F4F6;text-align:left">' +
      '<th style="padding:8px;border:1px solid #E5E7EB">Feed</th>' +
      '<th style="padding:8px;border:1px solid #E5E7EB">Issue</th>' +
      '<th style="padding:8px;border:1px solid #E5E7EB">Detail</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p style="margin-top:16px">' +
      '<a href="https://mog-tracker-app.vercel.app/admin/feed-health" style="display:inline-block;background:#D4AF37;color:#111827;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Open Feed Health dashboard</a>' +
      '</p>'

    const result = await sendEmail({
      to: process.env.ALERT_EMAIL || 'admin@mightyoakgroup.com',
      subject: 'MOG Tracker: ' + alerts.length + ' feed health issue' + (alerts.length === 1 ? '' : 's'),
      html: emailLayout('Feed health alert', body),
    })
    if (result.ok) sent = 1
  }

  return NextResponse.json({
    ok: true,
    window_hours: 26,
    runs_inspected: runs?.length ?? 0,
    alerts,
    email_sent: sent,
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
