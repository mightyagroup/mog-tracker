# Phase 10 Deployment Guide

## Pre-Deployment Checklist

- [ ] All files created (see PHASE_10_SUMMARY.md for file list)
- [ ] Environment variables configured (.env.local with Supabase keys)
- [ ] Database backup taken (optional but recommended)
- [ ] Read RBAC_IMPLEMENTATION.md to understand the system

## Deployment Steps

### Step 1: Apply Database Migration (5 minutes)

The migration creates the `user_profiles` table and updates RLS policies on all 8 data tables.

#### Option A: Using Supabase CLI (Recommended)
```bash
# Ensure you have Supabase CLI installed
npm install -D supabase

# Initialize Supabase local environment (optional)
supabase init

# Link to your project
supabase link --project-ref lqymdyorcwgeesmkvvob

# Push the migration
supabase db push
```

#### Option B: Using Supabase Dashboard (Manual)
1. Go to: https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/033_rbac.sql`
4. Paste into the SQL Editor
5. Click "Run"
6. Wait for success message

#### Option C: Using SQL Files
If you have psql or similar:
```bash
# Get your database URL from Supabase dashboard
psql "postgresql://[user]:[password]@[host]:5432/[database]" < supabase/migrations/033_rbac.sql
```

**Verify Migration**:
After applying, verify the migration worked:
```sql
-- Should return user_profiles
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_profiles';

-- Should return RLS is enabled
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Should return 39 policies (8 tables × 4-5 policies each + user_profiles)
SELECT COUNT(*) FROM pg_policies;
```

### Step 2: Create Initial Admin User (5 minutes)

Create the first admin user that can access /admin and manage other users.

#### Option A: Using Seed Script (Recommended)
```bash
# Ensure Node environment is set up
node --version  # Should be 16+

# Run the seed script
npx ts-node scripts/seed-admin.ts

# You'll be prompted:
# Enter admin password: [type password]
```

The script will:
1. Create auth user: admin@mightyoakgroup.com
2. Create user profile with admin role
3. Grant access to all entities (exousia, vitalx, ironhouse)

#### Option B: Manual Creation via Dashboard
1. Go to: https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/auth/users
2. Click "Add user"
3. Email: `admin@mightyoakgroup.com`
4. Password: [choose secure password]
5. Click "Create user"
6. Note the User ID
7. Go to SQL Editor and run:
   ```sql
   INSERT INTO user_profiles (
     user_id, email, display_name, role, entities_access, is_active
   ) VALUES (
     '[USER_ID_FROM_STEP_6]',
     'admin@mightyoakgroup.com',
     'Admin',
     'admin',
     ARRAY['exousia', 'vitalx', 'ironhouse'],
     true
   );
   ```

**Verify Admin Creation**:
```sql
SELECT * FROM user_profiles WHERE email = 'admin@mightyoakgroup.com';
-- Should return 1 row with role='admin'
```

### Step 3: Commit and Push Code (5 minutes)

```bash
# Check that only expected files are modified
git status

# Should show only Phase 10 files (no .env.local, no build artifacts)

# Add all Phase 10 files
git add -A

# Commit with descriptive message
git commit -m "Phase 10: Role-Based Access Control (RBAC)

- Add user_profiles table and RLS policies
- Implement Auth context and server-side helpers
- Create admin panel for user management
- Add EntityGuard component for entity protection
- Include seed script for initial admin user

Includes comprehensive documentation and testing guide."

# Push to GitHub
git push origin main
```

### Step 4: Deploy to Vercel (5-10 minutes)

Vercel automatically deploys on push to main, but you can also manually trigger:

```bash
# Verify build works locally (optional)
npm run build

# If build succeeds, deployment will be automatic
# Check: https://vercel.com/mightyagroup/mog-tracker/deployments

