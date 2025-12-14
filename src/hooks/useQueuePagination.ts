import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export interface QueueItem {
  id: string
  organization_id: string
  project_id: string | null
  project_name: string | null
  file_id: string
  file_name: string | null
  file_url: string | null
  status: string
  progress: number
  task_id: string | null
  generated_prompt: string | null
  error_message: string | null
  retry_count: number
  tokens_reserved: number
  folder_path: string | null
  folder_id: string | null
  batch_id: string | null
  ai_model: string | null
  started_at: string
  last_updated: string
  total_count: number
}

export interface QueueFilters {
  status?: string | null
  projectId?: string | null
  folderPath?: string | null
  search?: string | null
}

export interface UseQueuePaginationOptions {
  pageSize?: number
  filters?: QueueFilters
}

export interface QueueStats {
  total_count: number
  queued_count: number
  processing_count: number
  failed_count: number
}

export interface FolderStats {
  folder_path: string
  folder_id: string | null
  total_count: number
  queued_count: number
  processing_count: number
  failed_count: number
  completed_pct: number
}

export function useQueuePagination(
  page: number = 1,
  options: UseQueuePaginationOptions = {}
) {
  const { organization } = useAuthStore()
  const { pageSize = 50, filters = {} } = options

  return useQuery({
    queryKey: ['queue-page', organization?.id, page, pageSize, filters],
    queryFn: async () => {
      if (!organization) return { items: [], totalCount: 0 }

      const { data, error } = await supabase.rpc('get_queue_page', {
        p_organization_id: organization.id,
        p_page_size: pageSize,
        p_page: page,
        p_status: filters.status || undefined,
        p_project_id: filters.projectId || undefined,
        p_folder_path: filters.folderPath || undefined,
        p_search: filters.search || undefined
      })

      if (error) throw error

      const items = (data || []) as QueueItem[]
      const totalCount = items.length > 0 ? items[0].total_count : 0

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    },
    enabled: !!organization,
    staleTime: 2000 // Consider data fresh for 2 seconds
  })
}

export function useQueueStats() {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: ['queue-stats', organization?.id],
    queryFn: async () => {
      if (!organization) return null

      const { data, error } = await supabase.rpc('get_queue_stats', {
        p_organization_id: organization.id
      })

      if (error) throw error

      // RPC returns array, get first item
      const stats = Array.isArray(data) ? data[0] : data
      return stats as QueueStats
    },
    enabled: !!organization,
    refetchInterval: 5000 // Update stats every 5 seconds
  })
}

export function useQueueFolderStats() {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: ['queue-folder-stats', organization?.id],
    queryFn: async () => {
      if (!organization) return []

      const { data, error } = await supabase.rpc('get_queue_folder_stats', {
        p_organization_id: organization.id
      })

      if (error) throw error

      return (data || []) as FolderStats[]
    },
    enabled: !!organization,
    staleTime: 10000 // Folder stats don't change as often
  })
}
