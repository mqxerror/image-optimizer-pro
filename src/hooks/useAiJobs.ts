import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useEffect } from 'react'

// AI Job types
export interface AiJob {
  id: string
  organization_id: string
  job_type: 'optimize' | 'combine' | 'generate'
  source: 'studio' | 'queue' | 'combination' | 'api'
  source_id: string | null
  provider: string
  ai_model: string
  task_id: string | null
  callback_received: boolean
  input_url: string
  input_url_2: string | null
  prompt: string | null
  settings: Record<string, any> | null
  status: 'pending' | 'submitted' | 'processing' | 'success' | 'failed' | 'timeout' | 'cancelled'
  result_url: string | null
  error_message: string | null
  error_code: string | null
  created_at: string
  submitted_at: string | null
  callback_at: string | null
  completed_at: string | null
  processing_time_ms: number | null
  attempt_count: number
  max_attempts: number
  tokens_reserved: number
  tokens_used: number
  created_by: string | null
}

export interface AiJobStats {
  total_jobs: number
  successful_jobs: number
  failed_jobs: number
  pending_jobs: number
  success_rate: number | null
  avg_processing_time_ms: number | null
  total_tokens_used: number
  jobs_by_model: Record<string, number>
  jobs_by_source: Record<string, number>
  jobs_by_day: Record<string, number>
}

export interface ActiveJob {
  job_id: string
  job_type: string
  source: string
  source_id: string | null
  ai_model: string
  status: string
  input_url: string
  created_at: string
  submitted_at: string | null
  elapsed_seconds: number
  attempt_count: number
}

// Hook for getting job statistics
export function useAiJobStats(days: number = 7) {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: ['ai-job-stats', organization?.id, days],
    queryFn: async () => {
      if (!organization) return null

      const { data, error } = await supabase.rpc('get_ai_job_stats', {
        p_org_id: organization.id,
        p_days: days
      })

      if (error) throw error
      return data as AiJobStats
    },
    enabled: !!organization,
    staleTime: 30000 // Cache for 30 seconds
  })
}

// Hook for getting active (in-progress) jobs
export function useActiveJobs() {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: ['active-jobs', organization?.id],
    queryFn: async () => {
      if (!organization) return []

      const { data, error } = await supabase.rpc('get_active_jobs', {
        p_org_id: organization.id
      })

      if (error) throw error
      return (data || []) as ActiveJob[]
    },
    enabled: !!organization,
    refetchInterval: 3000 // Poll every 3 seconds for active jobs
  })
}

// Hook for real-time subscription to job updates
export function useAiJobsRealtime(options?: {
  onJobCompleted?: (job: AiJob) => void
  onJobFailed?: (job: AiJob) => void
}) {
  const { organization } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!organization) return

    const channel = supabase
      .channel(`ai-jobs-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_jobs',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['ai-job-stats'] })
          queryClient.invalidateQueries({ queryKey: ['active-jobs'] })
          queryClient.invalidateQueries({ queryKey: ['ai-jobs'] })

          // Also invalidate source-specific queries
          const job = payload.new as AiJob
          if (job?.source === 'studio') {
            queryClient.invalidateQueries({ queryKey: ['studio-generations'] })
          } else if (job?.source === 'queue') {
            queryClient.invalidateQueries({ queryKey: ['queue-page'] })
            queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
          } else if (job?.source === 'combination') {
            queryClient.invalidateQueries({ queryKey: ['combination-jobs'] })
          }

          // Callback for completed jobs
          if (payload.eventType === 'UPDATE' && job) {
            if (job.status === 'success') {
              options?.onJobCompleted?.(job)
            } else if (job.status === 'failed' || job.status === 'timeout') {
              options?.onJobFailed?.(job)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization?.id, queryClient, options])
}

// Hook for listing jobs with pagination
export function useAiJobs(options?: {
  page?: number
  pageSize?: number
  status?: string
  source?: string
  aiModel?: string
}) {
  const { organization } = useAuthStore()
  const { page = 1, pageSize = 20, status, source, aiModel } = options || {}

  return useQuery({
    queryKey: ['ai-jobs', organization?.id, page, pageSize, status, source, aiModel],
    queryFn: async () => {
      if (!organization) return { jobs: [], total: 0 }

      let query = supabase
        .from('ai_jobs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (status) query = query.eq('status', status)
      if (source) query = query.eq('source', source)
      if (aiModel) query = query.eq('ai_model', aiModel)

      const start = (page - 1) * pageSize
      query = query.range(start, start + pageSize - 1)

      const { data, error, count } = await query

      if (error) throw error

      return {
        jobs: (data || []) as AiJob[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    },
    enabled: !!organization,
    staleTime: 5000
  })
}

// Hook for getting a single job by ID
export function useAiJob(jobId: string | null) {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: ['ai-job', jobId],
    queryFn: async () => {
      if (!jobId || !organization) return null

      const { data, error } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('organization_id', organization.id)
        .single()

      if (error) throw error
      return data as AiJob
    },
    enabled: !!jobId && !!organization
  })
}

// Hook for cancelling a job
export function useCancelJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('ai_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .in('status', ['pending', 'submitted', 'processing'])

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['active-jobs'] })
    }
  })
}

// Hook for retrying a failed job
export function useRetryJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      // Get the original job
      const { data: job, error: fetchError } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (fetchError || !job) throw new Error('Job not found')

      // Reset the job for retry
      const { error } = await supabase
        .from('ai_jobs')
        .update({
          status: 'pending',
          error_message: null,
          error_code: null,
          attempt_count: job.attempt_count + 1,
          callback_received: false,
          completed_at: null
        })
        .eq('id', jobId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['active-jobs'] })
    }
  })
}

// Hook for getting processing count (for badges)
export function useActiveJobsCount() {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: ['active-jobs-count', organization?.id],
    queryFn: async () => {
      if (!organization) return 0

      const { count, error } = await supabase
        .from('ai_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .in('status', ['pending', 'submitted', 'processing'])

      if (error) throw error
      return count || 0
    },
    enabled: !!organization,
    refetchInterval: 5000 // Poll every 5 seconds
  })
}

// Hook for triggering the check-ai-jobs function (fallback polling)
export function useCheckPendingJobs() {
  const { session } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-ai-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to check pending jobs')
      }

      return response.json()
    }
  })
}
