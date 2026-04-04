import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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

    // Audit notification for pricing saves -- notify admin users
    try {
      const adminSb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      // Get the lead title for context
      let leadTitle = 'Unknown lead'
      let entity = pricingType === 'commercial' ? 'vitalx' : 'exousia'
      if (govLeadId) {
        const { data: lead } = await supabase.from('gov_leads').select('title, entity').eq('id', govLeadId).single()
        if (lead) { leadTitle = lead.title; entity = lead.entity }
      } else if (commercialLeadId) {
        const { data: lead } = await supabase.from('commercial_leads').select('organization_name, entity').eq('id', commercialLeadId).single()
        if (lead) { leadTitle = lead.organization_name; entity = lead.entity }
      }
      // Get performer name
      const { data: profile } = await adminSb.from('user_profiles').select('display_name, email').eq('user_id', user.id).single()
      const actor = profile?.display_name || profile?.email || user.email || 'Unknown user'
      // Get admin users to notify (excluding current user)
      const { data: admins } = await adminSb.from('user_profiles').select('user_id').eq('role', 'admin').eq('is_active', true).neq('user_id', user.id)
      if (admins && admins.length > 0) {
        const fmtPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPrice)
        await adminSb.from('notifications').insert(
          admins.map(a => ({
            user_id: a.user_id,
            notification_type: 'system',
            title: `Pricing updated`,
            message: `${actor} saved pricing for "${leadTitle}" -- ${fmtPrice} at ${marginPercent}% margin`,
            link: `/${entity}`,
            entity,
            is_read: false,
          }))
        )
      }
    } catch (auditErr) {
      console.warn('Audit notification for pricing failed:', auditErr)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Pricing save error:', error)
    return NextResponse.json({ error: 'Failed to save pricing' }, { status: 500 })
  }
}
