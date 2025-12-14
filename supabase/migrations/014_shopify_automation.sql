-- ============================================================================
-- Shopify Automation System
-- Enables automated batch processing with trust-building safety controls
-- ============================================================================

-- Automation configuration per store
CREATE TABLE shopify_automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Master toggle
  is_enabled BOOLEAN DEFAULT false,

  -- Webhook trigger (auto-queue when products added to Shopify)
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_secret TEXT,

  -- Schedule trigger
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'twice_daily'
  schedule_time TEXT DEFAULT '02:00', -- HH:MM format
  schedule_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  schedule_timezone TEXT DEFAULT 'America/New_York',
  schedule_next_run_at TIMESTAMPTZ,
  schedule_last_run_at TIMESTAMPTZ,

  -- Safety: Approval requirement (trust building)
  require_approval BOOLEAN DEFAULT true,
  approval_threshold INT DEFAULT 5, -- Require approval for first N batches
  batches_completed INT DEFAULT 0, -- Track completed batches

  -- Safety: Daily limits
  daily_limit INT DEFAULT 500,
  daily_processed INT DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT now(),

  -- Safety: Auto-pause on high failure rate
  auto_pause_enabled BOOLEAN DEFAULT true,
  auto_pause_threshold DECIMAL DEFAULT 0.15, -- Pause if failure > 15%
  is_paused BOOLEAN DEFAULT false,
  paused_reason TEXT,
  paused_at TIMESTAMPTZ,

  -- Default processing settings
  default_preset_id UUID REFERENCES optimization_presets(id),
  default_ai_model TEXT DEFAULT 'flux-kontext-pro',
  default_quality INT DEFAULT 85,
  default_format TEXT DEFAULT 'webp',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(store_id)
);

-- Pending automation queue (products waiting to be processed)
CREATE TABLE shopify_automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Product info
  shopify_product_id TEXT NOT NULL,
  product_title TEXT,
  product_handle TEXT,
  image_count INT DEFAULT 0,
  thumbnail_url TEXT,

  -- Queue metadata
  source TEXT NOT NULL DEFAULT 'manual', -- 'webhook', 'scheduled', 'manual'
  priority TEXT DEFAULT 'normal', -- 'high', 'normal', 'low'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'skipped'

  -- Processing info
  job_id UUID REFERENCES shopify_sync_jobs(id),
  error_message TEXT,

  -- Timestamps
  added_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,

  UNIQUE(store_id, shopify_product_id)
);

-- Excluded products (never auto-process these)
CREATE TABLE shopify_excluded_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Product info
  shopify_product_id TEXT NOT NULL,
  product_title TEXT,
  product_handle TEXT,
  thumbnail_url TEXT,

  -- Exclusion metadata
  reason TEXT, -- User's reason for excluding
  excluded_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(store_id, shopify_product_id)
);

-- Automation run history
CREATE TABLE shopify_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID REFERENCES shopify_automation_configs(id),

  -- Run info
  trigger_type TEXT NOT NULL, -- 'webhook', 'scheduled', 'manual', 'test'

  -- Stats
  products_queued INT DEFAULT 0,
  images_queued INT DEFAULT 0,
  images_processed INT DEFAULT 0,
  images_failed INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'paused', 'cancelled'
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Computed success rate for quick queries
  success_rate DECIMAL GENERATED ALWAYS AS (
    CASE
      WHEN images_processed + images_failed > 0
      THEN images_processed::DECIMAL / (images_processed + images_failed)
      ELSE 1.0
    END
  ) STORED
);

-- Test run tracking (for trust building)
CREATE TABLE shopify_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID REFERENCES shopify_automation_runs(id),

  -- Test configuration
  test_count INT NOT NULL, -- Number of images to test
  selected_product_ids TEXT[], -- Specific products selected (null = random)

  -- Results
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  results JSONB, -- Detailed results for review

  -- User feedback
  approved BOOLEAN,
  feedback TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX idx_automation_configs_store ON shopify_automation_configs(store_id);
CREATE INDEX idx_automation_configs_user ON shopify_automation_configs(user_id);
CREATE INDEX idx_automation_configs_schedule ON shopify_automation_configs(schedule_next_run_at)
  WHERE schedule_enabled = true AND is_enabled = true AND is_paused = false;

CREATE INDEX idx_automation_queue_store ON shopify_automation_queue(store_id);
CREATE INDEX idx_automation_queue_status ON shopify_automation_queue(status);
CREATE INDEX idx_automation_queue_priority ON shopify_automation_queue(store_id, priority, added_at);
CREATE INDEX idx_automation_queue_pending ON shopify_automation_queue(store_id, status, priority, added_at)
  WHERE status = 'pending';

CREATE INDEX idx_excluded_products_store ON shopify_excluded_products(store_id);
CREATE INDEX idx_excluded_products_lookup ON shopify_excluded_products(store_id, shopify_product_id);

