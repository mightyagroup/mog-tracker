import { NextResponse } from 'next/server'
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

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  // List all auth users
  const { data: usersData, error: uErr } = await supa.auth.admin.listUsers()
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  const users = usersData.users || []

  // Pull all user_drive_configs in one query
  const { data: cfgs } = await supa.from('user_drive_configs').select('*')
  const configsByUser: Record<string, Bag[]> = {}
  for (const c of (cfgs as Bag[] | null) || []) {
    if (!configsByUser[c.user_id]) configsByUser[c.user_id] = []
    configsByUser[c.user_id].push(c)
  }

  const out = users.map(u => ({
    id: u.id,
    email: u.email,
    last_sign_in_at: u.last_sign_in_at,
    roles: (u.app_metadata?.roles || u.user_metadata?.roles || []) as string[],
    drive_configs: configsByUser[u.id] || [],
  }))

  return NextResponse.json({ users: out })
}
