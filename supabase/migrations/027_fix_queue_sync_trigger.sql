-- ============================================================================
-- Fix Queue Sync Trigger - Ensure queue items move to history properly
-- ============================================================================

-- The issue: When ai_jobs.status changes to 'success', the trigger tries to:
-- 1. INSERT into processing_history from queue_item CTE
-- 2. DELETE from processing_queue
--
-- If the CTE returns no rows (source_id mismatch), both operations silently succeed
-- with 0 rows affected. The queue item stays in 'optimizing' state forever.
--
-- Fix: Update queue item status FIRST, then delete. Also add explicit checks.

CREATE OR REPLACE FUNCTION sync_ai_job_to_source()
RETURNS TRIGGER AS $$
DECLARE
  v_queue_item RECORD;
  v_rows_affected INT;
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
      -- For queue: First get the queue item to ensure it exists
      SELECT * INTO v_queue_item
      FROM processing_queue
      WHERE id = NEW.source_id;

      IF NOT FOUND THEN
        -- Queue item doesn't exist - log and continue
        RAISE NOTICE 'Queue item not found for source_id: %', NEW.source_id;
        RETURN NEW;
      END IF;

      IF NEW.status = 'success' THEN
        -- First, update queue item status to 'success' (belt and suspenders)
        UPDATE processing_queue
        SET
          status = 'success',
          completed_at = NEW.completed_at,
          last_updated = now()
        WHERE id = NEW.source_id;

        -- Insert into processing_history
        INSERT INTO processing_history (
          organization_id, project_id, file_id, file_name,
          original_url, optimized_url, status, ai_model,
          tokens_used, processing_time_sec, generated_prompt,
          completed_at, created_by
        )
        VALUES (
          v_queue_item.organization_id,
          v_queue_item.project_id,
          v_queue_item.file_id,
          v_queue_item.file_name,
          NEW.input_url,
          NEW.result_url,
          'success',
          NEW.ai_model,
          NEW.tokens_used,
          COALESCE(NEW.processing_time_ms / 1000, 0),
          NEW.prompt,
          NEW.completed_at,
          NEW.created_by
        );

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

        IF v_rows_affected > 0 THEN
          -- Only delete if history insert succeeded
          DELETE FROM processing_queue WHERE id = NEW.source_id;
        ELSE
          RAISE WARNING 'Failed to insert into processing_history for source_id: %', NEW.source_id;
        END IF;

      ELSE
        -- Failed/Timeout: Update queue item with error
        UPDATE processing_queue
        SET
          status = 'failed',
          error_message = NEW.error_message,
          task_id = NEW.task_id,
          last_updated = now()
        WHERE id = NEW.source_id;
      END IF;

    WHEN 'shopify' THEN
      -- For shopify: update shopify_queue_items
      IF NEW.status = 'success' THEN
        UPDATE shopify_queue_items
        SET
          status = 'success',
          result_url = NEW.result_url,
          error_message = NULL,
          processing_time_sec = COALESCE(NEW.processing_time_ms / 1000, 0),
          completed_at = NEW.completed_at
        WHERE id = NEW.source_id;
      ELSE
        UPDATE shopify_queue_items
        SET
          status = 'failed',
          error_message = NEW.error_message,
          completed_at = NEW.completed_at
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS ai_job_sync_to_source ON ai_jobs;
CREATE TRIGGER ai_job_sync_to_source
BEFORE UPDATE OF status ON ai_jobs
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('success', 'failed', 'timeout'))
EXECUTE FUNCTION sync_ai_job_to_source();

-- Also update the ImageQueueGrid query to show 'success' status items as completed
-- (The UI should already handle this, but let's ensure the query includes it)

COMMENT ON FUNCTION sync_ai_job_to_source() IS
'Syncs ai_jobs completion status to source tables. For queue source:
- On success: Updates queue item status to success, inserts into processing_history, then deletes queue item
- On failure: Updates queue item with error status
Uses explicit record fetch instead of CTE to ensure item exists before operations.';
