import type { ShopifySyncJob, ShopifyJobStatus } from '@/types/shopify'

export interface JobsFilterState {
  search: string
  storeId: string | null
  statuses: ShopifyJobStatus[]
  dateRange: {
    from: Date | null
    to: Date | null
  }
}

export interface JobStatusCount {
  all: number
  active: number
  paused: number
  awaiting_approval: number
  completed: number
  failed: number
}

export type JobStatusTab = 'all' | 'active' | 'paused' | 'awaiting_approval' | 'completed' | 'failed'

export interface VisualJobCardProps {
  job: ShopifySyncJob
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  selectionMode?: boolean
  previewImages?: string[]
}

export interface BulkAction {
  id: string
  label: string
  icon: React.ReactNode
  variant?: 'default' | 'destructive'
  requiredStatuses: ShopifyJobStatus[]
}
