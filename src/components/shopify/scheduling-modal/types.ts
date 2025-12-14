// Automation configuration for a store
export interface AutomationConfig {
  id: string
  store_id: string
  user_id: string

  // Master toggle
  is_enabled: boolean

  // Webhook trigger
  webhook_enabled: boolean
  webhook_secret?: string

  // Schedule trigger
  schedule_enabled: boolean
  schedule_frequency: 'daily' | 'weekly' | 'twice_daily'
  schedule_time: string // HH:MM format
  schedule_days: string[]
  schedule_timezone: string
  schedule_next_run_at?: string
  schedule_last_run_at?: string

  // Safety: Approval requirement
  require_approval: boolean
  approval_threshold: number
  batches_completed: number

  // Safety: Daily limits
  daily_limit: number
  daily_processed: number
  daily_reset_at?: string

  // Safety: Auto-pause
  auto_pause_enabled: boolean
  auto_pause_threshold: number
  is_paused: boolean
  paused_reason?: string
  paused_at?: string

  // Default settings
  default_preset_id?: string
  default_ai_model: string
  default_quality: number
  default_format: string

  created_at: string
  updated_at: string
}

// Queue item for pending products
export interface QueueItem {
  id: string
  store_id: string
  user_id: string

  // Product info
  shopify_product_id: string
  product_title?: string
  product_handle?: string
  image_count: number
  thumbnail_url?: string

  // Queue metadata
  source: 'webhook' | 'scheduled' | 'manual'
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

  // Processing info
  job_id?: string
  error_message?: string

  added_at: string
  processed_at?: string
}

// Excluded product
export interface ExcludedProduct {
  id: string
  store_id: string
  user_id: string

  shopify_product_id: string
  product_title?: string
  product_handle?: string
  thumbnail_url?: string

  reason?: string
  excluded_at: string
}

// Automation run history
export interface AutomationRun {
  id: string
  store_id: string
  user_id: string
  config_id?: string

  trigger_type: 'webhook' | 'scheduled' | 'manual' | 'test'

  products_queued: number
  images_queued: number
  images_processed: number
  images_failed: number

  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
  error_message?: string
  success_rate: number

  started_at: string
  completed_at?: string
}

// Test run for trust building
export interface TestRun {
  id: string
  store_id: string
  user_id: string
  run_id?: string

  test_count: number
  selected_product_ids?: string[]

  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: TestRunResults

  approved?: boolean
  feedback?: string

  created_at: string
  completed_at?: string
}

export interface TestRunResults {
  processed: TestRunImage[]
  failed: TestRunImage[]
  summary: {
    total: number
    successful: number
    failed: number
    avg_size_reduction: number
  }
}

export interface TestRunImage {
  product_id: string
  product_title: string
  image_url: string
  original_url?: string
  optimized_url?: string
  size_before?: number
  size_after?: number
  error?: string
}

// Form state for editing config
export interface AutomationConfigForm {
  is_enabled: boolean

  webhook_enabled: boolean

  schedule_enabled: boolean
  schedule_frequency: 'daily' | 'weekly' | 'twice_daily'
  schedule_time: string
  schedule_days: string[]
  schedule_timezone: string

  require_approval: boolean
  approval_threshold: number

  daily_limit: number

  auto_pause_enabled: boolean
  auto_pause_threshold: number

  default_ai_model: string
  default_quality: number
  default_format: string
}

// Aggregated stats for display
export interface AutomationStats {
  totalRuns: number
  successRate: number
  totalImagesProcessed: number
  recentRuns: AutomationRun[]
  isApprovalComplete: boolean
}

// Queue filters
export interface QueueFilters {
  source?: 'webhook' | 'scheduled' | 'manual' | null
  priority?: 'high' | 'normal' | 'low' | null
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | null
  search?: string
}

// Props for modal
export interface AdvancedSchedulingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
}

// Props for panels
export interface SafetyControlsPanelProps {
  config: AutomationConfig | null
  form: AutomationConfigForm
  onChange: (updates: Partial<AutomationConfigForm>) => void
  stats: AutomationStats | null
}

export interface TriggersPanelProps {
  form: AutomationConfigForm
  onChange: (updates: Partial<AutomationConfigForm>) => void
  webhookSecret?: string
}

export interface PendingQueuePanelProps {
  storeId: string
  items: QueueItem[]
  isLoading: boolean
  filters: QueueFilters
  onFiltersChange: (filters: QueueFilters) => void
  onPriorityChange: (ids: string[], priority: 'high' | 'normal' | 'low') => void
  onExclude: (ids: string[]) => void
  onRemove: (ids: string[]) => void
  onProcess: (ids: string[]) => void
}

export interface AutomationHistoryPanelProps {
  runs: AutomationRun[]
  isLoading: boolean
  stats: AutomationStats | null
}

export interface ExcludedProductsPanelProps {
  storeId: string
  products: ExcludedProduct[]
  isLoading: boolean
  onRestore: (ids: string[]) => void
}

export interface TestRunCardProps {
  storeId: string
  config: AutomationConfig | null
}

// API request/response types
export interface AutomationConfigUpdateRequest {
  action: 'get' | 'update' | 'reset'
  store_id: string
  config?: Partial<AutomationConfigForm>
}

export interface QueueActionRequest {
  action: 'list' | 'add' | 'remove' | 'update_priority' | 'process' | 'skip'
  store_id: string
  product_ids?: string[]
  priority?: 'high' | 'normal' | 'low'
  filters?: QueueFilters
}

export interface ExcludeActionRequest {
  action: 'list' | 'add' | 'remove'
  store_id: string
  product_ids?: string[]
  reason?: string
}

export interface TestRunRequest {
  action: 'start' | 'get' | 'approve' | 'reject'
  store_id: string
  test_count?: number
  selected_product_ids?: string[]
  test_run_id?: string
  feedback?: string
}
