-- ============================================================================
-- AI Jobs System Migration
-- Unified job tracking for all AI operations (Studio, Queue, Combination)
-- ============================================================================

-- ============================================================================
-- 1. AI MODEL CONFIGURATIONS TABLE
-- Database-driven model configuration - add new models without code deploy
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_model_configs (
  id TEXT PRIMARY KEY, -- e.g., 'flux-kontext-pro'
  provider TEXT DEFAULT 'kie.ai',
  display_name TEXT NOT NULL,
  description TEXT,

  -- Endpoints
  submit_endpoint TEXT NOT NULL,
  status_endpoint TEXT NOT NULL,

  -- Request format template
  request_template JSONB NOT NULL,

  -- Response parsing paths (arrays for nested access)
  task_id_path TEXT[] DEFAULT ARRAY['data', 'taskId'],
  result_url_paths TEXT[][] DEFAULT ARRAY[
    ARRAY['data', 'response', 'resultImageUrl'],
    ARRAY['data', 'output', 'images', '0'],
    ARRAY['resultImageUrl']
  ],
  success_check JSONB DEFAULT '{"path": ["data", "successFlag"], "value": 1}',
  failure_check JSONB DEFAULT '{"path": ["data", "successFlag"], "values": [2, 3]}',

  -- Cost & Limits
  token_cost DECIMAL(10,2) DEFAULT 1.0,
  avg_processing_time_sec INTEGER DEFAULT 30,
  max_processing_time_sec INTEGER DEFAULT 600,

  -- Feature flags
  supports_callback BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. AI JOBS TABLE
-- Single source of truth for ALL AI operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Job Type & Source
  job_type TEXT NOT NULL CHECK (job_type IN ('optimize', 'combine', 'generate')),
  source TEXT NOT NULL CHECK (source IN ('studio', 'queue', 'combination', 'api')),
  source_id UUID, -- Reference to source table record

  -- AI Provider Info
  provider TEXT DEFAULT 'kie.ai',
  ai_model TEXT NOT NULL,
  task_id TEXT, -- Provider's task ID (from Kie.ai)
  callback_received BOOLEAN DEFAULT false,

  -- Request Details
  input_url TEXT NOT NULL,
  input_url_2 TEXT, -- For combination jobs (jewelry image)
  prompt TEXT,
  settings JSONB,

  -- Result
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'processing', 'success', 'failed', 'timeout', 'cancelled')),
  result_url TEXT,
  error_message TEXT,
  error_code TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  callback_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- Retry Logic
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,

  -- Cost Tracking
  tokens_reserved DECIMAL(10,2) DEFAULT 0,
  tokens_used DECIMAL(10,2) DEFAULT 0,
  tokens_refunded BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Indexes for common queries
