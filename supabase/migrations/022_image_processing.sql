-- ============================================
-- Image Processing (IOPaint + Imaginary)
-- Migration: 022_image_processing.sql
-- ============================================

-- Processing pipelines (saved presets)
CREATE TABLE IF NOT EXISTS processing_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  output_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing jobs for batch operations
CREATE TABLE IF NOT EXISTS image_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES processing_pipelines(id),
  operation VARCHAR(50) NOT NULL, -- remove_background, inpaint, transform, batch
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  input_urls JSONB NOT NULL DEFAULT '[]',
  output_urls JSONB DEFAULT '[]',
  options JSONB DEFAULT '{}',
  total_images INTEGER DEFAULT 0,
  processed_images INTEGER DEFAULT 0,
  failed_images INTEGER DEFAULT 0,
  tokens_used DECIMAL(10, 2) DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing results (individual image results)
CREATE TABLE IF NOT EXISTS image_processing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES image_processing_jobs(id) ON DELETE CASCADE,
  input_url TEXT NOT NULL,
  output_url TEXT,
  operations JSONB DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INTEGER,
  tokens_used DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipelines_org ON processing_pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_org ON image_processing_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON image_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_results_job ON image_processing_results(job_id);

-- RLS
ALTER TABLE processing_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_processing_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view pipelines"
  ON processing_pipelines FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage pipelines"
  ON processing_pipelines FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view processing jobs"
  ON image_processing_jobs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can create processing jobs"
  ON image_processing_jobs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view results"
  ON image_processing_results FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM image_processing_jobs WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Seed default pipelines
INSERT INTO processing_pipelines (id, organization_id, name, description, steps, output_config, is_default)
SELECT
  gen_random_uuid(),
  o.id,
  'E-commerce Ready',
  'Remove background, resize to 2048x2048, convert to WebP',
  '[
    {"engine": "iopaint", "operation": "remove_background", "params": {"background": "white"}},
    {"engine": "imaginary", "operation": "resize", "params": {"width": 2048, "height": 2048, "type": "fit"}},
    {"engine": "imaginary", "operation": "convert", "params": {"format": "webp", "quality": 90}}
  ]'::jsonb,
  '{"format": "webp", "quality": 90}'::jsonb,
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM processing_pipelines pp WHERE pp.organization_id = o.id AND pp.name = 'E-commerce Ready'
);
