-- Migration: Extended Roles
-- Add editor and viewer roles to user_organizations

-- Update role constraint to support all four roles
ALTER TABLE user_organizations
DROP CONSTRAINT IF EXISTS user_organizations_role_check;

ALTER TABLE user_organizations
ADD CONSTRAINT user_organizations_role_check
CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Convert existing 'member' roles to 'viewer'
UPDATE user_organizations
SET role = 'viewer'
WHERE role = 'member' OR role IS NULL;

-- Create function to check if user has specific permission level
CREATE OR REPLACE FUNCTION has_organization_permission(
  org_id UUID,
  required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_level INT;
  required_level INT;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO user_role
  FROM user_organizations
  WHERE user_id = auth.uid()
  AND organization_id = org_id;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Define role hierarchy (higher = more permissions)
  role_level := CASE user_role
    WHEN 'owner' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'editor' THEN 1
    WHEN 'viewer' THEN 0
    ELSE 0
  END;

  required_level := CASE required_role
    WHEN 'owner' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'editor' THEN 1
    WHEN 'viewer' THEN 0
    ELSE 0
  END;

  RETURN role_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_organization_permission(UUID, TEXT) TO authenticated;