CREATE INDEX idx_ai_jobs_org_status ON ai_jobs(organization_id, status);
CREATE INDEX idx_ai_jobs_org_created ON ai_jobs(organization_id, created_at DESC);
CREATE INDEX idx_ai_jobs_task_id ON ai_jobs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_ai_jobs_source ON ai_jobs(source, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_ai_jobs_pending ON ai_jobs(status, next_retry_at)
  WHERE status IN ('pending', 'submitted', 'processing');
CREATE INDEX idx_ai_jobs_model ON ai_jobs(organization_id, ai_model);
CREATE INDEX idx_ai_jobs_callback ON ai_jobs(callback_received, status)
  WHERE callback_received = false AND status IN ('submitted', 'processing');

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE ai_jobs;

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_configs ENABLE ROW LEVEL SECURITY;

-- AI Jobs: Users can only see jobs from their organization
CREATE POLICY "Users can view their organization's jobs"
  ON ai_jobs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert jobs for their organization"
  ON ai_jobs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all jobs"
  ON ai_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Model configs: Everyone can read active models
CREATE POLICY "Anyone can view active models"
  ON ai_model_configs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage models"
  ON ai_model_configs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. SEED AI MODEL CONFIGURATIONS
-- ============================================================================

INSERT INTO ai_model_configs (id, display_name, description, submit_endpoint, status_endpoint, request_template, task_id_path, result_url_paths, success_check, failure_check, token_cost, avg_processing_time_sec, supports_callback)
VALUES
  -- Flux Kontext Pro
  ('flux-kontext-pro', 'Flux Kontext Pro', 'Fast, high-quality image enhancement',
   'https://api.kie.ai/api/v1/flux/kontext/generate',
   'https://api.kie.ai/api/v1/flux/kontext/record-info',
   '{"model": "flux-kontext-pro", "outputFormat": "png"}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'response', 'resultImageUrl'], ARRAY['response', 'resultImageUrl']],
   '{"path": ["data", "successFlag"], "value": 1}',
   '{"path": ["data", "successFlag"], "values": [2, 3]}',
   1.0, 20, true),

  -- Flux Kontext Max
  ('flux-kontext-max', 'Flux Kontext Max', 'Maximum quality image enhancement',
   'https://api.kie.ai/api/v1/flux/kontext/generate',
   'https://api.kie.ai/api/v1/flux/kontext/record-info',
   '{"model": "flux-kontext-max", "outputFormat": "png"}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'response', 'resultImageUrl'], ARRAY['response', 'resultImageUrl']],
   '{"path": ["data", "successFlag"], "value": 1}',
   '{"path": ["data", "successFlag"], "values": [2, 3]}',
   2.0, 30, true),

  -- Nano Banana
  ('nano-banana', 'Nano Banana', 'Google nano-banana edit model',
   'https://api.kie.ai/api/v1/jobs/createTask',
   'https://api.kie.ai/api/v1/jobs/recordInfo',
   '{"model": "google/nano-banana-edit", "input": {"output_format": "png"}}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'resultJson'], ARRAY['data', 'output', 'images', '0']],
   '{"path": ["data", "state"], "value": "success"}',
   '{"path": ["data", "state"], "value": "fail"}',
   1.0, 40, true),

  -- Nano Banana Pro
  ('nano-banana-pro', 'Nano Banana Pro', 'Enhanced nano-banana with 2K resolution',
   'https://api.kie.ai/api/v1/jobs/createTask',
   'https://api.kie.ai/api/v1/jobs/recordInfo',
   '{"model": "nano-banana-pro", "input": {"output_format": "png", "resolution": "2K"}}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'resultJson'], ARRAY['data', 'output', 'images', '0'], ARRAY['data', 'images', '0']],
   '{"path": ["data", "state"], "value": "success"}',
   '{"path": ["data", "state"], "value": "fail"}',
   1.5, 50, true),

  -- Ghibli Style
  ('ghibli', 'Ghibli Style', 'Studio Ghibli anime style transformation',
   'https://api.kie.ai/api/v1/jobs/createTask',
   'https://api.kie.ai/api/v1/jobs/recordInfo',
   '{"model": "ghibli", "input": {"output_format": "png"}}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'resultJson'], ARRAY['data', 'output', 'images', '0']],
   '{"path": ["data", "state"], "value": "success"}',
   '{"path": ["data", "state"], "value": "fail"}',
   1.0, 45, true),

  -- Seedream V4 Edit (for combinations)
  ('seedream-v4-edit', 'Seedream V4 Edit', 'Advanced image editing and composition',
   'https://api.kie.ai/api/v1/jobs/createTask',
   'https://api.kie.ai/api/v1/jobs/recordInfo',
   '{"model": "seedream-v4-edit", "input": {"output_format": "png"}}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'resultJson'], ARRAY['data', 'output', 'images', '0']],
   '{"path": ["data", "state"], "value": "success"}',
   '{"path": ["data", "state"], "value": "fail"}',
   2.0, 60, true),

  -- GPT-4o Image
  ('gpt-4o-image', 'GPT-4o Image', 'OpenAI GPT-4o powered image generation',
   'https://api.kie.ai/api/v1/gpt4o-image/generate',
   'https://api.kie.ai/api/v1/gpt4o-image/record-info',
   '{"outputFormat": "png"}',
   ARRAY['data', 'taskId'],
   ARRAY[ARRAY['data', 'response', 'resultImageUrl']],
   '{"path": ["data", "successFlag"], "value": 1}',
   '{"path": ["data", "successFlag"], "values": [2, 3]}',
   3.0, 45, true)

ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  submit_endpoint = EXCLUDED.submit_endpoint,
  status_endpoint = EXCLUDED.status_endpoint,
  request_template = EXCLUDED.request_template,
  token_cost = EXCLUDED.token_cost,
  updated_at = now();

-- ============================================================================
-- 5. TRIGGER: SYNC RESULTS TO LEGACY TABLES
-- When ai_jobs completes, update the source table
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_ai_job_to_source()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to a terminal state
  IF NEW.status NOT IN ('success', 'failed', 'timeout') THEN
    RETURN NEW;
  END IF;

  -- Calculate processing time
  IF NEW.completed_at IS NOT NULL AND NEW.submitted_at IS NOT NULL THEN
    NEW.processing_time_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.submitted_at)) * 1000;
  END IF;

  -- Update source table based on source type
  CASE NEW.source
    WHEN 'studio' THEN
      UPDATE studio_generations
      SET
        status = NEW.status,
        result_url = NEW.result_url,
        error_message = NEW.error_message,
        processing_time_sec = COALESCE(NEW.processing_time_ms / 1000, 0),
        task_id = NEW.task_id
      WHERE id = NEW.source_id;

    WHEN 'queue' THEN
      -- For queue: create history record and delete queue item
      IF NEW.status = 'success' THEN
        -- Get queue item details
        WITH queue_item AS (
          SELECT * FROM processing_queue WHERE id = NEW.source_id
        )
        INSERT INTO processing_history (
          organization_id, project_id, file_id, file_name,
          original_url, optimized_url, status, ai_model,
          tokens_used, processing_time_sec, generated_prompt,
          completed_at, created_by
        )
        SELECT
          qi.organization_id, qi.project_id, qi.file_id, qi.file_name,
          NEW.input_url, NEW.result_url, 'success', NEW.ai_model,
          NEW.tokens_used, COALESCE(NEW.processing_time_ms / 1000, 0), NEW.prompt,
          NEW.completed_at, NEW.created_by
        FROM queue_item qi;

        -- Delete from queue
        DELETE FROM processing_queue WHERE id = NEW.source_id;
      ELSE
        -- Update queue item with error
        UPDATE processing_queue
        SET
          status = 'failed',
          error_message = NEW.error_message,
          task_id = NEW.task_id
        WHERE id = NEW.source_id;
      END IF;

    WHEN 'combination' THEN
      UPDATE combination_jobs
      SET
        status = NEW.status,
        result_url = NEW.result_url,
        error_message = NEW.error_message,
        processing_time_sec = COALESCE(NEW.processing_time_ms / 1000, 0),
        task_id = NEW.task_id
      WHERE id = NEW.source_id;

  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ai_job_sync_to_source
