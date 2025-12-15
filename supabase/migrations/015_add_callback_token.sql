-- ============================================================================
-- Add callback_token column to ai_jobs table
-- This is CRITICAL for webhook authentication - without it, ALL processing fails!
-- ============================================================================

-- Add the callback_token column with auto-generated UUID default
ALTER TABLE ai_jobs
ADD COLUMN IF NOT EXISTS callback_token UUID DEFAULT gen_random_uuid();

-- Create index for quick lookups by callback token (used in webhook verification)
CREATE INDEX IF NOT EXISTS idx_ai_jobs_callback_token
ON ai_jobs(callback_token)
WHERE callback_token IS NOT NULL;

-- Backfill existing rows that don't have a callback token
UPDATE ai_jobs
SET callback_token = gen_random_uuid()
WHERE callback_token IS NULL;

-- Make callback_token NOT NULL after backfill (optional, but ensures data integrity)
-- Note: Not adding NOT NULL constraint to avoid breaking existing code during transition

COMMENT ON COLUMN ai_jobs.callback_token IS 'Unique token for webhook callback authentication. Auto-generated on insert.';
