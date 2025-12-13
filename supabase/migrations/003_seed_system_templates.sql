-- ============================================
-- SEED SYSTEM TEMPLATES
-- Migration: 003_seed_system_templates.sql
-- Description: Insert default system templates for jewelry optimization
-- ============================================

-- Clear existing system templates (for idempotency)
DELETE FROM prompt_templates WHERE is_system = TRUE;

-- Insert system templates
INSERT INTO prompt_templates (
  name,
  category,
  subcategory,
  base_prompt,
  style,
  background,
  lighting,
  is_system,
  is_active,
  organization_id,
  created_by
) VALUES

-- ============================================
-- JEWELRY - RINGS
-- ============================================
(
  'Gold Ring Premium',
  'Jewelry',
  'Rings',
  'Professional studio photography of a gold ring. Ultra-shiny premium gold finish with clean white studio background. Elegant soft shadows with bright studio lighting and crisp reflections. 85mm macro lens, f/11-f/16 deep sharpness, professional 3-point studio lighting, top softbox for glossy metal highlights, HDR, 8K macro detail. Keep exact design, shape, geometry, and proportions identical to input. Enhance shine, gloss, and polished metal reflections. Boost clarity, contrast, and micro-texture detail. Add clean, realistic specular highlights for a luxury finish.',
  'Premium',
  'White',
  'Three-point studio with top softbox',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Silver Ring Elegant',
  'Jewelry',
  'Rings',
  'Professional studio photography of a silver/platinum ring. Polished silver finish with soft gradient studio background. Elegant lighting with gentle highlights and subtle reflections. 85mm macro lens, f/11 deep sharpness, soft diffused lighting. Keep exact design and proportions identical. Enhance clarity, silver luster, and cool metallic tones. Clean professional e-commerce ready image.',
  'Elegant',
  'Gradient',
  'Soft diffused',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Diamond Ring Showcase',
  'Jewelry',
  'Rings',
  'Professional macro photography showcasing diamond engagement ring. Brilliant diamond sparkle with clean white background. Studio lighting optimized for maximum gemstone refraction and fire. 100mm macro lens, f/16 for maximum depth, HDR processing for diamond brilliance. Preserve exact cut, clarity, and setting details. Maximize sparkle, brilliance, and light dispersion. Professional jewelry catalog quality.',
  'Premium',
  'White',
  'Diamond-optimized multi-point',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Wedding Band Classic',
  'Jewelry',
  'Rings',
  'Professional product photography of wedding band. Clean, timeless presentation with pure white background. Focus on band details, engravings if present, and metal finish quality. 85mm macro lens, even studio lighting, soft shadows. Preserve exact proportions and any surface details. Enhance metal polish and reflective quality. Wedding catalog ready.',
  'Classic',
  'White',
  'Even studio',
  TRUE,
  TRUE,
  NULL,
  NULL
),

-- ============================================
-- JEWELRY - NECKLACES
-- ============================================
(
  'Necklace Studio Premium',
  'Jewelry',
  'Necklaces',
  'Professional product photography of necklace displayed elegantly. Clean white studio background with soft shadows creating depth. Full chain visible with pendant/focal point sharp and detailed. 85mm lens, f/11, three-point lighting setup. Enhance metal shine, any gemstone brilliance, and chain link definition. Professional e-commerce ready with consistent lighting.',
  'Premium',
  'White',
  'Three-point studio',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Pendant Close-Up',
  'Jewelry',
  'Necklaces',
  'Professional macro photography focusing on pendant detail. Sharp focus on pendant with artistic chain blur. White background with subtle reflection surface. 100mm macro lens, f/8 for selective focus, ring light for even illumination. Enhance pendant details, gemstones, and metalwork. Luxury jewelry presentation.',
  'Premium',
  'White',
  'Ring light macro',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Chain Necklace Detail',
  'Jewelry',
  'Necklaces',
  'Professional photography showcasing chain necklace craftsmanship. Emphasis on link pattern and metal quality. Clean white background, even lighting to show chain texture. 85mm lens, f/11, diffused lighting. Enhance metallic finish and link definition. Clear product photography for e-commerce.',
  'Standard',
  'White',
  'Diffused even',
  TRUE,
  TRUE,
  NULL,
  NULL
),

-- ============================================
-- JEWELRY - EARRINGS
-- ============================================
(
  'Earrings Macro Premium',
  'Jewelry',
  'Earrings',
  'Professional macro photography of earrings. Detailed close-up showing craftsmanship, stone settings, and metalwork. White background with subtle reflection. 100mm macro lens, f/16 for full depth, ring light for shadowless illumination. Enhance fine details, gemstone sparkle, and metallic finish. Pair displayed symmetrically.',
  'Premium',
  'White',
  'Ring light macro',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Stud Earrings Simple',
  'Jewelry',
  'Earrings',
  'Clean product photography of stud earrings. Simple, elegant presentation on white background. Focus on front face detail and back mechanism quality. 85mm lens, soft even lighting. Enhance stone brilliance and metal polish. E-commerce ready with clear detail visibility.',
  'Standard',
  'White',
  'Soft even',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Drop Earrings Elegant',
  'Jewelry',
  'Earrings',
  'Professional photography of drop/dangle earrings. Full length visible showing movement and design flow. White background with gentle shadows suggesting dimension. 85mm lens, f/11, three-point lighting. Enhance metalwork, any gemstones, and overall elegance. Luxury presentation.',
  'Elegant',
  'White',
  'Three-point studio',
  TRUE,
  TRUE,
  NULL,
  NULL
),

