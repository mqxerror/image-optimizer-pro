export const AI_MODELS = [
  {
    id: 'flux-kontext-pro',
    name: 'Flux Kontext Pro',
    description: 'Professional image editing',
    price: '$0.04/image',
    recommended: true,
    badge: 'RECOMMENDED' as string | undefined
  },
  {
    id: 'flux-kontext-max',
    name: 'Flux Kontext Max',
    description: 'Maximum quality for hero shots',
    price: '$0.08/image',
    recommended: false,
    badge: undefined as string | undefined
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    description: 'Fast & affordable bulk processing',
    price: '$0.02/image',
    recommended: false,
    badge: 'BUDGET' as string | undefined
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Best quality, 4K support',
    price: '$0.09-0.12/image',
    recommended: false,
    badge: undefined as string | undefined
  },
  {
    id: 'ghibli',
    name: 'Ghibli Style',
    description: 'Artistic transformation',
    price: '$0.05/image',
    recommended: false,
    badge: 'CREATIVE' as string | undefined
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'Creative generation',
    price: '$0.10/image',
    recommended: false,
    badge: 'CREATIVE' as string | undefined
  },
]

export const RESOLUTIONS = ['2K', '4K'] as const

export const WIZARD_STEPS = [
  { id: 1, label: 'Basics', description: 'Name & source folder' },
  { id: 2, label: 'AI Settings', description: 'Model & resolution' },
  { id: 3, label: 'Prompt', description: 'Template or custom' },
  { id: 4, label: 'Review', description: 'Confirm & create' },
] as const

export const FIELD_TOOLTIPS = {
  name: {
    title: 'Project Name',
    description: 'A descriptive name helps you find this project later. Examples: "Spring 2024 Rings", "Client ABC Order"'
  },
  source_folder: {
    title: 'Source Folder',
    description: 'Select the Google Drive folder containing your jewelry images. All JPG, PNG, and WEBP files will be available for processing.'
  },
  ai_model: {
    title: 'AI Model',
    description: 'Different models produce different results. Flux Kontext Pro is best for most jewelry photos. Use Max for hero shots that need extra detail.'
  },
  resolution: {
    title: 'Output Resolution',
    description: '2K (2048px) works for most e-commerce. 4K (4096px) is better for zoom or print. Note: 4K costs 2x tokens.'
  },
  trial_count: {
    title: 'Trial Images',
    description: 'Process a few test images first to verify settings before the full batch. This saves tokens if adjustments are needed.'
  },
  template: {
    title: 'Prompt Template',
    description: 'Pre-written prompts optimized for specific use cases. Ensures consistent results across all images.'
  },
  custom_prompt: {
    title: 'Custom Prompt',
    description: 'Write your own instructions. Be specific about background, lighting, and what to preserve.'
  }
} as const
