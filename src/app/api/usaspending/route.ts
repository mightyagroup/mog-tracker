import { NextResponse } from 'next/server'

const USA_BASE = 'https://api.usaspending.gov/api/v2'

// Get a date string N years ago
function yearsAgo(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { naics_code, agency } = body

    if (!naics_code) {
      return NextResponse.json({ found: false, error: 'No NAICS code provided' })
    }

    // Build agency filter — try to extract the toptier agency name from
    // SAM.gov's fullParentPathName (e.g. "DEPT OF DEFENSE > ARMY > ...")
    let agencyFilter: Record<string, unknown>[] | undefined
    if (agency) {
      const toptierName = agency.split('>')[0].trim()
      if (toptierName) {
        agencyFilter = [{ type: 'awarding', tier: 'toptier', name: toptierName }]
      }
    }

    // Strategy 1: NAICS + agency + last 3 years
    // Strategy 2: NAICS only (broader) if Strategy 1 returns nothing
    const threeYearsAgo = yearsAgo(3)
    const today = new Date().toISOString().slice(0, 10)
    const timePeriod = [{ start_date: threeYearsAgo, end_date: today }]

    const makeBody = (withAgency: boolean) => ({
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: [naics_code],
        time_period: timePeriod,
        ...(withAgency && agencyFilter ? { agencies: agencyFilter } : {}),
      },
      fields: [
        'Award ID',
        'Recipient Name',
        'Award Amount',
        'Start Date',
        'End Date',
        'awarding_agency_name',
        'Description',
        'Place of Performance State Code',
      ],
      sort: 'Award Amount',
      order: 'desc',
      limit: 10,
      page: 1,
    })

    let awardData: Record<string, unknown>[] | null = null

    // Try with agency filter first (more specific)
    if (agencyFilter) {
      const res = await fetch(`${USA_BASE}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody(true)),
      })
      if (res.ok) {
        const data = await res.json()
        if ((data.results?.length ?? 0) > 0) {
          awardData = data.results
        }
      }
    }

    // Fallback: NAICS only (no agency filter)
    if (!awardData) {
      const res = await fetch(`${USA_BASE}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody(false)),
      })
      if (res.ok) {
        const data = await res.json()
        if ((data.results?.length ?? 0) > 0) {
          awardData = data.results
        }
      }
    }

    if (!awardData || awardData.length === 0) {
      return NextResponse.json({ found: false })
    }

    // Aggregate
    const totalValue = awardData.reduce((sum, a) => sum + ((a['Award Amount'] as number) ?? 0), 0)
    const avgAward = Math.round(totalValue / awardData.length)

    // Top 3 contractors by award amount
    const topContractors = awardData
      .slice(0, 5)
      .map(a => ({
        name: a['Recipient Name'] as string,
        amount: a['Award Amount'] as number,
        year: (a['Start Date'] as string)?.slice(0, 4),
      }))

    const topRecipient = topContractors[0]?.name ?? null

    const awardsDesc = topContractors
      .map(c => `${c.name} — $${(c.amount ?? 0).toLocaleString()} (${c.year ?? '?'})`)
      .join('\n')

    return NextResponse.json({
      found: true,
      previous_award_total: totalValue,
      avg_award_size: avgAward,
      incumbent_contractor: topRecipient,
      award_count: awardData.length,
      top_contractors: topContractors,
      award_history_notes: `Top ${topContractors.length} awards in NAICS ${naics_code} (last 3 yrs):\n${awardsDesc}`,
      raw: awardData,
    })
  } catch (err) {
    return NextResponse.json({ found: false, error: String(err) }, { status: 500 })
  }
}
