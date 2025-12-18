-- ============================================================================
-- Fix Realtime Subscriptions - REPLICA IDENTITY FULL
-- Required for Supabase Realtime to filter by non-primary-key columns
-- ============================================================================

-- Without REPLICA IDENTITY FULL, filters like `project_id=eq.{uuid}` silently fail
-- because PostgreSQL's default replica identity only includes the primary key in WAL

-- Set REPLICA IDENTITY FULL on processing tables
ALTER TABLE processing_queue REPLICA IDENTITY FULL;
ALTER TABLE processing_history REPLICA IDENTITY FULL;

-- Also set on ai_jobs for good measure (used in some realtime subscriptions)
ALTER TABLE ai_jobs REPLICA IDENTITY FULL;

-- Ensure tables are added to realtime publication
-- (They may already be added, but this is idempotent with IF NOT EXISTS pattern)
DO $$
BEGIN
  -- Check if processing_queue is in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'processing_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;
  END IF;

  -- Check if processing_history is in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'processing_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE processing_history;
  END IF;
END $$;
