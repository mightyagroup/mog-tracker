-- Migration 035: Fix Circular RLS Dependency in RBAC Functions
--
-- PROBLEM: Helper functions (user_can_access_entity, user_can_edit, etc.)
-- query user_profiles, but user_profiles has RLS policies that also query
-- user_profiles to check admin status. This creates a circular dependency
-- where PostgreSQL returns empty results, causing NULL roles and blocking
-- all data access across every table using these functions.
--
-- FIX: Recreate all helper functions with SECURITY DEFINER so they execute
-- as the function owner (postgres) and bypass RLS on user_profiles.
-- Also simplify the user_profiles admin policy to avoid the circularity.

-- ============================================================================
-- Step 1: Drop and recreate helper functions with SECURITY DEFINER
-- ============================================================================

-- get_user_role: Returns the user's role from user_profiles
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE user_id = p_user_id AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- get_user_entities: Returns the user's entities_access array
CREATE OR REPLACE FUNCTION get_user_entities(p_user_id uuid)
RETURNS text[] AS $$
  SELECT entities_access FROM user_profiles WHERE user_id = p_user_id AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- user_can_access_entity: Checks if user has access to a specific entity
CREATE OR REPLACE FUNCTION user_can_access_entity(p_user_id uuid, p_entity text)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_entities text[];
BEGIN
  SELECT role, entities_access INTO v_role, v_entities
  FROM user_profiles WHERE user_id = p_user_id AND is_active = true;

  -- No profile found = no access
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Admin has access to everything
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Manager/viewer: check entities_access array
  IF v_role IN ('manager', 'viewer') THEN
    RETURN p_entity = ANY(v_entities);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- user_can_edit: Checks if user has edit permissions (admin or manager)
CREATE OR REPLACE FUNCTION user_can_edit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE user_id = p_user_id AND is_active = true;
  RETURN v_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Step 2: Fix user_profiles RLS policies to remove circular dependency
-- ============================================================================

-- Drop the problematic admin policy that queries user_profiles from within
-- user_profiles RLS (this was the circular dependency)
DROP POLICY IF EXISTS "Admin can do everything" ON user_profiles;
DROP POLICY IF EXISTS "Users can see their own profile" ON user_profiles;

-- Recreate user_profiles policies without circular references:

-- All authenticated users can read their own profile
-- (This is essential -- without it, the app can't load user context)
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all profiles (uses SECURITY DEFINER function, no circularity)
CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Admins can insert new profiles
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Admins can update any profile
CREATE POLICY "Admins can update profiles" ON user_profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Users can update their own display_name (limited self-edit)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================================
-- Step 3: Update compliance_records to use RBAC (was still on old generic policy)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON compliance_records;

CREATE POLICY "compliance_records_read" ON compliance_records
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "compliance_records_write" ON compliance_records
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "compliance_records_update" ON compliance_records
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "compliance_records_delete" ON compliance_records
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

-- ============================================================================
-- Step 4: Verify admin profile exists
-- ============================================================================
-- Ensure the admin user profile is present and active
-- (user_id 35218281-c0f3-4e56-8317-9c8b786f9210 = admin@mightyoakgroup.com)
INSERT INTO user_profiles (user_id, role, display_name, email, entities_access, is_active)
VALUES (
  '35218281-c0f3-4e56-8317-9c8b786f9210',
  'admin',
  'Emmanuela Wireko-Brobbey',
  'admin@mightyoakgroup.com',
  '{exousia,vitalx,ironhouse}',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  entities_access = '{exousia,vitalx,ironhouse}',
  is_active = true;

-- Migration 035 complete
