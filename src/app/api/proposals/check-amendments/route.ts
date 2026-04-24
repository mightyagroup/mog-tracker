import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/proposals/check-amendments  { proposal_id: string }
// Also callable as GET /api/cron/check-amendments (no body) — scans all active proposals.
//
// Looks up the solicitation on SAM.gov by notice_id or solicitation_number. Records
// amendment_count and a list of amendment dates. If the count has grown since last
// check, flags the proposal via amendments_detected and updates amendments_latest_check.

export const runtime = 'nodejs'
export const maxDuration = 90

async function checkOne(proposal: Record<string, unknown>, supa: ReturnType<typeof createClient>): Promise<Record<string, unknown>> {
  const samApiKey = process.env.SAMGOV_API_KEY
  if (!samApiKey) return { proposal_id: proposal.id, skipped: 'SAMGOV_API_KEY not set' }
  const solNum = proposal.solicitation_number as string | null
  if (!solNum) return { proposal_id: proposal.id, skipped: 'no solicitation_number' }

  const url = 'https://api.sam.gov/prod/opportunities/v2/search?api_key=' + samApiKey +
    '&solnum=' + encodeURIComponent(solNum) + '&limit=1'
  const r = await fetch(url)
  if (!r.ok) {
    return { proposal_id: proposal.id, error: 'SAM ' + r.status }
  }
  const j = await r.json()
  const opp = j.opportunitiesData?.[0]
  if (!opp) return { proposal_id: proposal.id, not_found: true }

  const modifications: Array<{ date: string; description?: string }> = (opp.modifications || []).map((m: Record<string, unknown>) => ({
    date: (m.modificationNumber as string) || (m.postedDate as string) || '',
    description: m.description as string | undefined,
  }))
  const newCount = modifications.length
  const prior = (proposal.amendments_detected as unknown[]) || []
  const priorCount = Array.isArray(prior) ? prior.length : 0

  const patch: Record<string, unknown> = {
    amendments_latest_check: new Date().toISOString(),
    amendments_detected: modifications,
    amendment_count: newCount,
  }
  if (newCount > priorCount) {
    patch.amendments_incorporated = false
  }
  await supa.from('proposals').update(patch).eq('id', proposal.id as string)
  return { proposal_id: proposal.id, prior_count: priorCount, new_count: newCount, new_amendments: newCount > priorCount }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const proposalId = body.proposal_id as string | undefined

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    if (proposalId) {
      const { data: p } = await supa.from('proposals').select('*').eq('id', proposalId).single()
      if (!p) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })
      const out = await checkOne(p as Record<string, unknown>, supa)
      return NextResponse.json(out)
    }

    const { data: props } = await supa.from('proposals')
      .select('id, solicitation_number, amendments_detected')
      .in('status', ['drafting', 'pink_team', 'validating', 'ready'])
      .is('archived_at', null)
    const results: Record<string, unknown>[] = []
    for (const p of (props as Record<string, unknown>[] | null) || []) {
      results.push(await checkOne(p, supa))
      await new Promise(r => setTimeout(r, 1200)) // be kind to SAM
    }
    return NextResponse.json({ ok: true, checked: results.length, results })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== 'Bearer ' + (process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return POST(req)
}
