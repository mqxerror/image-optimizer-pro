import type { ShopifyProduct, ShopifyProductImage } from '@/types/shopify'

export interface FilterState {
  excludeModelImages: boolean
  imageType: 'all' | 'main_only' | 'variants_only'
  includeTags: string[]
  excludeTags: string[]
}

export interface FilterStats {
  totalProducts: number
  filteredProducts: number
  totalImages: number
  filteredImages: number
  modelImagesExcluded: number
  svgImagesSkipped: number
}

export interface FilteredImage {
  productId: string
  productTitle: string
  image: ShopifyProductImage
  isModel: boolean
  isSvg: boolean
  isExcluded: boolean
  excludeReason?: 'model' | 'svg' | 'tag' | 'position'
}

export interface OptimizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: ShopifyProduct[]
  selectedProductIds: Set<string>
  templates: Array<{ id: string; name: string }>
  onSubmit: (config: JobConfig) => Promise<void>
  isSubmitting?: boolean
}

export interface JobConfig {
  aiModel: string
  templateId: string | null
  customPrompt: string
  filteredImages: FilteredImage[]
  stats: FilterStats
}

// Helper to detect model/lifestyle images
export function isModelImage(image: { src: string; alt: string | null }): boolean {
  const modelKeywords = ['model', 'lifestyle', 'worn', 'wearing', 'person', 'woman', 'man', 'body', 'hand', 'finger', 'neck', 'ear']
  const srcLower = image.src.toLowerCase()
  const altLower = (image.alt || '').toLowerCase()
  return modelKeywords.some(keyword => srcLower.includes(keyword) || altLower.includes(keyword))
}

// Helper to check if image is SVG
export function isSvgImage(src: string): boolean {
  return src.toLowerCase().includes('.svg')
}
