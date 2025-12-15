-- Add is_favorite column to prompt_templates
ALTER TABLE prompt_templates
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add is_favorite column to studio_presets
ALTER TABLE studio_presets
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create indexes for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_templates_favorite
  ON prompt_templates(organization_id, is_favorite)
  WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_presets_favorite
  ON studio_presets(organization_id, is_favorite)
  WHERE is_favorite = TRUE;

-- Add comments
COMMENT ON COLUMN prompt_templates.is_favorite IS 'User-marked favorite for quick access';
COMMENT ON COLUMN studio_presets.is_favorite IS 'User-marked favorite for quick access';
