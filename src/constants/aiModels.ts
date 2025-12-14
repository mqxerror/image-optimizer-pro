/**
 * Unified AI Model Definitions
 *
 * This file contains all AI model configurations used across the Studio.
 * Models can be filtered by mode (single, combination, or both).
 *
 * To add a new model:
 * 1. Add a new entry to the AI_MODELS array
 * 2. Specify which modes it supports
 * 3. Set appropriate quality/speed ratings
 */

export type StudioMode = 'single' | 'combination'

export interface AIModelDefinition {
  id: string                          // Technical ID used in API calls
  technicalName: string               // Technical name for display
  friendlyName: string                // Customer-friendly name
  description: string                 // Short description of the model
  provider: string                    // Provider name (e.g., 'BFL', 'OpenAI')
  quality: 1 | 2 | 3 | 4 | 5         // Quality rating (1-5)
  speed: 1 | 2 | 3 | 4 | 5           // Speed rating (1-5)
  tokenCost: number                   // Token cost per generation
  recommended?: boolean               // Show recommended badge
  modes: StudioMode[]                 // Which modes support this model
  capabilities?: string[]             // Specific capabilities (future use)
  isNew?: boolean                     // Show "New" badge
  isPremium?: boolean                 // Mark as premium tier
}

/**
 * All available AI models
 * Sorted by recommended status, then by quality
 */
export const AI_MODELS: AIModelDefinition[] = [
  // === SHARED MODELS (both modes) ===
  {
    id: 'flux-kontext-pro',
    technicalName: 'Flux Kontext Pro',
    friendlyName: 'Pro Quality',
    description: 'Best balance of quality and speed',
    provider: 'BFL',
    quality: 4,
    speed: 4,
    tokenCost: 2,
    recommended: true,
    modes: ['single', 'combination'],
  },
  {
    id: 'flux-kontext-max',
    technicalName: 'Flux Kontext Max',
    friendlyName: 'Ultra Quality',
    description: 'Highest quality, detailed results',
    provider: 'BFL',
    quality: 5,
    speed: 3,
    tokenCost: 3,
    modes: ['single', 'combination'],
  },

  // === SINGLE MODE MODELS ===
  {
    id: 'nano-banana',
    technicalName: 'Nano Banana',
    friendlyName: 'Quick Edit',
    description: 'Fast edits for simple changes',
    provider: 'Banana',
    quality: 3,
    speed: 5,
    tokenCost: 1,
    modes: ['single'],
  },
  {
    id: 'nano-banana-pro',
    technicalName: 'Nano Banana Pro',
    friendlyName: 'HD Quick Edit',
    description: '2K resolution, fast processing',
    provider: 'Banana',
    quality: 4,
    speed: 4,
    tokenCost: 2,
    modes: ['single'],
  },
  {
    id: 'ghibli',
    technicalName: 'Ghibli Style',
    friendlyName: 'Anime Style',
    description: 'Transform to anime art style',
    provider: 'Custom',
    quality: 4,
    speed: 3,
    tokenCost: 2,
    modes: ['single'],
  },

  // === COMBINATION MODE MODELS ===
  {
    id: 'seedream-v4-edit',
    technicalName: 'Seedream 4.0',
    friendlyName: 'Creative Blend',
    description: 'Excellent for natural compositing',
    provider: 'Seedream',
    quality: 4,
    speed: 3,
    tokenCost: 3,
    modes: ['combination'],
  },
  {
    id: 'gpt-4o-image',
    technicalName: 'GPT-4o Vision',
    friendlyName: 'Premium Vision',
    description: 'Best understanding of context',
    provider: 'OpenAI',
    quality: 5,
    speed: 2,
    tokenCost: 4,
    isPremium: true,
    modes: ['combination'],
  },
]

/**
 * Get models filtered by studio mode
 */
export function getModelsForMode(mode: StudioMode): AIModelDefinition[] {
  return AI_MODELS.filter(model => model.modes.includes(mode))
}

/**
 * Get a specific model by ID
 */
export function getModelById(id: string): AIModelDefinition | undefined {
  return AI_MODELS.find(model => model.id === id)
}

/**
 * Get the recommended model for a specific mode
 */
export function getRecommendedModel(mode: StudioMode): AIModelDefinition | undefined {
  const models = getModelsForMode(mode)
  return models.find(m => m.recommended) || models[0]
}

/**
 * Get default model ID for a mode
 */
export function getDefaultModelId(mode: StudioMode): string {
  const recommended = getRecommendedModel(mode)
  return recommended?.id || 'flux-kontext-pro'
}

/**
 * Format display name: "Friendly Name (Technical Name)"
 */
export function formatModelDisplayName(model: AIModelDefinition): string {
  return `${model.friendlyName} (${model.technicalName})`
}

/**
 * Get quality rating as visual dots
 */
export function getQualityDots(rating: number): string {
  return '●'.repeat(rating) + '○'.repeat(5 - rating)
}

/**
 * Get speed rating as visual dots
 */
export function getSpeedDots(rating: number): string {
  return '●'.repeat(rating) + '○'.repeat(5 - rating)
}
