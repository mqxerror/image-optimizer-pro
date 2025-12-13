# Image Combination Feature: Model + Jewelry Compositing

**Created:** December 12, 2025
**Designer:** Uma (UX Designer)
**Feature Type:** Major New Capability
**Priority:** High (Unique Differentiator)

---

## 1. Feature Overview

### What It Does
Allows users to upload **two separate images** (a model photo + a jewelry product photo) and use AI to composite them into a realistic image of the model wearing the jewelry.

### Use Cases
1. **Virtual Try-On** - Show jewelry on models without physical photoshoot
2. **Product Visualization** - Place jewelry on stock model photos
3. **Catalog Creation** - Generate multiple model+jewelry combinations
4. **A/B Testing** - Same jewelry on different models for marketing tests

### Value Proposition
- **Saves costs**: No photoshoot needed
- **Faster iteration**: Test jewelry on multiple models instantly
- **Scalability**: Generate hundreds of variations
- **Creative freedom**: Mix any model with any jewelry piece

---

## 2. User Flow Design

### 2.1 Entry Points

**Option A: Studio Mode Switcher** (Recommended)
```
┌─────────────────────────────────────────────┐
│ STUDIO HEADER                               │
│ ┌───────────────────────────────────────┐  │
│ │ ○ Single Image  ● Combination Mode   │  │ ← New toggle
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Option B: Separate Studio Tab** (Alternative)
```
Navigation Tabs:
┌────────────┬────────────────┬───────────┐
│  Enhance   │  Combine (NEW) │  Presets  │
└────────────┴────────────────┴───────────┘
```

**Recommended:** Option A (mode switcher) keeps everything in one place

---

### 2.2 Combination Mode Interface

```
┌─────────────────────────────────────────────────────────────────┐
│ STUDIO - COMBINATION MODE                                       │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ○ Single Image  ● Combination Mode                         ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────────────────┬────────────┐
│              │                                      │            │
│   PRESETS    │         DUAL UPLOAD AREA            │   QUICK    │
│              │                                      │  CONTROLS  │
│  Templates:  │  ┌───────────┐  ┌───────────┐      │            │
│  • Natural   │  │  MODEL    │  │  JEWELRY  │      │  Position  │
│  • Studio    │  │           │  │           │      │  ┌───────┐ │
│  • Dramatic  │  │  [📤]     │  │  [📤]     │      │  │ ▓▓▓░  │ │
│              │  │  Upload   │  │  Upload   │      │  └───────┘ │
│  Saved:      │  │  Model    │  │  Jewelry  │      │            │
│  • My Look 1 │  │           │  │           │      │  Scale     │
│  • My Look 2 │  │  Drop or  │  │  Drop or  │      │  ┌───────┐ │
│              │  │  Click    │  │  Click    │      │  │ ▓▓▓▓░ │ │
│              │  └───────────┘  └───────────┘      │  └───────┘ │
│              │                                      │            │
│              │  AFTER UPLOAD:                      │  Blend     │
│              │  ┌─────────────────────────────┐   │  ┌───────┐ │
│              │  │                             │   │  │ ▓▓▓▓░ │ │
│              │  │   [Combined Preview]        │   │  └───────┘ │
│              │  │                             │   │            │
│              │  │   Model wearing jewelry     │   │  Lighting  │
│              │  │                             │   │  ┌───────┐ │
│              │  │                             │   │  │ ▓▓▓▓▓░│ │
│              │  └─────────────────────────────┘   │  └───────┘ │
│              │                                      │            │
│              │  [Custom Instructions (Optional)]   │  [Advanced]│
│              │                                      │            │
│              │  [✨ Generate Combination] [2 tokens]│           │
└──────────────┴──────────────────────────────────────┴────────────┘
```

---

## 3. Detailed Component Design

### 3.1 Dual Upload Component

**File:** `/src/components/studio/DualImageUploader.tsx`

**Features:**
- Side-by-side upload zones
- Drag & drop support for each zone
- Clear labels: "Model Photo" and "Jewelry Photo"
- Preview after upload with replace/clear options
- Image validation (format, size)

**Visual Design:**
```
┌─────────────────────┐  ┌─────────────────────┐
│   MODEL PHOTO       │  │   JEWELRY PHOTO     │
│                     │  │                     │
│  ┌───────────────┐ │  │  ┌───────────────┐ │
│  │               │ │  │  │               │ │
│  │      👤       │ │  │  │      💎       │ │
│  │               │ │  │  │               │ │
│  │  Drop image   │ │  │  │  Drop image   │ │
│  │  or click to  │ │  │  │  or click to  │ │
│  │    browse     │ │  │  │    browse     │ │
│  │               │ │  │  │               │ │
│  └───────────────┘ │  │  └───────────────┘ │
│                     │  │                     │
│  PNG, JPG up to 10MB│  │  PNG, JPG up to 10MB│
└─────────────────────┘  └─────────────────────┘

