-- Seed System Combination Templates
-- 4 pre-built templates for common use cases

INSERT INTO combination_templates (
  name,
  description,
  category,
  is_system,
  is_active,
  position_y,
  scale,
  blend_intensity,
  lighting_match,
  rotation,
  advanced_settings
) VALUES
-- 1. Natural Daylight
(
  'Natural Daylight',
  'Soft, natural lighting ideal for everyday jewelry. Creates warm, approachable images perfect for lifestyle marketing and social media.',
  'natural',
  TRUE,
  TRUE,
  50,
  100,
  60,
  70,
  0,
  '{
    "placement": {
      "preset": "necklace",
      "fine_x": 0,
      "fine_y": 0
    },
    "lighting": {
      "shadow_enabled": true,
      "shadow_intensity": 40,
      "shadow_direction": "auto"
    },
    "realism": {
      "skin_tone_match": true,
      "depth_of_field_match": true,
      "reflectivity": 50
    }
  }'::JSONB
),

-- 2. Studio Professional
(
  'Studio Professional',
  'High-key studio lighting with clean backgrounds. Perfect for e-commerce catalogs and product pages requiring consistent, professional imagery.',
  'studio',
  TRUE,
  TRUE,
  50,
  100,
  80,
  90,
  0,
  '{
    "placement": {
      "preset": "necklace",
      "fine_x": 0,
      "fine_y": 0
    },
    "lighting": {
      "shadow_enabled": true,
      "shadow_intensity": 30,
      "shadow_direction": "bottom"
    },
    "realism": {
      "skin_tone_match": true,
      "depth_of_field_match": false,
      "reflectivity": 80
    }
  }'::JSONB
),

-- 3. Dramatic Evening
(
  'Dramatic Evening',
  'Strong directional lighting with deep shadows. Ideal for luxury jewelry and high-fashion editorial content that demands attention.',
  'dramatic',
  TRUE,
  TRUE,
  50,
  105,
  85,
  75,
  0,
  '{
    "placement": {
      "preset": "necklace",
      "fine_x": 0,
      "fine_y": 0
    },
    "lighting": {
      "shadow_enabled": true,
      "shadow_intensity": 80,
      "shadow_direction": "left"
    },
    "realism": {
      "skin_tone_match": true,
      "depth_of_field_match": true,
      "reflectivity": 90
    }
  }'::JSONB
),

-- 4. Outdoor Editorial
(
  'Outdoor Editorial',
  'Natural bokeh and environmental lighting. Creates lifestyle-focused marketing images with an authentic, editorial feel.',
  'outdoor',
  TRUE,
  TRUE,
  50,
  95,
  65,
  60,
  0,
  '{
    "placement": {
      "preset": "necklace",
      "fine_x": 0,
      "fine_y": 0
    },
    "lighting": {
      "shadow_enabled": true,
      "shadow_intensity": 50,
      "shadow_direction": "auto"
    },
    "realism": {
      "skin_tone_match": true,
      "depth_of_field_match": true,
      "reflectivity": 60
    }
  }'::JSONB
);
