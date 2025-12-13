-- Add quality feedback tracking to processing_history
-- UX-016: Results Quality Feedback

-- Add feedback columns to processing_history table
ALTER TABLE processing_history
ADD COLUMN IF NOT EXISTS quality_rating TEXT CHECK (quality_rating IN ('thumbs_up', 'thumbs_down', NULL)),
ADD COLUMN IF NOT EXISTS feedback_text TEXT,
ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;

-- Create index for feedback queries
CREATE INDEX IF NOT EXISTS idx_processing_history_quality_rating
ON processing_history(quality_rating)
WHERE quality_rating IS NOT NULL;

-- Comment
COMMENT ON COLUMN processing_history.quality_rating IS 'User quality rating: thumbs_up or thumbs_down';
COMMENT ON COLUMN processing_history.feedback_text IS 'Optional user feedback text';
COMMENT ON COLUMN processing_history.feedback_submitted_at IS 'When feedback was submitted';
