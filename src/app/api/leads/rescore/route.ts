import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateFitScore, calculateCommercialFitScore } from '@/lib/utils'
import { EntityType, SourceType, SetAsideType, CommercialStatus } from '@/lib/types'

type GovLeadScoreRow = {
  id: string
  entity: EntityType
  naics_code?: string | null
  set_aside?: string | null
  place_of_performance?: string | null
  response_deadline?: string | null
  source?: string | null
  estimated_value?: number | null
}

type CommercialLeadScoreRow = {
  id: string
  entity: EntityType
  status?: string | null
  estimated_annual_value?: number | null
  source?: string | null
}

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: govLeads, error: govError } = await supabase
      .from('gov_leads')
      .select('id, entity, naics_code, set_aside, place_of_performance, response_deadline, source, estimated_value')

    if (govError) throw govError

    const { data: commLeads, error: commError } = await supabase
      .from('commercial_leads')
      .select('id, entity, status, estimated_annual_value, source')

    if (commError) throw commError

    let updatedGov = 0
    let updatedComm = 0

    const govRows = (govLeads ?? []) as GovLeadScoreRow[]
    if (govRows.length) {
      for (const lead of govRows) {
        const newScore = calculateFitScore({
          naics_code: lead.naics_code ?? undefined,
          set_aside: (lead.set_aside as SetAsideType) ?? 'none',
          place_of_performance: lead.place_of_performance ?? undefined,
          response_deadline: lead.response_deadline ?? undefined,
          source: (lead.source as SourceType) ?? 'manual',
          estimated_value: lead.estimated_value ?? undefined,
        }, lead.entity)

        const oldLead = await supabase
          .from('gov_leads')
          .select('fit_score')
          .eq('id', lead.id)
          .maybeSingle()

        if (oldLead.error) continue

        if ((oldLead.data?.fit_score ?? 0) !== newScore) {
          const { error: updateError } = await supabase
            .from('gov_leads')
            .update({ fit_score: newScore })
            .eq('id', lead.id)
          if (!updateError) updatedGov++
        }
      }
    }

    const commRows = (commLeads ?? []) as CommercialLeadScoreRow[]
    if (commRows.length) {
      for (const lead of commRows) {
        const newScore = calculateCommercialFitScore({
          status: (lead.status as CommercialStatus) ?? undefined,
          estimated_annual_value: lead.estimated_annual_value ?? undefined,
          source: (lead.source as SourceType) ?? 'manual',
        })

        const oldLead = await supabase
          .from('commercial_leads')
          .select('fit_score')
          .eq('id', lead.id)
          .maybeSingle()
        if (oldLead.error) continue

        if ((oldLead.data?.fit_score ?? 0) !== newScore) {
          const { error: updateError } = await supabase
            .from('commercial_leads')
            .update({ fit_score: newScore })
            .eq('id', lead.id)
          if (!updateError) updatedComm++
        }
      }
    }

    return NextResponse.json({ success: true, updatedGov, updatedComm })
  } catch (error) {
    console.error('Rescore error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
