-- Create regenerate_presets table for saving model+prompt combinations
CREATE TABLE IF NOT EXISTS regenerate_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  prompt_mode TEXT NOT NULL CHECK (prompt_mode IN ('template', 'preset', 'custom')),
  template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  studio_preset_id UUID REFERENCES studio_presets(id) ON DELETE SET NULL,
  custom_prompt TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_regenerate_presets_org ON regenerate_presets(organization_id);

-- Enable RLS
ALTER TABLE regenerate_presets ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view presets from their organization
CREATE POLICY "Users can view own org regenerate_presets" ON regenerate_presets
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Users can insert presets to their organization
CREATE POLICY "Users can insert own org regenerate_presets" ON regenerate_presets
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Users can update presets in their organization
CREATE POLICY "Users can update own org regenerate_presets" ON regenerate_presets
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Users can delete presets from their organization
CREATE POLICY "Users can delete own org regenerate_presets" ON regenerate_presets
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_regenerate_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_regenerate_presets_updated_at
  BEFORE UPDATE ON regenerate_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_regenerate_presets_updated_at();
