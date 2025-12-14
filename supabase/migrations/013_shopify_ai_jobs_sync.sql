-- ============================================================================
-- SHOPIFY AI JOBS SYNC
-- Add shopify source to ai_jobs and sync results to shopify_images
-- ============================================================================

-- 1. Add 'shopify' to the source CHECK constraint
ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_source_check;
ALTER TABLE ai_jobs ADD CONSTRAINT ai_jobs_source_check
  CHECK (source IN ('studio', 'queue', 'combination', 'api', 'shopify'));

-- 2. Add ai_job_id column to shopify_images if not exists
ALTER TABLE shopify_images ADD COLUMN IF NOT EXISTS ai_job_id UUID REFERENCES ai_jobs(id);
CREATE INDEX IF NOT EXISTS idx_shopify_images_ai_job ON shopify_images(ai_job_id) WHERE ai_job_id IS NOT NULL;

-- 3. Update the sync_ai_job_to_source function to handle shopify
CREATE OR REPLACE FUNCTION sync_ai_job_to_source()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id UUID;
  v_pending INT;
  v_ready INT;
  v_failed INT;
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

    WHEN 'shopify' THEN
      -- Update shopify_images with result
      IF NEW.status = 'success' THEN
        UPDATE shopify_images
        SET
          status = 'ready',
          optimized_url = NEW.result_url,
          error_message = NULL,
          tokens_used = COALESCE(NEW.tokens_used, 0)::INT,
          processing_time_ms = COALESCE(NEW.processing_time_ms, 0)::INT,
          updated_at = now()
        WHERE id = NEW.source_id;
      ELSE
        UPDATE shopify_images
        SET
          status = 'failed',
          error_message = NEW.error_message,
          updated_at = now()
        WHERE id = NEW.source_id;
      END IF;

      -- Get the job_id from the shopify_images record
      SELECT job_id INTO v_job_id FROM shopify_images WHERE id = NEW.source_id;

      IF v_job_id IS NOT NULL THEN
        -- Count statuses
        SELECT
          COUNT(*) FILTER (WHERE status IN ('queued', 'processing')),
          COUNT(*) FILTER (WHERE status = 'ready'),
          COUNT(*) FILTER (WHERE status = 'failed')
        INTO v_pending, v_ready, v_failed
        FROM shopify_images
        WHERE job_id = v_job_id;

        -- If no more pending images, update the job status
        IF v_pending = 0 THEN
          IF v_ready > 0 THEN
            UPDATE shopify_sync_jobs
            SET status = 'awaiting_approval', updated_at = now()
            WHERE id = v_job_id AND status = 'processing';
          ELSIF v_failed > 0 THEN
            UPDATE shopify_sync_jobs
            SET status = 'failed', last_error = 'All images failed', updated_at = now()
            WHERE id = v_job_id AND status = 'processing';
          END IF;
        END IF;
      END IF;

    ELSE
      -- Unknown source, do nothing
      NULL;

  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (drop and recreate to ensure it's fresh)
DROP TRIGGER IF EXISTS ai_job_sync_to_source ON ai_jobs;
CREATE TRIGGER ai_job_sync_to_source
BEFORE UPDATE OF status ON ai_jobs
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('success', 'failed', 'timeout'))
EXECUTE FUNCTION sync_ai_job_to_source();

-- 4. Add/update helper function to manually update job counts
CREATE OR REPLACE FUNCTION update_shopify_job_counts(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shopify_sync_jobs
  SET
    processed_count = (
      SELECT COUNT(*) FROM shopify_images
      WHERE job_id = p_job_id
      AND status IN ('ready', 'approved', 'pushing', 'pushed')
    ),
    pushed_count = (
      SELECT COUNT(*) FROM shopify_images
      WHERE job_id = p_job_id
      AND status = 'pushed'
    ),
    failed_count = (
      SELECT COUNT(*) FROM shopify_images
      WHERE job_id = p_job_id
      AND status = 'failed'
    ),
    updated_at = now()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_shopify_job_counts(UUID) TO service_role;
