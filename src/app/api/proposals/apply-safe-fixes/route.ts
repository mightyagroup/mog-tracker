import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { humanizeDeterministic } from '@/lib/proposals/humanizer-runtime'

// POST /api/proposals/apply-safe-fixes
// Body: { proposal_id: string }
// Applies deterministic safe fixes: humanizer pass, address protocol check,
// strip curly quotes, fix em dashes. Never rewrites substantive content.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const proposalId = body.proposal_id as string
    if (!proposalId) return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { data: p } = await supa.from('proposals')
      .select('id, narrative_draft')
      .eq('id', proposalId)
      .single()

    if (!p) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })
    const prop = (p as unknown) as { narrative_draft: string | null }

    if (!prop.narrative_draft) {
      return NextResponse.json({ error: 'no narrative to fix' }, { status: 400 })
    }

    const before = prop.narrative_draft
    const after = humanizeDeterministic(before)
    const changed = before !== after

    if (changed) {
      const { error } = await supa.from('proposals').update({ narrative_draft: after }).eq('id', proposalId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      changed,
      char_delta: after.length - before.length,
      text: after,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
