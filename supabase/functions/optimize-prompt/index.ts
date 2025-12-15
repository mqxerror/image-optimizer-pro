import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OptimizePromptRequest {
  current_prompt?: string
  jewelry_type?: string
  optimization_goal?: 'professional' | 'creative' | 'detailed' | 'minimal'
  use_ai?: boolean
  template_settings?: {
    background_type?: string
    lighting_style?: string
    enhancement_level?: string
  }
}

// Professional prompt templates for jewelry photography
const PROMPT_TEMPLATES = {
  default: "Enhance this jewelry image for professional e-commerce presentation. Make the background pure white, increase image sharpness and clarity, improve lighting to highlight jewelry details and sparkle, and enhance color vibrancy while maintaining natural appearance.",

  ring: "Transform this ring photograph into a professional product image. Create a clean pure white background, enhance the metal's reflective qualities and shine, bring out the brilliance and fire of any gemstones, ensure crisp focus on intricate details and engravings, and optimize lighting for maximum sparkle.",

  necklace: "Enhance this necklace photograph to professional quality. Set against a pristine white background, highlight the chain's texture and clasp details, maximize pendant brilliance and light reflection, ensure even lighting across the entire piece, and enhance color accuracy of metals and stones.",

  earrings: "Elevate this earring photograph to luxury product standards. Create a seamless white backdrop, showcase symmetry and matching quality, enhance gemstone sparkle and metal luster, capture fine filigree and setting details, and ensure professional studio-quality lighting.",

  bracelet: "Optimize this bracelet image for high-end retail presentation. Pure white background with soft shadows for depth, highlight link construction and clasp mechanism, enhance any stone settings or decorative elements, ensure consistent color and shine throughout the piece.",

  watch: "Transform this watch photograph into a premium product image. Clean white background with subtle reflection, enhance dial readability and crystal clarity, highlight case finish and bezel details, showcase band texture and clasp quality, and ensure accurate color representation."
}

// Quality enhancement phrases by goal
const QUALITY_PHRASES = {
  professional: [
    'professional studio lighting',
    'commercial-grade quality',
    '8K ultra-high resolution',
    'e-commerce ready presentation',
    'true-to-life color accuracy',
  ],
  creative: [
    'artistic composition',
    'dramatic lighting effects',
    'unique visual appeal',
    'creative color grading',
    'boutique aesthetic',
  ],
  detailed: [
    'extreme macro detail',
    'crystal-clear sharpness',
    'every facet visible',
    'texture-rich rendering',
    'microscopic precision',
  ],
  minimal: [
    'clean aesthetic',
    'minimalist presentation',
    'subtle elegance',
    'refined simplicity',
  ],
}

// Enhanced prompt optimization with AI-like improvements
function optimizePromptAdvanced(prompt: string, goal: string): string {
  const trimmedPrompt = prompt.trim()
  const goalPhrases = QUALITY_PHRASES[goal as keyof typeof QUALITY_PHRASES] || QUALITY_PHRASES.professional

  // Detect jewelry keywords
  const jewelryTypes = ['ring', 'necklace', 'bracelet', 'earring', 'watch', 'pendant', 'chain', 'jewelry']
  const mentionedJewelry = jewelryTypes.filter(j => trimmedPrompt.toLowerCase().includes(j))

  // Detect background mentions
  const hasBackgroundMention = /background|backdrop|surface/i.test(trimmedPrompt)

  // Detect lighting mentions
  const hasLightingMention = /light|bright|shadow|glow|shine|sparkle/i.test(trimmedPrompt)

  // Build enhanced prompt
  let enhanced = trimmedPrompt

  // Add professional context if not present
  if (!trimmedPrompt.toLowerCase().includes('professional') && !trimmedPrompt.toLowerCase().includes('commercial')) {
    enhanced = `Professional jewelry product photography: ${enhanced}`
  }

  // Add quality phrases based on goal
  const randomPhrases = goalPhrases.slice(0, 3).join(', ')
  enhanced = `${enhanced}. ${randomPhrases}`

  // Add background enhancement if not mentioned
  if (!hasBackgroundMention) {
    enhanced += '. Clean, seamless white background with subtle shadow for depth'
  }

  // Add lighting enhancement if not mentioned
  if (!hasLightingMention) {
    enhanced += '. Optimal three-point studio lighting to maximize sparkle and highlight details'
  }

  // Add jewelry-specific enhancements
  if (mentionedJewelry.length > 0) {
    if (mentionedJewelry.includes('ring') || mentionedJewelry.includes('earring')) {
      enhanced += '. Enhance gemstone brilliance and fire'
    }
    if (mentionedJewelry.includes('necklace') || mentionedJewelry.includes('chain')) {
      enhanced += '. Highlight chain texture and clasp details'
    }
    if (mentionedJewelry.includes('watch')) {
      enhanced += '. Ensure dial clarity and crystal perfection'
    }
  } else {
    // Generic jewelry enhancement
    enhanced += '. Enhance metal luster and any gemstone brilliance'
  }

  // Final quality boost
  enhanced += '. Sharp focus, vibrant colors, ready for luxury e-commerce.'

  return enhanced
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: OptimizePromptRequest = await req.json()
    const { current_prompt, jewelry_type, optimization_goal = 'professional', use_ai, template_settings } = body

    let optimizedPrompt: string

    // Use AI-like enhancement if requested and prompt exists
    if (use_ai && current_prompt && current_prompt.trim().length > 5) {
      optimizedPrompt = optimizePromptAdvanced(current_prompt, optimization_goal)
    } else if (current_prompt && current_prompt.trim().length > 10) {
      // Simple enhancement for existing prompt
      optimizedPrompt = `${current_prompt.trim()} Ensure professional e-commerce quality with pure white background, optimal lighting for jewelry photography, enhanced sharpness, and true-to-life colors.`
    } else {
      // Generate based on jewelry type
      const jewelryKey = jewelry_type?.toLowerCase() || 'default'
      const basePrompt = PROMPT_TEMPLATES[jewelryKey as keyof typeof PROMPT_TEMPLATES] || PROMPT_TEMPLATES.default

      // Customize based on template settings
      const customizations: string[] = []

      if (template_settings?.background_type && template_settings.background_type !== 'white') {
        customizations.push(`Use a ${template_settings.background_type} background`)
      }

      if (template_settings?.lighting_style) {
        const lightingMap: Record<string, string> = {
          'studio': 'professional studio lighting',
          'natural': 'natural daylight appearance',
          'dramatic': 'dramatic accent lighting',
          'soft': 'soft diffused lighting'
        }
        customizations.push(lightingMap[template_settings.lighting_style] || '')
      }

      if (template_settings?.enhancement_level === 'maximum') {
        customizations.push('Apply maximum enhancement for ultra-premium presentation')
      }

      optimizedPrompt = customizations.length > 0
        ? `${basePrompt} ${customizations.filter(Boolean).join('. ')}.`
        : basePrompt
    }

    // Estimate tokens (rough approximation: ~4 chars per token)
    const tokensUsed = Math.ceil(optimizedPrompt.length / 4)

    return new Response(
      JSON.stringify({
        success: true,
        optimized_prompt: optimizedPrompt,
        tokens_used: tokensUsed,
        jewelry_type: jewelry_type || 'general',
        optimization_goal
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('Optimize prompt error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