AFTER UPLOAD:

┌─────────────────────┐  ┌─────────────────────┐
│ ✓ Model Photo       │  │ ✓ Jewelry Photo     │
│ ┌─────────────────┐ │  │ ┌─────────────────┐ │
│ │                 │ │  │ │                 │ │
│ │ [Model Image]   │ │  │ │ [Jewelry Image] │ │
│ │                 │ │  │ │                 │ │
│ └─────────────────┘ │  │ └─────────────────┘ │
│ [Replace] [Clear]   │  │ [Replace] [Clear]   │
└─────────────────────┘  └─────────────────────┘
```

---

### 3.2 Combination Controls (Quick Mode)

**Sliders for Quick Adjustments:**

1. **Position** (0-100%)
   - Where jewelry sits on model (higher = closer to face, lower = chest area)
   - Default: 60% (neck/collarbone area)

2. **Scale** (50-150%)
   - Size of jewelry relative to model
   - Default: 100% (auto-detected based on image analysis)

3. **Blend** (0-100%)
   - How naturally jewelry integrates with lighting/shadows
   - Default: 80% (realistic integration)

4. **Lighting Match** (0-100%)
   - Adjusts jewelry lighting to match model's lighting
   - Default: 70% (preserve some original jewelry shine)

5. **Angle Adjustment** (-45° to +45°)
   - Rotate jewelry to match model's pose
   - Default: 0° (straight on)

---

### 3.3 Advanced Combination Controls

**Additional Settings in Advanced Panel:**

```
┌─────────────────────────────────┐
│ 📐 Placement Settings       ▼  │
├─────────────────────────────────┤
│ Position Preset                 │
│ ○ Necklace (collarbone)        │
│ ○ Earrings (ear level)         │
│ ○ Ring (hand - specify left/right) │
│ ○ Bracelet (wrist)             │
│ ○ Custom (manual position)     │
│                                 │
│ X Position: [──●────] 50%      │
│ Y Position: [────●──] 60%      │
│ Rotation:   [───●───] 0°       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 💡 Lighting Integration     ▼  │
├─────────────────────────────────┤
│ Match Model Lighting            │
│ Intensity: [────●──] 70%       │
│                                 │
│ Shadow Generation               │
│ ☑ Auto-generate shadows        │
│ Shadow Intensity: [──●──] 40%  │
│                                 │
│ Highlight Preservation          │
│ ☑ Keep jewelry sparkle         │
│ Sparkle Amount: [───●─] 80%    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🎨 Realism Enhancements     ▼  │
├─────────────────────────────────┤
│ Skin Tone Matching              │
│ ☑ Adjust jewelry warmth/cool   │
│                                 │
│ Depth of Field                  │
│ ☑ Blur background (focus jewelry)│
│ Blur Amount: [──●──] 30%       │
│                                 │
│ Reflection/Shine                │
│ Metal Reflectivity: [───●─] 70%│
│ Gemstone Sparkle: [────●] 90%  │
└─────────────────────────────────┘
```

---

## 4. AI Processing Backend

### 4.1 Image Analysis Phase

**Before combination, analyze both images:**

1. **Model Image Analysis**
   - Detect face landmarks (eyes, nose, ears, chin)
   - Identify body pose (frontal, profile, 3/4 view)
   - Extract lighting direction and intensity
   - Detect skin tone for color matching

2. **Jewelry Image Analysis**
   - Detect jewelry type (necklace, earring, ring, bracelet)
   - Extract jewelry dimensions
   - Identify metal type (gold, silver, platinum)
   - Detect gemstones and their properties

### 4.2 AI Prompt Generation

**Generated prompt structure:**
```
Photorealistic composite image of [MODEL_DESCRIPTION] wearing [JEWELRY_DESCRIPTION].
Position the jewelry at [POSITION] with [SCALE] size.
Match lighting: [MODEL_LIGHTING] with [BLEND_INTENSITY] integration.
Preserve jewelry sparkle and detail while ensuring natural shadows and reflections on skin.
Maintain realistic depth of field. Professional product photography quality.
```

**Example:**
```
Photorealistic composite image of a young woman with olive skin tone,
looking directly at camera, wearing a delicate gold necklace with
emerald pendant. Position the necklace at collarbone level (60% from top)
with 100% natural size. Match soft studio lighting from upper right
with 80% integration. Preserve gold luster and emerald sparkle while
ensuring natural shadows on skin. Slight blur on background. Professional
product photography quality, 4K resolution.
```

### 4.3 Processing Steps

1. **Background Separation**
   - Remove jewelry from its original background
   - Preserve alpha channel for clean edges

2. **Placement Calculation**
   - Map jewelry coordinates to model's body landmarks
   - Auto-detect optimal position based on jewelry type

3. **Lighting Harmonization**
   - Adjust jewelry lighting to match model's environment
   - Generate appropriate shadows on skin

4. **Blending & Integration**
   - Composite jewelry layer onto model layer
   - Apply edge feathering for seamless integration
   - Add realistic reflections/shadows

5. **Enhancement Pass**
   - Final color grading to unify the image
   - Sharpness adjustment for professional look

---

## 5. User Experience Flow

### 5.1 Happy Path

1. User selects "Combination Mode"
2. Uploads model photo → Preview shows instantly
3. Uploads jewelry photo → Preview updates
4. System auto-analyzes both images (2-3 seconds)
5. Default combination preview shown with recommended settings
6. User adjusts position/scale/lighting with sliders
7. (Optional) Switches to Advanced for fine-tuning
8. Clicks "Generate Combination" (2 tokens)
9. Processing indicator shows progress (15-30 seconds)
10. Final combined image displayed with download option

### 5.2 Edge Cases & Error Handling

**Invalid Uploads:**
```
┌────────────────────────────────────────┐
│ ⚠️ Warning                            │
├────────────────────────────────────────┤
│ The uploaded image doesn't appear to  │
│ contain a person. Please upload a     │
│ photo with a visible model.           │
│                                        │
│ [Upload Different Image] [Cancel]     │
└────────────────────────────────────────┘
```

**Low Quality Image:**
```
┌────────────────────────────────────────┐
│ ⚠️ Image Quality Warning              │
├────────────────────────────────────────┤
│ This image is low resolution (800x600).│
│ For best results, use at least 1920x   │
│ 1080px images.                         │
│                                        │
│ [Continue Anyway] [Upload Better Image]│
└────────────────────────────────────────┘
```

**Jewelry Not Detected:**
```
┌────────────────────────────────────────┐
│ 💎 Jewelry Detection                  │
├────────────────────────────────────────┤
│ We couldn't automatically detect the   │
│ jewelry type. Please select manually:  │
│                                        │
│ ○ Necklace  ○ Earrings                │
│ ○ Ring      ○ Bracelet                │
│ ○ Other                                │
│                                        │
│ [Confirm]                              │
└────────────────────────────────────────┘
```

---

## 6. Template System for Combinations

### 6.1 Pre-Built Combination Templates

**Template Categories:**

1. **Natural Lighting**
   - Soft daylight look
   - Minimal shadows
   - Best for: Everyday jewelry

2. **Studio Professional**
   - High-key lighting
   - Clean white background
   - Best for: E-commerce catalogs

3. **Dramatic Evening**
   - Strong directional light
   - Deep shadows
   - Best for: Luxury jewelry

4. **Outdoor Editorial**
   - Natural environment
   - Bokeh background
   - Best for: Lifestyle marketing

### 6.2 Template Application

**Quick Apply:**
```
┌─────────────────────────────────┐
│ 📋 Combination Templates        │
├─────────────────────────────────┤
│ [Preview] Natural Daylight      │
│ • Soft shadows                  │
│ • Warm color tone               │
│ • Position: Necklace (60%)      │
│                                 │
│ [Preview] Studio Professional   │
│ • Clean lighting                │
│ • Neutral background            │
│ • Position: Center              │
│                                 │
│ [Apply Template]                │
└─────────────────────────────────┘
```

---

## 7. Technical Implementation

### 7.1 New Database Schema

**Table: `combination_jobs`**
```sql
CREATE TABLE combination_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),

  -- Input images
  model_image_url TEXT NOT NULL,
  jewelry_image_url TEXT NOT NULL,

  -- Settings
  position_x INTEGER DEFAULT 50,  -- 0-100
  position_y INTEGER DEFAULT 60,  -- 0-100
  scale INTEGER DEFAULT 100,      -- 50-150
  blend_intensity INTEGER DEFAULT 80,  -- 0-100
  lighting_match INTEGER DEFAULT 70,   -- 0-100
  rotation INTEGER DEFAULT 0,     -- -45 to 45

  -- Advanced settings (JSONB)
  advanced_settings JSONB,

  -- Template used
  template_id UUID REFERENCES combination_templates(id),

  -- Output
  result_image_url TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Metadata
  processing_time_sec DECIMAL(10,2),
  tokens_used INTEGER DEFAULT 2,
  ai_model TEXT DEFAULT 'flux-pro',
  generated_prompt TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_combination_jobs_org ON combination_jobs(organization_id);
