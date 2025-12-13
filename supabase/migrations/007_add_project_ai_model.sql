-- Add AI Model to Projects
-- This stores the selected AI model for each project

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'flux-kontext-pro';

-- Create index for filtering by AI model
CREATE INDEX IF NOT EXISTS idx_projects_ai_model ON projects(organization_id, ai_model);

-- Function to auto-update project status based on processing
CREATE OR REPLACE FUNCTION update_project_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the project stats and status
  UPDATE projects
  SET
    status = CASE
      -- If there are queued or processing items, project is active
      WHEN EXISTS (
        SELECT 1 FROM processing_queue
        WHERE project_id = NEW.project_id
        AND status IN ('queued', 'processing', 'optimizing')
      ) THEN 'active'
      -- If all images are processed and none failed, project is completed
      WHEN processed_images > 0 AND processed_images >= total_images AND failed_images = 0 THEN 'completed'
      -- If there are processed images but not all, keep active
      WHEN processed_images > 0 THEN 'active'
      -- Otherwise keep as draft
      ELSE 'draft'
    END,
    updated_at = NOW()
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on processing_history insert to update project status
DROP TRIGGER IF EXISTS trg_update_project_status ON processing_history;
CREATE TRIGGER trg_update_project_status
AFTER INSERT ON processing_history
FOR EACH ROW
EXECUTE FUNCTION update_project_status();

-- Also trigger when queue items change status
CREATE OR REPLACE FUNCTION update_project_status_from_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE projects
    SET
      status = CASE
        WHEN EXISTS (
          SELECT 1 FROM processing_queue
          WHERE project_id = NEW.project_id
          AND status IN ('queued', 'processing', 'optimizing')
        ) THEN 'active'
        WHEN processed_images > 0 AND processed_images >= total_images AND failed_images = 0 THEN 'completed'
        WHEN processed_images > 0 THEN 'active'
        ELSE 'draft'
      END,
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_project_status_queue ON processing_queue;
CREATE TRIGGER trg_update_project_status_queue
AFTER INSERT OR UPDATE ON processing_queue
FOR EACH ROW
EXECUTE FUNCTION update_project_status_from_queue();
