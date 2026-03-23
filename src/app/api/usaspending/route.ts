import { NextResponse } from 'next/server'

const USA_BASE = 'https://api.usaspending.gov/api/v2'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { solicitation_number, naics_code, agency } = body

    let awardData = null

    // Strategy 1: Search by PIID (solicitation/contract number)
    if (solicitation_number) {
      const piidRes = await fetch(`${USA_BASE}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            award_type_codes: ['A', 'B', 'C', 'D'],
            award_ids: [solicitation_number],
          },
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Start Date', 'End Date', 'awarding_agency_name', 'Description'],
          sort: 'Award Amount',
          order: 'desc',
          limit: 5,
          page: 1,
        }),
      })

      if (piidRes.ok) {
        const piidData = await piidRes.json()
        if (piidData.results?.length > 0) {
          awardData = piidData.results
        }
      }
    }

    // Strategy 2: Search by NAICS + agency name
    if (!awardData && naics_code) {
      const filters: Record<string, unknown> = {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: [naics_code],
      }

      if (agency) {
        filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agency }]
      }

      const naicsRes = await fetch(`${USA_BASE}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Start Date', 'End Date', 'awarding_agency_name', 'Description', 'Place of Performance State Code'],
          sort: 'Award Amount',
          order: 'desc',
          limit: 5,
          page: 1,
        }),
      })

      if (naicsRes.ok) {
        const naicsData = await naicsRes.json()
        if (naicsData.results?.length > 0) {
          awardData = naicsData.results
        }
      }
    }

    if (!awardData || awardData.length === 0) {
      return NextResponse.json({ found: false })
    }

    // Aggregate results
    const totalValue = awardData.reduce((sum: number, a: Record<string, unknown>) => sum + ((a['Award Amount'] as number) ?? 0), 0)
    const topRecipient = awardData[0]['Recipient Name'] as string
    const awardsDesc = awardData
      .slice(0, 3)
      .map((a: Record<string, unknown>) => {
        const amount = a['Award Amount'] as number
        const name = a['Recipient Name'] as string
        const date = a['Start Date'] as string
        return `${name} — $${amount?.toLocaleString() ?? '?'} (${date?.slice(0, 4) ?? '?'})`
      })
      .join('\n')

    return NextResponse.json({
      found: true,
      previous_award_total: totalValue,
      incumbent_contractor: topRecipient ?? null,
      award_history_notes: `Top ${awardData.length} recent awards from USASpending.gov:\n${awardsDesc}`,
      raw: awardData,
    })
  } catch (err) {
    return NextResponse.json({ found: false, error: String(err) }, { status: 500 })
  }
}
