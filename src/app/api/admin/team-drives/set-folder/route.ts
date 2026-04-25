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

/** Extract just the Drive folder ID from a URL like https://drive.google.com/drive/folders/<ID>?usp=drive_link */
function normalizeFolderId(input: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const m = trimmed.match(/\/folders\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const userId = body.user_id as string
  const entity = body.entity as string
  const rawFolder = body.root_folder_id as string | null

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (!['exousia', 'vitalx', 'ironhouse'].includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
  }

  const folder = normalizeFolderId(rawFolder)

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  if (!folder) {
    await supa.from('user_drive_configs').update({ root_folder_id: null }).eq('user_id', userId).eq('entity', entity)
    return NextResponse.json({ ok: true, cleared: true })
  }

  await supa.from('user_drive_configs').upsert({
    user_id: userId,
    entity,
    root_folder_id: folder,
  }, { onConflict: 'user_id,entity' })

  return NextResponse.json({ ok: true, saved_id: folder, normalized_from_url: rawFolder !== folder })
}