CREATE INDEX idx_combination_jobs_status ON combination_jobs(status);
```

**Table: `combination_templates`**
```sql
CREATE TABLE combination_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'natural', 'studio', 'dramatic', 'outdoor'
  is_system BOOLEAN DEFAULT false,

  -- Default settings
  default_position_x INTEGER DEFAULT 50,
  default_position_y INTEGER DEFAULT 60,
  default_scale INTEGER DEFAULT 100,
  default_blend INTEGER DEFAULT 80,
  default_lighting INTEGER DEFAULT 70,

  settings JSONB,  -- All settings as JSON

  preview_image_url TEXT,
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

### 7.2 Edge Function: `combine-images`

**File:** `/supabase/functions/combine-images/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CombineRequest {
  model_image_url: string
  jewelry_image_url: string
  settings: {
    position_x: number
    position_y: number
    scale: number
    blend_intensity: number
    lighting_match: number
    rotation?: number
  }
  template_id?: string
}

serve(async (req) => {
  try {
    const { model_image_url, jewelry_image_url, settings, template_id } = await req.json()

    // 1. Validate images
    if (!model_image_url || !jewelry_image_url) {
      throw new Error('Both model and jewelry images required')
    }

    // 2. Download images from Supabase Storage
    const modelImageBlob = await fetch(model_image_url).then(r => r.blob())
    const jewelryImageBlob = await fetch(jewelry_image_url).then(r => r.blob())

    // 3. Analyze images with AI
    const analysis = await analyzeImages(modelImageBlob, jewelryImageBlob)

    // 4. Generate AI prompt for combination
    const prompt = generateCombinationPrompt(analysis, settings)

    // 5. Call Kie.ai (or appropriate image generation API)
    const combinedImage = await kieAPI.combineImages({
      model_image: modelImageBlob,
      jewelry_image: jewelryImageBlob,
      prompt: prompt,
      position: { x: settings.position_x, y: settings.position_y },
      scale: settings.scale / 100,
      blend_mode: settings.blend_intensity / 100
    })

    // 6. Upload result to Supabase Storage
    const resultUrl = await uploadResult(combinedImage)

    // 7. Deduct tokens
    await deductTokens(2) // 2 tokens for combination

    // 8. Save to database
    await saveCombinationJob({
      result_image_url: resultUrl,
      status: 'completed',
      tokens_used: 2,
      generated_prompt: prompt
    })

    return new Response(JSON.stringify({
      success: true,
      result_url: resultUrl,
      tokens_used: 2
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Helper functions
async function analyzeImages(modelBlob: Blob, jewelryBlob: Blob) {
  // Use Claude Vision API to analyze images
  // Return: jewelry_type, model_pose, lighting_direction, skin_tone, etc.
}

function generateCombinationPrompt(analysis: any, settings: any) {
  // Build detailed prompt for AI image generation
  return `Photorealistic composite of ${analysis.model_description} wearing ${analysis.jewelry_description}...`
}
```

