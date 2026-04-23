import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST /api/leads/review-amendment
// Body: { leadId: string, notes?: string }
// Marks the current amendment_count as "reviewed" by the current user.
// A fresh amendment (feed bumps amendment_count again) will re-trigger the flag.
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.leadId || typeof body.leadId !== 'string') {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    // Pull the current amendment_count so we snapshot exactly what the user reviewed
    const { data: lead, error: leadErr } = await supabase
      .from('gov_leads')
      .select('id, amendment_count, entity')
      .eq('id', body.leadId)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const currentCount = lead.amendment_count ?? 0

    const { error: updateErr } = await supabase
      .from('gov_leads')
      .update({
        last_reviewed_amendment_count: currentCount,
        amendment_reviewed_at: new Date().toISOString(),
        amendment_reviewed_by: user.id,
        amendment_review_notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
      })
      .eq('id', body.leadId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log the review as an interaction so it shows in the lead's timeline
    await supabase.from('interactions').insert({
      entity: lead.entity,
      gov_lead_id: lead.id,
      interaction_date: new Date().toISOString().slice(0, 10),
      interaction_type: 'amendment_review',
      subject: `Amendment reviewed (count: ${currentCount})`,
      notes: typeof body.notes === 'string' && body.notes.trim()
        ? body.notes
        : `User acknowledged ${currentCount} amendment(s). Flag cleared until new amendments arrive.`,
    })

    return NextResponse.json({
      success: true,
      reviewedCount: currentCount,
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
