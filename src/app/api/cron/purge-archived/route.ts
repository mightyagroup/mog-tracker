import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Hard delete gov_leads archived more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: govPurged, error: govError } = await supabase
      .from('gov_leads')
      .delete()
      .not('archived_at', 'is', null)
      .lt('archived_at', sevenDaysAgo)
      .select('id')

    if (govError) {
      console.error('Error purging gov_leads:', govError)
    }

    // Hard delete commercial_leads archived more than 7 days ago
    const { data: commPurged, error: commError } = await supabase
      .from('commercial_leads')
      .delete()
      .not('archived_at', 'is', null)
      .lt('archived_at', sevenDaysAgo)
      .select('id')

    if (commError) {
      console.error('Error purging commercial_leads:', commError)
    }

    const govCount = govPurged?.length ?? 0
    const commCount = commPurged?.length ?? 0

    return NextResponse.json({
      success: true,
      purged: {
        gov_leads: govCount,
        commercial_leads: commCount,
        total: govCount + commCount,
      },
      cutoff: sevenDaysAgo,
    })
  } catch (error) {
    console.error('Purge archived error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
