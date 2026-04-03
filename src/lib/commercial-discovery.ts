/**
 * Commercial Lead Discovery for VitalX
 *
 * Searches public data sources (NPI Registry, CMS) to find healthcare
 * facilities that may need medical courier, specimen transport, pharmacy
 * delivery, or related logistics services.
 *
 * Server-side only.
 */

// ── NPI Registry Types ───────────────────────────────────────────────────────

interface NpiResult {
  number: number
  basic?: {
    organization_name?: string
    name?: string
    first_name?: string
    last_name?: string
    authorized_official_first_name?: string
    authorized_official_last_name?: string
    authorized_official_telephone_number?: string
    authorized_official_title_or_position?: string
  }
  addresses?: Array<{
    address_purpose: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postal_code: string
    telephone_number?: string
    fax_number?: string
  }>
  taxonomies?: Array<{
    code: string
    desc: string
    primary: boolean
    state?: string
    license?: string
  }>
  other_names?: Array<{
    type: string
    organization_name?: string
  }>
}

interface NpiResponse {
  result_count: number
  results: NpiResult[]
}

// ── Discovery Result Type ────────────────────────────────────────────────────

export interface DiscoveredProspect {
  organization_name: string
  contact_name: string | null
  contact_title: string | null
  contact_phone: string | null
  address: string
  city: string
  state: string
  zip: string
  npi_number: string
  taxonomy_description: string
  suggested_category: string
  source: string
}

// ── NPI Taxonomy codes relevant to VitalX services ───────────────────────────
// These are healthcare provider taxonomy codes for facility types that
// commonly need courier/logistics services.

const TAXONOMY_SEARCHES: { code?: string; desc: string; category: string }[] = [
  // Hospitals
  { desc: 'General Acute Care Hospital', category: 'Hospital Systems' },
  { desc: 'Rehabilitation Hospital', category: 'Hospital Systems' },
  { desc: 'Psychiatric Hospital', category: 'Hospital Systems' },
  { desc: 'Children', category: 'Hospital Systems' },
  // Labs
  { desc: 'Clinical Medical Laboratory', category: 'Reference Labs' },
  { desc: 'Clinical Laboratory', category: 'Reference Labs' },
  { code: '291U00000X', desc: 'Clinical Medical Laboratory', category: 'Reference Labs' },
  // Pharmacy
  { desc: 'Pharmacy', category: 'Pharmacy/Specialty' },
  { desc: 'Community/Retail Pharmacy', category: 'Pharmacy/Specialty' },
  { desc: 'Compounding Pharmacy', category: 'Pharmacy/Specialty' },
  { desc: 'Specialty Pharmacy', category: 'Pharmacy/Specialty' },
  // Home Health
  { desc: 'Home Health', category: 'Home Health' },
  { desc: 'Home Infusion', category: 'Home Health' },
  // Urgent Care
  { desc: 'Urgent Care', category: 'Urgent Care/Outpatient' },
  { desc: 'Ambulatory Surgical', category: 'Urgent Care/Outpatient' },
  // Blood Banks
  { desc: 'Blood Bank', category: 'Blood Banks' },
  // Clinical Research
  { desc: 'Clinical Research', category: 'Clinical Research/Biotech' },
  // DNA/Drug Testing
  { desc: 'Forensic Laboratory', category: 'DNA/Drug Testing' },
]

// DMV area states for targeting
const DMV_STATES = ['VA', 'MD', 'DC']

// Cities to search within DMV
const DMV_CITIES = [
  // Virginia
  'Arlington', 'Alexandria', 'Fairfax', 'Reston', 'Tysons', 'McLean',
  'Vienna', 'Falls Church', 'Manassas', 'Woodbridge', 'Springfield',
  'Chantilly', 'Herndon', 'Leesburg', 'Fredericksburg', 'Richmond',
  'Sterling', 'Ashburn', 'Centreville', 'Annandale',
  // Maryland
  'Bethesda', 'Rockville', 'Silver Spring', 'Gaithersburg', 'College Park',
  'Bowie', 'Laurel', 'Columbia', 'Baltimore', 'Annapolis', 'Germantown',
  'Frederick', 'Greenbelt', 'Hyattsville', 'Largo', 'Landover',
  // DC
  'Washington',
]

// ── NPI Registry API ─────────────────────────────────────────────────────────

/**
 * Search the NPI Registry for organizations matching criteria.
 * NPI Registry is free, no API key required.
 * Docs: https://npiregistry.cms.hhs.gov/api-page
 */
async function searchNpiRegistry(params: {
  state: string
  city?: string
  taxonomyDescription?: string
  limit?: number
}): Promise<NpiResult[]> {
  const searchParams = new URLSearchParams({
    version: '2.1',
    enumeration_type: 'NPI-2', // Organizations only (not individual providers)
    state: params.state,
    limit: String(params.limit || 50),
  })

  if (params.city) {
    searchParams.set('city', params.city)
  }

  if (params.taxonomyDescription) {
    searchParams.set('taxonomy_description', params.taxonomyDescription)
  }

  try {
    const resp = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?${searchParams.toString()}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(15_000) : undefined,
      }
    )

    if (!resp.ok) {
      console.error(`NPI Registry returned ${resp.status}`)
      return []
    }

    const data: NpiResponse = await resp.json()
    return data.results || []
  } catch (err) {
    console.error('NPI Registry search error:', err)
    return []
  }
}

/**
 * Convert an NPI result to a DiscoveredProspect.
 */
