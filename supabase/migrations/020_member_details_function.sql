-- Function to get organization member details (including email)
-- Only callable by org owners and admins
CREATE OR REPLACE FUNCTION get_organization_members(org_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller has permission (owner or admin of this org)
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
    AND organization_id = org_id
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to view member details';
  END IF;

  RETURN QUERY
  SELECT
    uo.user_id,
    au.email::TEXT,
    up.display_name,
    up.avatar_url,
    uo.role,
    uo.created_at as joined_at
  FROM user_organizations uo
  LEFT JOIN auth.users au ON au.id = uo.user_id
  LEFT JOIN user_profiles up ON up.user_id = uo.user_id
  WHERE uo.organization_id = org_id
  ORDER BY uo.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO authenticated;