-- ============================================
-- JEWELRY - BRACELETS
-- ============================================
(
  'Bracelet Studio',
  'Jewelry',
  'Bracelets',
  'Professional product photography of bracelet. Elegant display showing full design and clasp detail. Clean white studio background with soft shadows. 85mm lens, f/11, three-point lighting. Enhance metal shine, link definition, and any decorative elements. Professional catalog quality.',
  'Premium',
  'White',
  'Three-point studio',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Bangle Lifestyle',
  'Jewelry',
  'Bracelets',
  'Professional product photography of bangle bracelet. Elegant curved display showing design and finish. Soft gradient background suggesting luxury. Natural lighting style with gentle shadows. 85mm lens, f/8 for slight depth blur. Enhance gold/silver richness and surface polish.',
  'Lifestyle',
  'Gradient',
  'Natural soft',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Tennis Bracelet Premium',
  'Jewelry',
  'Bracelets',
  'Professional photography of tennis bracelet. Emphasis on stone arrangement and setting quality. White background with reflection surface showing sparkle. 100mm macro for stone detail, f/16, controlled studio lighting for maximum brilliance. Enhance every stone''s fire and clarity.',
  'Premium',
  'White',
  'Controlled studio',
  TRUE,
  TRUE,
  NULL,
  NULL
),

-- ============================================
-- JEWELRY - WATCHES
-- ============================================
(
  'Watch Premium Studio',
  'Jewelry',
  'Watches',
  'Professional studio photography of luxury watch. Clean white background with precise controlled reflections. Focus on dial detail, case finish, and band quality. 100mm macro, f/16 for dial sharpness, controlled multi-point studio lighting. Enhance metal polish, dial clarity, crystal transparency. Luxury timepiece presentation.',
  'Premium',
  'White',
  'Controlled studio multi-point',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Watch Detail Macro',
  'Jewelry',
  'Watches',
  'Professional macro photography of watch face. Extreme detail on dial, hands, indices, and complications. White background, ring light for even illumination. 100mm macro, f/22 maximum depth. Enhance every dial element, crystal clarity, and bezel detail. Collector-grade presentation.',
  'Premium',
  'White',
  'Ring light macro',
  TRUE,
  TRUE,
  NULL,
  NULL
),

-- ============================================
-- GENERAL PRODUCT
-- ============================================
(
  'General Product White',
  'Product',
  'General',
  'Professional e-commerce product photography. Clean pure white background with soft shadows for dimension. Product centered and well-lit from multiple angles. Standard studio setup optimized for online retail. Enhance colors, details, and overall presentation. Amazon/Shopify listing ready.',
  'Standard',
  'White',
  'Even studio multi-point',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'General Product Gradient',
  'Product',
  'General',
  'Professional product photography with subtle gradient background. Soft lighting creating gentle shadows and dimension. Product as hero with lifestyle appeal. 85mm lens, f/8, soft diffused lighting. Enhance product details while maintaining natural feel. Premium e-commerce presentation.',
  'Lifestyle',
  'Gradient',
  'Soft diffused',
  TRUE,
  TRUE,
  NULL,
  NULL
),

-- ============================================
-- JEWELRY - OTHER
-- ============================================
(
  'Brooch/Pin Detail',
  'Jewelry',
  'Brooches',
  'Professional macro photography of brooch or pin. Full detail visibility of design elements, stones, and metalwork. White background with subtle shadow. 100mm macro, f/16, ring light. Enhance all decorative elements and pin mechanism. Vintage or modern presentation.',
  'Premium',
  'White',
  'Ring light',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Anklet Delicate',
  'Jewelry',
  'Anklets',
  'Professional photography of anklet. Delicate presentation showing chain detail and any charms. White background, soft lighting. 85mm lens, soft diffused light. Enhance fine chain links and decorative elements. Feminine, elegant presentation.',
  'Elegant',
  'White',
  'Soft diffused',
  TRUE,
  TRUE,
  NULL,
  NULL
),
(
  'Jewelry Set Display',
  'Jewelry',
  'Sets',
  'Professional photography of matching jewelry set. Coordinated display of multiple pieces (necklace, earrings, bracelet). White background, consistent lighting across all pieces. 85mm lens, f/11, three-point studio. Enhance matching elements and metal consistency. Gift set presentation.',
  'Premium',
  'White',
  'Three-point studio',
  TRUE,
  TRUE,
  NULL,
  NULL
);

-- Log the seed
DO $$
BEGIN
  RAISE NOTICE 'Seeded % system templates', (SELECT COUNT(*) FROM prompt_templates WHERE is_system = TRUE);
END $$;
