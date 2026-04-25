import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ENTITY_NAICS } from '@/lib/constants'
import { calculateFitScore, autoCategorizeLead } from '@/lib/utils'
import { EntityType, SetAsideType, ServiceCategory } from '@/lib/types'

// Use Node runtime — cheerio-free HTML parse needs Buffer/text decoding.
export const runtime = 'nodejs'
export const maxDuration = 60

// Public eVA opportunity listing. Confirmed accessible without login.
const EVA_PUBLIC_URL = 'https://mvendor.cgieva.com/Vendor/public/AllOpportunities.jsp'
const EVA_DETAIL_BASE = 'https://mvendor.cgieva.com/Vendor/public/'

// ── Set-aside code mapping ──────────────────────────────────────────────────
function mapSetAside(code: string | null | undefined): string {
  if (!code) return 'none'
  const c = code.toUpperCase().trim()
  if (c.includes('WOSB') && c.includes('ED')) return 'edwosb'
  if (c.includes('WOSB')) return 'wosb'
  if (c.includes('SWAM') || c.includes('SWaM') || c.includes('SMALL') || c.includes('MICRO')) return 'small_business'
  if (c.includes('8A') || c.includes('8(A)')) return '8a'
  if (c.includes('HUBZONE') || c === 'HZC' || c === 'HZS') return 'hubzone'
  if (c.includes('SDVOSB') || c.includes('VETERAN')) return 'sdvosb'
  if (c === 'SBP' || c === 'SBA') return 'small_business'
  return 'none'
}

interface EvaOpportunity {
  solicitation_number?: string
  state_procurement_id?: string
  title?: string
  description?: string
  agency?: string
  naics_code?: string
  set_aside?: string
  place_of_performance?: string
  estimated_value?: number
  response_deadline?: string
  posted_date?: string
  solicitation_url?: string
}

