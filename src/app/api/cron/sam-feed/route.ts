import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Entity NAICS config ───────────────────────────────────────────────────────
const ENTITY_NAICS: Record<string, string[]> = {
  exousia:   ['561720', '561730', '561210', '541614', '541990', '561110'],
  vitalx:    ['492110', '492210', '621511', '621610', '485991', '485999', '561990'],
  ironhouse: ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
}

const ALL_NAICS = Array.from(new Set(Object.values(ENTITY_NAICS).flat()))

// ── SAM.gov set-aside code → our DB enum ─────────────────────────────────────
function mapSetAside(code: string | null | undefined): string {
  if (!code) return 'none'
  const c = code.toUpperCase().trim()
  if (c === 'WOSB')                                 return 'wosb'
  if (c === 'EDWOSB')                               return 'edwosb'
  if (c === '8A' || c === '8AN')                    return '8a'
  if (c === 'HZC' || c === 'HZS')                  return 'hubzone'
  if (c === 'SDVOSBC' || c === 'SDVOSBS')          return 'sdvosb'
  if (c === 'SBP' || c === 'SBA')                  return 'small_business'
  if (c === 'VSA' || c === 'VSB' || c === 'VOSB')  return 'small_business'
  if (c === 'SS')                                   return 'sole_source'
  if (c === 'NONE' || c === '' || c === 'N/A')      return 'none'
  if (c.includes('SB') || c.includes('SMALL'))      return 'small_business'
  return 'none'
}

// ── Place of performance string ───────────────────────────────────────────────
function formatPlaceOfPerformance(pop: Record<string, unknown> | null | undefined): string {
  if (!pop) return ''
  const city  = (pop.city  as Record<string, string> | undefined)?.name ?? ''
  const state = (pop.state as Record<string, string> | undefined)?.name ?? ''
  return [city, state].filter(Boolean).join(', ')
}

// ── Extract NAICS code from SAM.gov response (handles both field shapes) ──────
// SAM.gov v2 returns either naicsCode (string) or naicsCodes (array), or both
function extractNaicsCode(opp: Record<string, unknown>): string | undefined {
  // Singular string field
  if (typeof opp.naicsCode === 'string' && opp.naicsCode.trim()) {
    return opp.naicsCode.trim().slice(0, 6) // strip any description suffix
  }
  // Plural array field — take the first code
  if (Array.isArray(opp.naicsCodes) && opp.naicsCodes.length > 0) {
    const first = opp.naicsCodes[0]
    if (typeof first === 'string') return first.trim().slice(0, 6)
    if (typeof first === 'object' && first !== null) {
      const val = (first as Record<string, unknown>).code ?? (first as Record<string, unknown>).naicsCode
      if (typeof val === 'string') return val.trim().slice(0, 6)
    }
  }
  // Fallback: check classificationCode (sometimes NAICS is stored there)
  if (typeof opp.classificationCode === 'string') {
    const cc = opp.classificationCode.trim()
    if (/^\d{6}$/.test(cc) && ALL_NAICS.includes(cc)) return cc
  }
  return undefined
}

// ── SAM.gov opportunity response type ────────────────────────────────────────
type SamOpportunity = Record<string, unknown>