BEFORE UPDATE OF status ON ai_jobs
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('success', 'failed', 'timeout'))
EXECUTE FUNCTION sync_ai_job_to_source();

-- ============================================================================
-- 6. TRIGGER: TOKEN MANAGEMENT
-- Reserve tokens on job creation, deduct/refund on completion
-- ============================================================================

CREATE OR REPLACE FUNCTION manage_ai_job_tokens()
RETURNS TRIGGER AS $$
DECLARE
  v_token_cost DECIMAL(10,2);
BEGIN
  -- On INSERT: Reserve tokens
  IF TG_OP = 'INSERT' THEN
    -- Get token cost from model config
    SELECT token_cost INTO v_token_cost
    FROM ai_model_configs
    WHERE id = NEW.ai_model;

    v_token_cost := COALESCE(v_token_cost, 1.0);
    NEW.tokens_reserved := v_token_cost;

    -- Reserve tokens (deduct from balance, add to reserved)
    UPDATE token_accounts
    SET
      balance = balance - v_token_cost,
      updated_at = now()
    WHERE organization_id = NEW.organization_id;

    RETURN NEW;
  END IF;

  -- On UPDATE to terminal status: Finalize tokens
  IF TG_OP = 'UPDATE' AND NEW.status IN ('success', 'failed', 'timeout', 'cancelled') THEN
    IF NEW.status = 'success' AND NOT COALESCE(OLD.tokens_refunded, false) THEN
      -- Success: Mark tokens as used
      NEW.tokens_used := NEW.tokens_reserved;

      -- Record transaction
      INSERT INTO token_transactions (
        account_id, type, amount, description,
        reference_type, reference_id, metadata
      )
      SELECT
        ta.id, 'usage', -NEW.tokens_reserved,
        'AI Job: ' || NEW.job_type || ' (' || NEW.ai_model || ')',
        'ai_job', NEW.id::text,
        jsonb_build_object('source', NEW.source, 'model', NEW.ai_model)
      FROM token_accounts ta
      WHERE ta.organization_id = NEW.organization_id;

      -- Update lifetime used
      UPDATE token_accounts
      SET lifetime_used = lifetime_used + NEW.tokens_reserved
      WHERE organization_id = NEW.organization_id;

    ELSIF NEW.status IN ('failed', 'timeout', 'cancelled') AND NOT COALESCE(OLD.tokens_refunded, false) THEN
      -- Failed: Refund reserved tokens
      NEW.tokens_refunded := true;

      UPDATE token_accounts
      SET
        balance = balance + NEW.tokens_reserved,
        updated_at = now()
      WHERE organization_id = NEW.organization_id;

      -- Record refund transaction
      INSERT INTO token_transactions (
        account_id, type, amount, description,
        reference_type, reference_id
      )
      SELECT
        ta.id, 'refund', NEW.tokens_reserved,
        'Refund: AI Job ' || NEW.status,
        'ai_job', NEW.id::text
      FROM token_accounts ta
      WHERE ta.organization_id = NEW.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ai_job_token_management
