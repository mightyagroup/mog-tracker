import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { autoCategorizeLead } from '@/lib/utils'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get all categories
    const { data: categories, error: catError } = await supabase
      .from('service_categories')
      .select('*')
    if (catError) throw catError

    // Get all leads without category or with mismatched NAICS
    const { data: leads, error: leadError } = await supabase
      .from('gov_leads')
      .select('id, entity, naics_code, title, description, service_category_id')
    if (leadError) throw leadError

    let updated = 0
    const errors: string[] = []

    for (const lead of leads) {
      let newCategoryId = lead.service_category_id

      // If no category, try to auto-categorize
      if (!newCategoryId) {
        newCategoryId = autoCategorizeLead(lead.entity, lead.naics_code, lead.title, lead.description, categories)
      }

      // If has category but NAICS doesn't match, try to find a better match
      if (newCategoryId && lead.naics_code) {
        const currentCategory = categories.find(c => c.id === newCategoryId)
        if (currentCategory && !(currentCategory.naics_codes as string[]).includes(lead.naics_code)) {
          // Try to find a category that matches the NAICS
          const betterMatch = categories.find(c =>
            c.entity === lead.entity && (c.naics_codes as string[]).includes(lead.naics_code)
          )
          if (betterMatch) {
            newCategoryId = betterMatch.id
          }
        }
      }

      // Update if category changed
      if (newCategoryId !== lead.service_category_id) {
        const { error: updateError } = await supabase
          .from('gov_leads')
          .update({ service_category_id: newCategoryId })
          .eq('id', lead.id)
        if (updateError) {
          errors.push(`Failed to update lead ${lead.id}: ${updateError.message}`)
        } else {
          updated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Recategorized ${updated} leads${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    })

  } catch (error) {
    console.error('Recategorize error:', error)
    return NextResponse.json(
      { error: 'Failed to recategorize leads', detail: String(error) },
      { status: 500 }
    )
  }
}