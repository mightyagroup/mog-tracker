# Phase 10: Role-Based Access Control (RBAC) - Checklist

## Completed Components

### Database & Migrations
- [x] `supabase/migrations/033_rbac.sql` - RBAC migration with:
  - user_profiles table
  - RLS policies for all tables
  - Helper functions (get_user_role, get_user_entities, user_can_access_entity, user_can_edit)
  - Index on user_id and role

### Type Definitions
- [x] `src/lib/types.ts` - Added:
  - UserRole type ('admin' | 'manager' | 'viewer')
  - UserProfile interface

### Auth System
- [x] `src/lib/auth-context.tsx` - React Context providing:
  - Current user with profile data
  - Loading and error states
  - Helper methods: hasRole(), canAccessEntity(), canEdit(), isAdmin()
  - Auto-create profile on first login with viewer role

- [x] `src/lib/auth-helpers.ts` - Server-side helpers:
  - getUserProfile() - Get user's profile
  - requireRole() - Verify role (throws AuthorizationError)
  - requireEntityAccess() - Verify entity access (throws AuthorizationError)
  - requireEditAccess() - Verify edit permissions
  - isAdmin(), canEdit(), canAccessEntity() - Boolean checks

- [x] `src/hooks/useEntityAccess.ts` - Hook for entity access checks

### UI Components
- [x] `src/components/layout/Header.tsx` - Page header showing:
  - Page title
  - Entity info (if applicable)
  - Current user and role

- [x] `src/components/common/AccessDenied.tsx` - Access denied message with back link

- [x] `src/components/common/EntityGuard.tsx` - Wrapper component to protect entity pages:
  - Shows loading state during auth
  - Shows access denied if user doesn't have entity access
  - Only renders children if authorized

### Admin Panel
- [x] `src/app/admin/page.tsx` - Admin-only page for user management:
  - Requires admin role (redirects if not admin)
  - Shows user list with sorting
  - Add user modal button
  - Fetches and displays all users

- [x] `src/components/admin/UserList.tsx` - User management table:
  - Display user info (email, role, entities, status)
  - Edit mode for each user
  - Role and entity selector
  - Active/inactive toggle
  - Delete functionality

- [x] `src/components/admin/AddUserModal.tsx` - Create new user modal:
  - Email and password input
  - Display name (optional)
  - Role selector
  - Entity access checkboxes
  - Calls API route to create user

### API Routes
- [x] `src/app/api/auth/create-user/route.ts` - Protected API route:
  - Requires admin role
  - Creates auth user with service role key
  - Creates user profile
  - Returns user and profile data
  - Cleans up auth user if profile creation fails

