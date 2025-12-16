import type { StudioSettings } from '@/types/studio'

/**
 * Builds a comprehensive prompt from studio settings
 */
export function buildPromptFromSettings(settings: StudioSettings): string {
  const parts: string[] = []

  // Start with base photography description
  parts.push('Professional jewelry product photography')

  // Camera settings
  const cameraDesc = buildCameraDescription(settings.camera)
  if (cameraDesc) parts.push(cameraDesc)

  // Lighting
  const lightingDesc = buildLightingDescription(settings.lighting)
  if (lightingDesc) parts.push(lightingDesc)

  // Background
  const bgDesc = buildBackgroundDescription(settings.background)
  if (bgDesc) parts.push(bgDesc)

  // Jewelry enhancements
  const jewelryDesc = buildJewelryDescription(settings.jewelry)
  if (jewelryDesc) parts.push(jewelryDesc)

  // Composition
  const compDesc = buildCompositionDescription(settings.composition)
  if (compDesc) parts.push(compDesc)

  // Add quality boosters
  parts.push('8K resolution, ultra high detail, commercial quality, ready for e-commerce')

  return parts.join('. ') + '.'
}

function buildCameraDescription(camera: StudioSettings['camera']): string {
  const parts: string[] = []

  // Lens
  const lensMap: Record<string, string> = {
    '50mm': '50mm lens for natural perspective',
    '85mm': '85mm portrait lens for flattering compression',
    '100mm': '100mm macro lens for extreme detail',
    '135mm': '135mm telephoto for beautiful bokeh',
  }
  parts.push(lensMap[camera.lens] || `${camera.lens} lens`)

  // Aperture
  const apertureMap: Record<string, string> = {
    'f/1.4': 'wide open at f/1.4 for creamy bokeh',
    'f/2.8': 'f/2.8 for subject isolation',
    'f/8': 'f/8 for sharp detail throughout',
    'f/16': 'f/16 for maximum depth of field',
  }
  parts.push(apertureMap[camera.aperture] || camera.aperture)

  // Angle
  const angleMap: Record<string, string> = {
    'top-down': 'shot from directly above (flat lay)',
    '45deg': 'shot at 45 degree angle',
    'eye-level': 'eye-level perspective',
    'low-angle': 'shot from low angle looking up',
  }
  parts.push(angleMap[camera.angle] || camera.angle)

  // Focus
  if (camera.focus === 'shallow-dof') {
    parts.push('shallow depth of field with artistic blur')
  } else if (camera.focus === 'tilt-shift') {
    parts.push('tilt-shift effect for miniature look')
  }

  // Distance/shot type
  const distanceMap: Record<string, string> = {
    'close-up': 'close-up detail shot',
    'medium': 'medium shot',
    'full': 'wide shot showing full context',
  }
  if (distanceMap[camera.distance]) {
    parts.push(distanceMap[camera.distance])
  }

  return parts.join(', ')
}

function buildLightingDescription(lighting: StudioSettings['lighting']): string {
  const parts: string[] = []

  // Style
  const styleMap: Record<string, string> = {
    'studio-3point': 'professional three-point studio lighting',
    'natural': 'soft natural window light',
    'dramatic': 'dramatic high-contrast lighting with deep shadows',
    'soft': 'soft diffused lighting for even illumination',
    'rim': 'rim lighting for edge definition',
    'split': 'split lighting for artistic effect',
  }
  parts.push(styleMap[lighting.style] || lighting.style)

  // Direction
  const dirMap: Record<string, string> = {
    'top-left': 'light from upper left',
    'top': 'overhead lighting',
    'top-right': 'light from upper right',
    'left': 'side lighting from left',
    'center': 'front-facing light',
    'right': 'side lighting from right',
    'bottom-left': 'low light from left',
    'bottom': 'low accent lighting',
    'bottom-right': 'low light from right',
  }
  parts.push(dirMap[lighting.direction])

  // Intensity descriptions
  if (lighting.keyIntensity > 80) {
    parts.push('bright key light')
  } else if (lighting.keyIntensity < 40) {
    parts.push('subtle key light')
  }

  // Fill intensity
  if (lighting.fillIntensity > 70) {
    parts.push('with strong fill lighting for even illumination')
  } else if (lighting.fillIntensity < 30) {
    parts.push('with minimal fill creating dramatic shadows')
  }

  if (lighting.rimIntensity > 60) {
    parts.push('strong rim lighting for edge separation')
  }

  return parts.join(', ')
}

