import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: leads, error } = await supabase
      .from('gov_leads')
      .select('id,entity,solicitation_number,updated_at')
      .not('solicitation_number', 'is', null)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to read leads' }, { status: 500 })
    }

    const groups = new Map<string, Array<{ id: string; updated_at: string }>>()
    ;(leads ?? []).forEach((lead: { entity: string; solicitation_number: string; id: string; updated_at: string }) => {
      const key = `${lead.entity}::${lead.solicitation_number}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push({ id: lead.id, updated_at: lead.updated_at })
    })

    let merged = 0
    for (const items of Array.from(groups.values())) {
      if (items.length <= 1) continue
      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      const remove = items.slice(1)
      const removeIds = remove.map(r => r.id)
      const { error: delError } = await supabase
        .from('gov_leads')
        .delete()
        .in('id', removeIds)
      if (delError) {
        console.error('Error deleting duplicates', delError)
        continue
      }
      merged += removeIds.length
    }

    return NextResponse.json({ success: true, merged })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to merge duplicates' }, { status: 500 })
  }
}