interface SamResponse {
  opportunitiesData?: SamOpportunity[]
  totalRecords?: number
  _embedded?: { results?: SamOpportunity[] }
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
  const url = `https://api.sam.gov/prod/opportunities/v2/search?${params.toString()}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // AbortSignal.timeout may not be available on all Node versions — use manual controller
    signal: AbortSignal.timeout ? AbortSignal.timeout(28_000) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SAM.gov API ${res.status}: ${text.slice(0, 300)}`)
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

  // ?dryRun=1 — fetch and diagnose without writing to DB
  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── Load service categories ───────────────────────────────────────────────
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, entity, naics_codes, keywords, name')
  const catList = categories ?? []

  function findCategoryId(entity: string, naicsCode: string | undefined, title: string): string | null {
    if (naicsCode) {
      const match = catList.find(c => c.entity === entity && (c.naics_codes as string[]).includes(naicsCode))
      if (match) return match.id
    }
    if (title) {
      const tl = title.toLowerCase()
      const match = catList.find(c =>
        c.entity === entity &&
        (c.keywords as string[]).some(kw => tl.includes(kw.toLowerCase()))
      )
      if (match) return match.id
    }
    const fallback = catList.find(c => c.entity === entity && c.name.toLowerCase().includes('general'))
    return fallback?.id ?? null
  }

  function calcFitScore(entity: string, naicsCode: string | undefined, setAside: string, placeOfPerf: string, deadline: string | undefined): number {
    let score = 0
    if (setAside === 'wosb' || setAside === 'edwosb') score += 35
    else if (setAside === 'small_business' || setAside === 'total_small_business') score += 22
    else if (setAside === 'sole_source') score += 12
    else if (setAside === 'full_and_open') score += 5
    if (naicsCode && ENTITY_NAICS[entity]?.includes(naicsCode)) score += 25
    const loc = placeOfPerf.toLowerCase()
    if (['spotsylvania', 'fredericksburg', 'stafford', 'prince william', 'fairfax', 'loudoun', 'arlington', 'alexandria'].some(s => loc.includes(s))) score += 20
    else if (loc.includes('virginia') || loc.includes(' va ') || loc.includes(', va')) score += 16
    else if (loc.includes('maryland') || loc.includes('district of columbia') || loc.includes(' dc')) score += 12
    else if (loc.includes('nationwide') || loc.includes('remote') || loc === '') score += 8
    if (deadline) {
      const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
      if (daysLeft >= 14) score += 5
      else if (daysLeft >= 7) score += 3
      else if (daysLeft >= 3) score += 1
    }
    return Math.min(score, 100)
  }

  // ── Fetch opportunities ───────────────────────────────────────────────────
  const postedFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

  let allOpps: SamOpportunity[] = []

  try {
    for (let page = 0; page < 3; page++) {
      const data = await fetchSamPage(apiKey, postedFrom, page * 100)
      // Handle both response shapes
      const opps = data.opportunitiesData ?? data._embedded?.results ?? []
      allOpps = allOpps.concat(opps)
      if (opps.length < 100) break
    }
  } catch (err) {
    return NextResponse.json({ error: 'SAM.gov fetch failed', detail: String(err) }, { status: 502 })
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────
  const sampleRaw = allOpps.slice(0, 2).map(o => ({
    noticeId:         o.noticeId,
    naicsCode:        o.naicsCode,
    naicsCodes:       o.naicsCodes,
    classificationCode: o.classificationCode,
    typeOfSetAside:   o.typeOfSetAside,
    responseDeadLine: o.responseDeadLine,
    placeOfPerformance: o.placeOfPerformance,
    title:            (o.title as string | undefined)?.slice(0, 80),
  }))

  let inserted = 0
  let updated = 0
  let skippedMalformed = 0
  let skippedNoEntity = 0
  const errorLog: string[] = []

  // ── Process each opportunity ──────────────────────────────────────────────
  for (const opp of allOpps) {
    const noticeId    = typeof opp.noticeId === 'string' ? opp.noticeId : ''
    const title       = typeof opp.title === 'string' ? opp.title : 'Untitled Opportunity'
    const naicsCode   = extractNaicsCode(opp)
    const setAside    = mapSetAside(opp.typeOfSetAside as string | undefined)
    const placeOfPerf = formatPlaceOfPerformance(opp.placeOfPerformance as Record<string, unknown> | undefined)
    const agency      = typeof opp.fullParentPathName === 'string' ? opp.fullParentPathName : null
    const hierarchy   = Array.isArray(opp.organizationHierarchy) ? opp.organizationHierarchy as { level: number; name: string }[] : []
    const subAgency   = hierarchy.find(o => o.level === 2)?.name ?? null
    const postedDate  = typeof opp.postedDate === 'string' ? opp.postedDate.slice(0, 10) : null
    const deadline    = typeof opp.responseDeadLine === 'string' ? opp.responseDeadLine : undefined
    const archiveDate = typeof opp.archiveDate === 'string' ? opp.archiveDate.slice(0, 10) : null
    const solNum      = typeof opp.solicitationNumber === 'string' ? opp.solicitationNumber : null
    const samUrl      = noticeId ? `https://sam.gov/opp/${noticeId}/view` : null

    // ── Extract contracting officer POC ─────────────────────────────────────
    const pocs = Array.isArray(opp.pointOfContact) ? opp.pointOfContact as Record<string, unknown>[] : []
    const primaryPoc = pocs.find(p => p.type === 'primary') ?? pocs[0] ?? null
    const pocName  = typeof primaryPoc?.fullName === 'string' ? primaryPoc.fullName.trim() : null
    const pocEmail = typeof primaryPoc?.email === 'string' ? primaryPoc.email.trim().toLowerCase() : null
    const pocPhone = typeof primaryPoc?.phone === 'string' ? primaryPoc.phone.trim() : null
    const pocTitle = typeof primaryPoc?.title === 'string' ? primaryPoc.title.trim() : null

    if (!noticeId && !solNum) { skippedMalformed++; continue }

    const targetEntities = Object.keys(ENTITY_NAICS).filter(
      e => naicsCode && ENTITY_NAICS[e].includes(naicsCode)
    )
    if (targetEntities.length === 0) { skippedNoEntity++; continue }

    if (dryRun) { inserted += targetEntities.length; continue }

    for (const entity of targetEntities) {
      const fitScore   = calcFitScore(entity, naicsCode, setAside, placeOfPerf, deadline)
      const categoryId = findCategoryId(entity, naicsCode, title)

      const leadData = {
        entity,
        title,
        solicitation_number: solNum,
        notice_id:            noticeId || null,
        status:               'new',
        source:               'sam_gov',
        naics_code:           naicsCode ?? null,
        set_aside:            setAside,
        agency,
        sub_agency:           subAgency,
        place_of_performance: placeOfPerf || null,
        posted_date:          postedDate,
        response_deadline:    deadline ?? null,
        archive_date:         archiveDate,
        sam_gov_url:          samUrl,
        fit_score:            fitScore,
        service_category_id:  categoryId,
        contracting_officer_name:  pocName,
        contracting_officer_email: pocEmail,
        contracting_officer_phone: pocPhone,
      }

      try {
        const lookupField = noticeId ? 'notice_id' : 'solicitation_number'
        const lookupValue = noticeId || solNum
        if (!lookupValue) continue

        const { data: existing, error: lookupErr } = await supabase
          .from('gov_leads')
          .select('id')
          .eq(lookupField, lookupValue)
          .eq('entity', entity)
          .maybeSingle()

        if (lookupErr) {
          errorLog.push(`lookup(${entity}/${noticeId}): ${lookupErr.message}`)
          continue
        }

        if (existing) {
          const { error: updateErr } = await supabase
            .from('gov_leads')
            .update({
              title,
              agency,
              sub_agency:                subAgency,
              place_of_performance:      placeOfPerf || null,
              response_deadline:         deadline ?? null,
              archive_date:              archiveDate,
              fit_score:                 fitScore,
              service_category_id:       categoryId,
              sam_gov_url:               samUrl,
              contracting_officer_name:  pocName,
              contracting_officer_email: pocEmail,
              contracting_officer_phone: pocPhone,
            })
            .eq('id', existing.id)
          if (updateErr) errorLog.push(`update(${entity}/${noticeId}): ${updateErr.message}`)
          else updated++
        } else {
          const { error: insertErr } = await supabase.from('gov_leads').insert(leadData)
          if (insertErr) {
            errorLog.push(`insert(${entity}/${noticeId || solNum}): ${insertErr.message}`)
          } else {
            inserted++
          }
        }

        // ── Upsert contracting officer to master contacts ──────────────────
        if (!dryRun && pocEmail) {
          try {
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id, entities_associated, organization')
              .eq('email', pocEmail)
              .maybeSingle()
            if (existingContact) {
              const entities = Array.from(new Set([...(existingContact.entities_associated ?? []), entity]))
              const updatePayload: Record<string, unknown> = { entities_associated: entities }
              if (!existingContact.organization && (agency ?? subAgency)) {
                updatePayload.organization = agency ?? subAgency
              }
              await supabase.from('contacts').update(updatePayload).eq('id', existingContact.id)
            } else if (pocName) {
              const parts = pocName.split(' ')
              await supabase.from('contacts').insert({
                first_name: parts[0] ?? pocName,
                last_name: (parts.slice(1).join(' ') || parts[0]) ?? '',
                title: pocTitle ?? 'Contracting Officer',
                organization: agency ?? subAgency ?? null,
                email: pocEmail,
                phone: pocPhone ?? null,
                contact_type: 'contracting_officer',
                entities_associated: [entity],
              })
            }
          } catch { /* non-fatal */ }
        }
      } catch (e) {
        errorLog.push(`exception(${entity}/${noticeId}): ${String(e)}`)
      }
    }
  }

  return NextResponse.json({
    success:          true,
    dryRun,
    fetched:          allOpps.length,
    inserted,
    updated,
    skippedMalformed,
    skippedNoEntity,
    errorCount:       errorLog.length,
    errors:           errorLog.slice(0, 20),
    sampleRaw,
    timestamp:        new Date().toISOString(),
  })
}
