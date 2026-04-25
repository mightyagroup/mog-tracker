import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bag = any

async function requireAdmin() {
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'Not logged in', status: 401 }
  const roles = ((user.app_metadata as Bag)?.roles || (user.user_metadata as Bag)?.roles || []) as string[]
  const isAdmin = Array.isArray(roles) && roles.includes('admin')
  if (!isAdmin) return { error: 'Admin only', status: 403 }
  return { user }
}

// POST /api/admin/team-drives/set-folder
// Body: { user_id: string, entity: 'exousia'|'vitalx'|'ironhouse', root_folder_id: string|null }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const userId = body.user_id as string
  const entity = body.entity as string
  const folder = (body.root_folder_id as string | null) || null

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
  }

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  if (folder === null || folder === '') {
    // Empty value = remove the folder for this user/entity (but keep their OAuth if they have one)
    await supa.from('user_drive_configs').update({ root_folder_id: null }).eq('user_id', userId).eq('entity', entity)
  } else {
    await supa.from('user_drive_configs').upsert({
      user_id: userId,
      entity,
      root_folder_id: folder,
    }, { onConflict: 'user_id,entity' })
  }

  return NextResponse.json({ ok: true })
}
