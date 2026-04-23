// Morning digest: every weekday at 7 AM EST (12 UTC), sends each subscribed
// admin/manager a single email with:
//   - Government leads with response_deadline in next 7 days (per entity)
//   - Commercial prospects with next_follow_up today
//   - New leads added in last 24 h

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailLayout } from '@/lib/email'

type GovLead = {
  id: string
  entity: string
  title: string
  agency: string | null
  response_deadline: string | null
  fit_score: number | null
  solicitation_number: string | null
}

type CommLead = {
  id: string
  organization_name: string
  service_category: string | null
  next_follow_up: string | null
  estimated_annual_value: number | null
}

function escapeHtml(s: string | null | undefined): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return d }
}

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US')
}

function daysUntil(iso: string | null): string {
  if (!iso) return '—'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  return d < 0 ? 'overdue' : (d === 0 ? 'today' : d + 'd')
}

function renderGovDl(govDl: GovLead[]): string {
  if (govDl.length === 0) return ''
  const rows = govDl.map(g =>
    '<tr>' +
    '<td style="padding:6px;border:1px solid #E5E7EB;text-transform:capitalize">' + g.entity + '</td>' +
    '<td style="padding:6px;border:1px solid #E5E7EB">' +
      '<a href="https://mog-tracker-app.vercel.app/' + g.entity + '?lead=' + g.id + '" style="color:#253A5E">' + escapeHtml(g.title.slice(0, 80)) + '</a>' +
      '<div style="color:#6B7280;font-size:11px">' + escapeHtml(g.agency) + '</div>' +
    '</td>' +
    '<td style="padding:6px;border:1px solid #E5E7EB">' + fmtDate(g.response_deadline) +
      '<div style="color:#DC2626;font-size:11px">' + daysUntil(g.response_deadline) + '</div>' +
    '</td>' +
    '<td style="padding:6px;border:1px solid #E5E7EB">' + (g.fit_score ?? '—') + '</td>' +
    '</tr>'
  ).join('')
  return '<h2 style="color:#253A5E;font-size:18px;margin:0 0 8px 0">Government deadlines (next 7 days)</h2>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
    '<thead><tr style="background:#F3F4F6;text-align:left">' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Entity</th>' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Title</th>' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Deadline</th>' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Fit</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>'
}

function renderComm(comm: CommLead[]): string {
  if (comm.length === 0) return ''
  const rows = comm.map(c =>
    '<tr>' +
    '<td style="padding:6px;border:1px solid #E5E7EB">' +
      '<a href="https://mog-tracker-app.vercel.app/vitalx?lead=' + c.id + '" style="color:#064E3B">' + escapeHtml(c.organization_name) + '</a>' +
    '</td>' +
    '<td style="padding:6px;border:1px solid #E5E7EB">' + escapeHtml(c.service_category) + '</td>' +
    '<td style="padding:6px;border:1px solid #E5E7EB">' + fmtUsd(c.estimated_annual_value) + '</td>' +
    '</tr>'
  ).join('')
  return '<h2 style="color:#064E3B;font-size:18px;margin:24px 0 8px 0">VitalX commercial follow-ups today</h2>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
    '<thead><tr style="background:#F3F4F6;text-align:left">' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Organization</th>' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Category</th>' +
    '<th style="padding:6px;border:1px solid #E5E7EB">Est. Annual</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>'
}

function renderNew(newleads: GovLead[]): string {
  if (newleads.length === 0) return ''
  const items = newleads.slice(0, 15).map(g => {
    const deadline = g.response_deadline
      ? ' <span style="color:#6B7280">— ' + daysUntil(g.response_deadline) + ' left</span>'
      : ''
    return '<li style="margin:4px 0"><strong style="text-transform:capitalize">' + g.entity + ':</strong> ' +
      '<a href="https://mog-tracker-app.vercel.app/' + g.entity + '?lead=' + g.id + '" style="color:#253A5E">' +
      escapeHtml(g.title.slice(0, 100)) + '</a>' + deadline + '</li>'
  }).join('')
  return '<h2 style="color:#1F2937;font-size:18px;margin:24px 0 8px 0">New gov leads in last 24 hours</h2>' +
    '<ul style="padding-left:20px;font-size:14px">' + items + '</ul>'
}

function renderDigest(govDl: GovLead[], comm: CommLead[], newleads: GovLead[]): string {
  const parts = [renderGovDl(govDl), renderComm(comm), renderNew(newleads)].filter(Boolean)
  if (parts.length === 0) return '<p>Nothing pressing this morning.</p>'
  return parts.join('')
}

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

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, email, role, entities_access, is_active')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no active admin/manager users' })
  }

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const in7Days = new Date(today.getTime() + 7 * 24 * 3600 * 1000).toISOString()
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000).toISOString()

  const [govDeadlines, commToday, newlyAdded] = await Promise.all([
    supabase.from('gov_leads')
      .select('id, entity, title, agency, response_deadline, fit_score, solicitation_number')
      .is('archived_at', null)
      .not('response_deadline', 'is', null)
      .lte('response_deadline', in7Days)
      .gte('response_deadline', today.toISOString())
      .in('status', ['new', 'reviewing', 'bid_no_bid', 'active_bid'])
      .order('response_deadline', { ascending: true })
      .limit(50),
    supabase.from('commercial_leads')
      .select('id, organization_name, service_category, next_follow_up, estimated_annual_value')
      .eq('entity', 'vitalx').is('archived_at', null)
      .eq('next_follow_up', todayIso)
      .in('status', ['prospect', 'outreach', 'proposal', 'negotiation'])
      .order('estimated_annual_value', { ascending: false, nullsFirst: false })
      .limit(50),
    supabase.from('gov_leads')
      .select('id, entity, title, agency, response_deadline, fit_score, solicitation_number')
      .is('archived_at', null)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  let sent = 0
  let failed = 0
  for (const p of profiles) {
    if (!p.email) continue
    const entitiesSet = new Set(p.role === 'admin' ? ['exousia', 'vitalx', 'ironhouse'] : (p.entities_access || []))
    const myGovDl = (govDeadlines.data || []).filter(r => entitiesSet.has(r.entity))
    const myNew = (newlyAdded.data || []).filter(r => entitiesSet.has(r.entity))
    const myComm = entitiesSet.has('vitalx') ? (commToday.data || []) : []

    if (myGovDl.length === 0 && myNew.length === 0 && myComm.length === 0) continue

    const body = renderDigest(myGovDl as GovLead[], myComm as CommLead[], myNew as GovLead[])
    const subject = 'MOG Tracker: ' + myGovDl.length + ' deadlines, ' + myComm.length + ' follow-ups, ' + myNew.length + ' new'
    const result = await sendEmail({
      to: p.email,
      subject,
      html: emailLayout('Morning digest', body),
    })
    if (result.ok) sent++; else failed++
  }

  return NextResponse.json({ ok: true, sent, failed, subscribers: profiles.length })
}
