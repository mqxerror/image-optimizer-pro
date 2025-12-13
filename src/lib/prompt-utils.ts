/**
 * Shared prompt generation utilities
 * Ensures consistent prompt output across the application
 */

import { buildPromptFromSettings } from '@/components/studio/PromptBuilder'
import { presetToSettings, type StudioPreset } from '@/types/studio'

export interface TemplateData {
  base_prompt: string | null
  style: string | null
  background: string | null
  lighting: string | null
}

/**
 * Generate a prompt from a template
 * Used consistently in: EditProjectDialog, OverviewTab, process-image edge function
 */
export function generateTemplatePrompt(template: TemplateData): string {
  const parts = [template.base_prompt]
  if (template.style) parts.push(`Style: ${template.style}`)
  if (template.background) parts.push(`Background: ${template.background}`)
  if (template.lighting) parts.push(`Lighting: ${template.lighting}`)
  return parts.filter(Boolean).join('. ')
}

/**
 * Generate a prompt from a studio preset using the full settings
 * This reuses the same buildPromptFromSettings function used in the Studio page
 * to ensure consistency
 */
export function generateStudioPresetPrompt(preset: StudioPreset): string {
  const settings = presetToSettings(preset)
  return buildPromptFromSettings(settings)
}

/**
 * Get the prompt mode label
 */
export function getPromptModeLabel(mode: 'template' | 'preset' | 'custom' | null | undefined): string {
  switch (mode) {
    case 'template':
      return 'Template'
    case 'preset':
      return 'Studio Preset'
    case 'custom':
      return 'Custom Prompt'
    default:
      return 'Custom Prompt'
  }
}

// Re-export StudioPreset type for consumers
export type { StudioPreset }
