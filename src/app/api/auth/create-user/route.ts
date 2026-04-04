import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth-helpers'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { UserRole, EntityType } from '@/lib/types'

interface CreateUserRequest {
  email: string
  password: string
  displayName?: string
  role: UserRole
  entities: EntityType[]
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verify the user is an admin
    await requireRole(supabase, 'admin')

    const body: CreateUserRequest = await request.json()

    // Validate input
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (body.role !== 'admin' && body.entities.length === 0) {
      return NextResponse.json(
        { error: 'Non-admin users must have at least one entity' },
        { status: 400 }
      )
    }

    // Create user with service role key (for admin operations)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create auth user
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm so they can log in
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create user profile
    const { data: profile, error: profileError } = await serviceSupabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: body.email,
        display_name: body.displayName || body.email.split('@')[0],
        role: body.role,
        entities_access: body.entities,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      // Clean up the auth user if profile creation fails
      await serviceSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      profile,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Requires')) {
      return NextResponse.json(
        { error: 'Unauthorized - admin role required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