---

### 7.3 Component Files to Create

1. **`/src/components/studio/DualImageUploader.tsx`**
   - Dual upload zones
   - Preview after upload
   - Validation

2. **`/src/components/studio/CombinationControls.tsx`**
   - Quick mode sliders (Position, Scale, Blend, Lighting, Angle)
   - Real-time preview updates

3. **`/src/components/studio/CombinationAdvancedPanel.tsx`**
   - Placement presets
   - Lighting integration controls
   - Realism enhancements

4. **`/src/components/studio/CombinationTemplates.tsx`**
   - Template selector sidebar
   - Preview thumbnails
   - Apply template action

5. **`/src/pages/StudioCombination.tsx`** (or mode switcher in existing Studio.tsx)
   - Main combination workflow
   - Orchestrates all components

---

## 8. Pricing & Token System

### 8.1 Token Cost

**Combination Processing:**
- **2 tokens** per combination generation
- Rationale: More complex than single image optimization (2 images analyzed + composite)

**Cost Comparison:**
- Single image optimization: 1 token (2K) / 2 tokens (4K)
- Image combination: 2 tokens (regardless of resolution)
- Re-process existing combination: 1 token (50% discount)

### 8.2 Pricing Display

```
┌──────────────────────────────────┐
│ [✨ Generate Combination]        │
│                                  │
│ 💰 2 tokens                      │
│ Your balance: 45 tokens          │
│                                  │
│ After generation: 43 tokens      │
└──────────────────────────────────┘
```

