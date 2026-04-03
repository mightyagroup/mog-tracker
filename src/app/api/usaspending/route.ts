import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USA_BASE = 'https://api.usaspending.gov/api/v2'

function yearsAgo(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().slice(0, 10)
}

function parsePop(pop?: string | null): { country: string; state?: string; city?: string } | null {
  if (!pop) return null
  const text = pop.trim()
  const stateMatch = text.match(/\b(A[LKZ]|C[AD]|D[EC]|F[LM]|G[AU]|H[I]|I[DLN]|K[SY]|L[A]|M[EDAINSOT]|N[EVHJMYC]|O[HKR]|P[AR]|Q[UA]|R[I]|S[CDT]|T[NX]|U[T]|V[ATC]|W[AVI])\b/i)
  const cityMatch = text.match(/^(.+?)(?:,|\s+-\s+|\s+\(|$)/)
  if (stateMatch) {
    return {
      country: 'USA',
      state: stateMatch[1].toUpperCase(),
      city: cityMatch ? cityMatch[1].trim() : undefined,
    }
  }
  return { country: 'USA', city: cityMatch ? cityMatch[1].trim() : undefined }
}

async function searchUsaSpending(filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${USA_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  })
  if (!res.ok) {
    throw new Error(`USASpending API returned status ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data.results) ? data.results : []
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      lead_id,
      solicitation_number,
      naics_code,
      place_of_performance,
      agency,
    } = body

    if (!naics_code && !solicitation_number) {
      return NextResponse.json({ found: false, error: 'Missing solicitation_number or naics_code' }, { status: 400 })
    }

    const timePeriod = [{ start_date: yearsAgo(5), end_date: new Date().toISOString().slice(0, 10) }]

    type ReusableLead = {
      manual_pricing_override?: boolean
      previous_award_total?: number
      incumbent_contractor?: string
      award_history_notes?: string
      usaspending_match_method?: string
      usaspending_confidence?: string
      source?: string
    }

    let existingLead: ReusableLead | null = null
    let supabase: ReturnType<typeof createClient> | null = null

    if (lead_id) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data } = await supabase.from('gov_leads').select('*').eq('id', lead_id).single()
      existingLead = data as ReusableLead | null
      if (existingLead && existingLead.manual_pricing_override) {
        return NextResponse.json({
          found: Boolean(existingLead.previous_award_total || existingLead.incumbent_contractor),
          previous_award_total: existingLead.previous_award_total,
          incumbent_contractor: existingLead.incumbent_contractor,
          award_history_notes: existingLead.award_history_notes,
          usaspending_match_method: existingLead.usaspending_match_method,
          usaspending_confidence: existingLead.usaspending_confidence,
          manual_pricing_override: existingLead.manual_pricing_override,
          source: existingLead.source,
          message: 'Manual override active; skipping external lookup',
        })
      }
    }

    const buildBase = {
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        time_period: timePeriod,
      },
      fields: [
        'Award ID', 'Recipient Name', 'Award Amount', 'Start Date', 'End Date',
        'awarding_agency_name', 'Description', 'Place of Performance Country', 'Place of Performance State Code', 'Place of Performance City Name',
      ],
      sort: 'Award Date',
      order: 'desc',
      limit: 20,
      page: 1,
    }

    let awardData: Record<string, unknown>[] = []
    let matchMethod = 'None'
    let confidence = 'None'

    // STEP 1: solicitation number match
    if (solicitation_number) {
      const payload = {
        ...buildBase,
        filters: {
          ...buildBase.filters,
          keyword: solicitation_number,
          // Attempt explicit award_id filter if supported
          award_id: [solicitation_number],
        },
      }
      try {
        awardData = await searchUsaSpending(payload)
      } catch {
        // ignore but continue to next search method
      }
      if (awardData.length > 0) {
        matchMethod = 'Solicitation'
        confidence = 'High'
      }
    }

    // STEP 2: location match (NAICS + pop)
    if (awardData.length === 0 && naics_code && place_of_performance) {
      const pop = parsePop(place_of_performance)
      if (pop) {
        const location: Record<string, string> = { country: pop.country }
        if (pop.state) location.state = pop.state
        if (pop.city) location.city = pop.city

        const payload = {
          ...buildBase,
          filters: {
            ...buildBase.filters,
            naics_codes: [naics_code],
            place_of_performance_locations: [location],
          },
        }
        try {
          awardData = await searchUsaSpending(payload)
        } catch {
          // ignore and continue
        }
        if (awardData.length > 0) {
          matchMethod = 'Location'
          confidence = 'Medium'
        }
      }
    }

    // STEP 3: agency match (NAICS + agency, recent first)
    if (awardData.length === 0 && naics_code && agency) {
      const toptierName = agency.split('>')[0].trim()
      const agencyFilter = toptierName ? [{ type: 'awarding', tier: 'toptier', name: toptierName }] : undefined
      if (agencyFilter) {
        const payload = {
          ...buildBase,
          filters: {
            ...buildBase.filters,
            naics_codes: [naics_code],
            agencies: agencyFilter,
          },
        }
        try {
          awardData = await searchUsaSpending(payload)
        } catch {
          // ignore
        }
        if (awardData.length > 0) {
          matchMethod = 'Agency'
          confidence = 'Low'
        }
      }
    }

    if (awardData.length === 0) {
      return NextResponse.json({
        found: false,
        message: 'No prior award data found for this specific contract',
      })
    }

    // Pick the most recent award (sorting already by award date descending)
    const primary = awardData[0]
    const previousAward = Number(primary['Award Amount'] ?? 0)
    const incumbent = String(primary['Recipient Name'] ?? '')
    const historyNotes = `Match method: ${matchMethod}; ${awardData.length} award(s) from USASpending` +
      `\nMost recent award: ${incumbent} $${previousAward.toLocaleString()} ${primary['Start Date'] ?? ''}`

    // Cache to Supabase if we have a lead id and not manual override
    if (supabase && existingLead && !existingLead.manual_pricing_override) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('gov_leads') as any).update({
        previous_award_total: previousAward,
        incumbent_contractor: incumbent,
        award_history_notes: historyNotes,
        usaspending_match_method: matchMethod,
        usaspending_confidence: confidence,
      }).eq('id', lead_id)
    }

    return NextResponse.json({
      found: true,
      usaspending_match_method: matchMethod,
      usaspending_confidence: confidence,
      previous_award_total: previousAward,
      incumbent_contractor: incumbent,
      award_history_notes: historyNotes,
      raw: awardData,
    })
  } catch (err) {
    console.error('USASpending lookup failed', String(err))
    return NextResponse.json({ found: false, error: 'USASpending lookup failed' }, { status: 500 })
  }
}

