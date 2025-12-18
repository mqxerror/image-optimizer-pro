-- ============================================================================
-- Auto-Retry System for AI Jobs
-- Automatically retries failed jobs up to max_attempts times
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION: Schedule retry for failed jobs
-- Called BEFORE the token refund to intercept failures
-- ============================================================================

CREATE OR REPLACE FUNCTION schedule_ai_job_retry()
RETURNS TRIGGER AS $$
DECLARE
  v_retry_delay INTERVAL;
BEGIN
  -- Only process newly failed/timeout jobs
  IF NEW.status NOT IN ('failed', 'timeout') THEN
    RETURN NEW;
  END IF;

  -- Skip if old status was already failed (no double-retry)
  IF OLD.status IN ('failed', 'timeout') THEN
    RETURN NEW;
  END IF;

  -- Check if we've exceeded max attempts
  IF NEW.attempt_count >= NEW.max_attempts THEN
    -- Max retries reached, let the job fail permanently
    RETURN NEW;
  END IF;

  -- Check if tokens were already refunded (final failure)
  IF COALESCE(NEW.tokens_refunded, false) THEN
    RETURN NEW;
  END IF;

  -- Calculate exponential backoff: 30s, 60s, 120s, etc.
  v_retry_delay := (30 * power(2, NEW.attempt_count))::text || ' seconds';

  -- Schedule retry instead of final failure
  NEW.status := 'pending';
  NEW.next_retry_at := now() + v_retry_delay;
  NEW.last_error := NEW.error_message;
  NEW.error_message := NULL;
  NEW.attempt_count := NEW.attempt_count + 1;
  NEW.callback_received := false;
  NEW.task_id := NULL; -- Clear old task ID for new submission

  RAISE NOTICE 'Scheduling retry % of % for job % in %',
    NEW.attempt_count, NEW.max_attempts, NEW.id, v_retry_delay;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS ai_job_auto_retry ON ai_jobs;

-- Create trigger that runs BEFORE the sync and token triggers
-- Priority ordering: retry -> sync -> tokens
CREATE TRIGGER ai_job_auto_retry
BEFORE UPDATE OF status ON ai_jobs
FOR EACH ROW
WHEN (
  NEW.status IN ('failed', 'timeout')
  AND OLD.status NOT IN ('failed', 'timeout', 'success', 'cancelled')
  AND NEW.attempt_count < NEW.max_attempts
  AND NOT COALESCE(NEW.tokens_refunded, false)
)
EXECUTE FUNCTION schedule_ai_job_retry();

-- ============================================================================
-- 2. FUNCTION: Get jobs ready for retry
-- Enhanced version with better filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION get_jobs_for_retry(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  job_id UUID,
  organization_id UUID,
  ai_model TEXT,
  task_id TEXT,
  attempt_count INTEGER,
  max_attempts INTEGER,
  input_url TEXT,
  input_url_2 TEXT,
  prompt TEXT,
  settings JSONB,
  source TEXT,
  source_id UUID,
  job_type TEXT,
  created_by UUID,
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
    aj.max_attempts,
    aj.input_url,
    aj.input_url_2,
    aj.prompt,
    aj.settings,
    aj.source,
    aj.source_id,
    aj.job_type,
    aj.created_by,
    aj.created_at
  FROM ai_jobs aj
  WHERE aj.status = 'pending'
    AND aj.next_retry_at IS NOT NULL
    AND aj.next_retry_at <= now()
    AND aj.attempt_count > 0  -- Only jobs that are retrying
    AND aj.attempt_count < aj.max_attempts
  ORDER BY aj.next_retry_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FUNCTION: Get stale jobs for polling check
-- Jobs that are stuck in submitted/processing state
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stale_jobs_for_check(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  job_id UUID,
  organization_id UUID,
  ai_model TEXT,
  task_id TEXT,
  attempt_count INTEGER,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  seconds_since_submit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aj.id as job_id,
    aj.organization_id,
    aj.ai_model,
    aj.task_id,
    aj.attempt_count,
    aj.status,
    aj.submitted_at,
    EXTRACT(EPOCH FROM (now() - aj.submitted_at))::INTEGER as seconds_since_submit
  FROM ai_jobs aj
  WHERE aj.status IN ('submitted', 'processing')
    AND aj.callback_received = false
    AND aj.task_id IS NOT NULL
    AND aj.submitted_at IS NOT NULL
    AND aj.submitted_at < now() - interval '30 seconds'  -- At least 30s old
    AND aj.attempt_count < aj.max_attempts
  ORDER BY aj.submitted_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_jobs_for_retry TO service_role;
GRANT EXECUTE ON FUNCTION get_stale_jobs_for_check TO service_role;

-- ============================================================================
-- 4. INDEX: Optimize retry queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_jobs_retry
ON ai_jobs(status, next_retry_at, attempt_count)
WHERE status = 'pending' AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_jobs_stale
ON ai_jobs(status, submitted_at, callback_received)
WHERE status IN ('submitted', 'processing') AND callback_received = false;
