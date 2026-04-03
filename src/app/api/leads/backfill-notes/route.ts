import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInitialSummary, LeadSnapshot } from '@/lib/lead-tracking'

// POST /api/leads/backfill-notes
// Finds all gov_leads that have NO interaction notes and generates initial summary notes for them.
// Also generates notes for commercial leads missing them.

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let govBackfilled = 0
  let commercialBackfilled = 0
  const errors: string[] = []

  try {
    // ── Gov leads without any interaction notes ──────────────────────────
    const { data: allGovLeads, error: govErr } = await supabase
      .from('gov_leads')
      .select('id, entity, title, solicitation_number, description, agency, sub_agency, naics_code, set_aside, contract_type, estimated_value, place_of_performance, response_deadline, sam_gov_url, status, fit_score')
      .order('created_at', { ascending: false })

    if (govErr) {
      errors.push(`Failed to fetch gov leads: ${govErr.message}`)
    } else if (allGovLeads && allGovLeads.length > 0) {
      // Get all gov lead IDs that already have interaction notes
      const { data: existingNotes } = await supabase
        .from('interactions')
        .select('gov_lead_id')
        .not('gov_lead_id', 'is', null)
        .eq('subject', 'New Opportunity -- Initial Summary')

      const hasNote = new Set((existingNotes ?? []).map(n => n.gov_lead_id))

      const leadsNeedingNotes = allGovLeads.filter(l => !hasNote.has(l.id))

      for (const lead of leadsNeedingNotes) {
        try {
          const snapshot: LeadSnapshot = {
            title: lead.title,
            solicitation_number: lead.solicitation_number,
            description: lead.description,
            agency: lead.agency,
            sub_agency: lead.sub_agency,
            naics_code: lead.naics_code,
            set_aside: lead.set_aside,
            contract_type: lead.contract_type,
            estimated_value: lead.estimated_value,
            place_of_performance: lead.place_of_performance,
            response_deadline: lead.response_deadline,
            sam_gov_url: lead.sam_gov_url,
          }

          const summaryNote = generateInitialSummary(snapshot)

          await supabase.from('interactions').insert({
            entity: lead.entity,
            gov_lead_id: lead.id,
            interaction_date: new Date().toISOString().slice(0, 10),
            interaction_type: 'system_update',
            subject: 'New Opportunity -- Initial Summary',
            notes: summaryNote,
          })

          govBackfilled++
        } catch (err) {
          errors.push(`Gov lead ${lead.solicitation_number || lead.id}: ${String(err)}`)
        }
      }
    }

    // ── Commercial leads without any interaction notes ───────────────────
    const { data: allCommercialLeads, error: commErr } = await supabase
      .from('commercial_leads')
      .select('id, entity, organization_name, service_category, status, estimated_annual_value, contact_name, contact_title, contact_email, contact_phone, notes, service_summary, office_city, office_state')
      .order('created_at', { ascending: false })

    if (commErr) {
      errors.push(`Failed to fetch commercial leads: ${commErr.message}`)
    } else if (allCommercialLeads && allCommercialLeads.length > 0) {
      const { data: existingCommNotes } = await supabase
        .from('interactions')
        .select('commercial_lead_id')
        .not('commercial_lead_id', 'is', null)
        .in('subject', ['New Prospect -- Initial Summary', 'New Prospect -- NPI Discovery Import'])

      const hasCommNote = new Set((existingCommNotes ?? []).map(n => n.commercial_lead_id))

      const commLeadsNeedingNotes = allCommercialLeads.filter(l => !hasCommNote.has(l.id))

      for (const lead of commLeadsNeedingNotes) {
        try {
          const summaryLines: string[] = [
            `NEW PROSPECT: ${lead.organization_name}`,
            '',
            `Category: ${lead.service_category || 'Not set'}`,
            `Status: ${lead.status || 'prospect'}`,
          ]
          if (lead.estimated_annual_value) summaryLines.push(`Est. Annual Value: $${Number(lead.estimated_annual_value).toLocaleString()}`)
          if (lead.contact_name) summaryLines.push(`Contact: ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''}`)
          if (lead.contact_email) summaryLines.push(`Email: ${lead.contact_email}`)
          if (lead.contact_phone) summaryLines.push(`Phone: ${lead.contact_phone}`)
          if (lead.office_city && lead.office_state) summaryLines.push(`Location: ${lead.office_city}, ${lead.office_state}`)
          if (lead.service_summary) summaryLines.push('', 'Service Summary:', lead.service_summary)
          if (lead.notes) summaryLines.push('', 'Notes:', lead.notes)
          summaryLines.push('', `Source: Backfill (pre-existing lead)`, `Generated: ${new Date().toISOString().split('T')[0]}`)

          await supabase.from('interactions').insert({
            entity: lead.entity || 'vitalx',
            commercial_lead_id: lead.id,
            interaction_date: new Date().toISOString().slice(0, 10),
            interaction_type: 'system_update',
            subject: 'New Prospect -- Initial Summary',
            notes: summaryLines.join('\n'),
          })

          commercialBackfilled++
        } catch (err) {
          errors.push(`Commercial lead ${lead.organization_name || lead.id}: ${String(err)}`)
        }
      }
    }
  } catch (err) {
    errors.push(`Top-level error: ${String(err)}`)
  }

  return NextResponse.json({
    success: true,
    govBackfilled,
    commercialBackfilled,
    errors: errors.length > 0 ? errors : undefined,
  })
}
