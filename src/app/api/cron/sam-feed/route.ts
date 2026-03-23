import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Entity NAICS config ───────────────────────────────────────────────────────
const ENTITY_NAICS: Record<string, string[]> = {
  exousia:   ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
  vitalx:    ['492110', '492210', '621511', '621610', '485991', '485999', '561990'],
  ironhouse: ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
}

const ALL_NAICS = Array.from(new Set(Object.values(ENTITY_NAICS).flat()))

// ── SAM.gov set-aside code → our DB enum ─────────────────────────────────────
function mapSetAside(code: string | null | undefined): string {
  if (!code) return 'none'
  const c = code.toUpperCase()
  if (c === 'WOSB')                          return 'wosb'
  if (c === 'EDWOSB')                        return 'edwosb'
  if (c === '8A' || c === '8AN')             return '8a'
  if (c === 'HZC' || c === 'HZS')           return 'hubzone'
  if (c === 'SDVOSBC' || c === 'SDVOSBS')   return 'sdvosb'
  if (c === 'SBP' || c === 'SBA')           return 'small_business'
  if (c === 'VSA' || c === 'VSB' || c === 'VOSB') return 'small_business'
  if (c === 'SS')                            return 'sole_source'
  if (c === 'NONE' || c === '' || c === 'N/A') return 'none'
  // Partial set-asides → small_business
  if (c.includes('SB') || c.includes('SMALL')) return 'small_business'
  return 'none'
}

// ── Place of performance string ───────────────────────────────────────────────
function formatPlaceOfPerformance(pop: Record<string, unknown> | null | undefined): string {
  if (!pop) return ''
  const city  = (pop.city  as Record<string, string> | undefined)?.name ?? ''
  const state = (pop.state as Record<string, string> | undefined)?.name ?? ''
  const parts = [city, state].filter(Boolean)
  return parts.join(', ')
}

// ── SAM.gov opportunity response type ────────────────────────────────────────
interface SamOpportunity {
  noticeId?: string
  title?: string
  solicitationNumber?: string
  postedDate?: string
  responseDeadLine?: string
  archiveDate?: string
  naicsCode?: string
  typeOfSetAside?: string
  fullParentPathName?: string
  organizationHierarchy?: { level: number; name: string; code: string }[]
  placeOfPerformance?: Record<string, unknown>
  description?: string
  active?: string
}

interface SamResponse {
  opportunitiesData?: SamOpportunity[]
  totalRecords?: number
}