// ── HTML scraping helpers ───────────────────────────────────────────────────
function stripTags(s: string): string {
  return s
    .replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function parseEvaDate(s: string | undefined): string | null {
  if (!s) return null
  const cleaned = s.trim()
  // eVA uses MM/DD/YYYY or MM/DD/YYYY HH:MM AM/PM
  const m = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i)
  if (!m) return null
  const [, mm, dd, yyyy, hh, mi, ampm] = m
  let hours = hh ? parseInt(hh, 10) : 0
  const minutes = mi ? parseInt(mi, 10) : 0
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
  }
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`
  return iso
}

// Parse the eVA AllOpportunities.jsp HTML page into structured rows.
// The page renders a <table> with rows like:
//   <tr><td>Solicitation #</td><td>Title</td><td>Agency</td><td>NAICS</td><td>Posted</td><td>Closes</td></tr>
// We extract via a tolerant table-row regex and fall back gracefully.
function parseEvaListing(html: string): EvaOpportunity[] {
  const ops: EvaOpportunity[] = []

  // Find the main data table — eVA uses <table class="dataTable"> or similar.
  // Match every <tr>...</tr> that contains at least 4 <td> cells (likely a data row).
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRe.exec(html)) !== null) {
    const rowHtml = rowMatch[1]
    const cells: string[] = []
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1])
    }
    if (cells.length < 4) continue

    // Extract solicitation link if present (often in cell 0 or 1)
    let detailUrl: string | undefined
    const aMatch = rowHtml.match(/<a[^>]+href="([^"]+)"[^>]*>/i)
    if (aMatch) {
      const href = aMatch[1]
      detailUrl = href.startsWith('http') ? href : EVA_DETAIL_BASE + href.replace(/^\.\//, '')
    }

    // Most common eVA layout (observed):
    //   [0] solicitation number, [1] title, [2] description short, [3] agency,
    //   [4] NAICS, [5] posted date, [6] closes date
    // Fall back tolerantly when fewer cells exist.
    const cellTxt = cells.map(stripTags)

    const solicitationNumber = cellTxt[0] || ''
    const title = cellTxt[1] || cellTxt[0] || 'eVA Opportunity'
    const agency = cellTxt[3] || cellTxt[2] || ''
    const naicsRaw = (cellTxt[4] || '').match(/\b(\d{6})\b/)
    const naics = naicsRaw ? naicsRaw[1] : undefined
    const postedDate = parseEvaDate(cellTxt[5])
    const closesDate = parseEvaDate(cellTxt[6])

    // Skip junk header rows
    if (!solicitationNumber || /solicitation|description|posted|closing/i.test(solicitationNumber)) {
      continue
    }
    // Skip rows whose first cell is purely whitespace or a date
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(solicitationNumber)) continue

    // Look for set-aside hint anywhere in the row text
    const rowText = cellTxt.join(' | ')
    let setAside: string | undefined
    if (/SWaM|small\s*business|micro/i.test(rowText)) setAside = 'small_business'
    if (/WOSB/i.test(rowText)) setAside = 'wosb'

    ops.push({
      solicitation_number: solicitationNumber,
      state_procurement_id: solicitationNumber,
      title,
      agency: agency || undefined,
      naics_code: naics,
      set_aside: setAside,
      posted_date: postedDate || undefined,
      response_deadline: closesDate || undefined,
      solicitation_url: detailUrl,
      place_of_performance: 'Virginia',
    })
  }

  return ops
}

// Apply NAICS-based entity routing + write to gov_leads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupaClient = any
async function ingestEvaOpportunities(
  opps: EvaOpportunity[],
  supabase: SupaClient,
  categories: ServiceCategory[],
  dryRun: boolean,
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const errorLog: string[] = []
  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const opp of opps) {
    const stateProcurementId = opp.state_procurement_id || opp.solicitation_number
    if (!stateProcurementId) { skipped++; continue }

    const title = opp.title ?? 'Untitled Opportunity'
    const naicsCode = opp.naics_code
    const setAside = mapSetAside(opp.set_aside)
    const agency = opp.agency ?? null
    const placeOfPerf = opp.place_of_performance ?? 'Virginia'
    const deadline = opp.response_deadline ?? null
    const postedDate = opp.posted_date ? opp.posted_date.slice(0, 10) : null
    const solNum = opp.solicitation_number ?? null
    const description = opp.description ?? null

    // Route to all entities matching by NAICS. If no NAICS, route to all eVA-registered entities
    // (Exousia + IronHouse — both registered, Exousia SWaM-certified for priority).
    let targetEntities: EntityType[] = (Object.keys(ENTITY_NAICS) as EntityType[]).filter(
      e => naicsCode && ENTITY_NAICS[e].includes(naicsCode)
    )
    if (targetEntities.length === 0) {
      // No NAICS hit — route by keyword to relevant entities
      const t = (title + ' ' + (description || '')).toLowerCase()
      if (/janitor|custod|clean|landscap|grounds|mowing|facilit|hvac|plumbing|trash|waste/.test(t)) {
        targetEntities = ['exousia', 'ironhouse']
      } else if (/medical|courier|specimen|patient|nemt|pharmacy|laborator/.test(t)) {
        targetEntities = ['vitalx']
      } else {
        // unmapped — skip
        skipped++
        continue
      }
    }

    if (dryRun) { inserted += targetEntities.length; continue }

    for (const entity of targetEntities) {
      const fitScore = calculateFitScore({
        naics_code: naicsCode,
        set_aside: setAside as SetAsideType,
        place_of_performance: placeOfPerf,
        response_deadline: deadline ?? undefined,
        source: 'eva',
        estimated_value: opp.estimated_value,
      }, entity)

      const categoryId = autoCategorizeLead(entity, naicsCode, title, description, categories)

      try {
        const { data: existing, error: lookupErr } = await supabase
          .from('gov_leads')
          .select('id')
          .eq('state_procurement_id', `eva_${stateProcurementId}`)
          .eq('entity', entity)
          .maybeSingle()

        if (lookupErr) { errorLog.push(`lookup(${entity}/${stateProcurementId}): ${lookupErr.message}`); continue }

        const e = existing as { id?: string } | null

        if (e?.id) {
          const { error: updateErr } = await supabase
            .from('gov_leads')
            .update({
              title,
              agency,
              naics_code: naicsCode ?? null,
              set_aside: setAside,
              place_of_performance: placeOfPerf,
              response_deadline: deadline,
              posted_date: postedDate,
              estimated_value: opp.estimated_value ?? null,
              service_category_id: categoryId,
              fit_score: fitScore,
              last_eva_check: new Date().toISOString(),
              solicitation_url: opp.solicitation_url ?? null,
            } as never)
            .eq('id', e.id)
          if (updateErr) errorLog.push(`update(${entity}/${stateProcurementId}): ${updateErr.message}`)
          else updated++
        } else {
          const { error: insertErr } = await supabase
            .from('gov_leads')
            .insert({
              entity,
              state_procurement_id: `eva_${stateProcurementId}`,
              title,
              solicitation_number: solNum,
              description,
              status: 'new',
              source: 'eva',
              naics_code: naicsCode ?? null,
              set_aside: setAside,
              agency,
              place_of_performance: placeOfPerf,
              posted_date: postedDate,
              response_deadline: deadline,
              estimated_value: opp.estimated_value ?? null,
              fit_score: fitScore,
              service_category_id: categoryId,
              solicitation_url: opp.solicitation_url ?? null,
              last_eva_check: new Date().toISOString(),
            } as never)
          if (insertErr) errorLog.push(`insert(${entity}/${stateProcurementId}): ${insertErr.message}`)
          else inserted++
        }
      } catch (e) {
        errorLog.push(`exception(${entity}/${stateProcurementId}): ${String(e)}`)
      }
    }
  }

  return { inserted, updated, skipped, errors: errorLog }
}

// ── GET: live scrape eVA public listing ─────────────────────────────────────
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'
  const skipScrape = searchParams.get('skipScrape') === '1'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Service categories for autoCategorize
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, entity, naics_codes, keywords, name, psc_codes, color, sort_order, created_at, updated_at')
  if (!categories) {
    return NextResponse.json({ error: 'Failed to load service categories' }, { status: 500 })
  }
  const typedCategories = categories as unknown as ServiceCategory[]

  let opps: EvaOpportunity[] = []
  let scrapeError: string | null = null
  let fetched = 0

  if (!skipScrape) {
    try {
      const r = await fetch(EVA_PUBLIC_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
      })

      // AWS WAF challenge detection — eVA sits behind awselb/2.0 + WAF.
      // The data table is JavaScript-rendered via a protected endpoint, so a
      // raw HTTP fetch never sees the rows. We detect both the challenge
      // header and the case where the static HTML returns 0 tables/rows.
      const wafHeader = r.headers.get('x-amzn-waf-action')
      if (wafHeader === 'challenge') {
        scrapeError = 'eVA blocked by AWS WAF challenge — programmatic scraping not possible. Use manual import (POST /api/cron/eva-feed) or eVA email notifications.'
      } else if (!r.ok) {
        scrapeError = `eVA fetch ${r.status} ${r.statusText}`
      } else {
        const html = await r.text()
        opps = parseEvaListing(html)
        fetched = opps.length
        if (fetched === 0) {
          // The page loaded but rows are JS-rendered — confirm via heuristic.
          const hasTables = /<table[^>]*>/i.test(html)
          if (!hasTables) {
            scrapeError = 'eVA returned 0 opportunity rows — data is JavaScript-rendered behind AWS WAF. Listing page does not include table HTML at request time. Use manual import or rely on SAM.gov + email notifications.'
          }
        }
      }
    } catch (e) {
      scrapeError = `eVA fetch failed: ${String(e)}`
    }
  }

  const result = await ingestEvaOpportunities(opps, supabase, typedCategories, dryRun)

  // Recent eva leads for context
  const { data: recentEvaLeads } = await supabase
    .from('gov_leads')
    .select('id, title, solicitation_number, created_at')
    .eq('source', 'eva')
    .order('created_at', { ascending: false })
    .limit(10)

  // Log
  try {
    await supabase.from('state_feed_logs').insert({
      feed_type: 'eva',
      status: scrapeError ? 'error' : (result.errors.length === 0 ? 'success' : 'partial'),
      fetched,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors_count: result.errors.length + (scrapeError ? 1 : 0),
      details: {
        dryRun,
        skipScrape,
        scrape_error: scrapeError,
        errors: result.errors.slice(0, 10),
      },
    } as never)
  } catch { /* non-fatal */ }

  return NextResponse.json({
    success: !scrapeError,
    feed: 'eva',
    source_url: EVA_PUBLIC_URL,
    dryRun,
    fetched,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    errorCount: result.errors.length,
    errors: result.errors.slice(0, 10),
    scrapeError,
    recentLeadsCount: recentEvaLeads?.length ?? 0,
    timestamp: new Date().toISOString(),
  })
}

// ── POST endpoint for bulk importing eVA leads (manual entry) ──────────────
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: { leads?: EvaOpportunity[]; dryRun?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { leads = [], dryRun = false } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, entity, naics_codes, keywords, name, psc_codes, color, sort_order, created_at, updated_at')
  if (!categories) {
    return NextResponse.json({ error: 'Failed to load service categories' }, { status: 500 })
  }
  const typedCategories = categories as unknown as ServiceCategory[]

  const result = await ingestEvaOpportunities(leads, supabase, typedCategories, dryRun)

  try {
    await supabase.from('state_feed_logs').insert({
      feed_type: 'eva',
      status: result.errors.length === 0 ? 'success' : 'partial',
      fetched: leads.length,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors_count: result.errors.length,
      details: { dryRun, mode: 'manual_post' },
    } as never)
  } catch { /* non-fatal */ }

  return NextResponse.json({
    success: true,
    feed: 'eva',
    dryRun,
    fetched: leads.length,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    errorCount: result.errors.length,
    errors: result.errors.slice(0, 20),
    timestamp: new Date().toISOString(),
  })
}
