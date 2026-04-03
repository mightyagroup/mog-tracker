import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SAM_API_BASE = 'https://api.sam.gov/prod/opportunities/v2/search'

export async function POST() {
  try {
    if (!process.env.SAMGOV_API_KEY) {
      return NextResponse.json({ success: false, error: 'Missing SAMGOV_API_KEY' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: leads, error } = await supabase
      .from('gov_leads')
      .select('id,solicitation_number,notice_id')
      .eq('solicitation_verified', false)
      .not('solicitation_number', 'is', null)
      .limit(100)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    let verifiedCount = 0
    for (const l of leads || []) {
      if (!l.solicitation_number) continue

      const params = new URLSearchParams({
        api_key: process.env.SAMGOV_API_KEY,
        keyword: l.solicitation_number,
        limit: '1',
      })

      try {
        const res = await fetch(`${SAM_API_BASE}?${params.toString()}`)
        if (!res.ok) continue
        const body = await res.json()
        const results = body?.elements ?? []
        if (Array.isArray(results) && results.length > 0) {
          // mark verified if any result includes our solicitation reference
          const matches = results.some((item: Record<string, unknown>) => {
            const entry = item as { solicitationNumber?: string; id?: string }
            const notice = entry.solicitationNumber || entry.id || ''
            return String(notice).toLowerCase().includes((l.solicitation_number ?? '').toLowerCase())
          })
          if (matches) {
            await supabase.from('gov_leads').update({ solicitation_verified: true }).eq('id', l.id)
            verifiedCount++
          }
        }
      } catch {
        console.error('SAM verification fetch failed')
      }
    }

    return NextResponse.json({ success: true, verified: verifiedCount, checked: leads?.length ?? 0 })
  } catch {
    return NextResponse.json({ success: false, error: 'SAM verification failed' }, { status: 500 })
  }
}
