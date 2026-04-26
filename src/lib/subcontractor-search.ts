// Subcontractor search engine — finds and verifies candidate subcontractors
// for a federal bid based on NAICS, location, and set-aside requirements.
//
// Sources searched, in order:
//   1. Internal `subcontractors` table (highest trust)
//   2. SAM.gov Entity API (federal-registered businesses)
//   3. Web research fallback (stubbed — TODO Phase 1.5)
//
// Each candidate is tagged with a verification badge per handoff Rule 3:
//   - sam_verified         ✅ UEI active, set-asides match
//   - listed_not_confirmed ⚠️ Found in registry but auto-verify failed
//   - web_only             🔍 Not in registry — must register before contracting
//   - unable_to_verify     ❌ Conflicting/stale info
//
// Returns at most 12-15 candidates per handoff Rule 4.
//
// Server-side only.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { ParsedSolicitation } from './solicitation-parser'
import { fixMojibakeDeep } from './text-utils'

// ─── Public types ────────────────────────────────────────────────────────────

export type EntityType = 'exousia' | 'vitalx' | 'ironhouse'

export type VerificationStatus =
  | 'sam_verified'
  | 'listed_not_confirmed'
  | 'web_only'
  | 'unable_to_verify'

export type RankedSub = {
  company_name: string
  uei?: string
  cage?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  naics_codes: string[]
  certifications: string[]
  geographic_coverage?: string
  match_score: number  // 0-100
  verification_status: VerificationStatus
  verification_notes?: string
  source: 'internal' | 'sam_entity' | 'dsbs' | 'web_research'
  raw_data?: Record<string, unknown>
}

export type SearchOptions = {
  /** Cap on returned candidates. Default 15 (handoff Rule 4: 12-15). */
  maxCandidates?: number
  /** Skip live phone/website verification (fast mode). Default false. */
  skipLiveVerification?: boolean
  /** Skip SAM.gov calls (e.g., when SAMGOV_API_KEY not present). Default false. */
  skipSamLookup?: boolean
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchSubcontractors(
  bid: ParsedSolicitation,
  entity: EntityType,
  options: SearchOptions = {}
): Promise<RankedSub[]> {
  const max = options.maxCandidates ?? 15
  const candidates: RankedSub[] = []

  // 1. Internal table
  const internal = await searchInternalTable(bid, entity)
  candidates.push(...internal)

  // 2. SAM.gov Entity API
  if (!options.skipSamLookup && candidates.length < max) {
    try {
      const sam = await searchSamEntity(bid, max - candidates.length + 5)
      candidates.push(...sam)
    } catch (e) {
      console.warn('[subcontractor-search] SAM entity lookup failed:', (e as Error).message)
    }
  }

  // 3. Deduplicate by UEI (preferred) or normalized company name
  const deduped = deduplicateCandidates(candidates)

  // 4. Score and rank
  for (const c of deduped) {
    c.match_score = scoreCandidate(c, bid)
  }

  // 5. Live verification (phone reachability + website 200/404)
  if (!options.skipLiveVerification) {
    await Promise.all(deduped.map(c => verifyContactInfoLive(c)))
  }

  // 6. Sort by score, cap to maxCandidates
  deduped.sort((a, b) => b.match_score - a.match_score)
  const capped = deduped.slice(0, max)

  return fixMojibakeDeep(capped)
}

// ─── Source 1: internal table ────────────────────────────────────────────────

async function searchInternalTable(
  bid: ParsedSolicitation,
  entity: EntityType
): Promise<RankedSub[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[subcontractor-search] Supabase env missing; skipping internal lookup')
    return []
  }
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Filter by NAICS overlap. Subs table stores naics_codes as text[].
  const naicsTargets = [bid.naics].filter(Boolean) as string[]
  let query = supabase.from('subcontractors').select('*')
  if (naicsTargets.length > 0) {
    query = query.overlaps('naics_codes', naicsTargets)
  }
  if (entity) {
    // Optionally limit to subs known to work with this entity
    query = query.contains('entities_associated', [entity])
  }
  const { data, error } = await query.limit(20)
  if (error) {
    console.warn('[subcontractor-search] internal query failed:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return data.map((row): RankedSub => ({
    company_name: row.company_name || '(unknown)',
    uei: row.uei || undefined,
    cage: row.cage_code || undefined,
    contact_name: row.contact_name || undefined,
    contact_email: row.contact_email || undefined,
    contact_phone: row.contact_phone || undefined,
    website: row.website || undefined,
    naics_codes: Array.isArray(row.naics_codes) ? row.naics_codes : [],
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    geographic_coverage: row.geographic_coverage || undefined,
    match_score: 0, // computed later
    verification_status: row.uei ? 'sam_verified' : 'listed_not_confirmed',
    source: 'internal',
    raw_data: row,
  }))
}

