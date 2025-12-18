import { useMemo, useCallback } from 'react'
import type { JewelryBrief, BackgroundType, ShadowType } from './types'

/**
 * Maps background type to prompt text
 */
const BACKGROUND_PROMPTS: Record<BackgroundType, string> = {
  'pure-white': 'on pure white seamless background',
  'light-gray': 'on light gray gradient background',
  'lifestyle': 'in elegant lifestyle setting with soft ambient lighting',
  'transparent': 'on transparent background for PNG export',
}

/**
 * Maps shadow type to prompt text
 */
const SHADOW_PROMPTS: Record<ShadowType, string> = {
  'none': '',
  'soft': 'with soft natural shadow',
  'product-grounded': 'with product-grounded shadow adding depth and dimension',
}

/**
 * Compiles a JewelryBrief into a natural language prompt
 */
export function compileBriefToPrompt(brief: JewelryBrief): string {
  const parts: string[] = []

  // Base context
  parts.push('Professional jewelry product photography')

  // Background
  parts.push(BACKGROUND_PROMPTS[brief.background])

  // Shadow (if not none)
  const shadowPrompt = SHADOW_PROMPTS[brief.shadow]
  if (shadowPrompt) {
    parts.push(shadowPrompt)
  }

  // Retouch settings
  const retouchParts: string[] = []

  if (brief.retouch.dustRemoval) {
    retouchParts.push('dust and imperfections removed')
  }

  if (brief.retouch.reflectionControl >= 60) {
    retouchParts.push('controlled reflections')
  } else if (brief.retouch.reflectionControl <= 30) {
    retouchParts.push('natural reflections preserved')
  }

  if (brief.retouch.metalWarmth >= 60) {
    retouchParts.push('warm metal tones enhanced')
  } else if (brief.retouch.metalWarmth <= 30) {
    retouchParts.push('cool metal tones')
  }

  if (brief.retouch.stoneSparkle >= 60) {
    retouchParts.push('gemstone sparkle and brilliance enhanced')
  } else if (brief.retouch.stoneSparkle >= 40) {
    retouchParts.push('natural gemstone sparkle')
  }

  if (retouchParts.length > 0) {
    parts.push(retouchParts.join(', '))
  }

  // Framing
  const framingParts: string[] = []

  switch (brief.framing.position) {
    case 'centered':
      framingParts.push('centered composition')
      break
    case 'rule-of-thirds':
      framingParts.push('rule of thirds composition')
      break
    case 'left-aligned':
      framingParts.push('left-aligned composition')
      break
    case 'right-aligned':
      framingParts.push('right-aligned composition')
      break
  }

  if (brief.framing.marginPercent > 0) {
    framingParts.push(`${brief.framing.marginPercent}% margin`)
  }

  if (brief.framing.cropSafe) {
    framingParts.push('crop-safe margins')
  }

  if (framingParts.length > 0) {
    parts.push(framingParts.join(', '))
  }

  // Compliance
  if (brief.compliance.gmcSafe) {
    parts.push('Google Merchant Center compliant')
    parts.push('no text overlays or promotional elements')
  }

  if (brief.compliance.noWatermarks) {
    parts.push('no watermarks')
  }

  // Quality
  parts.push('8K resolution')
  parts.push('commercial quality')

  // Join with proper punctuation
  return parts.filter(Boolean).join('. ') + '.'
}

/**
 * Attempts to parse a raw prompt back into a brief (best effort)
 * Used when user wants to "rebuild brief from prompt"
 */