// ── Fetch one page from SAM.gov ───────────────────────────────────────────────
async function fetchSamPage(apiKey: string, postedFrom: string, offset: number): Promise<SamResponse> {
  const params = new URLSearchParams({
    api_key:    apiKey,
    postedFrom: postedFrom,
    postedTo:   new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    naicsCode:  ALL_NAICS.join(','),
    limit:      '100',
    offset:     offset.toString(),
  })
  const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25_000) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SAM.gov API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<SamResponse>
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // Auth: verify CRON_SECRET if set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const apiKey = process.env.SAMGOV_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SAMGOV_API_KEY not set' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── Load service categories for NAICS → category_id mapping ──────────────
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, entity, naics_codes, keywords, name')
  const catList = categories ?? []

  function findCategoryId(entity: string, naicsCode: string | undefined, title: string): string | null {
    // First: match by NAICS code
    if (naicsCode) {
      const match = catList.find(c => c.entity === entity && (c.naics_codes as string[]).includes(naicsCode))
      if (match) return match.id
    }
    // Fallback: keyword match on title
    if (title) {
      const tl = title.toLowerCase()
      const match = catList.find(c =>
        c.entity === entity &&
        (c.keywords as string[]).some(kw => tl.includes(kw.toLowerCase()))
      )
      if (match) return match.id
    }
    // Last resort: "General Support" or last category
    const fallback = catList.find(c => c.entity === entity && c.name.toLowerCase().includes('general'))
    return fallback?.id ?? null
  }

  // ── Calculate fit score (inline to avoid browser-only issues with date-fns) ─
  function calcFitScore(entity: string, naicsCode: string | undefined, setAside: string, placeOfPerf: string, estimatedValue: number | null, deadline: string | undefined): number {
    let score = 0
    // Set-aside (0–35)
    if (setAside === 'wosb' || setAside === 'edwosb') score += 35
    else if (setAside === 'small_business' || setAside === 'total_small_business') score += 22
    else if (setAside === 'sole_source') score += 12
    else if (setAside === 'full_and_open') score += 5
    // NAICS (0–25)
    if (naicsCode && ENTITY_NAICS[entity]?.includes(naicsCode)) score += 25
    // Location (0–20)
    const loc = placeOfPerf.toLowerCase()
    if (['spotsylvania', 'fredericksburg', 'stafford', 'prince william', 'fairfax', 'loudoun', 'arlington', 'alexandria'].some(s => loc.includes(s))) score += 20
    else if (loc.includes('virginia') || loc.includes(' va ') || loc.includes(', va')) score += 16
    else if (loc.includes('maryland') || loc.includes('district of columbia') || loc.includes(' dc')) score += 12
    else if (loc.includes('nationwide') || loc.includes('remote') || loc === '') score += 8
    // Value (0–15)
    const val = estimatedValue ?? 0
    if (val >= 25_000 && val <= 750_000) score += 15
    else if (val > 750_000 && val <= 2_000_000) score += 10
    else if (val > 0 && val < 25_000) score += 3
    // Time (0–5)
    if (deadline) {
      const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
      if (daysLeft >= 14) score += 5
      else if (daysLeft >= 7) score += 3
      else if (daysLeft >= 3) score += 1
    }
    return Math.min(score, 100)
  }

  // ── Fetch opportunities (up to 3 pages = 300 records) ────────────────────
  const postedFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

  let allOpps: SamOpportunity[] = []
  let inserted = 0
  let updated = 0
  let errors = 0

  try {
    for (let page = 0; page < 3; page++) {
      const data = await fetchSamPage(apiKey, postedFrom, page * 100)
      const opps = data.opportunitiesData ?? []
      allOpps = allOpps.concat(opps)
      if (opps.length < 100) break // no more pages
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'SAM.gov fetch failed', detail: String(err) },
      { status: 502 }
    )
  }

  // ── Process each opportunity ──────────────────────────────────────────────
  for (const opp of allOpps) {
    const noticeId        = opp.noticeId ?? ''
    const title           = opp.title ?? 'Untitled Opportunity'
    const naicsCode       = opp.naicsCode ?? undefined
    const setAside        = mapSetAside(opp.typeOfSetAside)
    const placeOfPerf     = formatPlaceOfPerformance(opp.placeOfPerformance ?? null)
    const agency          = opp.fullParentPathName ?? null
    const subAgency       = opp.organizationHierarchy?.find(o => o.level === 2)?.name ?? null
    const postedDate      = opp.postedDate ? opp.postedDate.slice(0, 10) : null
    const deadline        = opp.responseDeadLine ?? undefined
    const archiveDate     = opp.archiveDate ? opp.archiveDate.slice(0, 10) : null
    const solNum          = opp.solicitationNumber ?? null
    const samUrl          = noticeId ? `https://sam.gov/opp/${noticeId}/view` : null

    if (!noticeId && !solNum) continue // skip malformed records

    // Route to entities by NAICS
    const targetEntities = (Object.keys(ENTITY_NAICS) as string[]).filter(
      e => naicsCode && ENTITY_NAICS[e].includes(naicsCode)
    )
    // Fallback: if no NAICS match but we got the record (shouldn't happen with our NAICS filter), skip
    if (targetEntities.length === 0) continue

    for (const entity of targetEntities) {
      const fitScore = calcFitScore(entity, naicsCode, setAside, placeOfPerf, null, deadline)
      const categoryId = findCategoryId(entity, naicsCode, title)

      const leadData = {
        entity,
        title,
        solicitation_number: solNum,
        notice_id:           noticeId || null,
        status:              'new' as const,
        source:              'sam_gov' as const,
        naics_code:          naicsCode ?? null,
        set_aside:           setAside,
        agency,
        sub_agency:          subAgency,
        place_of_performance: placeOfPerf || null,
        posted_date:         postedDate,
        response_deadline:   deadline ?? null,
        archive_date:        archiveDate,
        sam_gov_url:         samUrl,
        fit_score:           fitScore,
        service_category_id: categoryId,
      }

      try {
        // Check for existing record by notice_id + entity (most reliable key)
        const lookupField = noticeId ? 'notice_id' : 'solicitation_number'
        const lookupValue = noticeId || solNum
        if (!lookupValue) continue

        const { data: existing } = await supabase
          .from('gov_leads')
          .select('id, status')
          .eq(lookupField, lookupValue)
          .eq('entity', entity)
          .maybeSingle()

        if (existing) {
          // Update non-status fields (don't overwrite manual status changes)
          await supabase
            .from('gov_leads')
            .update({
              title,
              agency,
              sub_agency:          subAgency,
              place_of_performance: placeOfPerf || null,
              response_deadline:   deadline ?? null,
              archive_date:        archiveDate,
              fit_score:           fitScore,
              service_category_id: categoryId ?? existing.id,
              sam_gov_url:         samUrl,
            })
            .eq('id', existing.id)
          updated++
        } else {
          const { error } = await supabase.from('gov_leads').insert(leadData)
          if (error) errors++
          else inserted++
        }
      } catch {
        errors++
      }
    }
  }

  return NextResponse.json({
    success: true,
    fetched:  allOpps.length,
    inserted,
    updated,
    errors,
    timestamp: new Date().toISOString(),
  })
}
