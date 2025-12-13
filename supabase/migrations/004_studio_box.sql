-- Studio Box Feature - Database Schema
-- Adds studio presets and generation tracking for the creative playground

-- ============================================
-- STUDIO PRESETS
-- Pre-configured settings for different photography styles
-- ============================================
CREATE TABLE studio_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'custom', -- popular, editorial, lifestyle, minimal, dramatic, custom
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,

  -- Camera Settings
  camera_lens TEXT DEFAULT '85mm', -- 50mm, 85mm, 100mm, 135mm
  camera_aperture TEXT DEFAULT 'f/8', -- f/1.4, f/2.8, f/8, f/16
  camera_angle TEXT DEFAULT '45deg', -- top-down, 45deg, eye-level, low-angle
  camera_focus TEXT DEFAULT 'sharp', -- sharp, shallow-dof, tilt-shift
  camera_distance TEXT DEFAULT 'medium', -- close-up, medium, full

  -- Lighting Settings
  lighting_style TEXT DEFAULT 'studio-3point', -- studio-3point, natural, dramatic, soft, rim, split
  lighting_key_intensity INTEGER DEFAULT 70, -- 0-100
  lighting_fill_intensity INTEGER DEFAULT 40,
  lighting_rim_intensity INTEGER DEFAULT 50,
  lighting_direction TEXT DEFAULT 'top-right', -- top-left, top, top-right, left, center, right, bottom-left, bottom, bottom-right

  -- Background Settings
  background_type TEXT DEFAULT 'white', -- white, gradient, black, transparent, scene
  background_surface TEXT DEFAULT 'none', -- none, marble, velvet, wood, mirror, silk, concrete
  background_shadow TEXT DEFAULT 'soft', -- none, soft, hard, floating
  background_reflection INTEGER DEFAULT 0, -- 0-100
  background_color TEXT, -- hex color for gradient/scene

  -- Jewelry/Product Enhancement
  jewelry_metal TEXT DEFAULT 'gold', -- gold, silver, rose-gold, platinum, mixed, auto
  jewelry_finish TEXT DEFAULT 'high-polish', -- high-polish, matte, brushed, hammered
  jewelry_sparkle INTEGER DEFAULT 70, -- 0-100
  jewelry_color_pop INTEGER DEFAULT 50,
  jewelry_detail INTEGER DEFAULT 80,

  -- Composition
  composition_framing TEXT DEFAULT 'center', -- center, rule-of-thirds, golden-ratio
  composition_aspect_ratio TEXT DEFAULT '1:1', -- 1:1, 4:5, 16:9, 9:16, 3:4, 4:3
  composition_padding INTEGER DEFAULT 30, -- 0-100

  -- AI Model preference
  ai_model TEXT DEFAULT 'flux-kontext-pro',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDIO GENERATIONS
-- Track all generations made in Studio Box
-- ============================================
CREATE TABLE studio_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES studio_presets(id) ON DELETE SET NULL,

  -- Source image
  original_url TEXT NOT NULL,
  original_file_name TEXT,
  original_storage_path TEXT,

  -- Generated result
  result_url TEXT,
  result_storage_path TEXT,

  -- Settings used (snapshot at generation time)
  settings_snapshot JSONB NOT NULL,
  custom_prompt TEXT,
  final_prompt TEXT, -- The actual prompt sent to AI

  -- AI Processing
  ai_model TEXT NOT NULL,
  task_id TEXT, -- Kie.ai task ID
  status TEXT DEFAULT 'pending', -- pending, processing, success, failed
  error_message TEXT,
  processing_time_sec INTEGER,

  -- Cost
  tokens_used DECIMAL(10,2) DEFAULT 1,

  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDIO IDEAS
-- Suggestion prompts for the "Ideas to Explore" section
-- ============================================
CREATE TABLE studio_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  category TEXT, -- jewelry, product, lifestyle, creative
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default ideas
INSERT INTO studio_ideas (text, category, display_order) VALUES
  ('Luxury promotional imagery for high-end jewelry catalog', 'jewelry', 1),
  ('Lifestyle shot on marble vanity with soft morning light', 'lifestyle', 2),
  ('Dramatic black background with single spotlight on gemstone', 'jewelry', 3),
  ('Macro detail shot showing intricate craftsmanship', 'jewelry', 4),
  ('Floating product with soft shadow below', 'product', 5),
  ('Editorial fashion shoot style with bold contrast', 'jewelry', 6),
  ('Minimalist white space with subtle gradient shadow', 'minimal', 7),
  ('Warm golden hour lighting on rose gold pieces', 'jewelry', 8),
  ('Clean e-commerce ready image with pure white background', 'product', 9),
  ('Artistic composition using rule of thirds', 'creative', 10);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_studio_presets_org ON studio_presets(organization_id);
CREATE INDEX idx_studio_presets_category ON studio_presets(category);
CREATE INDEX idx_studio_presets_system ON studio_presets(is_system);
CREATE INDEX idx_studio_generations_org ON studio_generations(organization_id);
CREATE INDEX idx_studio_generations_status ON studio_generations(status);
CREATE INDEX idx_studio_generations_created ON studio_generations(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE studio_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ideas ENABLE ROW LEVEL SECURITY;

-- Presets: Users can view system presets + their org presets
CREATE POLICY "Users can view studio presets"
  ON studio_presets FOR SELECT
  USING (
    is_system = TRUE OR
    organization_id IN (SELECT get_user_organization_ids())
  );

CREATE POLICY "Users can insert org presets"
  ON studio_presets FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org presets"
  ON studio_presets FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org presets"
  ON studio_presets FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()) AND is_system = FALSE);

-- Generations: Users can CRUD their org's generations
CREATE POLICY "Users can view org generations"
  ON studio_generations FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org generations"
  ON studio_generations FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org generations"
  ON studio_generations FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org generations"
  ON studio_generations FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Ideas: Everyone can view active ideas
CREATE POLICY "Anyone can view active ideas"
  ON studio_ideas FOR SELECT
  USING (is_active = TRUE);

-- ============================================
-- REALTIME for generations
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE studio_generations;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_studio_presets_updated_at
  BEFORE UPDATE ON studio_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment usage count when a generation uses a preset
CREATE OR REPLACE FUNCTION increment_preset_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.preset_id IS NOT NULL THEN
    UPDATE studio_presets
    SET usage_count = usage_count + 1
    WHERE id = NEW.preset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_preset_usage_on_generation
  AFTER INSERT ON studio_generations
  FOR EACH ROW EXECUTE FUNCTION increment_preset_usage();