BEFORE INSERT OR UPDATE OF status ON ai_jobs
FOR EACH ROW
EXECUTE FUNCTION manage_ai_job_tokens();

-- ============================================================================
-- 7. RPC FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Get job statistics for an organization
CREATE OR REPLACE FUNCTION get_ai_job_stats(
  p_org_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_jobs BIGINT,
  successful_jobs BIGINT,
  failed_jobs BIGINT,
  pending_jobs BIGINT,
  success_rate NUMERIC,
  avg_processing_time_ms NUMERIC,
  total_tokens_used NUMERIC,
  jobs_by_model JSONB,
  jobs_by_source JSONB,
  jobs_by_day JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH job_data AS (
    SELECT *
    FROM ai_jobs
    WHERE organization_id = p_org_id
      AND created_at >= now() - (p_days || ' days')::interval
  ),
  model_stats AS (
    SELECT jsonb_object_agg(ai_model, cnt) as data
    FROM (
      SELECT ai_model, count(*) as cnt
      FROM job_data
      GROUP BY ai_model
    ) m
  ),
  source_stats AS (
    SELECT jsonb_object_agg(source, cnt) as data
    FROM (
      SELECT source, count(*) as cnt
      FROM job_data
      GROUP BY source
    ) s
  ),
  daily_stats AS (
    SELECT jsonb_object_agg(day, cnt) as data
    FROM (
      SELECT date_trunc('day', created_at)::date::text as day, count(*) as cnt
      FROM job_data
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at)
    ) d
  )
  SELECT
    count(*)::BIGINT as total_jobs,
    count(*) FILTER (WHERE status = 'success')::BIGINT as successful_jobs,
    count(*) FILTER (WHERE status IN ('failed', 'timeout'))::BIGINT as failed_jobs,
    count(*) FILTER (WHERE status IN ('pending', 'submitted', 'processing'))::BIGINT as pending_jobs,
    ROUND(
      count(*) FILTER (WHERE status = 'success')::NUMERIC /
      NULLIF(count(*) FILTER (WHERE status IN ('success', 'failed', 'timeout')), 0) * 100,
      1
    ) as success_rate,
    ROUND(avg(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL), 0) as avg_processing_time_ms,
    COALESCE(sum(tokens_used), 0) as total_tokens_used,
    COALESCE((SELECT data FROM model_stats), '{}'::jsonb) as jobs_by_model,
    COALESCE((SELECT data FROM source_stats), '{}'::jsonb) as jobs_by_source,
    COALESCE((SELECT data FROM daily_stats), '{}'::jsonb) as jobs_by_day
  FROM job_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active (in-progress) jobs for real-time display
CREATE OR REPLACE FUNCTION get_active_jobs(p_org_id UUID)
RETURNS TABLE (
  job_id UUID,
  job_type TEXT,
  source TEXT,
  source_id UUID,
  ai_model TEXT,
  status TEXT,
  input_url TEXT,
  created_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  elapsed_seconds INTEGER,
  attempt_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aj.id as job_id,
    aj.job_type,
    aj.source,
    aj.source_id,
    aj.ai_model,
    aj.status,
    aj.input_url,
    aj.created_at,
    aj.submitted_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(aj.submitted_at, aj.created_at)))::INTEGER as elapsed_seconds,
    aj.attempt_count
  FROM ai_jobs aj
  WHERE aj.organization_id = p_org_id
    AND aj.status IN ('pending', 'submitted', 'processing')
  ORDER BY aj.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get jobs pending retry
