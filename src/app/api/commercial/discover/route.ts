import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  discoverCommercialProspects,
  quickDiscovery,
  type DiscoveredProspect,
} from '@/lib/commercial-discovery'

/**
 * POST /api/commercial/discover
 *
 * Discover new commercial prospects by searching the NPI Registry
 * for healthcare facilities in the DMV area.
 *
 * Body options:
 *   mode: 'full' | 'quick' (default: 'full')
 *   categories?: string[]  -- filter to specific categories
 *   city?: string          -- for quick mode
 *   state?: string         -- for quick mode (default: 'VA')
 *   autoImport?: boolean   -- if true, auto-import all found prospects into DB
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      mode = 'full',
      categories,
      city,
      state = 'VA',
      autoImport = false,
    } = body

    // Get existing organization names for deduplication
    const { data: existingLeads } = await supabase
      .from('commercial_leads')
      .select('organization_name')
      .eq('entity', 'vitalx')

    const existingOrgs = (existingLeads || []).map(
      (l: { organization_name: string }) => l.organization_name,
    )

    let prospects: DiscoveredProspect[]
    let searchesRun = 0
    let errors: string[] = []

    if (mode === 'quick' && city) {
      // Quick: single category + city
      prospects = await quickDiscovery(
        categories?.[0] || 'Hospital Systems',
        city,
        state,
        existingOrgs,
      )
    } else {
      // Full discovery across DMV
      const result = await discoverCommercialProspects({
        categories,
        existingOrgs,
      })
      prospects = result.prospects
      searchesRun = result.searchesRun
      errors = result.errors
    }

    // Auto-import if requested
    let imported = 0
    if (autoImport && prospects.length > 0) {
      const inserts = prospects.map(p => ({
        entity: 'vitalx' as const,
        organization_name: p.organization_name,
        contact_name: p.contact_name,
        contact_title: p.contact_title,
        contact_phone: p.contact_phone,
        service_category: p.suggested_category,
        status: 'prospect' as const,
        notes: [
          `NPI: ${p.npi_number}`,
          `Type: ${p.taxonomy_description}`,
          `Address: ${p.address}, ${p.city}, ${p.state} ${p.zip}`,
          `Source: NPI Registry auto-discovery`,
          `Discovered: ${new Date().toISOString().split('T')[0]}`,
        ].join('\n'),
      }))

      // Batch insert in chunks of 50
      for (let i = 0; i < inserts.length; i += 50) {
        const chunk = inserts.slice(i, i + 50)
        const { error: insertError, data: insertedData } = await supabase
          .from('commercial_leads')
          .insert(chunk)
          .select('id')

        if (insertError) {
          errors.push(`Batch insert ${i}-${i + chunk.length}: ${insertError.message}`)
        } else {
          imported += insertedData?.length || 0
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      prospects: autoImport ? [] : prospects, // Don't return full list if auto-imported
      totalFound: prospects.length,
      imported,
      searchesRun,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Commercial discovery error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discovery failed' },
      { status: 500 },
    )
  }
}
