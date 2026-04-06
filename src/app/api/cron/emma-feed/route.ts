import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ENTITY_NAICS } from '@/lib/constants'
import { calculateFitScore, autoCategorizeLead } from '@/lib/utils'
import { EntityType, SetAsideType, ServiceCategory } from '@/lib/types'

// ALL_NAICS reserved for future eMMA API integration
// const ALL_NAICS = Array.from(new Set(Object.values(ENTITY_NAICS).flat()))

// ── Set-aside code mapping ──────────────────────────────────────────────────
function mapSetAside(code: string | null | undefined): string {
  if (!code) return 'none'
  const c = code.toUpperCase().trim()
  if (c === 'WOSB') return 'wosb'
  if (c === 'EDWOSB') return 'edwosb'
  if (c === '8A' || c === '8AN') return '8a'
  if (c === 'HZC' || c === 'HZS') return 'hubzone'
  if (c === 'SDVOSBC' || c === 'SDVOSBS') return 'sdvosb'
  if (c === 'SBP' || c === 'SBA') return 'small_business'
  if (c.includes('SB') || c.includes('SMALL')) return 'small_business'
  return 'none'
}

interface EmmaOpportunity {
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

export async function GET(request: Request) {
  // Auth: verify CRON_SECRET if set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── Load service categories ───────────────────────────────────────────────
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, entity, naics_codes, keywords, name, psc_codes, color, sort_order, created_at, updated_at')

  if (!categories) {
    return NextResponse.json({ error: 'Failed to load service categories' }, { status: 500 })
  }

  // typedCategories used only by POST handler
  // const typedCategories = categories as ServiceCategory[]

  // ── For now, eMMA integration is a placeholder ─────────────────────────────
  // eMMA (eMaryland Marketplace Advantage) does not have a reliable public API.
  // This endpoint is designed to:
  // 1. Accept POST requests with manually-entered eMMA lead data (from bulk import)
  // 2. Provide a GET endpoint that returns diagnostic info
  // 3. Support future integration if eMMA releases an API

  const errorLog: string[] = []
  const inserted = 0
  const updated = 0
  const skipped = 0

  // For GET requests: return info about the feed and any recent leads
  const { data: recentEmmaLeads } = await supabase
    .from('gov_leads')
    .select('id, title, solicitation_number, created_at')
    .eq('source', 'emma')
    .order('created_at', { ascending: false })
    .limit(10)

  // ── Log the feed run ──────────────────────────────────────────────────────
  try {
    await supabase.from('state_feed_logs').insert({
      feed_type: 'emma',
      status: 'success',
      fetched: 0,
      inserted,
      updated,
      skipped,
      errors_count: errorLog.length,
      details: {
        message: 'eMMA feed is ready for bulk import. Use POST endpoint or import component to add leads.',
        recent_leads_count: recentEmmaLeads?.length ?? 0,
        dryRun,
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({
    success: true,
    feed: 'emma',
    dryRun,
    message: 'eMMA feed is operational. Manual import via POST or UI component required.',
    inserted,
    updated,
    skipped,
    recentLeadsCount: recentEmmaLeads?.length ?? 0,
    errorCount: errorLog.length,
    errors: errorLog.slice(0, 10),
    timestamp: new Date().toISOString(),
  })
}

// ── POST endpoint for bulk importing eMMA leads ─────────────────────────────
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: { leads?: EmmaOpportunity[]; dryRun?: boolean }
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

  // ── Load service categories ───────────────────────────────────────────────
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, entity, naics_codes, keywords, name, psc_codes, color, sort_order, created_at, updated_at')

  if (!categories) {
    return NextResponse.json({ error: 'Failed to load service categories' }, { status: 500 })
  }

  const typedCategories = categories as ServiceCategory[]

  const errorLog: string[] = []
  let inserted = 0
  let updated = 0
  let skipped = 0

  // ── Process each eMMA lead ─────────────────────────────────────────────────
  for (const opp of leads) {
    const stateProcurementId = opp.state_procurement_id || opp.solicitation_number
    if (!stateProcurementId) {
      skipped++
      continue
    }

    const title = opp.title ?? 'Untitled Opportunity'
    const naicsCode = opp.naics_code
    const setAside = mapSetAside(opp.set_aside)
    const agency = opp.agency ?? null
    const placeOfPerf = opp.place_of_performance ?? null
    const deadline = opp.response_deadline ?? null
    const postedDate = opp.posted_date ?? null
    const solNum = opp.solicitation_number ?? null
    const description = opp.description ?? null

    // ── Determine target entities based on NAICS code ──────────────────────
    const targetEntities = (Object.keys(ENTITY_NAICS) as EntityType[]).filter(
      e => naicsCode && ENTITY_NAICS[e].includes(naicsCode)
    )

    if (targetEntities.length === 0) {
      skipped++
      continue
    }

    if (dryRun) {
      updated += targetEntities.length
      continue
    }

    // ── Process for each target entity ──────────────────────────────────────
    for (const entity of targetEntities) {
      const fitScore = calculateFitScore({
        naics_code: naicsCode,
        set_aside: setAside as SetAsideType,
        place_of_performance: placeOfPerf ?? undefined,
        response_deadline: deadline ?? undefined,
        source: 'emma',
        estimated_value: opp.estimated_value,
      }, entity)

      const categoryId = autoCategorizeLead(entity, naicsCode, title, description, typedCategories)

      try {
        // Check if lead already exists by state_procurement_id
        const { data: existing, error: lookupErr } = await supabase
          .from('gov_leads')
          .select('id, title, agency, response_deadline, naics_code, set_aside')
          .eq('state_procurement_id', `emma_${stateProcurementId}`)
          .eq('entity', entity)
          .maybeSingle()

        if (lookupErr) {
          errorLog.push(`lookup(emma/${entity}/${stateProcurementId}): ${lookupErr.message}`)
          continue
        }

        if (existing) {
          // ── Update existing lead ────────────────────────────────────────
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
              last_emma_check: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (updateErr) {
            errorLog.push(`update(emma/${entity}/${stateProcurementId}): ${updateErr.message}`)
          } else {
            updated++
          }
        } else {
          // ── Insert new lead ────────────────────────────────────────────
          const { error: insertErr } = await supabase
            .from('gov_leads')
            .insert({
              entity,
              state_procurement_id: `emma_${stateProcurementId}`,
              title,
              solicitation_number: solNum,
              description,
              status: 'new',
              source: 'emma',
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
              last_emma_check: new Date().toISOString(),
            })

          if (insertErr) {
            errorLog.push(`insert(emma/${entity}/${stateProcurementId}): ${insertErr.message}`)
          } else {
            inserted++
          }
        }
      } catch (e) {
        errorLog.push(`exception(emma/${entity}/${stateProcurementId}): ${String(e)}`)
      }
    }
  }

  // ── Log the feed run ──────────────────────────────────────────────────────
  try {
    await supabase.from('state_feed_logs').insert({
      feed_type: 'emma',
      status: errorLog.length === 0 ? 'success' : 'partial',
      fetched: leads.length,
      inserted,
      updated,
      skipped,
      errors_count: errorLog.length,
      details: { dryRun },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({
    success: true,
    feed: 'emma',
    dryRun,
    fetched: leads.length,
    inserted,
    updated,
    skipped,
    errorCount: errorLog.length,
    errors: errorLog.slice(0, 20),
    timestamp: new Date().toISOString(),
  })
}
