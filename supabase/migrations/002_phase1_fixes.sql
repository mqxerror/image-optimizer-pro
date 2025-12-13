-- ============================================
-- PHASE 1 SCHEMA FIXES
-- Migration: 002_phase1_fixes.sql
-- Description: Add missing columns and tables for Phase 1
-- ============================================

-- 1. Add missing columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Comment on settings structure
COMMENT ON COLUMN organizations.settings IS 'JSON: { default_resolution: "2K"|"4K", default_template_id: UUID }';

-- 2. Create storage_connections table for Google Drive OAuth
CREATE TABLE IF NOT EXISTS storage_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_drive', 'dropbox', 'supabase_storage'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT, -- External provider's user ID
  provider_email TEXT, -- External provider's email
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_storage_connections_org
  ON storage_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_storage_connections_user
  ON storage_connections(user_id);

-- 3. Enable RLS on storage_connections
ALTER TABLE storage_connections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for storage_connections
CREATE POLICY "Users can view org storage connections"
  ON storage_connections FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org storage connections"
  ON storage_connections FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org storage connections"
  ON storage_connections FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org storage connections"
  ON storage_connections FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- 5. Allow authenticated users to create organizations (for registration flow)
-- Drop existing policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- 6. Allow users to update their own organizations (where they are owner)
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;

CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 7. Allow users to delete their own organizations (where they are owner)
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 8. Allow users to insert themselves into user_organizations
DROP POLICY IF EXISTS "Users can create own membership" ON user_organizations;

CREATE POLICY "Users can create own membership"
  ON user_organizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 9. Updated_at trigger for storage_connections
CREATE TRIGGER update_storage_connections_updated_at
  BEFORE UPDATE ON storage_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. Add profile columns to track user display name (optional)
-- This allows users to set a display name separate from email
-- We'll use auth.users metadata for this, no schema change needed

-- 11. Create a function to get user's primary organization
-- Useful for dashboard and default context
CREATE OR REPLACE FUNCTION get_user_primary_organization()
RETURNS UUID AS $$
  SELECT organization_id
  FROM user_organizations
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER;

-- 12. Create a function to check if user owns an organization
CREATE OR REPLACE FUNCTION is_organization_owner(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'owner'
  ) OR EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_id
    AND owner_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- 13. Add constraint to ensure projects reference valid templates
-- (template can be null, but if set must exist)
-- Already handled by FK, but adding explicit check for org templates
CREATE OR REPLACE FUNCTION check_template_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    -- Check template is either system or belongs to same org
    IF NOT EXISTS (
      SELECT 1 FROM prompt_templates
      WHERE id = NEW.template_id
      AND (is_system = TRUE OR organization_id = NEW.organization_id)
    ) THEN
      RAISE EXCEPTION 'Template not accessible to this organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_project_template_access ON projects;
CREATE TRIGGER check_project_template_access
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION check_template_access();
