// POST /api/leads/suggest-subs
// Body: { gov_lead_id: string }
// Returns the top subcontractors that match the opportunity's NAICS, keywords,
// geography, and needed certifications, with a plain-language match rationale.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type Sub = {
  id: string
  company_name: string
  services_offered: string | null
  naics_codes: string[] | null
  certifications: string[] | null
  set_asides: string[] | null
  geographic_coverage: string | null
  teaming_agreement_status: string | null
  entities_associated: string[] | null
}

export async function POST(request: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const govLeadId = body.gov_lead_id as string | undefined
  if (!govLeadId) return NextResponse.json({ error: 'gov_lead_id required' }, { status: 400 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: lead, error: leadErr } = await svc
    .from('gov_leads')
    .select('id, entity, title, description, naics_code, set_aside, place_of_performance')
    .eq('id', govLeadId).maybeSingle()
  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: subs } = await svc.from('subcontractors')
    .select('id, company_name, services_offered, naics_codes, certifications, set_asides, geographic_coverage, teaming_agreement_status, entities_associated')
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, suggestions: [] })

  const haystack = ((lead.title || '') + ' ' + (lead.description || '')).toLowerCase()
  const placeLower = (lead.place_of_performance || '').toLowerCase()
  const wantCert = (lead.set_aside || '').toLowerCase()

  const scored = (subs as Sub[]).map(s => {
    let score = 0
    const reasons: string[] = []

    // NAICS match
    if (lead.naics_code && (s.naics_codes || []).includes(lead.naics_code)) {
      score += 40
      reasons.push('NAICS ' + lead.naics_code + ' match')
    }

    // Services-offered keyword match
    if (s.services_offered) {
      const keywords = s.services_offered.toLowerCase().split(/[\s,;.]+/).filter(k => k.length > 3)
      const hits = keywords.filter(k => haystack.includes(k))
      if (hits.length > 0) {
        score += Math.min(25, hits.length * 5)
        reasons.push('scope keywords (' + Array.from(new Set(hits)).slice(0, 4).join(', ') + ')')
      }
    }

    // Cert match
    if (wantCert && (s.certifications || []).map(c => c.toLowerCase()).some(c => wantCert.includes(c) || c.includes(wantCert))) {
      score += 20
      reasons.push('cert match (' + (s.certifications || []).join(', ') + ')')
    }

    // Geographic match
    if (placeLower && s.geographic_coverage && placeLower.split(/[,\s]+/).some((token: string) => !!token && s.geographic_coverage!.toLowerCase().includes(token))) {
      score += 10
      reasons.push('geographic fit (' + s.geographic_coverage + ')')
    }

    // Teaming agreement already executed
    if (s.teaming_agreement_status === 'executed') {
      score += 5
      reasons.push('teaming agreement executed')
    }

    // Entity association (prefer same-entity subs)
    if ((s.entities_associated || []).includes(lead.entity)) {
      score += 5
      reasons.push('previously used by ' + lead.entity)
    }

    return { sub: s, score, reasons }
  })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const suggestions = scored.map(r => ({
    id: r.sub.id,
    company_name: r.sub.company_name,
    score: r.score,
    rationale: r.reasons.join(' Â· '),
    certifications: r.sub.certifications || [],
    teaming_agreement_status: r.sub.teaming_agreement_status,
  }))

  return NextResponse.json({ ok: true, suggestions })
}
