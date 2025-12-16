-- ============================================
-- Stripe Payment Integration
-- Migration: 021_stripe_integration.sql
-- ============================================

-- Stripe customer mapping
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL, -- basic, pro, business, enterprise
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, canceled, past_due, trialing, incomplete
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  tokens_per_period INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token purchases (one-time payments)
CREATE TABLE IF NOT EXISTS token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_checkout_session_id VARCHAR(255),
  package_id VARCHAR(50) NOT NULL, -- starter, standard, pro, enterprise
  tokens_amount INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe webhook events (for idempotency and debugging)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token pricing packages (for UI and validation)
CREATE TABLE IF NOT EXISTS token_packages (
  id VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  tokens INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id VARCHAR(255),
  description TEXT,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  tokens_monthly INTEGER NOT NULL,
  max_team_members INTEGER DEFAULT 2,
  max_stores INTEGER DEFAULT 1,
  price_monthly_cents INTEGER NOT NULL,
  price_yearly_cents INTEGER NOT NULL,
  stripe_monthly_price_id VARCHAR(255),
  stripe_yearly_price_id VARCHAR(255),
  features JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AppSumo licenses
CREATE TABLE IF NOT EXISTS appsumo_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  tokens_monthly INTEGER NOT NULL DEFAULT 5000,
  max_team_members INTEGER DEFAULT 2,
  max_stores INTEGER DEFAULT 1,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  redeemed_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_org ON stripe_customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_org ON token_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON token_purchases(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_appsumo_licenses_org ON appsumo_licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_appsumo_licenses_code ON appsumo_licenses(code);

-- RLS Policies
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE appsumo_licenses ENABLE ROW LEVEL SECURITY;

-- Public read for packages/plans (no auth needed)
CREATE POLICY "Anyone can view token packages"
  ON token_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Org members can view their billing data
CREATE POLICY "Org members can view stripe customer"
  ON stripe_customers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view purchases"
  ON token_purchases FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view appsumo licenses"
  ON appsumo_licenses FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Seed default token packages
INSERT INTO token_packages (id, display_name, tokens, price_cents, description, is_popular, sort_order) VALUES
  ('starter', 'Starter Pack', 1000, 900, '$0.009 per token', false, 1),
  ('standard', 'Standard Pack', 5000, 3900, '$0.0078 per token - 13% off', true, 2),
  ('pro', 'Pro Pack', 15000, 9900, '$0.0066 per token - 27% off', false, 3),
  ('enterprise', 'Enterprise Pack', 50000, 24900, '$0.005 per token - 44% off', false, 4)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  tokens = EXCLUDED.tokens,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order;

-- Seed default subscription plans
INSERT INTO subscription_plans (id, display_name, tokens_monthly, max_team_members, max_stores, price_monthly_cents, price_yearly_cents, features, sort_order) VALUES
  ('basic', 'Basic', 3000, 2, 1, 1900, 18240, '["Basic image processing", "Email support"]', 1),
  ('pro', 'Pro', 10000, 5, 3, 4900, 47040, '["Priority processing", "Shopify integration", "Team collaboration"]', 2),
  ('business', 'Business', 30000, 15, 10, 12900, 123840, '["Advanced automation", "API access", "Dedicated support"]', 3),
  ('enterprise', 'Enterprise', 100000, -1, -1, 39900, 383040, '["Unlimited team", "Unlimited stores", "Custom integrations", "SLA guarantee"]', 4)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  tokens_monthly = EXCLUDED.tokens_monthly,
  max_team_members = EXCLUDED.max_team_members,
  max_stores = EXCLUDED.max_stores,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_yearly_cents = EXCLUDED.price_yearly_cents,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- Function to credit tokens after successful payment
CREATE OR REPLACE FUNCTION credit_tokens_from_purchase(
  p_org_id UUID,
  p_tokens INTEGER,
  p_purchase_id UUID,
  p_description TEXT DEFAULT 'Token purchase'
)
RETURNS VOID AS $$
DECLARE
  v_account_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get or create token account
  SELECT id, balance INTO v_account_id, v_current_balance
  FROM token_accounts
  WHERE organization_id = p_org_id;

  IF v_account_id IS NULL THEN
    INSERT INTO token_accounts (organization_id, balance, lifetime_purchased)
    VALUES (p_org_id, p_tokens, p_tokens)
    RETURNING id INTO v_account_id;
    v_current_balance := 0;
    v_new_balance := p_tokens;
  ELSE
    v_new_balance := v_current_balance + p_tokens;
    UPDATE token_accounts
    SET balance = v_new_balance,
        lifetime_purchased = lifetime_purchased + p_tokens,
        updated_at = NOW()
    WHERE id = v_account_id;
  END IF;

  -- Record transaction
  INSERT INTO token_transactions (
    account_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    v_account_id,
    'purchase',
    p_tokens,
    v_current_balance,
    v_new_balance,
    'token_purchase',
    p_purchase_id,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to credit subscription tokens
CREATE OR REPLACE FUNCTION credit_subscription_tokens(
  p_org_id UUID,
  p_tokens INTEGER,
  p_subscription_id UUID,
  p_description TEXT DEFAULT 'Subscription token credit'
)
RETURNS VOID AS $$
DECLARE
  v_account_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get or create token account
  SELECT id, balance INTO v_account_id, v_current_balance
  FROM token_accounts
  WHERE organization_id = p_org_id;

  IF v_account_id IS NULL THEN
    INSERT INTO token_accounts (organization_id, balance, lifetime_purchased)
    VALUES (p_org_id, p_tokens, p_tokens)
    RETURNING id INTO v_account_id;
    v_current_balance := 0;
    v_new_balance := p_tokens;
  ELSE
    v_new_balance := v_current_balance + p_tokens;
    UPDATE token_accounts
    SET balance = v_new_balance,
        lifetime_purchased = lifetime_purchased + p_tokens,
        updated_at = NOW()
    WHERE id = v_account_id;
  END IF;

  -- Record transaction
  INSERT INTO token_transactions (
    account_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    v_account_id,
    'subscription',
    p_tokens,
    v_current_balance,
    v_new_balance,
    'subscription',
    p_subscription_id,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle AppSumo token credits
CREATE OR REPLACE FUNCTION credit_appsumo_tokens(
  p_org_id UUID,
  p_tokens INTEGER,
  p_license_id UUID,
  p_description TEXT DEFAULT 'AppSumo license credit'
)
RETURNS VOID AS $$
DECLARE
  v_account_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get or create token account
  SELECT id, balance INTO v_account_id, v_current_balance
  FROM token_accounts
  WHERE organization_id = p_org_id;

  IF v_account_id IS NULL THEN
    INSERT INTO token_accounts (organization_id, balance, lifetime_purchased)
    VALUES (p_org_id, p_tokens, p_tokens)
    RETURNING id INTO v_account_id;
    v_current_balance := 0;
    v_new_balance := p_tokens;
  ELSE
    v_new_balance := v_current_balance + p_tokens;
    UPDATE token_accounts
    SET balance = v_new_balance,
        lifetime_purchased = lifetime_purchased + p_tokens,
        updated_at = NOW()
    WHERE id = v_account_id;
  END IF;

  -- Record transaction
  INSERT INTO token_transactions (
    account_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    v_account_id,
    'bonus',
    p_tokens,
    v_current_balance,
    v_new_balance,
    'appsumo_license',
    p_license_id,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
