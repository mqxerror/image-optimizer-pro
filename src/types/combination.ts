// Image Combination Feature Types

// ============================================
// AI MODEL TYPES
// ============================================
// Note: AI model definitions are now centralized in @/constants/aiModels.ts
// This type is kept for backwards compatibility
export type CombinationAIModel = string

// ============================================
// PLACEMENT TYPES
// ============================================
export type PlacementPreset = 'necklace' | 'earrings' | 'ring' | 'bracelet' | 'brooch' | 'custom'
export type ShadowDirection = 'auto' | 'top' | 'bottom' | 'left' | 'right'
export type CombinationCategory = 'natural' | 'studio' | 'dramatic' | 'outdoor' | 'custom'
export type CombinationStatus = 'pending' | 'analyzing' | 'generating' | 'success' | 'failed'

// ============================================
// SETTINGS INTERFACES
// ============================================

export interface PlacementSettings {
  preset: PlacementPreset
  fine_x: number // -50 to 50 fine adjustment
  fine_y: number // -50 to 50 fine adjustment
}

export interface LightingIntegrationSettings {
  shadow_enabled: boolean
  shadow_intensity: number // 0-100
  shadow_direction: ShadowDirection
}

export interface RealismSettings {
  skin_tone_match: boolean
  depth_of_field_match: boolean
  reflectivity: number // 0-100
}

export interface CombinationAdvancedSettings {
  placement: PlacementSettings
  lighting: LightingIntegrationSettings
  realism: RealismSettings
}

// Quick control settings (5 sliders + model)
export interface CombinationQuickSettings {
  position_y: number // 0-100 (vertical position on model)
  scale: number // 50-150 (jewelry size)
  blend_intensity: number // 0-100 (integration)
  lighting_match: number // 0-100 (lighting match)
  rotation: number // -45 to 45 (angle)
  ai_model: CombinationAIModel // Selected AI model
}

// Full combination settings
export interface CombinationSettings extends CombinationQuickSettings {
  advanced: CombinationAdvancedSettings
}

// ============================================
// IMAGE ANALYSIS TYPES (from Claude Vision)
// ============================================

export interface ModelImageAnalysis {
  face_detected: boolean
  face_landmarks?: {
    neck_position: { x: number; y: number }
    ear_positions?: { left: { x: number; y: number }; right: { x: number; y: number } }
    hand_positions?: { left?: { x: number; y: number }; right?: { x: number; y: number } }
  }
  pose: 'frontal' | 'profile-left' | 'profile-right' | 'three-quarter' | 'unknown'
  lighting_analysis: {
    direction: string
    intensity: 'low' | 'medium' | 'high'
    color_temperature: 'warm' | 'neutral' | 'cool'
  }
  skin_tone: {
    hue: number
    saturation: number
    lightness: number
  }
  suggested_placements: PlacementPreset[]
}

export interface JewelryImageAnalysis {
  jewelry_type: PlacementPreset
  detected_dimensions: {
    width: number
    height: number
    aspect_ratio: number
  }
  metal_type: 'gold' | 'silver' | 'rose-gold' | 'platinum' | 'mixed' | 'unknown'
  has_gemstones: boolean
  gemstone_colors?: string[]
  background_type: 'transparent' | 'white' | 'colored' | 'complex'
  quality_score: number // 0-100
}

// ============================================
// DATABASE MODELS
// ============================================

export interface CombinationTemplate {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  thumbnail_url: string | null
  category: CombinationCategory
  is_system: boolean
  is_active: boolean
  usage_count: number

  // Quick Controls
  position_y: number
  scale: number
  blend_intensity: number
  lighting_match: number
  rotation: number

