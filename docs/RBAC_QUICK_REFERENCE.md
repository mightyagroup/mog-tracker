# RBAC Quick Reference

## Roles & Permissions

| Action | Admin | Manager | Viewer |
|--------|-------|---------|--------|
| View own entity | ✓ | ✓ | ✓ |
| View other entities | ✓ | ✗ | ✗ |
| Create/edit/delete in own entity | ✓ | ✓ | ✗ |
| Create/edit/delete in other entities | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ |
| Access /admin | ✓ | ✗ | ✗ |

## Frontend Usage

### Check Role
```typescript
import { useAuth } from '@/lib/auth-context'

const { hasRole } = useAuth()

if (hasRole('admin')) { /* ... */ }
if (hasRole(['admin', 'manager'])) { /* ... */ }
```

### Check Entity Access
```typescript
const { canAccessEntity } = useAuth()

if (canAccessEntity('exousia')) { /* ... */ }
```

### Check Edit Permissions
```typescript
const { canEdit } = useAuth()

if (canEdit()) {
  // Show edit/delete buttons
}
```

### Check Admin
```typescript
const { isAdmin } = useAuth()

if (isAdmin()) {
  // Show admin-only features
}
```

### Protect Entity Page
```typescript
import { EntityGuard } from '@/components/common/EntityGuard'

export default function PageComponent() {
  return (
    <EntityGuard entity="exousia">
      {/* Only shown if user has exousia access */}
    </EntityGuard>
  )
}
```

## Server-Side Usage

### Get User Profile
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-helpers'

const supabase = await createServerSupabaseClient()
const profile = await getUserProfile(supabase)

console.log(profile.role) // 'admin' | 'manager' | 'viewer'
console.log(profile.entities_access) // ['exousia', 'vitalx']
```

### Require Role
```typescript
import { requireRole } from '@/lib/auth-helpers'

await requireRole(supabase, 'admin') // Throws if not admin
await requireRole(supabase, ['admin', 'manager']) // Throws if neither
```

### Require Entity Access
```typescript
import { requireEntityAccess } from '@/lib/auth-helpers'

await requireEntityAccess(supabase, 'exousia') // Throws if no access
```

### Require Edit Access
```typescript
import { requireEditAccess } from '@/lib/auth-helpers'

await requireEditAccess(supabase) // Throws if viewer
```

### Boolean Checks (No Throw)
```typescript
import { isAdmin, canEdit, canAccessEntity } from '@/lib/auth-helpers'

const isAdminUser = await isAdmin(supabase) // true | false
const canEditData = await canEdit(supabase) // true | false
const hasAccess = await canAccessEntity(supabase, 'exousia') // true | false
```

## Protect API Routes

### Basic Pattern
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireEditAccess, AuthorizationError } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authorization
    await requireEditAccess(supabase)

    // Your logic here

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
```

### With Entity Check
```typescript
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    await requireEditAccess(supabase)
    await requireEntityAccess(supabase, body.entity)

    // Create in entity
    const { data } = await supabase.from('gov_leads').insert({
      ...body,
      entity: body.entity
    })

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
```

## Database Queries

### Respects RLS Automatically
```typescript
const supabase = createClient()

// This query respects the user's RLS policies
// Returns only data they can access
const { data } = await supabase
  .from('gov_leads')
  .select('*')
  .eq('entity', 'exousia')
```

### Helper Functions in SQL
```sql
-- Get user's role
SELECT get_user_role('user-id-here')

-- Get user's entities
SELECT get_user_entities('user-id-here')

-- Check entity access
SELECT user_can_access_entity('user-id-here', 'exousia')

-- Check edit permissions
SELECT user_can_edit('user-id-here')
```

## User Management

### Create User (API)
```typescript
const response = await fetch('/api/auth/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123',
    displayName: 'User Name',
    role: 'manager',
    entities: ['exousia', 'vitalx']
  })
})
```

### Create Initial Admin (Script)
```bash
export SUPABASE_SERVICE_ROLE_KEY=your_key
npx ts-node scripts/seed-admin.ts
```

### Edit User
```typescript
const { error } = await supabase
  .from('user_profiles')
  .update({
    role: 'manager',
    entities_access: ['exousia'],
    is_active: true
  })
  .eq('id', userId)
```

## Common Patterns

### Conditional Button
```tsx
const { canEdit } = useAuth()

<button disabled={!canEdit()}>
  {canEdit() ? 'Edit' : 'View Only'}
</button>
```

### Admin-Only Feature
```tsx
const { isAdmin } = useAuth()

{isAdmin() && (
  <AdminPanel />
)}
```

### Entity-Specific Content
```tsx
const { canAccessEntity } = useAuth()

{canAccessEntity('exousia') && (
  <ExousiaPanel />
)}
```

### Multiple Entity Check
```tsx
const { canAccessEntity } = useAuth()

const exousiaAccess = canAccessEntity('exousia')
const vitalxAccess = canAccessEntity('vitalx')
const ironhouseAccess = canAccessEntity('ironhouse')

const hasAnyAccess = exousiaAccess || vitalxAccess || ironhouseAccess
```

## Types

```typescript
// User types
type UserRole = 'admin' | 'manager' | 'viewer'
type EntityType = 'exousia' | 'vitalx' | 'ironhouse'

interface UserProfile {
  id: string
  user_id: string
  role: UserRole
  display_name?: string
  email?: string
  entities_access: EntityType[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Auth context
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: Error | null
  hasRole: (role: UserRole | UserRole[]) => boolean
  canAccessEntity: (entity: EntityType) => boolean
  canEdit: () => boolean
  isAdmin: () => boolean
  refetch: () => Promise<void>
}
```

## Troubleshooting

### User can't see entity
1. Check `user_profiles.entities_access` contains entity
2. Check `user_profiles.role` is not 'admin' (always has access)
3. Check `user_profiles.is_active` is true
4. Clear browser cache and reload

### API returns 403
1. User doesn't have required role
2. User doesn't have required entity access
3. Check `requireRole()` and `requireEntityAccess()` calls

### "Cannot find name useAuth"
1. Ensure `<AuthProvider>` wraps component tree (in layout.tsx)
2. Use `'use client'` at top of component
3. Import: `import { useAuth } from '@/lib/auth-context'`

### Profile not created on login
1. Check `user_profiles` table exists
2. Check RLS policy allows INSERT
3. Check auth user exists in `auth.users`
4. Manually create profile:
   ```sql
   INSERT INTO user_profiles (user_id, email, role, entities_access, is_active)
   VALUES ('user-id', 'email@example.com', 'viewer', '{}', true)
   ```
