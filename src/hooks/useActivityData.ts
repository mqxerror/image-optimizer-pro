import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'

export type ActivitySource = 'queue' | 'studio' | 'combination' | 'history'
export type ActivityStatus = 'pending' | 'processing' | 'success' | 'failed' | 'timeout'
export type PipelineStep = 'queued' | 'processing' | 'complete' | 'failed'

export interface ActivityItem {
  id: string
  source: ActivitySource
  sourceId: string
  fileName: string | null
  imageUrl: string | null
  resultUrl: string | null
  thumbnailUrl: string | null
  status: ActivityStatus
  pipelineStep: PipelineStep
  aiModel: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
  processingTimeMs: number | null
  // For display
  stepNumber: 1 | 2 | 3
  projectName?: string | null
  // Extended fields for detail modal
  prompt?: string | null
  tokensUsed?: number | null
  settingsSnapshot?: any | null
  // Combination-specific
  modelImageUrl?: string | null
  jewelryImageUrl?: string | null
  positionY?: number | null
  scale?: number | null
  rotation?: number | null
  blendIntensity?: number | null
  lightingMatch?: number | null
}

export type ActivityFilter = 'all' | 'queued' | 'processing' | 'complete' | 'failed'

interface UseActivityDataOptions {
  filter?: ActivityFilter
  limit?: number
}

function mapStatusToPipelineStep(status: string): PipelineStep {
  switch (status) {
    case 'queued':
    case 'pending':
      return 'queued'
    case 'processing':
    case 'submitted':
    case 'optimizing':
      return 'processing'
    case 'success':
    case 'completed':
      return 'complete'
    case 'failed':
    case 'timeout':
    case 'error':
      return 'failed'
    default:
      return 'queued'
  }
}

function mapPipelineStepToNumber(step: PipelineStep): 1 | 2 | 3 {
  switch (step) {
    case 'queued':
      return 1
    case 'processing':
      return 2
    case 'complete':
    case 'failed':
      return 3
  }
}