---

## 9. Success Metrics

**Track after launch:**
1. **Combination usage rate** - % of users who try combination mode
2. **Template vs custom** - How many use templates vs manual settings
3. **Average combinations per user** - Engagement metric
4. **Combination quality rating** - User feedback (thumbs up/down)
5. **Time to first combination** - Onboarding success
6. **Error rate** - % of failed combinations (image detection issues)

---

## 10. Future Enhancements

### Phase 2 (Post-MVP)
1. **Multi-jewelry support** - Combine model with multiple pieces (necklace + earrings)
2. **Batch combinations** - One model + 10 jewelry pieces = 10 outputs
3. **Video try-on** - Animate jewelry on model in short video
4. **AR preview** - Show how it would look in AR
5. **Social sharing** - Share combinations directly to Instagram/Pinterest

### Phase 3 (Advanced)
1. **3D jewelry rendering** - Upload 3D model, render on 2D model photo
2. **Custom backgrounds** - Replace model background with new scene
3. **Skin tone variations** - Generate same combination on different skin tones
4. **Seasonal lighting** - Apply summer/winter/golden hour lighting

---

## 11. Marketing Positioning

### Value Propositions

**For Jewelry Brands:**
> "Create unlimited model+jewelry combinations without expensive photoshoots. Test your collection on diverse models in minutes, not days."

**For E-commerce:**
> "Show every piece on a model instantly. Increase conversion with realistic try-on visuals."

**For Marketers:**
> "A/B test jewelry on different models, poses, and lighting scenarios. Find what converts best."

---

## 12. Competitive Analysis

### Existing Solutions
- **Jewelry try-on apps** (AR-based, mobile only)
  - Limited to AR preview, not photorealistic renders

- **Virtual model services** (manual compositing)
  - Expensive ($50-200 per image)
  - Slow turnaround (24-48 hours)

- **Stock photo + editing** (Photoshop manual work)
  - Requires design skills
  - Time-consuming (1-2 hours per image)

### Our Advantage
- ✅ **AI-powered** - Photorealistic in 30 seconds
- ✅ **Affordable** - 2 tokens (~$0.20 vs $50+)
- ✅ **Scalable** - Generate hundreds of combinations
- ✅ **Self-service** - No designer needed
- ✅ **Integrated** - Part of existing workflow

---

## 13. Implementation Priority

### Phase 1: MVP (2-3 weeks)
- [x] Dual image upload UI
- [x] Basic combination with 5 quick controls
- [x] Edge function for AI processing
- [x] Database schema
- [x] Token billing integration

### Phase 2: Templates (1 week)
- [x] 4 pre-built templates
- [x] Template selector UI
- [x] Save custom templates

### Phase 3: Advanced Controls (1 week)
- [x] Advanced panel with placement presets
- [x] Lighting integration controls
- [x] Realism enhancements

### Phase 4: Polish (1 week)
- [x] Error handling & validation
- [x] Progress indicators
- [x] Quality feedback system
- [x] Documentation & help tooltips

**Total Estimate:** 5-6 weeks for full feature

---

**Ready to implement this game-changing feature?** This positions Image Optimizer Pro as the only platform offering AI-powered jewelry+model combinations at scale.

Next steps:
1. Approve this spec
2. Start with dual upload UI (3-4 days)
3. Build backend edge function (1 week)
4. Integrate into Studio (3-4 days)

---

*Designed by Uma | UX Designer*
