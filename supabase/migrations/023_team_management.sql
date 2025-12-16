-- ============================================
-- Team & User Groups Management
-- Migration: 023_team_management.sql
-- ============================================

-- User groups for organizing team members
CREATE TABLE IF NOT EXISTS user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6366f1',
  token_limit_monthly INTEGER,
  token_limit_daily INTEGER,
  allowed_features TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group membership (many-to-many: users to groups)
CREATE TABLE IF NOT EXISTS user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Organization invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  groups UUID[] DEFAULT '{}',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-user token usage tracking
CREATE TABLE IF NOT EXISTS user_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_used DECIMAL(10, 2) NOT NULL DEFAULT 0,
  operation_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(organization_id, user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_groups_org ON user_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_token_usage_org_user ON user_token_usage(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_token_usage_date ON user_token_usage(date);

-- RLS
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_token_usage ENABLE ROW LEVEL SECURITY;

-- Policies for user_groups
CREATE POLICY "Org members can view groups"
  ON user_groups FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage groups"
  ON user_groups FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policies for user_group_members
CREATE POLICY "Org members can view group members"
  ON user_group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM user_groups WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage group members"
  ON user_group_members FOR ALL
  USING (
    group_id IN (
      SELECT id FROM user_groups WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Policies for invitations
CREATE POLICY "Org members can view invitations"
  ON organization_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invitations"
  ON organization_invitations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policies for user token usage
CREATE POLICY "Users can view own usage"
  ON user_token_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view org usage"
  ON user_token_usage FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Function to track user token usage
CREATE OR REPLACE FUNCTION track_user_token_usage(
  p_org_id UUID,
  p_user_id UUID,
  p_tokens DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_token_usage (organization_id, user_id, date, tokens_used, operation_count)
  VALUES (p_org_id, p_user_id, CURRENT_DATE, p_tokens, 1)
  ON CONFLICT (organization_id, user_id, date)
  DO UPDATE SET
    tokens_used = user_token_usage.tokens_used + EXCLUDED.tokens_used,
    operation_count = user_token_usage.operation_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM organization_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = v_invitation.organization_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('error', 'Already a member of this organization');
  END IF;

  -- Add user to organization
  INSERT INTO user_organizations (organization_id, user_id, role)
  VALUES (v_invitation.organization_id, v_user_id, v_invitation.role);

  -- Add to groups if specified
  IF array_length(v_invitation.groups, 1) > 0 THEN
    INSERT INTO user_group_members (group_id, user_id, added_by)
    SELECT unnest(v_invitation.groups), v_user_id, v_invitation.invited_by;
  END IF;

  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET accepted_at = NOW(), accepted_by = v_user_id
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
