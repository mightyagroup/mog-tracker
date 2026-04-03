import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface PricingSaveRequest {
  govLeadId?: string | null
  commercialLeadId?: string | null
  pricingType: 'government' | 'commercial'
  pricingData: Record<string, unknown>
  totalPrice: number
  totalCost: number
  marginPercent: number
  notes?: string | null
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as PricingSaveRequest
    const { govLeadId, commercialLeadId, pricingType, pricingData, totalPrice, totalCost, marginPercent, notes } = body

    if (!pricingType || (!govLeadId && !commercialLeadId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current version to increment
    const { data: existing } = govLeadId
      ? await supabase
          .from('pricing_records')
          .select('version')
          .eq('gov_lead_id', govLeadId)
          .order('version', { ascending: false })
          .limit(1)
      : await supabase
          .from('pricing_records')
          .select('version')
          .eq('commercial_lead_id', commercialLeadId)
          .order('version', { ascending: false })
          .limit(1)

    const nextVersion = (existing && existing.length > 0 ? existing[0].version : 0) + 1

    const { data, error } = await supabase
      .from('pricing_records')
      .insert({
        gov_lead_id: govLeadId || null,
        commercial_lead_id: commercialLeadId || null,
        pricing_type: pricingType,
        pricing_data: pricingData,
        total_price: totalPrice,
        total_cost: totalCost,
        margin_percent: marginPercent,
        version: nextVersion,
        is_submitted: false,
        notes: notes || null,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Pricing save error:', error)
    return NextResponse.json({ error: 'Failed to save pricing' }, { status: 500 })
  }
}
