-- Seed System Studio Presets
-- These are the default presets available to all users

INSERT INTO studio_presets (
  name, description, category, is_system, is_active,
  camera_lens, camera_aperture, camera_angle, camera_focus, camera_distance,
  lighting_style, lighting_key_intensity, lighting_fill_intensity, lighting_rim_intensity, lighting_direction,
  background_type, background_surface, background_shadow, background_reflection,
  jewelry_metal, jewelry_finish, jewelry_sparkle, jewelry_color_pop, jewelry_detail,
  composition_framing, composition_aspect_ratio, composition_padding,
  ai_model
) VALUES

-- POPULAR CATEGORY
(
  'Luxury E-commerce',
  'Clean, professional look perfect for high-end online stores. Pure white background with soft shadows.',
  'popular', TRUE, TRUE,
  '100mm', 'f/11', '45deg', 'sharp', 'medium',
  'studio-3point', 80, 50, 40, 'top-right',
  'white', 'none', 'soft', 10,
  'auto', 'high-polish', 80, 60, 90,
  'center', '1:1', 25,
  'flux-kontext-pro'
),
(
  'Editorial Portrait',
  'Dramatic magazine-style lighting with strong shadows and contrast.',
  'popular', TRUE, TRUE,
  '85mm', 'f/2.8', 'eye-level', 'shallow-dof', 'close-up',
  'dramatic', 90, 20, 70, 'left',
  'gradient', 'velvet', 'hard', 5,
  'auto', 'high-polish', 90, 70, 85,
  'rule-of-thirds', '4:5', 20,
  'flux-kontext-max'
),
(
  'White Studio',
  'Bright, airy feel with even lighting. Classic product photography style.',
  'popular', TRUE, TRUE,
  '100mm', 'f/16', '45deg', 'sharp', 'medium',
  'soft', 70, 70, 30, 'top',
  'white', 'none', 'floating', 15,
  'auto', 'high-polish', 70, 50, 85,
  'center', '1:1', 30,
  'flux-kontext-pro'
),

-- EDITORIAL CATEGORY
(
  'Glamour Spotlight',
  'Single dramatic spotlight creating high contrast and sparkle emphasis.',
  'editorial', TRUE, TRUE,
  '135mm', 'f/2.8', 'eye-level', 'shallow-dof', 'close-up',
  'dramatic', 100, 10, 80, 'top-right',
  'black', 'mirror', 'hard', 40,
  'auto', 'high-polish', 100, 80, 90,
  'golden-ratio', '4:5', 15,
  'flux-kontext-max'
),
(
  'Fashion Editorial',
  'Bold, high-fashion look with strong directional lighting.',
  'editorial', TRUE, TRUE,
  '85mm', 'f/4', '45deg', 'sharp', 'medium',
  'split', 85, 30, 60, 'left',
  'gradient', 'concrete', 'hard', 20,
  'auto', 'high-polish', 85, 75, 80,
  'rule-of-thirds', '9:16', 10,
  'flux-kontext-max'
),
(
  'Cobalt Studio',
  'Rich blue gradient background with cool-toned lighting.',
  'editorial', TRUE, TRUE,
  '100mm', 'f/8', '45deg', 'sharp', 'medium',
  'studio-3point', 75, 45, 55, 'top-right',
  'gradient', 'none', 'soft', 15,
  'silver', 'high-polish', 80, 65, 85,
  'center', '1:1', 25,
  'flux-kontext-pro'
),

-- LIFESTYLE CATEGORY
(
  'Natural Daylight',
  'Soft window light creating organic, warm atmosphere.',
  'lifestyle', TRUE, TRUE,
  '50mm', 'f/2.8', 'eye-level', 'shallow-dof', 'medium',
  'natural', 60, 60, 20, 'left',
  'scene', 'wood', 'soft', 5,
  'auto', 'high-polish', 60, 50, 70,
  'rule-of-thirds', '4:3', 20,
  'flux-kontext-pro'
),
(
  'Morning Vanity',
  'Lifestyle shot as if on a marble vanity with soft morning light.',
  'lifestyle', TRUE, TRUE,
  '50mm', 'f/4', '45deg', 'shallow-dof', 'medium',
  'natural', 55, 55, 25, 'top-left',
  'scene', 'marble', 'soft', 30,
  'auto', 'high-polish', 65, 55, 75,
  'rule-of-thirds', '4:5', 15,
  'flux-kontext-pro'
),
(
  'Terracotta Warmth',
  'Warm earth tones with soft, inviting lighting.',
  'lifestyle', TRUE, TRUE,
  '85mm', 'f/4', '45deg', 'shallow-dof', 'medium',
  'soft', 65, 55, 35, 'top-right',
  'gradient', 'concrete', 'soft', 10,
  'gold', 'high-polish', 75, 65, 80,
  'center', '1:1', 25,
  'flux-kontext-pro'
),