CREATE INDEX idx_automation_runs_store ON shopify_automation_runs(store_id);
CREATE INDEX idx_automation_runs_status ON shopify_automation_runs(status);
CREATE INDEX idx_automation_runs_recent ON shopify_automation_runs(store_id, started_at DESC);

CREATE INDEX idx_test_runs_store ON shopify_test_runs(store_id);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

ALTER TABLE shopify_automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_excluded_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_test_runs ENABLE ROW LEVEL SECURITY;

-- Automation configs policies
CREATE POLICY "Users can view own automation configs"
  ON shopify_automation_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automation configs"
  ON shopify_automation_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automation configs"
  ON shopify_automation_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own automation configs"
  ON shopify_automation_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Queue policies
CREATE POLICY "Users can view own queue items"
  ON shopify_automation_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items"
  ON shopify_automation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON shopify_automation_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON shopify_automation_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Excluded products policies
CREATE POLICY "Users can view own excluded products"
  ON shopify_excluded_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own excluded products"
  ON shopify_excluded_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own excluded products"
  ON shopify_excluded_products FOR DELETE
  USING (auth.uid() = user_id);

-- Runs policies
CREATE POLICY "Users can view own automation runs"
  ON shopify_automation_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automation runs"
  ON shopify_automation_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automation runs"
  ON shopify_automation_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- Test runs policies
CREATE POLICY "Users can view own test runs"
  ON shopify_test_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test runs"
  ON shopify_test_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test runs"
  ON shopify_test_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to reset daily counters
CREATE OR REPLACE FUNCTION reset_automation_daily_counters()
RETURNS void AS $$
BEGIN
  UPDATE shopify_automation_configs
  SET
    daily_processed = 0,
    daily_reset_at = now()
  WHERE daily_reset_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next scheduled run
CREATE OR REPLACE FUNCTION calculate_next_run(
  p_frequency TEXT,
  p_time TEXT,
  p_timezone TEXT,
  p_days TEXT[]
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_target_time TIME;
  v_current_day TEXT;
  v_check_date DATE;
  v_i INT;
BEGIN
  v_target_time := p_time::TIME;
  v_check_date := CURRENT_DATE;

  -- Simple daily schedule
  IF p_frequency = 'daily' THEN
    v_next_run := (v_check_date || ' ' || p_time)::TIMESTAMP AT TIME ZONE p_timezone;
    IF v_next_run <= now() THEN
      v_next_run := v_next_run + INTERVAL '1 day';
    END IF;
    RETURN v_next_run;
  END IF;

  -- Twice daily
  IF p_frequency = 'twice_daily' THEN
    v_next_run := (v_check_date || ' ' || p_time)::TIMESTAMP AT TIME ZONE p_timezone;
    IF v_next_run <= now() THEN
      v_next_run := v_next_run + INTERVAL '12 hours';
    END IF;
    IF v_next_run <= now() THEN
      v_next_run := v_next_run + INTERVAL '12 hours';
    END IF;
    RETURN v_next_run;
  END IF;

  -- Weekly (check specific days)
  IF p_frequency = 'weekly' THEN
    FOR v_i IN 0..7 LOOP
      v_check_date := CURRENT_DATE + v_i;
      v_current_day := LOWER(to_char(v_check_date, 'day'));
      v_current_day := TRIM(v_current_day);

      IF v_current_day = ANY(p_days) THEN
        v_next_run := (v_check_date || ' ' || p_time)::TIMESTAMP AT TIME ZONE p_timezone;
        IF v_next_run > now() THEN
          RETURN v_next_run;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Default: tomorrow at specified time
  RETURN ((CURRENT_DATE + 1) || ' ' || p_time)::TIMESTAMP AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_automation_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_config_updated
  BEFORE UPDATE ON shopify_automation_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_config_timestamp();

-- Trigger to update next run time when schedule changes
CREATE OR REPLACE FUNCTION update_schedule_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.schedule_enabled = true AND NEW.is_enabled = true AND NEW.is_paused = false THEN
    NEW.schedule_next_run_at := calculate_next_run(
      NEW.schedule_frequency,
      NEW.schedule_time,
      NEW.schedule_timezone,
      NEW.schedule_days
    );
  ELSE
    NEW.schedule_next_run_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_schedule_updated
  BEFORE INSERT OR UPDATE OF schedule_enabled, schedule_frequency, schedule_time, schedule_timezone, schedule_days, is_enabled, is_paused
  ON shopify_automation_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_next_run();

-- ============================================================================
-- Service role policies for edge functions
-- ============================================================================

CREATE POLICY "Service role can manage automation configs"
  ON shopify_automation_configs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage queue"
  ON shopify_automation_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage excluded products"
  ON shopify_excluded_products FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage automation runs"
  ON shopify_automation_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage test runs"
  ON shopify_test_runs FOR ALL
  USING (auth.role() = 'service_role');