# Wait for Vercel to complete deployment (typically 2-3 minutes)
```

**Verify Deployment**:
1. Open your Vercel URL
2. You should see the login page
3. Try logging in with admin@mightyoakgroup.com

### Step 5: Test RBAC System (10 minutes)

#### Test 1: Admin Login
1. Navigate to app URL
2. Log in: admin@mightyoakgroup.com / [your password]
3. Should see MOG Command, all entity trackers, and /admin link
4. Click /admin - should see user management page
5. Should be able to click "Add User" button

#### Test 2: Create Test Manager User
1. From /admin, click "Add User"
2. Fill in:
   - Email: `manager-test@example.com`
   - Password: `Test123456`
   - Display Name: `Test Manager`
   - Role: `Manager`
   - Check `exousia` checkbox
3. Click "Create User"
4. Should see user appear in list with Manager role

#### Test 3: Test Manager Permissions
1. Log out (button in sidebar)
2. Log in: manager-test@example.com / Test123456
3. Should see MOG Command and Exousia trackers only
4. Should NOT see VitalX or IronHouse
5. Should NOT see /admin link (no admin access)
6. Click into a lead - should see edit buttons
7. Go to URL and try manually visiting /admin - should redirect to home

#### Test 4: Create Test Viewer User
1. Log back in as admin
2. Add viewer user:
   - Email: `viewer-test@example.com`
   - Password: `Test123456`
   - Role: `Viewer`
   - Check `vitalx` checkbox
3. Log out and log in as viewer
4. Should see MOG Command and VitalX only
5. Click into a lead - edit buttons should be hidden or disabled
6. Try /admin - should redirect to home

#### Test 5: Edit User Permissions
1. Log in as admin
2. Go to /admin
3. Click edit button next to `manager-test@example.com`
4. Change Role to `Manager`
5. Check both `exousia` and `vitalx` boxes
6. Click save (green check button)
7. Log out and log in as manager-test
8. Should now see both Exousia and VitalX trackers

### Step 6: Post-Deployment Verification (5 minutes)

#### Database
- [ ] user_profiles table exists
- [ ] RLS is enabled on user_profiles
- [ ] 8 data tables have updated RLS policies
- [ ] Helper functions exist: get_user_role, get_user_entities, etc.

#### Application
- [ ] Login page works
- [ ] Admin can access /admin
- [ ] Non-admin redirects from /admin
- [ ] Manager can see assigned entities only
- [ ] Viewer cannot edit anything
- [ ] Edit buttons hidden/disabled for viewers
- [ ] Sidebar shows Admin link only for admins

#### API
- [ ] POST /api/auth/create-user works (admin only)
- [ ] Creating user without admin fails with 403
- [ ] User queries respect RLS policies

## Rollback Plan (If Needed)

If something goes wrong:

### Option 1: Undo Database Migration
```sql
-- Drop the migration changes (careful!)
DROP TABLE IF EXISTS user_profiles;
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS get_user_entities(uuid);
DROP FUNCTION IF EXISTS user_can_access_entity(uuid, text);
DROP FUNCTION IF EXISTS user_can_edit(uuid);

-- Re-apply old RLS policies
-- (See previous migration files for original policies)
```

### Option 2: Revert Git Commit
```bash
# If deployment hasn't fully completed
git revert HEAD
git push origin main

# Vercel will redeploy the previous version
```

### Option 3: Disable RBAC Enforcement
If you need the app running but without RBAC:
1. Temporarily comment out RLS policies
2. Users get full access
3. This is a workaround only - don't leave like this

## Troubleshooting

### Migration Fails with "relation already exists"
- The table or function already exists
- Safe to ignore, or drop first with `DROP TABLE IF EXISTS`

### Can't Create Admin User
1. Verify Supabase credentials in .env.local
2. Check SUPABASE_SERVICE_ROLE_KEY is set correctly
3. Ensure Supabase project is accessible
4. Try manual creation via dashboard instead

### Login Works But Can't See Any Data
1. Check user_profiles row exists for the user
2. Verify is_active is true
3. Verify entities_access is populated
4. Clear browser cache and reload

### Edit Buttons Still Visible for Viewers
1. Verify user has role='viewer' in user_profiles
2. Check components using canEdit() correctly
3. Verify Sidebar showing Admin link only for admins
4. Check browser console for JavaScript errors

### Admin Can't Access /admin Page
1. Check user_profiles role is 'admin'
2. Verify is_active is true
3. Check browser cache (might be cached redirect)
4. Check middleware matcher isn't blocking /admin

## Support

For detailed information, see:
- `PHASE_10_SUMMARY.md` - Overview of what was built
- `docs/RBAC_IMPLEMENTATION.md` - Complete technical guide
- `docs/PHASE_10_CHECKLIST.md` - Testing and troubleshooting
- `docs/RBAC_QUICK_REFERENCE.md` - Developer quick reference

## Success Criteria

✓ Phase 10 is successfully deployed when:

1. Database migration applied without errors
2. user_profiles table has at least 1 row (admin user)
3. Admin can log in and access /admin
4. Admin can create new users via /admin
5. Non-admin cannot access /admin
6. Manager can only see assigned entities
7. Viewer cannot edit anything
8. All RLS policies enforced at database level

## Estimated Timeline

| Step | Duration |
|------|----------|
| Database Migration | 5 min |
| Create Admin User | 5 min |
| Commit & Push | 5 min |
| Deploy to Vercel | 5-10 min |
| Testing | 10 min |
| Verification | 5 min |
| **Total** | **35-50 min** |

## Next Steps After Deployment

1. **Wrap Entity Pages** with EntityGuard component
2. **Hide Edit Buttons** for viewers using canEdit()
3. **Create More Users** for team members
4. **Configure Entity Access** per user
5. **Monitor Deployment** for any issues
6. **Update Documentation** with company-specific info

---

**Questions?** See RBAC_IMPLEMENTATION.md or RBAC_QUICK_REFERENCE.md