function buildBackgroundDescription(bg: StudioSettings['background']): string {
  const parts: string[] = []

  // Type
  const typeMap: Record<string, string> = {
    'white': 'clean pure white background',
    'gradient': 'subtle gradient background',
    'black': 'dramatic black background',
    'transparent': 'transparent background for compositing',
    'scene': 'lifestyle scene setting',
  }

  // Check if custom color is set for solid backgrounds
  if (bg.color && bg.type !== 'scene' && bg.type !== 'transparent') {
    // Use the custom color instead of the type description
    parts.push(`${bg.color} solid color background`)
  } else {
    parts.push(typeMap[bg.type] || bg.type)
  }

  // Surface
  if (bg.surface !== 'none') {
    const surfaceMap: Record<string, string> = {
      'marble': 'on luxurious marble surface',
      'velvet': 'on rich velvet fabric',
      'wood': 'on natural wood surface',
      'mirror': 'on reflective mirror surface',
      'silk': 'on elegant silk fabric',
      'concrete': 'on modern concrete surface',
    }
    parts.push(surfaceMap[bg.surface] || bg.surface)
  }

  // Shadow
  const shadowMap: Record<string, string> = {
    'none': '',
    'soft': 'with soft natural shadow',
    'hard': 'with crisp defined shadow',
    'floating': 'floating with subtle shadow below',
  }
  if (shadowMap[bg.shadow]) {
    parts.push(shadowMap[bg.shadow])
  }

  // Reflection
  if (bg.reflection > 30) {
    parts.push('with mirror-like reflection')
  } else if (bg.reflection > 0) {
    parts.push('with subtle reflection')
  }

  return parts.filter(Boolean).join(', ')
}

function buildJewelryDescription(jewelry: StudioSettings['jewelry']): string {
  const parts: string[] = []

  // Metal
  if (jewelry.metal !== 'auto') {
    const metalMap: Record<string, string> = {
      'gold': 'rich yellow gold with warm tones',
      'silver': 'brilliant silver with cool tones',
      'rose-gold': 'elegant rose gold with pink undertones',
      'platinum': 'lustrous platinum finish',
      'mixed': 'mixed metals beautifully combined',
    }
    parts.push(metalMap[jewelry.metal] || jewelry.metal)
  }

  // Finish
  const finishMap: Record<string, string> = {
    'high-polish': 'highly polished mirror-like finish',
    'matte': 'sophisticated matte finish',
    'brushed': 'brushed texture finish',
    'hammered': 'artisanal hammered texture',
  }
  parts.push(finishMap[jewelry.finish] || jewelry.finish)

  // Sparkle
  if (jewelry.sparkle > 80) {
    parts.push('brilliant sparkling highlights and light play')
  } else if (jewelry.sparkle > 50) {
    parts.push('elegant sparkle and shine')
  }

  // Color pop
  if (jewelry.colorPop > 70) {
    parts.push('vibrant enhanced colors')
  }

  // Detail
  if (jewelry.detail > 80) {
    parts.push('extreme detail showing every facet and texture')
  } else if (jewelry.detail > 50) {
    parts.push('sharp detail throughout')
  }

  return parts.join(', ')
}

function buildCompositionDescription(comp: StudioSettings['composition']): string {
  const parts: string[] = []

  // Framing
  const framingMap: Record<string, string> = {
    'center': 'centered composition',
    'rule-of-thirds': 'composed using rule of thirds',
    'golden-ratio': 'golden ratio composition',
  }
  parts.push(framingMap[comp.framing] || comp.framing)

  // Aspect ratio context
  const aspectMap: Record<string, string> = {
    '1:1': 'square format',
    '4:5': 'portrait format for Instagram',
    '16:9': 'widescreen format',
    '9:16': 'vertical story format',
    '3:4': 'classic portrait ratio',
    '4:3': 'classic landscape ratio',
  }
  parts.push(aspectMap[comp.aspectRatio] || comp.aspectRatio)

  // Padding
  if (comp.padding > 30) {
    parts.push('generous negative space around subject')
  }

  return parts.join(', ')
}

/**
 * Component to display the generated prompt (optional UI)
 */
interface PromptPreviewProps {
  settings: StudioSettings
  customPrompt?: string
}

export function PromptPreview({ settings, customPrompt }: PromptPreviewProps) {
  const generatedPrompt = buildPromptFromSettings(settings)
  const finalPrompt = customPrompt
    ? `${customPrompt}. ${generatedPrompt}`
    : generatedPrompt

  return (
    <div className="bg-slate-50 border rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">Generated Prompt</p>
      <p className="text-sm text-slate-700 leading-relaxed">{finalPrompt}</p>
    </div>
  )
}