export function parsePromptToBrief(prompt: string): Partial<JewelryBrief> {
  const lowerPrompt = prompt.toLowerCase()
  const brief: Partial<JewelryBrief> = {}

  // Detect background
  if (lowerPrompt.includes('pure white') || lowerPrompt.includes('white background')) {
    brief.background = 'pure-white'
  } else if (lowerPrompt.includes('gray') || lowerPrompt.includes('grey')) {
    brief.background = 'light-gray'
  } else if (lowerPrompt.includes('lifestyle') || lowerPrompt.includes('ambient')) {
    brief.background = 'lifestyle'
  } else if (lowerPrompt.includes('transparent') || lowerPrompt.includes('png')) {
    brief.background = 'transparent'
  }

  // Detect shadow
  if (lowerPrompt.includes('no shadow') || lowerPrompt.includes('without shadow')) {
    brief.shadow = 'none'
  } else if (lowerPrompt.includes('grounded') || lowerPrompt.includes('deep shadow')) {
    brief.shadow = 'product-grounded'
  } else if (lowerPrompt.includes('soft shadow') || lowerPrompt.includes('natural shadow')) {
    brief.shadow = 'soft'
  }

  // Detect retouch settings
  const retouch: Partial<JewelryBrief['retouch']> = {}

  if (lowerPrompt.includes('dust') && (lowerPrompt.includes('removed') || lowerPrompt.includes('remove'))) {
    retouch.dustRemoval = true
  }

  if (lowerPrompt.includes('controlled reflection')) {
    retouch.reflectionControl = 70
  } else if (lowerPrompt.includes('natural reflection')) {
    retouch.reflectionControl = 30
  }

  if (lowerPrompt.includes('warm') && lowerPrompt.includes('metal')) {
    retouch.metalWarmth = 70
  } else if (lowerPrompt.includes('cool') && lowerPrompt.includes('metal')) {
    retouch.metalWarmth = 30
  }

  if (lowerPrompt.includes('sparkle') || lowerPrompt.includes('brilliance')) {
    retouch.stoneSparkle = 70
  }

  if (Object.keys(retouch).length > 0) {
    brief.retouch = retouch as JewelryBrief['retouch']
  }

  // Detect framing
  const framing: Partial<JewelryBrief['framing']> = {}

  if (lowerPrompt.includes('centered')) {
    framing.position = 'centered'
  } else if (lowerPrompt.includes('rule of thirds')) {
    framing.position = 'rule-of-thirds'
  } else if (lowerPrompt.includes('left')) {
    framing.position = 'left-aligned'
  } else if (lowerPrompt.includes('right')) {
    framing.position = 'right-aligned'
  }

  if (lowerPrompt.includes('crop-safe') || lowerPrompt.includes('crop safe')) {
    framing.cropSafe = true
  }

  // Try to extract margin percentage
  const marginMatch = lowerPrompt.match(/(\d+)%?\s*margin/)
  if (marginMatch) {
    framing.marginPercent = parseInt(marginMatch[1], 10)
  }

  if (Object.keys(framing).length > 0) {
    brief.framing = framing as JewelryBrief['framing']
  }

  // Detect compliance
  const compliance: Partial<JewelryBrief['compliance']> = {}

  if (lowerPrompt.includes('google merchant') || lowerPrompt.includes('gmc')) {
    compliance.gmcSafe = true
  }

  if (lowerPrompt.includes('no watermark')) {
    compliance.noWatermarks = true
  }

  if (Object.keys(compliance).length > 0) {
    brief.compliance = compliance as JewelryBrief['compliance']
  }

  return brief
}

/**
 * Hook for compiling briefs to prompts with memoization
 */
export function useBriefCompiler(brief: JewelryBrief) {
  const compiledPrompt = useMemo(() => {
    return compileBriefToPrompt(brief)
  }, [
    brief.background,
    brief.shadow,
    brief.retouch.dustRemoval,
    brief.retouch.reflectionControl,
    brief.retouch.metalWarmth,
    brief.retouch.stoneSparkle,
    brief.framing.position,
    brief.framing.marginPercent,
    brief.framing.cropSafe,
    brief.compliance.gmcSafe,
    brief.compliance.noWatermarks,
  ])

  const parseFromPrompt = useCallback((prompt: string) => {
    return parsePromptToBrief(prompt)
  }, [])

  return {
    compiledPrompt,
    parseFromPrompt,
  }
}

export default useBriefCompiler
