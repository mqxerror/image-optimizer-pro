import { z } from 'zod'
import { RESOLUTIONS } from './constants'

export const wizardSchema = z.object({
  // Step 1: Project Basics
  name: z.string().min(2, 'Name must be at least 2 characters'),
  input_folder_id: z.string().optional(),
  input_folder_name: z.string().optional(),
  input_folder_url: z.string().optional(),

  // Step 2: AI Settings
  ai_model: z.string(),
  resolution: z.enum(RESOLUTIONS),
  trial_count: z.number().min(0).max(10),

  // Step 3: Prompt Configuration
  prompt_mode: z.enum(['template', 'preset', 'custom']),
  template_id: z.string().optional(),
  studio_preset_id: z.string().optional(),
  custom_prompt: z.string().optional(),
})

export type WizardFormData = z.infer<typeof wizardSchema>

export interface WizardStep {
  id: number
  label: string
  description: string
}

export interface SelectedFolder {
  id: string
  name: string
  url: string
  imageCount?: number
}
