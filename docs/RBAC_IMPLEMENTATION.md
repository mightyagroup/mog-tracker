# Phase 10: Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document describes the RBAC system implemented in Phase 10. The system provides three roles with different permission levels:

- **Admin**: Full access to everything, can manage users and all entities
- **Manager**: Can view/edit leads, contacts, subcontractors for assigned entities
- **Viewer**: Read-only access to assigned entities

## Database Schema

### user_profiles Table

```sql
CREATE TABLE user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  display_name text,
  email text,
  entities_access text[] DEFAULT '{}', -- exousia, vitalx, ironhouse
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS Policies

All tables have updated RLS policies that respect roles and entity access:

- **SELECT**: Users can read data for:
  - Their assigned entities (if manager/viewer)
  - All data (if admin)
  - Their own user profile

- **INSERT/UPDATE/DELETE**: Only admins and managers can modify data within their assigned entities

- **Helper Functions**:
  - `get_user_role(user_id)` - Returns user's role
  - `get_user_entities(user_id)` - Returns user's entity access list
  - `user_can_access_entity(user_id, entity)` - Checks entity access
  - `user_can_edit(user_id)` - Checks if user is admin or manager

## Frontend Components

### Auth Context (`src/lib/auth-context.tsx`)

Provides user information and permission helpers:

```typescript
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

Usage:
```typescript
const { user, canAccessEntity, canEdit, isAdmin } = useAuth()

// Check role
if (hasRole(['admin', 'manager'])) { /* ... */ }

// Check entity access
if (canAccessEntity('exousia')) { /* ... */ }

// Check edit permissions
if (canEdit()) { /* ... */ }

// Check admin
if (isAdmin()) { /* ... */ }
```

### EntityGuard Component

Wraps pages to require entity access:

```typescript
export default function ExousiaPage() {
  return (
    <EntityGuard entity="exousia">
      {/* Page content */}
    </EntityGuard>
  )
}
```

## Server-Side Auth Helpers (`src/lib/auth-helpers.ts`)

Use these in API routes and server components:

```typescript
// Get current user's profile
const profile = await getUserProfile(supabase)

// Require specific role (throws AuthorizationError)
await requireRole(supabase, 'admin')
await requireRole(supabase, ['admin', 'manager'])

// Require entity access (throws AuthorizationError)
await requireEntityAccess(supabase, 'exousia')

// Require edit access (throws AuthorizationError)
await requireEditAccess(supabase)

// Check without throwing (returns boolean)
const isAdmin = await isAdmin(supabase)
const canEdit = await canEdit(supabase)
const hasAccess = await canAccessEntity(supabase, 'exousia')
```

## Admin Panel (`/admin`)

Admin users can:

1. View all users with their roles and entity access
2. Add new users with email, password, role, and entity access
3. Edit user roles and entity assignments
4. Deactivate/reactivate users
5. Delete users

The admin panel is only accessible to users with the admin role.

## API Route Pattern

Protected API routes should verify authorization:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole, requireEditAccess } from '@/lib/auth-helpers'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verify the user is a manager or admin
    await requireEditAccess(supabase)

    // Your logic here

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Setting Up the Initial Admin User

### Method 1: Using the Seed Script

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=https://lqymdyorcwgeesmkvvob.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<your-key>

# Run the script
npx ts-node scripts/seed-admin.ts
```

You will be prompted to enter a password for admin@mightyoakgroup.com

### Method 2: Manual Creation

1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user with email `admin@mightyoakgroup.com` and desired password
3. Note the user ID
4. In Supabase Dashboard > SQL Editor, run:

```sql
INSERT INTO user_profiles (user_id, email, display_name, role, entities_access, is_active)
VALUES (
  '<user-id-from-step-2>',
  'admin@mightyoakgroup.com',
  'Admin',
  'admin',
  ARRAY['exousia', 'vitalx', 'ironhouse'],
  true
);
```

## Usage Examples

### Protecting an Entity Page

```typescript
// src/app/exousia/page.tsx
'use client'

import { EntityGuard } from '@/components/common/EntityGuard'

export default function ExousiaPage() {
  return (
    <EntityGuard entity="exousia">
      {/* Page content - only shown if user has exousia access */}
    </EntityGuard>
  )
}
```

### Conditional Button Display

```typescript
'use client'

import { useAuth } from '@/lib/auth-context'

export function LeadActions() {
  const { canEdit } = useAuth()

  return (
    <>
      <button>View</button>
      {canEdit() && <button>Edit</button>}
      {canEdit() && <button>Delete</button>}
    </>
  )
}
```

### Protected API Route

```typescript
// src/app/api/leads/create/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireEditAccess, requireEntityAccess } from '@/lib/auth-helpers'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  // Verify user is manager or admin
  await requireEditAccess(supabase)

  // Verify they have access to the entity
  await requireEntityAccess(supabase, body.entity)

  // Create the lead
  const { data, error } = await supabase.from('gov_leads').insert({
    ...body,
  })

  return NextResponse.json({ data })
}
```

## Migration Notes

### Database Migration (033_rbac.sql)

The migration:
1. Creates the `user_profiles` table
2. Drops all old `"Authenticated users can do everything"` RLS policies
3. Creates role-based RLS policies for all tables:
   - `service_categories_read/write/update/delete`
   - `gov_leads_read/write/update/delete`
   - `commercial_leads_read/write/update/delete`
   - `subcontractors_read/write/update/delete`
   - `contacts_read/write/update/delete`
   - `interactions_read/write/update/delete`
   - `compliance_items_read/write/update/delete`
   - `pricing_records_read/write/update/delete`
4. Creates helper functions for role checking

### Deployment Steps

1. **Apply the migration**:
   ```bash
   # Via Supabase CLI
   supabase db push

   # Or paste SQL into Supabase Dashboard > SQL Editor
   ```

2. **Seed the initial admin user**:
   ```bash
   npx ts-node scripts/seed-admin.ts
   ```

3. **Update root layout** (already done):
   - Wrap with `<AuthProvider>`

4. **Deploy to Vercel**:
   ```bash
   git add -A
   git commit -m "Phase 10: Role-Based Access Control (RBAC)"
   git push origin main
   ```

## Testing RBAC

### Test Admin User
- Email: admin@mightyoakgroup.com
- Password: [set via seed script]
- Should see all pages including /admin

### Test Manager User
1. Create via admin panel with role "manager"
2. Assign to "exousia" entity
3. Should see exousia tracker, but not vitalx/ironhouse
4. Should be able to edit leads

### Test Viewer User
1. Create via admin panel with role "viewer"
2. Assign to "vitalx" entity
3. Should see vitalx tracker in read-only mode
4. Edit/delete buttons should be hidden or disabled

## Security Considerations

1. **RLS is enforced at database level** - All queries from the anon key respect RLS policies
2. **Service role key is only used on server** - Never expose in browser
3. **Entity access is checked on each request** - No session tampering possible
4. **Passwords are never stored client-side** - Only auth tokens
5. **Admin creation requires service role key** - Cannot be done from the browser

## Future Enhancements

- [ ] Role-specific views and features
- [ ] Audit logging of admin actions
- [ ] Two-factor authentication for admins
- [ ] OAuth integration for SSO
- [ ] Custom role creation
- [ ] Permission-based UI rendering (not just role-based)
- [ ] Bulk user management/import
- [ ] API token generation for service accounts
