// Studio Box Feature Types

export type CameraLens = '50mm' | '85mm' | '100mm' | '135mm'
export type CameraAperture = 'f/1.4' | 'f/2.8' | 'f/8' | 'f/16'
export type CameraAngle = 'top-down' | '45deg' | 'eye-level' | 'low-angle'
export type CameraFocus = 'sharp' | 'shallow-dof' | 'tilt-shift'
export type CameraDistance = 'close-up' | 'medium' | 'full'

export type LightingStyle = 'studio-3point' | 'natural' | 'dramatic' | 'soft' | 'rim' | 'split'
export type LightingDirection =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

export type BackgroundType = 'white' | 'gradient' | 'black' | 'transparent' | 'scene'
export type BackgroundSurface = 'none' | 'marble' | 'velvet' | 'wood' | 'mirror' | 'silk' | 'concrete'
export type ShadowStyle = 'none' | 'soft' | 'hard' | 'floating'

export type JewelryMetal = 'gold' | 'silver' | 'rose-gold' | 'platinum' | 'mixed' | 'auto'
export type JewelryFinish = 'high-polish' | 'matte' | 'brushed' | 'hammered'

export type CompositionFraming = 'center' | 'rule-of-thirds' | 'golden-ratio'
export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '3:4' | '4:3'

export type PresetCategory = 'popular' | 'editorial' | 'lifestyle' | 'minimal' | 'dramatic' | 'custom'

export interface CameraSettings {
  lens: CameraLens
  aperture: CameraAperture
  angle: CameraAngle
  focus: CameraFocus
  distance: CameraDistance
}

export interface LightingSettings {
  style: LightingStyle
  keyIntensity: number
  fillIntensity: number
  rimIntensity: number
  direction: LightingDirection
}

export interface BackgroundSettings {
  type: BackgroundType
  surface: BackgroundSurface
  shadow: ShadowStyle
  reflection: number
  color?: string
}

export interface JewelrySettings {
  metal: JewelryMetal
  finish: JewelryFinish
  sparkle: number
  colorPop: number
  detail: number
}

export interface CompositionSettings {
  framing: CompositionFraming
  aspectRatio: AspectRatio
  padding: number
}

export interface StudioSettings {
  camera: CameraSettings
  lighting: LightingSettings
  background: BackgroundSettings
  jewelry: JewelrySettings
  composition: CompositionSettings
  aiModel: string
  customPrompt?: string
}

export interface StudioPreset {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  thumbnail_url: string | null
  category: PresetCategory
  is_system: boolean
  is_active: boolean
  usage_count: number

  // Flattened settings from DB
  camera_lens: CameraLens
  camera_aperture: CameraAperture
  camera_angle: CameraAngle
  camera_focus: CameraFocus
  camera_distance: CameraDistance

  lighting_style: LightingStyle
  lighting_key_intensity: number
  lighting_fill_intensity: number
  lighting_rim_intensity: number
  lighting_direction: LightingDirection

  background_type: BackgroundType
  background_surface: BackgroundSurface
  background_shadow: ShadowStyle
  background_reflection: number
  background_color: string | null

  jewelry_metal: JewelryMetal
  jewelry_finish: JewelryFinish
  jewelry_sparkle: number
  jewelry_color_pop: number
  jewelry_detail: number

  composition_framing: CompositionFraming
  composition_aspect_ratio: AspectRatio
  composition_padding: number

  ai_model: string
  custom_prompt: string | null

  created_by: string | null
  created_at: string
  updated_at: string
}

export interface StudioGeneration {
  id: string
  organization_id: string
  preset_id: string | null
  original_url: string
  original_file_name: string | null
  original_storage_path: string | null
  result_url: string | null
  result_storage_path: string | null
  settings_snapshot: StudioSettings
  custom_prompt: string | null
  final_prompt: string | null
  ai_model: string
  task_id: string | null
  status: 'pending' | 'processing' | 'success' | 'failed'
  error_message: string | null
  processing_time_sec: number | null
  tokens_used: number
  is_favorite: boolean
  created_by: string | null
  created_at: string
}

export interface StudioIdea {
  id: string
  text: string
  category: string | null
  is_active: boolean
  display_order: number
}

// Helper to convert preset to settings
export function presetToSettings(preset: StudioPreset): StudioSettings {
  return {
    camera: {
      lens: preset.camera_lens,
      aperture: preset.camera_aperture,
      angle: preset.camera_angle,
      focus: preset.camera_focus,
      distance: preset.camera_distance,
    },
    lighting: {
      style: preset.lighting_style,
      keyIntensity: preset.lighting_key_intensity,
      fillIntensity: preset.lighting_fill_intensity,
      rimIntensity: preset.lighting_rim_intensity,
      direction: preset.lighting_direction,
    },
    background: {
      type: preset.background_type,
      surface: preset.background_surface,
      shadow: preset.background_shadow,
      reflection: preset.background_reflection,
      color: preset.background_color || undefined,
    },
    jewelry: {
      metal: preset.jewelry_metal,
      finish: preset.jewelry_finish,
      sparkle: preset.jewelry_sparkle,
      colorPop: preset.jewelry_color_pop,
      detail: preset.jewelry_detail,
    },
    composition: {
      framing: preset.composition_framing,
      aspectRatio: preset.composition_aspect_ratio,
      padding: preset.composition_padding,
    },
    aiModel: preset.ai_model,
  }
}

// Default settings
export const defaultStudioSettings: StudioSettings = {
  camera: {
    lens: '85mm',
    aperture: 'f/8',
    angle: '45deg',
    focus: 'sharp',
    distance: 'medium',
  },
  lighting: {
    style: 'studio-3point',
    keyIntensity: 70,
    fillIntensity: 40,
    rimIntensity: 50,
    direction: 'top-right',
  },
  background: {
    type: 'white',
    surface: 'none',
    shadow: 'soft',
    reflection: 0,
  },
  jewelry: {
    metal: 'auto',
    finish: 'high-polish',
    sparkle: 70,
    colorPop: 50,
    detail: 80,
  },
  composition: {
    framing: 'center',
    aspectRatio: '1:1',
    padding: 30,
  },
  aiModel: 'flux-kontext-pro',
}
