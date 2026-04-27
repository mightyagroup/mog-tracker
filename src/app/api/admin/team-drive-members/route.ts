// GET    /api/admin/team-drive-members            — list members
// POST   /api/admin/team-drive-members            — add a member
// PATCH  /api/admin/team-drive-members?id=...     — update active/role/entities
// DELETE /api/admin/team-drive-members?id=...     — soft delete (sets active=false)

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function requireAdmin() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const roles = (user.app_metadata?.roles as string[] | undefined) || []
  if (!roles.includes('admin')) {
    return { error: NextResponse.json({ error: 'admin_only' }, { status: 403 }) }
  }
  return { user }
}

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const { data, error } = await svc()
    .from('team_drive_members')
    .select('*')
    .order('email')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data || [] })
}

export async function POST(request: Request) {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const email = String(body.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })
  }
  const { data, error } = await svc()
    .from('team_drive_members')
    .insert({
      email,
      display_name: body.display_name || null,
      role: body.role || 'editor',
      entities: body.entities || [],
      active: body.active === false ? false : true,
      notes: body.notes || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function PATCH(request: Request) {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  if ('active' in body) update.active = body.active
  if ('role' in body) update.role = body.role
  if ('entities' in body) update.entities = body.entities
  if ('display_name' in body) update.display_name = body.display_name
  if ('notes' in body) update.notes = body.notes

  const { data, error } = await svc()
    .from('team_drive_members')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function DELETE(request: Request) {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await svc()
    .from('team_drive_members')
    .update({ active: false })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
