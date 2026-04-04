-- Phase 10: Role-Based Access Control (RBAC)
-- This migration creates the user_profiles table and updates RLS policies

-- Create user_profiles table
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

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
-- Admins can do everything
CREATE POLICY "Admin can do everything" ON user_profiles
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can see their own profile
CREATE POLICY "Users can see their own profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- Helper function to get user entities access
CREATE OR REPLACE FUNCTION get_user_entities(p_user_id uuid)
RETURNS text[] AS $$
  SELECT entities_access FROM user_profiles WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- Helper function to check if user has access to entity
CREATE OR REPLACE FUNCTION user_can_access_entity(p_user_id uuid, p_entity text)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_entities text[];
BEGIN
  SELECT role, entities_access INTO v_role, v_entities
  FROM user_profiles WHERE user_id = p_user_id;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF v_role = 'viewer' OR v_role = 'manager' THEN
    RETURN p_entity = ANY(v_entities);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if user can edit
CREATE OR REPLACE FUNCTION user_can_edit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE user_id = p_user_id;
  RETURN v_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Update RLS Policies for service_categories
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON service_categories;

CREATE POLICY "service_categories_read" ON service_categories
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "service_categories_write" ON service_categories
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "service_categories_update" ON service_categories
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "service_categories_delete" ON service_categories
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

-- ============================================================================
-- Update RLS Policies for gov_leads
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON gov_leads;

CREATE POLICY "gov_leads_read" ON gov_leads
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "gov_leads_write" ON gov_leads
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "gov_leads_update" ON gov_leads
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "gov_leads_delete" ON gov_leads
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  );

-- ============================================================================
-- Update RLS Policies for commercial_leads
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON commercial_leads;

CREATE POLICY "commercial_leads_read" ON commercial_leads
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "commercial_leads_write" ON commercial_leads
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "commercial_leads_update" ON commercial_leads
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "commercial_leads_delete" ON commercial_leads
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid()) AND
    user_can_access_entity(auth.uid(), entity::text)
  );

-- ============================================================================
-- Update RLS Policies for subcontractors
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON subcontractors;

CREATE POLICY "subcontractors_read" ON subcontractors
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      user_can_edit(auth.uid()) OR -- admins/managers can see all
      entities_associated::text[] && get_user_entities(auth.uid())
    )
  );

CREATE POLICY "subcontractors_write" ON subcontractors
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "subcontractors_update" ON subcontractors
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "subcontractors_delete" ON subcontractors
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

-- ============================================================================
-- Update RLS Policies for contacts
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON contacts;

CREATE POLICY "contacts_read" ON contacts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      user_can_edit(auth.uid()) OR -- admins/managers can see all
      entities_associated::text[] && get_user_entities(auth.uid())
    )
  );

CREATE POLICY "contacts_write" ON contacts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

-- ============================================================================
-- Update RLS Policies for interactions
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON interactions;

CREATE POLICY "interactions_read" ON interactions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- Can see if they can access the entity
      (entity IS NOT NULL AND user_can_access_entity(auth.uid(), entity::text)) OR
      -- Can see if they can access the lead's entity (gov)
      (gov_lead_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM gov_leads
        WHERE id = gov_lead_id AND user_can_access_entity(auth.uid(), entity::text)
      )) OR
      -- Can see if they can access the lead's entity (commercial)
      (commercial_lead_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM commercial_leads
        WHERE id = commercial_lead_id AND user_can_access_entity(auth.uid(), entity::text)
      )) OR
      -- Admin/manager can see all
      user_can_edit(auth.uid())
    )
  );

CREATE POLICY "interactions_write" ON interactions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

CREATE POLICY "interactions_update" ON interactions
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

CREATE POLICY "interactions_delete" ON interactions
  FOR DELETE USING (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

-- ============================================================================
-- Update RLS Policies for compliance_items
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON compliance_items;

CREATE POLICY "compliance_items_read" ON compliance_items
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      user_can_edit(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM gov_leads
        WHERE id = gov_lead_id AND user_can_access_entity(auth.uid(), entity::text)
      )
    )
  );

CREATE POLICY "compliance_items_write" ON compliance_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

CREATE POLICY "compliance_items_update" ON compliance_items
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

CREATE POLICY "compliance_items_delete" ON compliance_items
  FOR DELETE USING (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

-- ============================================================================
-- Update RLS Policies for pricing_records
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can do everything" ON pricing_records;

CREATE POLICY "pricing_records_read" ON pricing_records
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      (gov_lead_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM gov_leads
        WHERE id = gov_lead_id AND user_can_access_entity(auth.uid(), entity::text)
      )) OR
      (commercial_lead_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM commercial_leads
        WHERE id = commercial_lead_id AND user_can_access_entity(auth.uid(), entity::text)
      )) OR
      user_can_edit(auth.uid())
    )
  );

CREATE POLICY "pricing_records_write" ON pricing_records
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

CREATE POLICY "pricing_records_update" ON pricing_records
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

CREATE POLICY "pricing_records_delete" ON pricing_records
  FOR DELETE USING (
    auth.role() = 'authenticated' AND user_can_edit(auth.uid())
  );

-- Migration 033 complete