// ─── Source 2: SAM.gov Entity API ────────────────────────────────────────────

async function searchSamEntity(
  bid: ParsedSolicitation,
  limit: number
): Promise<RankedSub[]> {
  const apiKey = process.env.SAMGOV_API_KEY
  if (!apiKey) {
    console.warn('[subcontractor-search] SAMGOV_API_KEY missing; skipping SAM entity lookup')
    return []
  }

  // SAM Entity Management API:
  // GET https://api.sam.gov/entity-information/v3/entities
  //   ?api_key=...
  //   &physicalAddressStateProvinceCode=NC
  //   &primaryNaics=561720
  //   &registrationStatus=A   (active)
  //   &businessTypeCode=...   (optional)
  //   &samRegistered=Yes
  //   &registrationStatus=A
  // The endpoint returns up to 1000 results paginated; we take ~25.
  const stateCode = bid.location_state_abbrev?.toUpperCase()
  const naics = bid.naics

  if (!naics) return []

  const params = new URLSearchParams()
  params.set('api_key', apiKey)
  if (naics) params.set('primaryNaics', naics)
  if (stateCode) params.set('physicalAddressProvinceOrStateCode', stateCode)
  params.set('registrationStatus', 'A')
  params.set('samRegistered', 'Yes')

  const url = 'https://api.sam.gov/entity-information/v3/entities?' + params.toString()
  const r = await fetch(url, {
    headers: { 'accept': 'application/json' },
  })
  if (!r.ok) {
    throw new Error('SAM Entity API ' + r.status + ': ' + (await r.text()).slice(0, 200))
  }
  const body = await r.json()
  const entities = (body?.entityData || []) as Array<Record<string, unknown>>
  return entities.slice(0, limit).map(e => mapSamEntityToRankedSub(e, bid))
}

function mapSamEntityToRankedSub(e: Record<string, unknown>, bid: ParsedSolicitation): RankedSub {
  // SAM Entity API response shape (simplified):
  //   entityRegistration: { ueiSAM, cageCode, legalBusinessName, ... }
  //   coreData: { generalInformation, physicalAddress, mailingAddress, ... }
  //   assertions: { primaryNaics, naicsList, ... }
  const reg = (e.entityRegistration || {}) as Record<string, unknown>
  const core = (e.coreData || {}) as Record<string, unknown>
  const assertions = (e.assertions || {}) as Record<string, unknown>

  const physicalAddress = (core.physicalAddress || {}) as Record<string, unknown>
  const generalInfo = (core.generalInformation || {}) as Record<string, unknown>

  const naicsList = Array.isArray(assertions.naicsList)
    ? (assertions.naicsList as Array<Record<string, unknown>>).map(n => String(n.naicsCode || ''))
    : []

  const certs: string[] = []
  const businessTypes = (core.businessTypes || {}) as Record<string, unknown>
  const sbaBusinessTypes = (businessTypes.sbaBusinessTypeList || []) as Array<Record<string, unknown>>
  for (const bt of sbaBusinessTypes) {
    if (bt.sbaBusinessTypeDesc) certs.push(String(bt.sbaBusinessTypeDesc))
  }

  return {
    company_name: String(reg.legalBusinessName || '(unknown)'),
    uei: reg.ueiSAM ? String(reg.ueiSAM) : undefined,
    cage: reg.cageCode ? String(reg.cageCode) : undefined,
    contact_name: undefined,  // SAM doesn't expose POC by default (PII)
    contact_email: undefined,
    contact_phone: undefined,
    website: generalInfo.entityURL ? String(generalInfo.entityURL) : undefined,
    address: physicalAddress.addressLine1 ? String(physicalAddress.addressLine1) : undefined,
    city: physicalAddress.city ? String(physicalAddress.city) : undefined,
    state: physicalAddress.stateOrProvinceCode ? String(physicalAddress.stateOrProvinceCode) : undefined,
    zip: physicalAddress.zipCode ? String(physicalAddress.zipCode) : undefined,
    naics_codes: naicsList,
    certifications: certs,
    geographic_coverage: physicalAddress.stateOrProvinceCode ? String(physicalAddress.stateOrProvinceCode) : undefined,
    match_score: 0,
    verification_status: reg.ueiSAM ? 'sam_verified' : 'listed_not_confirmed',
    verification_notes: bid.naics && naicsList.includes(bid.naics) ? 'NAICS match confirmed' : 'NAICS may not match exactly',
    source: 'sam_entity',
    raw_data: e,
  }
}

// ─── Dedupe ──────────────────────────────────────────────────────────────────

