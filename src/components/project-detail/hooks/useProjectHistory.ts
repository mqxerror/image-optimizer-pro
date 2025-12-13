import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProcessingHistoryItem } from '@/types/database'

const PAGE_SIZE = 24 // 4x6 grid

export type StatusFilter = 'all' | 'success' | 'failed'

export interface ProjectHistoryOptions {
  statusFilter?: StatusFilter
}

export function useProjectHistory(projectId: string | undefined, options: ProjectHistoryOptions = {}) {
  const { statusFilter = 'all' } = options

  return useInfiniteQuery({
    queryKey: ['project-history', projectId, statusFilter],
    queryFn: async ({ pageParam = 0 }) => {
      if (!projectId) return { data: [], nextPage: undefined }

      let query = supabase
        .from('processing_history')
        .select('id, file_name, original_url, optimized_url, status, ai_model, tokens_used, processing_time_sec, error_message, completed_at')
        .eq('project_id', projectId)
        .order('completed_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data as ProcessingHistoryItem[],
        nextPage: data?.length === PAGE_SIZE ? pageParam + 1 : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!projectId,
  })
}

// Helper to flatten all pages into a single array
export function flattenHistoryPages(pages: { data: ProcessingHistoryItem[] }[] | undefined) {
  if (!pages) return []
  return pages.flatMap((page) => page.data)
}