CREATE OR REPLACE FUNCTION get_jobs_for_retry(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  job_id UUID,
  organization_id UUID,
  ai_model TEXT,
  task_id TEXT,
  attempt_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aj.id as job_id,
    aj.organization_id,
    aj.ai_model,
    aj.task_id,
    aj.attempt_count,
    aj.created_at
  FROM ai_jobs aj
  WHERE aj.status IN ('submitted', 'processing')
    AND aj.callback_received = false
    AND (aj.next_retry_at IS NULL OR aj.next_retry_at <= now())
    AND aj.attempt_count < aj.max_attempts
    AND aj.created_at > now() - interval '30 minutes'
  ORDER BY aj.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. BACKFILL HISTORICAL DATA
-- Migrate existing records to ai_jobs for unified analytics
-- ============================================================================

-- Backfill from studio_generations
INSERT INTO ai_jobs (
  organization_id, job_type, source, source_id,
  ai_model, task_id, input_url, prompt,
  status, result_url, error_message,
  created_at, completed_at,
  processing_time_ms, tokens_used, created_by
)
SELECT
  organization_id,
  'optimize',
  'studio',
  id,
  COALESCE(ai_model, 'flux-kontext-pro'),
  task_id,
  original_url,
  COALESCE(final_prompt, custom_prompt),
  CASE
    WHEN status = 'pending_result' THEN 'processing'
    ELSE status
  END,
  result_url,
  error_message,
  created_at,
  CASE WHEN status IN ('success', 'failed')
    THEN created_at + (COALESCE(processing_time_sec, 0) || ' seconds')::interval
    ELSE NULL
  END,
  COALESCE(processing_time_sec, 0) * 1000,
  COALESCE(tokens_used, 0),
  created_by
FROM studio_generations
WHERE status IN ('success', 'failed')
ON CONFLICT DO NOTHING;

-- Backfill from processing_history
INSERT INTO ai_jobs (
  organization_id, job_type, source, source_id,
  ai_model, input_url, prompt,
  status, result_url, error_message,
  created_at, completed_at,
  processing_time_ms, tokens_used, created_by
)
SELECT
  organization_id,
  'optimize',
  'queue',
  id,
  COALESCE(ai_model, 'flux-kontext-pro'),
  original_url,
  generated_prompt,
  status,
  optimized_url,
  error_message,
  COALESCE(started_at, completed_at, created_at),
  completed_at,
  COALESCE(processing_time_sec, 0) * 1000,
  COALESCE(tokens_used, 0),
  created_by
FROM processing_history
WHERE status IN ('success', 'failed')
ON CONFLICT DO NOTHING;

-- Backfill from combination_jobs
INSERT INTO ai_jobs (
  organization_id, job_type, source, source_id,
  ai_model, task_id, input_url, input_url_2, prompt,
  status, result_url, error_message,
  created_at, completed_at,
  processing_time_ms, tokens_used, created_by
)
SELECT
  organization_id,
  'combine',
  'combination',
  id,
  COALESCE(ai_model, 'seedream-v4-edit'),
  task_id,
  model_image_url,
  jewelry_image_url,
  generated_prompt,
  status,
  result_url,
  error_message,
  created_at,
  CASE WHEN status IN ('success', 'failed')
    THEN created_at + (COALESCE(processing_time_sec, 0) || ' seconds')::interval
    ELSE NULL
  END,
  COALESCE(processing_time_sec, 0) * 1000,
  COALESCE(tokens_used, 0),
  created_by
FROM combination_jobs
WHERE status IN ('success', 'failed')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. HELPER FUNCTION: Submit AI Job
-- Called by edge functions to create and submit jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_ai_job(
  p_organization_id UUID,
  p_job_type TEXT,
  p_source TEXT,
  p_source_id UUID,
  p_ai_model TEXT,
  p_input_url TEXT,
  p_input_url_2 TEXT DEFAULT NULL,
  p_prompt TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO ai_jobs (
    organization_id, job_type, source, source_id,
    ai_model, input_url, input_url_2, prompt, settings,
    status, created_by
  )
  VALUES (
    p_organization_id, p_job_type, p_source, p_source_id,
    p_ai_model, p_input_url, p_input_url_2, p_prompt, p_settings,
    'pending', p_created_by
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. HELPER FUNCTION: Update Job Status
-- Called by webhook to update job results
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ai_job_result(
  p_task_id TEXT,
  p_status TEXT,
  p_result_url TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  UPDATE ai_jobs
  SET
    status = p_status,
    result_url = p_result_url,
    error_message = p_error_message,
    callback_received = true,
    callback_at = now(),
    completed_at = CASE WHEN p_status IN ('success', 'failed', 'timeout') THEN now() ELSE completed_at END
  WHERE task_id = p_task_id
    AND status NOT IN ('success', 'failed', 'timeout', 'cancelled')
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_ai_job_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION submit_ai_job TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_job_result TO service_role;
GRANT EXECUTE ON FUNCTION get_jobs_for_retry TO service_role;