  // Advanced Settings
  advanced_settings: CombinationAdvancedSettings

  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CombinationJob {
  id: string
  organization_id: string
  template_id: string | null

  // Source Images
  model_image_url: string
  model_image_storage_path: string | null
  model_image_analysis: ModelImageAnalysis | null

  jewelry_image_url: string
  jewelry_image_storage_path: string | null
  jewelry_image_analysis: JewelryImageAnalysis | null

  // Quick Control Settings
  position_y: number
  scale: number
  blend_intensity: number
  lighting_match: number
  rotation: number

  // Advanced Settings
  advanced_settings: CombinationAdvancedSettings

  // Result
  result_url: string | null
  result_storage_path: string | null
  result_thumbnail_url: string | null

  // AI Processing
  generated_prompt: string | null
  ai_model: string
  task_id: string | null
  status: CombinationStatus
  error_message: string | null
  processing_time_sec: number | null

  // Cost
  tokens_used: number

  // Metadata
  is_favorite: boolean
  is_reprocess: boolean
  parent_job_id: string | null
  version: number

  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateCombinationJobRequest {
  model_image_url: string
  model_image_file?: File
  jewelry_image_url: string
  jewelry_image_file?: File
  template_id?: string
  settings: CombinationQuickSettings
  advanced_settings?: Partial<CombinationAdvancedSettings>
}

export interface CombinationJobResponse {
  job: CombinationJob
  token_balance_after: number
}

// ============================================
// UI STATE TYPES
// ============================================

export interface DualImageState {
  model: {
    url: string | null
    file: File | null
    isUploading: boolean
    analysis: ModelImageAnalysis | null
  }
  jewelry: {
    url: string | null
    file: File | null
    isUploading: boolean
    analysis: JewelryImageAnalysis | null
  }
}

export interface CombinationUIState {
  images: DualImageState
  settings: CombinationSettings
  selectedTemplateId: string | null
  isGenerating: boolean
  showAdvancedPanel: boolean
  previewMode: 'side-by-side' | 'overlay'
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function templateToSettings(template: CombinationTemplate): CombinationSettings {
  return {
    position_y: template.position_y,
    scale: template.scale,
    blend_intensity: template.blend_intensity,
    lighting_match: template.lighting_match,
    rotation: template.rotation,
    ai_model: 'flux-kontext-max', // Default model, templates don't store model preference
    advanced: template.advanced_settings,
  }
}

export const defaultCombinationQuickSettings: CombinationQuickSettings = {
  position_y: 50,
  scale: 100,
  blend_intensity: 70,
  lighting_match: 80,
  rotation: 0,
  ai_model: 'flux-kontext-max', // Default to recommended model
}

export const defaultCombinationAdvancedSettings: CombinationAdvancedSettings = {
  placement: {
    preset: 'necklace',
    fine_x: 0,
    fine_y: 0,
  },
  lighting: {
    shadow_enabled: true,
    shadow_intensity: 60,
    shadow_direction: 'auto',
  },
  realism: {
    skin_tone_match: true,
    depth_of_field_match: true,
    reflectivity: 70,
  },
}

export const defaultCombinationSettings: CombinationSettings = {
  ...defaultCombinationQuickSettings,
  advanced: defaultCombinationAdvancedSettings,
}

export const defaultDualImageState: DualImageState = {
  model: {
    url: null,
    file: null,
    isUploading: false,
    analysis: null,
  },
  jewelry: {
    url: null,
    file: null,
    isUploading: false,
    analysis: null,
  },
}

// Placement preset descriptions for UI
export const placementPresetInfo: Record<PlacementPreset, { label: string; description: string }> = {
  necklace: {
    label: 'Necklace',
    description: 'Positioned on neck/chest area',
  },
  earrings: {
    label: 'Earrings',
    description: 'Positioned near ear lobes',
  },
  ring: {
    label: 'Ring',
    description: 'Positioned on finger/hand',
  },
  bracelet: {
    label: 'Bracelet',
    description: 'Positioned on wrist area',
  },
  brooch: {
    label: 'Brooch',
    description: 'Positioned on lapel/chest',
  },
  custom: {
    label: 'Custom',
    description: 'Manual positioning',
  },
}

// Category info for templates
export const categoryInfo: Record<CombinationCategory, { label: string; description: string; icon: string }> = {
  natural: {
    label: 'Natural Daylight',
    description: 'Soft, warm everyday lighting',
    icon: '🌤️',
  },
  studio: {
    label: 'Studio Professional',
    description: 'Clean, high-key product lighting',
    icon: '📸',
  },
  dramatic: {
    label: 'Dramatic Evening',
    description: 'Bold shadows for luxury appeal',
    icon: '✨',
  },
  outdoor: {
    label: 'Outdoor Editorial',
    description: 'Lifestyle marketing with bokeh',
    icon: '🌿',
  },
  custom: {
    label: 'Custom',
    description: 'Your personalized settings',
    icon: '🎨',
  },
}