function npiToProspect(result: NpiResult, suggestedCategory: string): DiscoveredProspect {
  const orgName = result.basic?.organization_name || result.basic?.name || 'Unknown Organization'

  // Get the primary/mailing address
  const addr = result.addresses?.find(a => a.address_purpose === 'LOCATION')
    || result.addresses?.find(a => a.address_purpose === 'MAILING')
    || result.addresses?.[0]

  // Build contact info from authorized official
  let contactName: string | null = null
  if (result.basic?.authorized_official_first_name) {
    contactName = [
      result.basic.authorized_official_first_name,
      result.basic.authorized_official_last_name,
    ].filter(Boolean).join(' ')
  }

  // Get primary taxonomy description
  const primaryTaxonomy = result.taxonomies?.find(t => t.primary) || result.taxonomies?.[0]

  return {
    organization_name: orgName,
    contact_name: contactName,
    contact_title: result.basic?.authorized_official_title_or_position || null,
    contact_phone: addr?.telephone_number || result.basic?.authorized_official_telephone_number || null,
    address: [addr?.address_1, addr?.address_2].filter(Boolean).join(', '),
    city: addr?.city || '',
    state: addr?.state || '',
    zip: (addr?.postal_code || '').slice(0, 5),
    npi_number: String(result.number),
    taxonomy_description: primaryTaxonomy?.desc || 'Healthcare Organization',
    suggested_category: suggestedCategory,
    source: 'npi_registry',
  }
}

// ── Main Discovery Function ──────────────────────────────────────────────────

export interface DiscoveryOptions {
  /** Which categories to search for. Defaults to all. */
  categories?: string[]
  /** Which states to search. Defaults to DMV. */
  states?: string[]
  /** Specific cities to target. If empty, searches statewide. */
  cities?: string[]
  /** Max results per search query. Default 50. */
  limitPerQuery?: number
  /** Existing organization names to skip (deduplication). */
  existingOrgs?: string[]
}

export interface DiscoveryResult {
  prospects: DiscoveredProspect[]
  totalFound: number
  totalNew: number
  searchesRun: number
  errors: string[]
}

/**
 * Run a discovery search across the NPI Registry for healthcare facilities
 * in the DMV area that could be VitalX commercial prospects.
 */
export async function discoverCommercialProspects(
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const {
    categories,
    states = DMV_STATES,
    cities = DMV_CITIES,
    limitPerQuery = 50,
    existingOrgs = [],
  } = options

  // Normalize existing org names for dedup
  const existingSet = new Set(existingOrgs.map(n => n.toLowerCase().trim()))

  const allProspects: DiscoveredProspect[] = []
  const seenNpi = new Set<string>()
  const errors: string[] = []
  let searchesRun = 0

  // Filter taxonomy searches by requested categories
  const searches = categories
    ? TAXONOMY_SEARCHES.filter(t => categories.includes(t.category))
    : TAXONOMY_SEARCHES

  // Run targeted city searches (higher quality, more specific)
  // Limit to a subset of cities to avoid excessive API calls
  const targetCities = cities.slice(0, 10) // Top 10 cities

  for (const search of searches) {
    for (const state of states) {
      // First: targeted city searches
      for (const city of targetCities.filter(c => {
        // Match city to state roughly
        if (state === 'DC') return c === 'Washington'
        if (state === 'VA') return ['Arlington', 'Alexandria', 'Fairfax', 'Reston', 'Richmond', 'Springfield', 'Woodbridge', 'Manassas', 'Herndon', 'Leesburg'].includes(c)
        if (state === 'MD') return ['Bethesda', 'Rockville', 'Silver Spring', 'Baltimore', 'Columbia', 'Gaithersburg', 'Laurel', 'Annapolis', 'Frederick', 'Largo'].includes(c)
        return false
      })) {
        try {
          const results = await searchNpiRegistry({
            state,
            city,
            taxonomyDescription: search.desc,
            limit: limitPerQuery,
          })

          for (const r of results) {
            const npi = String(r.number)
            if (seenNpi.has(npi)) continue
            seenNpi.add(npi)

            const prospect = npiToProspect(r, search.category)

            // Skip if already in our database
            if (existingSet.has(prospect.organization_name.toLowerCase().trim())) continue

            allProspects.push(prospect)
          }

          searchesRun++

          // Rate limit: 200ms between requests
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (err) {
          errors.push(`${search.desc} in ${city}, ${state}: ${String(err)}`)
        }
      }
    }
  }

  // Deduplicate by organization name (keep first occurrence)
  const dedupMap = new Map<string, DiscoveredProspect>()
  for (const p of allProspects) {
    const key = p.organization_name.toLowerCase().trim()
    if (!dedupMap.has(key)) {
      dedupMap.set(key, p)
    }
  }
  const uniqueProspects = Array.from(dedupMap.values())

  // Sort by category, then alphabetically
  uniqueProspects.sort((a, b) => {
    if (a.suggested_category !== b.suggested_category) {
      return a.suggested_category.localeCompare(b.suggested_category)
    }
    return a.organization_name.localeCompare(b.organization_name)
  })

  return {
    prospects: uniqueProspects,
    totalFound: allProspects.length,
    totalNew: uniqueProspects.length,
    searchesRun,
    errors,
  }
}

/**
 * Quick search for a specific category and location.
 * Useful for targeted prospecting.
 */
export async function quickDiscovery(
  category: string,
  city: string,
  state: string,
  existingOrgs: string[] = [],
): Promise<DiscoveredProspect[]> {
  const taxonomySearch = TAXONOMY_SEARCHES.find(t => t.category === category)
  if (!taxonomySearch) return []

  const existingSet = new Set(existingOrgs.map(n => n.toLowerCase().trim()))

  const results = await searchNpiRegistry({
    state,
    city,
    taxonomyDescription: taxonomySearch.desc,
    limit: 100,
  })

  return results
    .map(r => npiToProspect(r, category))
    .filter(p => !existingSet.has(p.organization_name.toLowerCase().trim()))
}