-- MINIMAL CATEGORY
(
  'Minimalist Clean',
  'Ultra-clean aesthetic with pure white and subtle shadows.',
  'minimal', TRUE, TRUE,
  '100mm', 'f/16', '45deg', 'sharp', 'medium',
  'soft', 65, 65, 25, 'top',
  'white', 'none', 'floating', 5,
  'auto', 'high-polish', 60, 40, 80,
  'center', '1:1', 40,
  'flux-kontext-pro'
),
(
  'Minimal Fashion',
  'Fashion-forward minimalism with careful negative space.',
  'minimal', TRUE, TRUE,
  '85mm', 'f/8', 'eye-level', 'sharp', 'medium',
  'soft', 70, 60, 30, 'top-right',
  'white', 'none', 'soft', 0,
  'auto', 'matte', 50, 40, 75,
  'golden-ratio', '4:5', 35,
  'flux-kontext-pro'
),
(
  'Soft Romantic',
  'Dreamy, soft focus look with gentle gradients.',
  'minimal', TRUE, TRUE,
  '85mm', 'f/1.4', '45deg', 'shallow-dof', 'close-up',
  'soft', 55, 55, 20, 'top',
  'gradient', 'silk', 'soft', 10,
  'rose-gold', 'high-polish', 65, 55, 70,
  'center', '1:1', 30,
  'flux-kontext-max'
),

-- DRAMATIC CATEGORY
(
  'Dark Moody',
  'Black background with dramatic rim lighting for mystery.',
  'dramatic', TRUE, TRUE,
  '135mm', 'f/4', 'eye-level', 'sharp', 'close-up',
  'rim', 60, 10, 90, 'bottom-right',
  'black', 'none', 'none', 0,
  'auto', 'high-polish', 90, 70, 95,
  'center', '1:1', 20,
  'flux-kontext-max'
),
(
  'Noir Elegance',
  'Film noir inspired with high contrast and deep shadows.',
  'dramatic', TRUE, TRUE,
  '85mm', 'f/2.8', '45deg', 'sharp', 'medium',
  'split', 95, 5, 70, 'left',
  'black', 'velvet', 'hard', 20,
  'auto', 'high-polish', 95, 80, 90,
  'rule-of-thirds', '16:9', 15,
  'flux-kontext-max'
),
(
  'Spotlight Drama',
  'Single focused spotlight with deep black surroundings.',
  'dramatic', TRUE, TRUE,
  '100mm', 'f/8', 'top-down', 'sharp', 'medium',
  'dramatic', 100, 0, 50, 'top',
  'black', 'mirror', 'hard', 50,
  'auto', 'high-polish', 100, 85, 95,
  'center', '1:1', 25,
  'flux-kontext-max'
),

-- SPECIAL/CREATIVE
(
  'Rose Gold Glow',
  'Warm pink undertones highlighting rose gold jewelry.',
  'popular', TRUE, TRUE,
  '100mm', 'f/8', '45deg', 'sharp', 'medium',
  'soft', 70, 55, 40, 'top-right',
  'gradient', 'silk', 'soft', 15,
  'rose-gold', 'high-polish', 80, 70, 85,
  'center', '1:1', 25,
  'flux-kontext-pro'
),
(
  'Macro Detail',
  'Extreme close-up to showcase intricate craftsmanship.',
  'popular', TRUE, TRUE,
  '100mm', 'f/16', '45deg', 'sharp', 'close-up',
  'studio-3point', 85, 60, 50, 'top-right',
  'white', 'none', 'soft', 5,
  'auto', 'high-polish', 90, 60, 100,
  'center', '1:1', 10,
  'flux-kontext-max'
),
(
  'Silver Cool',
  'Cool-toned setup perfect for silver and platinum pieces.',
  'popular', TRUE, TRUE,
  '100mm', 'f/11', '45deg', 'sharp', 'medium',
  'studio-3point', 75, 55, 45, 'top',
  'gradient', 'none', 'soft', 10,
  'silver', 'high-polish', 85, 50, 85,
  'center', '1:1', 25,
  'flux-kontext-pro'
);