export function useActivityData(options: UseActivityDataOptions = {}) {
  const { filter = 'all', limit = 50 } = options
  const { organization } = useAuthStore()

  // Always fetch ALL items - stats need the full picture
  const query = useQuery({
    queryKey: queryKeys.activity.data(organization?.id ?? '', limit),
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!organization) return []

      const items: ActivityItem[] = []

      // Fetch from multiple sources in parallel
      const [queueResult, studioResult, combinationResult, historyResult] = await Promise.all([
        // 1. Processing Queue (active items)
        supabase
          .from('processing_queue')
          .select('*, projects(name)')
          .eq('organization_id', organization.id)
          .neq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(limit),

        // 2. Studio Generations
        (supabase as any)
          .from('studio_generations')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(limit),

        // 3. Combination Jobs
        (supabase as any)
          .from('combination_jobs')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(limit),

        // 4. Processing History (completed from projects)
        supabase
          .from('processing_history')
          .select('*, projects(name)')
          .eq('organization_id', organization.id)
          .order('completed_at', { ascending: false })
          .limit(limit),
      ])

      // Process queue items
      if (queueResult.data) {
        for (const item of queueResult.data) {
          // Normalize status for consistent UI
          let status = item.status
          if (status === 'completed') status = 'success'
          else if (status === 'timeout' || status === 'error') status = 'failed'
          const pipelineStep = mapStatusToPipelineStep(status)
          items.push({
            id: `queue-${item.id}`,
            source: 'queue',
            sourceId: item.id,
            fileName: item.file_name,
            imageUrl: item.file_url || item.thumbnail_url,
            resultUrl: null,
            thumbnailUrl: item.thumbnail_url,
            status: status as ActivityStatus,
            pipelineStep,
            aiModel: item.ai_model,
            errorMessage: item.error_message,
            createdAt: item.started_at,
            completedAt: null,
            processingTimeMs: null,
            stepNumber: mapPipelineStepToNumber(pipelineStep),
            projectName: (item.projects as any)?.name,
          })
        }
      }

      // Process studio generations
      if (studioResult.data) {
        for (const item of studioResult.data) {
          // Normalize status for consistent UI
          let status = item.status
          if (status === 'completed') status = 'success'
          else if (status === 'timeout' || status === 'error') status = 'failed'
          const pipelineStep = mapStatusToPipelineStep(status)
          items.push({
            id: `studio-${item.id}`,
            source: 'studio',
            sourceId: item.id,
            fileName: item.original_file_name,
            imageUrl: item.original_url,
            resultUrl: item.result_url,
            thumbnailUrl: item.original_url,
            status: status as ActivityStatus,
            pipelineStep,
            aiModel: item.ai_model,
            errorMessage: item.error_message,
            createdAt: item.created_at,
            completedAt: item.result_url ? item.created_at : null,
            processingTimeMs: item.processing_time_sec ? item.processing_time_sec * 1000 : null,
            stepNumber: mapPipelineStepToNumber(pipelineStep),
            // Extended fields
            prompt: item.final_prompt || item.custom_prompt,
            tokensUsed: item.tokens_used,
            settingsSnapshot: item.settings_snapshot,
          })
        }
      }

      // Process combination jobs
      if (combinationResult.data) {
        for (const item of combinationResult.data) {
          // Normalize status for consistent UI
          let status = item.status
          if (status === 'completed') status = 'success'
          else if (status === 'timeout' || status === 'error') status = 'failed'
          const pipelineStep = mapStatusToPipelineStep(status)
          items.push({
            id: `combination-${item.id}`,
            source: 'combination',
            sourceId: item.id,
            fileName: 'Combination',
            imageUrl: item.model_image_url,
            resultUrl: item.result_url,
            thumbnailUrl: item.result_thumbnail_url || item.model_image_url,
            status: status as ActivityStatus,
            pipelineStep,
            aiModel: item.ai_model,
            errorMessage: item.error_message,
            createdAt: item.created_at,
            completedAt: item.updated_at,
            processingTimeMs: item.processing_time_sec ? item.processing_time_sec * 1000 : null,
            stepNumber: mapPipelineStepToNumber(pipelineStep),
            // Extended fields for combinations
            prompt: item.generated_prompt,
            tokensUsed: item.tokens_used,
            modelImageUrl: item.model_image_url,
            jewelryImageUrl: item.jewelry_image_url,
            positionY: item.position_y,
            scale: item.scale,
            rotation: item.rotation,
            blendIntensity: item.blend_intensity,
            lightingMatch: item.lighting_match,
          })
        }
      }

      // Process history items
      if (historyResult.data) {
        for (const item of historyResult.data) {
          const status = item.status === 'success' ? 'success' : 'failed'
          const pipelineStep = status === 'success' ? 'complete' : 'failed'
          items.push({
            id: `history-${item.id}`,
            source: 'history',
            sourceId: item.id,
            fileName: item.file_name,
            imageUrl: item.original_url,
            resultUrl: item.optimized_url,
            thumbnailUrl: item.original_url,
            status: status as ActivityStatus,
            pipelineStep,
            aiModel: item.ai_model,
            errorMessage: item.error_message,
            createdAt: item.started_at || item.completed_at,
            completedAt: item.completed_at,
            processingTimeMs: item.processing_time_sec ? item.processing_time_sec * 1000 : null,
            stepNumber: mapPipelineStepToNumber(pipelineStep),
            projectName: (item.projects as any)?.name,
          })
        }
      }

      // Sort by created date (newest first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Return all items - filtering happens after stats are computed
      return items
    },
    enabled: !!organization,
    refetchInterval: 5000, // Poll every 5 seconds for live updates
  })

  // Set up realtime subscriptions
  useEffect(() => {
    if (!organization) return

    // Subscribe to changes in relevant tables
    const channel = supabase
      .channel('activity-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processing_queue', filter: `organization_id=eq.${organization.id}` },
        () => query.refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'studio_generations', filter: `organization_id=eq.${organization.id}` },
        () => query.refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'combination_jobs', filter: `organization_id=eq.${organization.id}` },
        () => query.refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processing_history', filter: `organization_id=eq.${organization.id}` },
        () => query.refetch()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization, query])

  // Compute stats from ALL items (unfiltered)
  const allItems = query.data || []
  const queuedItems = allItems.filter(i => i.pipelineStep === 'queued')
  const processingItems = allItems.filter(i => i.pipelineStep === 'processing')
  const completedItems = allItems.filter(i => i.pipelineStep === 'complete')
  const failedItems = allItems.filter(i => i.pipelineStep === 'failed')

  // Apply filter for display items
  let filteredItems = allItems
  if (filter === 'queued') {
    filteredItems = queuedItems
  } else if (filter === 'processing') {
    filteredItems = processingItems
  } else if (filter === 'complete') {
    filteredItems = completedItems
  } else if (filter === 'failed') {
    filteredItems = failedItems
  }

  // Apply limit to filtered items
  const items = filteredItems.slice(0, limit)

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats: {
      total: allItems.length,
      queued: queuedItems.length,
      processing: processingItems.length,
      completed: completedItems.length,
      failed: failedItems.length,
    },
  }
}