### Middleware & Layout
- [x] `src/app/layout.tsx` - Wrapped with AuthProvider
- [x] `src/middleware.ts` - Updated matcher to exclude auth API route
- [x] `src/components/layout/Sidebar.tsx` - Updated to:
  - Show "Admin" nav item only if user is admin
  - Use useAuth() for admin check
  - Use Shield icon for admin link (red color #EF4444)

### Scripts
- [x] `scripts/seed-admin.ts` - Seed script to create initial admin user:
  - Prompts for password securely
  - Creates auth user and profile
  - Sets admin role and all entity access
  - Error handling and validation

### Documentation
- [x] `docs/RBAC_IMPLEMENTATION.md` - Comprehensive guide with:
  - Overview of roles and permissions
  - Database schema documentation
  - Frontend component usage
  - Server-side helper usage
  - Admin panel instructions
  - API route pattern
  - Initial admin setup methods
  - Testing procedures
  - Security considerations
  - Future enhancements

- [x] `docs/PHASE_10_CHECKLIST.md` - This checklist

## Deployment Steps

### 1. Database Migration
```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Paste SQL into Supabase Dashboard > SQL Editor
# Copy content of supabase/migrations/033_rbac.sql
```

### 2. Create Initial Admin User
```bash
# Set environment variables from .env.local
npx ts-node scripts/seed-admin.ts

# Follow prompt to enter password
```

### 3. Verify Migration
- Go to Supabase Dashboard > SQL Editor
- Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
- Should see `user_profiles` in the list
- Check that RLS is enabled on `user_profiles` table

### 4. Commit and Push
```bash
git add -A
git commit -m "Phase 10: Role-Based Access Control (RBAC)"
git push origin main
```

### 5. Deploy to Vercel
- Vercel will auto-deploy on push
- Verify deployment succeeds
- Open app and log in with admin@mightyoakgroup.com

## Testing Scenarios

### Test 1: Admin Login
1. Log in with admin@mightyoakgroup.com
2. Verify can see all entity trackers (Exousia, VitalX, IronHouse)
3. Verify can see /admin link in sidebar (red Shield icon)
4. Click /admin and verify user list appears
5. Verify "Add User" button is visible

### Test 2: Create Manager User
1. From admin panel, click "Add User"
2. Email: manager-test@example.com
3. Password: Test123!
4. Display name: Test Manager
5. Role: Manager
6. Check "exousia" entity
7. Click "Create User"
8. Verify user appears in list with manager role
9. Verify "exousia" appears in entities column

### Test 3: Manager Access
1. Log out
2. Log in with manager-test@example.com / Test123!
3. Verify can see MOG Command and Exousia
4. Verify cannot see VitalX or IronHouse trackers
5. Verify /admin redirects to home
6. Verify edit/delete buttons are visible for leads

### Test 4: Create Viewer User
1. Log out, log back in as admin
2. Create viewer user:
   - Email: viewer-test@example.com
   - Password: Test123!
   - Role: Viewer
   - Check "vitalx" entity
3. Log out and log in as viewer
4. Verify can see MOG Command and VitalX
5. Verify leads are in read-only mode (no edit buttons)
6. Verify add buttons are hidden

### Test 5: Edit User
1. Log in as admin
2. Go to /admin
3. Click edit button next to a user
4. Change role from "viewer" to "manager"
5. Add another entity
6. Click check button to save
7. Log in as that user and verify new permissions apply

### Test 6: User Auto-Creation
1. Create a new user via Supabase Dashboard > Auth > Users
2. Log in with that new user
3. Verify they are auto-created with viewer role
4. Go to admin and edit to assign entities

## Troubleshooting

### User Can't See Entities
**Problem**: User logged in but can't see any entity trackers
**Solution**:
1. Check user_profiles row in Supabase
2. Verify role is 'admin', 'manager', or 'viewer'
3. If manager/viewer, verify entities_access array contains the entity
4. Check is_active is true
5. Clear browser cache and reload

### Admin Can't Create Users
**Problem**: "Add User" button visible but API errors when trying to create
**Solution**:
1. Verify user has admin role in user_profiles table
2. Check SUPABASE_SERVICE_ROLE_KEY is set in environment
3. Check API response in browser console for specific error
4. Verify CREATE policy on auth.users (should be handled by Supabase)

### RLS Policies Blocking All Access
**Problem**: All queries return empty results
**Solution**:
1. Verify RLS is enabled on table: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`
3. Check policy conditions in Supabase Dashboard
4. Ensure user_profiles row exists for the user

### Can't Log In After Creating User
**Problem**: Created user in admin panel but can't log in
**Solution**:
1. Verify user was created in auth.users
2. Verify user_profiles row exists with correct user_id
3. Check password was set correctly (no typos)
4. Try resetting password in Supabase Dashboard

## Known Limitations

1. **User creation via signUp()**: The AddUserModal uses the regular signUp() flow. For true admin user creation without email confirmation, use the API route with service role key
2. **Password reset**: Not yet implemented - users must reset via Supabase Auth
3. **Bulk operations**: Can only edit one user at a time
4. **Audit logging**: Not yet implemented - no log of who changed what

## Security Notes

- All RLS policies are checked at database level
- Service role key only used on server (never exposed to browser)
- User can't escalate their own role (RLS policy prevents)
- Entity access checked on every request
- Passwords never stored or transmitted except over HTTPS

## Next Steps

After Phase 10, consider:
1. Wrap all entity page routes with EntityGuard component
2. Add conditional rendering for edit/delete buttons using canEdit()
3. Create audit log table to track admin actions
4. Add password reset flow
5. Add two-factor authentication for admins
6. Implement role-specific dashboards
