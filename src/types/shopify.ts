// Shopify Integration Types

export interface ShopifyStore {
  id: string
  user_id: string
  shop_domain: string
  shop_name: string | null
  status: 'active' | 'paused' | 'disconnected'
  scopes: string[]
  settings: ShopifyStoreSettings
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface ShopifyStoreSettings {
  optimization_mode: 'manual' | 'preview' | 'auto' | 'scheduled'
  schedule: {
    frequency: 'daily' | 'weekly'
    time: string
    timezone: string
  } | null
  auto_optimize_new: boolean
  default_preset_type: 'template' | 'studio_preset' | null
  default_preset_id: string | null
  notify_on_new_products: boolean
  notify_on_completion: boolean
}

export interface ShopifySyncJob {
  id: string
  store_id: string
  shop_domain?: string
  shop_name?: string
  trigger_type: 'manual' | 'webhook' | 'scheduled'
  preset_type: 'template' | 'studio_preset'
  preset_id: string | null
  status: ShopifyJobStatus
  product_count: number
  image_count: number
  processed_count: number
  pushed_count: number
  failed_count: number
  tokens_used: number
  retry_count: number
  max_retries: number
  last_error: string | null
  next_retry_at: string | null
  approved_at: string | null
  completed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  preview_images?: string[] // Up to 4 image URLs for thumbnail preview
}

export type ShopifyJobStatus =
  | 'pending'
  | 'processing'
  | 'awaiting_approval'
  | 'approved'
  | 'pushing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ShopifyImage {
  id: string
  job_id: string
  shopify_product_id: string
  shopify_image_id: string
  product_title: string | null
  image_position: number | null
  original_url: string
  original_width: number | null
  original_height: number | null
  optimized_url: string | null
  optimized_storage_path: string | null
  status: ShopifyImageStatus
  error_message: string | null
  tokens_used: number | null
  processing_time_ms: number | null
  push_attempts: number
  last_push_error: string | null
  pushed_at: string | null
  created_at: string
  updated_at: string
}

export type ShopifyImageStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'approved'
  | 'pushing'
  | 'pushed'
  | 'failed'
  | 'skipped'

export interface ShopifyProduct {
  id: string
  title: string
  product_type: string
  vendor: string
  tags: string[]
  status: string
  image_count: number
  images: ShopifyProductImage[]
}

export interface ShopifyProductImage {
  id: string
  src: string
  position: number
  alt: string | null
  width: number
  height: number
}

export interface ShopifyCollection {
  id: number
  title: string
  handle: string
  products_count: number
}

export interface ShopifyJobStats {
  total: number
  queued: number
  processing: number
  ready: number
  approved: number
  pushing: number
  pushed: number
  failed: number
  skipped: number
}

export interface ShopifyJobWithImages extends ShopifySyncJob {
  images: ShopifyImage[]
  stats: ShopifyJobStats
}

// API Response Types
export interface ShopifyProductsResponse {
  products: ShopifyProduct[]
  pagination: {
    next_page: string | null
    prev_page: string | null
    has_next: boolean
    has_prev: boolean
  }
}

export interface ShopifyCollectionsResponse {
  collections: ShopifyCollection[]
}

export interface ShopifyProductTypesResponse {
  product_types: string[]
}

export interface CreateJobRequest {
  store_id: string
  preset_type: 'template' | 'studio_preset'
  preset_id: string | null  // null when using custom prompt
  ai_model?: string  // Optional AI model override (defaults to flux-kontext-pro)
  custom_prompt?: string  // Custom prompt when not using a template
  products: Array<{
    id: string
    title: string
    images: Array<{
      id: string
      src: string
      position: number
      width?: number
      height?: number
    }>
  }>
}

export interface CreateJobResponse {
  success: boolean
  job_id: string
  product_count: number
  image_count: number
  expires_at: string
}
