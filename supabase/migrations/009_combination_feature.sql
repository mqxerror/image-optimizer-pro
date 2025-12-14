-- Image Combination Feature - Database Schema
-- Enables combining model photos with jewelry images using AI

-- ============================================
-- COMBINATION TEMPLATES
-- Pre-configured settings for different combination styles
-- ============================================
CREATE TABLE combination_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'custom', -- natural, studio, dramatic, outdoor, custom
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,

  -- Quick Controls Defaults
  position_y INTEGER DEFAULT 50, -- 0-100 (vertical position on model)
  scale INTEGER DEFAULT 100, -- 50-150
  blend_intensity INTEGER DEFAULT 70, -- 0-100
  lighting_match INTEGER DEFAULT 80, -- 0-100
  rotation INTEGER DEFAULT 0, -- -45 to 45

  -- Advanced Settings
  advanced_settings JSONB DEFAULT '{
    "placement": {
      "preset": "necklace",
      "fine_x": 0,
      "fine_y": 0
    },
    "lighting": {
      "shadow_enabled": true,
      "shadow_intensity": 60,
      "shadow_direction": "auto"
    },
    "realism": {
      "skin_tone_match": true,
      "depth_of_field_match": true,
      "reflectivity": 70
    }
  }'::JSONB,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMBINATION JOBS
-- Track all combination processing jobs
-- ============================================
CREATE TABLE combination_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES combination_templates(id) ON DELETE SET NULL,

  -- Source Images
  model_image_url TEXT NOT NULL,
  model_image_storage_path TEXT,
  model_image_analysis JSONB, -- Claude Vision analysis results

  jewelry_image_url TEXT NOT NULL,
  jewelry_image_storage_path TEXT,
  jewelry_image_analysis JSONB, -- Claude Vision analysis results

  -- Quick Control Settings
  position_y INTEGER DEFAULT 50,
  scale INTEGER DEFAULT 100,
  blend_intensity INTEGER DEFAULT 70,
  lighting_match INTEGER DEFAULT 80,
  rotation INTEGER DEFAULT 0,

  -- Advanced Settings (full JSONB)
  advanced_settings JSONB DEFAULT '{}'::JSONB,

  -- Generated Result
  result_url TEXT,
  result_storage_path TEXT,
  result_thumbnail_url TEXT,

  -- AI Processing
  generated_prompt TEXT, -- The final prompt sent to AI
  ai_model TEXT DEFAULT 'flux-kontext-pro',
  task_id TEXT, -- Kie.ai task ID
  status TEXT DEFAULT 'pending', -- pending, analyzing, generating, success, failed
  error_message TEXT,
  processing_time_sec INTEGER,

  -- Cost
  tokens_used DECIMAL(10,2) DEFAULT 2, -- 2 tokens per combination

  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  is_reprocess BOOLEAN DEFAULT FALSE, -- If true, cost is 1 token
  parent_job_id UUID REFERENCES combination_jobs(id) ON DELETE SET NULL, -- For reprocessing
  version INTEGER DEFAULT 1,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_combination_templates_org ON combination_templates(organization_id);
CREATE INDEX idx_combination_templates_category ON combination_templates(category);
CREATE INDEX idx_combination_templates_system ON combination_templates(is_system);

CREATE INDEX idx_combination_jobs_org ON combination_jobs(organization_id);
CREATE INDEX idx_combination_jobs_status ON combination_jobs(status);
CREATE INDEX idx_combination_jobs_created ON combination_jobs(created_at DESC);
CREATE INDEX idx_combination_jobs_template ON combination_jobs(template_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE combination_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_jobs ENABLE ROW LEVEL SECURITY;

-- Templates: Users can view system templates + their org templates
CREATE POLICY "Users can view combination templates"
  ON combination_templates FOR SELECT
  USING (
    is_system = TRUE OR
    organization_id IN (SELECT get_user_organization_ids())
  );

CREATE POLICY "Users can insert org combination templates"
  ON combination_templates FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org combination templates"
  ON combination_templates FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org combination templates"
  ON combination_templates FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()) AND is_system = FALSE);

-- Jobs: Users can CRUD their org's jobs
CREATE POLICY "Users can view org combination jobs"
  ON combination_jobs FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org combination jobs"
  ON combination_jobs FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org combination jobs"
  ON combination_jobs FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org combination jobs"
  ON combination_jobs FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- ============================================
-- REALTIME for combination jobs
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE combination_jobs;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_combination_templates_updated_at
  BEFORE UPDATE ON combination_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_combination_jobs_updated_at
  BEFORE UPDATE ON combination_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment usage count when a job uses a template
CREATE OR REPLACE FUNCTION increment_combination_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE combination_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_template_usage_on_combination
  AFTER INSERT ON combination_jobs
  FOR EACH ROW EXECUTE FUNCTION increment_combination_template_usage();
