-- Image Optimizer Pro - Initial Database Schema
-- Version: 2.0.0
-- Based on technical handoff document

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS (Multi-tenant support)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ORGANIZATION MEMBERSHIP
-- ============================================
CREATE TABLE user_organizations (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- owner, admin, member
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- ============================================
-- PROMPT TEMPLATES
-- ============================================
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- Jewelry, Product, Fashion, Food, Other
  subcategory TEXT,
  base_prompt TEXT,
  style TEXT, -- Premium, Elegant, Standard, Lifestyle, Minimal
  background TEXT, -- White, Gradient, Transparent, Natural, Custom
  lighting TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input_folder_url TEXT,
  input_folder_id TEXT,
  output_folder_url TEXT,
  output_folder_id TEXT,
  template_id UUID REFERENCES prompt_templates(id),
  custom_prompt TEXT,
  status TEXT DEFAULT 'draft', -- draft, active, completed, archived
  resolution TEXT DEFAULT '2K', -- 2K, 4K
  trial_count INTEGER DEFAULT 5,
  trial_completed INTEGER DEFAULT 0,
  total_images INTEGER DEFAULT 0,
  processed_images INTEGER DEFAULT 0,
  failed_images INTEGER DEFAULT 0,
  total_tokens DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROCESSING QUEUE
-- ============================================
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'queued', -- queued, processing, optimizing, failed
  progress INTEGER DEFAULT 0,
  task_id TEXT, -- Kie.ai task ID
  generated_prompt TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  tokens_reserved DECIMAL(10,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROCESSING HISTORY
-- ============================================
CREATE TABLE processing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  original_url TEXT,
  optimized_url TEXT,
  optimized_storage_path TEXT,
  status TEXT DEFAULT 'success', -- success, failed
  resolution TEXT,
  tokens_used DECIMAL(10,2),
  processing_time_sec INTEGER,
  generated_prompt TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TOKEN ACCOUNTS
-- ============================================
CREATE TABLE token_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0,
  lifetime_purchased DECIMAL(10,2) DEFAULT 0,
  lifetime_used DECIMAL(10,2) DEFAULT 0,
  low_balance_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOKEN TRANSACTIONS
-- ============================================
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES token_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- purchase, usage, refund, bonus, coupon, adjustment
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  description TEXT,
  reference_type TEXT, -- history, project, coupon, manual
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TOKEN PRICING
-- ============================================
CREATE TABLE token_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT UNIQUE NOT NULL, -- optimize_2k, optimize_4k, redo
  token_cost DECIMAL(10,2) NOT NULL,
  display_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default pricing
INSERT INTO token_pricing (operation, token_cost, display_name, description) VALUES
  ('optimize_2k', 1.0, '2K Image Optimization', 'Standard quality optimization'),
  ('optimize_4k', 2.0, '4K Image Optimization', 'Premium quality optimization'),
  ('redo', 0.5, 'Re-process Image', 'Re-optimize with different settings');

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_queue_org ON processing_queue(organization_id);
CREATE INDEX idx_queue_status ON processing_queue(status);
CREATE INDEX idx_queue_project ON processing_queue(project_id);
CREATE INDEX idx_history_org ON processing_history(organization_id);
CREATE INDEX idx_history_project ON processing_history(project_id);
CREATE INDEX idx_history_file ON processing_history(file_id);
CREATE INDEX idx_templates_org ON prompt_templates(organization_id);
CREATE INDEX idx_templates_category ON prompt_templates(category);
CREATE INDEX idx_transactions_account ON token_transactions(account_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations: Users can view their own organizations
CREATE POLICY "Users can view own organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_organization_ids()));

-- User Organizations: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- Projects: Users can CRUD their organization's projects
CREATE POLICY "Users can view org projects"
  ON projects FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org projects"
  ON projects FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org projects"
  ON projects FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org projects"
  ON projects FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Templates: Users can view system templates + their org templates
CREATE POLICY "Users can view templates"
  ON prompt_templates FOR SELECT
  USING (
    is_system = TRUE OR
    organization_id IN (SELECT get_user_organization_ids())
  );

CREATE POLICY "Users can insert org templates"
  ON prompt_templates FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org templates"
  ON prompt_templates FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org templates"
  ON prompt_templates FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()) AND is_system = FALSE);

-- Processing Queue: Users can CRUD their org's queue items
CREATE POLICY "Users can view org queue"
  ON processing_queue FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org queue"
  ON processing_queue FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org queue"
  ON processing_queue FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org queue"
  ON processing_queue FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Processing History: Users can view their org's history
CREATE POLICY "Users can view org history"
  ON processing_history FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org history"
  ON processing_history FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

-- Token Accounts: Users can view their org's account
CREATE POLICY "Users can view org token account"
  ON token_accounts FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Token Transactions: Users can view their org's transactions
CREATE POLICY "Users can view org transactions"
  ON token_transactions FOR SELECT
  USING (account_id IN (
    SELECT id FROM token_accounts
    WHERE organization_id IN (SELECT get_user_organization_ids())
  ));

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_history;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_token_accounts_updated_at
  BEFORE UPDATE ON token_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