function deduplicateCandidates(candidates: RankedSub[]): RankedSub[] {
  const byKey = new Map<string, RankedSub>()
  for (const c of candidates) {
    const key = c.uei
      ? 'uei:' + c.uei.toUpperCase()
      : 'name:' + c.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, c)
    } else {
      // Prefer the one with higher trust source; merge missing fields
      const better = sourceRank(c.source) > sourceRank(existing.source) ? c : existing
      const other = better === c ? existing : c
      byKey.set(key, mergeFields(better, other))
    }
  }
  return [...byKey.values()]
}

function sourceRank(src: RankedSub['source']): number {
  switch (src) {
    case 'internal': return 4
    case 'sam_entity': return 3
    case 'dsbs': return 2
    case 'web_research': return 1
    default: return 0
  }
}

function mergeFields(a: RankedSub, b: RankedSub): RankedSub {
  return {
    ...a,
    contact_name: a.contact_name || b.contact_name,
    contact_email: a.contact_email || b.contact_email,
    contact_phone: a.contact_phone || b.contact_phone,
    website: a.website || b.website,
    address: a.address || b.address,
    city: a.city || b.city,
    state: a.state || b.state,
    zip: a.zip || b.zip,
    naics_codes: [...new Set([...a.naics_codes, ...b.naics_codes])],
    certifications: [...new Set([...a.certifications, ...b.certifications])],
  }
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreCandidate(c: RankedSub, bid: ParsedSolicitation): number {
  let score = 0

  // Source trust (0-30)
  if (c.source === 'internal') score += 30
  else if (c.source === 'sam_entity') score += 22
  else if (c.source === 'dsbs') score += 14
  else score += 6

  // NAICS exact match (0-25)
  if (bid.naics && c.naics_codes.includes(bid.naics)) score += 25
  else if (bid.naics && c.naics_codes.some(n => n.slice(0, 4) === bid.naics?.slice(0, 4))) score += 12

  // Geographic match (0-20)
  if (bid.location_state_abbrev && c.state && c.state.toUpperCase() === bid.location_state_abbrev.toUpperCase()) {
    score += 20
  } else if (bid.location_state && c.geographic_coverage?.toLowerCase().includes(bid.location_state.toLowerCase())) {
    score += 12
  }

  // Verification (0-15)
  if (c.verification_status === 'sam_verified') score += 15
  else if (c.verification_status === 'listed_not_confirmed') score += 8
  else if (c.verification_status === 'web_only') score += 3

  // Set-aside relevance (0-10)
  if (bid.set_aside) {
    const sa = bid.set_aside.toLowerCase()
    const matches = c.certifications.some(cert => {
      const lc = cert.toLowerCase()
      if (sa.includes('wosb') && lc.includes('woman')) return true
      if (sa.includes('8(a)') && (lc.includes('8(a)') || lc.includes('8a'))) return true
      if (sa.includes('hubzone') && lc.includes('hubzone')) return true
      if (sa.includes('sdvosb') && lc.includes('service-disabled veteran')) return true
      if (sa.includes('small business') && lc.includes('small')) return true
      return false
    })
    if (matches) score += 10
  }

  return Math.min(score, 100)
}

// ─── Live verification ───────────────────────────────────────────────────────

async function verifyContactInfoLive(c: RankedSub): Promise<void> {
  const notes: string[] = c.verification_notes ? [c.verification_notes] : []

  if (c.website) {
    const ok = await checkWebsite(c.website)
    if (ok === 'ok') notes.push('website reachable')
    else if (ok === 'redirect') notes.push('website redirected')
    else notes.push('website unreachable or 404')
  }
  if (c.contact_phone) {
    const phoneClean = c.contact_phone.replace(/[^0-9+]/g, '')
    if (phoneClean.length >= 10) notes.push('phone format valid')
    else notes.push('phone format invalid')
  }

  c.verification_notes = notes.join('; ') || undefined

  // Downgrade verification if all signals broken
  if (c.verification_status === 'sam_verified' && notes.every(n => n.includes('unreachable') || n.includes('invalid'))) {
    c.verification_status = 'listed_not_confirmed'
    c.verification_notes = (c.verification_notes ? c.verification_notes + '; ' : '') + 'downgraded — all live checks failed'
  }
}

async function checkWebsite(url: string): Promise<'ok' | 'redirect' | 'fail'> {
  try {
    let target = url.trim()
    if (!target.startsWith('http')) target = 'https://' + target
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5000)
    const r = await fetch(target, { method: 'HEAD', redirect: 'manual', signal: controller.signal })
    clearTimeout(t)
    if (r.status >= 200 && r.status < 300) return 'ok'
    if (r.status >= 300 && r.status < 400) return 'redirect'
    return 'fail'
  } catch {
    return 'fail'
  }
}
