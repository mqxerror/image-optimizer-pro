import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface ProjectQueueStats {
  queued: number
  processing: number
  failed: number
  total: number
}

export function useProjectQueueStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-queue-stats', projectId],
    queryFn: async (): Promise<ProjectQueueStats> => {
      if (!projectId) return { queued: 0, processing: 0, failed: 0, total: 0 }

      const { data, error } = await supabase
        .from('processing_queue')
        .select('status')
        .eq('project_id', projectId)

      if (error) throw error

      const stats = {
        queued: data?.filter(i => i.status === 'queued').length || 0,
        processing: data?.filter(i => ['processing', 'optimizing', 'submitted'].includes(i.status)).length || 0,
        failed: data?.filter(i => i.status === 'failed').length || 0,
        total: data?.length || 0
      }

      return stats
    },
    enabled: !!projectId,
    refetchInterval: 5000 // Refresh every 5 seconds
  })
}

// Hook for processing queued items
export function useProcessProjectQueue(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (limit?: number) => {
      if (!projectId) throw new Error('No project ID')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Get queued items for this project
      const { data: queueItems, error } = await supabase
        .from('processing_queue')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'queued')
        .limit(limit || 10)

      if (error) throw error
      if (!queueItems || queueItems.length === 0) {
        throw new Error('No queued items to process')
      }

      // Fire-and-forget: Start all processing requests without waiting for completion
      // The queue status will be updated via polling (refetchInterval: 5000)
      queueItems.forEach((item) => {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ queue_item_id: item.id })
          }
        ).catch(err => console.error('Processing error for', item.id, err))
      })

      return { total: queueItems.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })

      toast({
        title: 'Processing started',
        description: `${data.total} images queued for processing`
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to start processing',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// Hook for running trial batch
export function useRunTrialBatch(projectId: string | undefined, trialCount: number) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Get the first N queued items for trial
      const { data: queueItems, error } = await supabase
        .from('processing_queue')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'queued')
        .order('started_at', { ascending: true })
        .limit(trialCount)

      if (error) throw error
      if (!queueItems || queueItems.length === 0) {
        throw new Error('No queued items to process for trial')
      }

      // Mark project as active and set trial in progress
      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId)

      // Fire-and-forget: Start all processing requests without waiting for completion
      // The trial_completed count will be updated by the edge function
      queueItems.forEach((item) => {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ queue_item_id: item.id })
          }
        ).catch(err => console.error('Trial processing error for', item.id, err))
      })

      return { total: queueItems.length, trialCount }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })

      toast({
        title: 'Trial batch started',
        description: `Processing ${data.total} trial images`
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to start trial batch',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// Hook for retrying failed items
export function useRetryProjectFailed(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')

      const { data, error } = await supabase
        .from('processing_queue')
        .update({
          status: 'queued',
          error_message: null,
          retry_count: 0,
          progress: 0
        })
        .eq('project_id', projectId)
        .eq('status', 'failed')
        .select('id')

      if (error) throw error

      return { count: data?.length || 0 }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })

      toast({
        title: 'Items requeued',
        description: `${data.count} failed items moved back to queue`
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to retry items',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// Hook for resetting trial
export function useResetTrial(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')

      // Reset trial_completed to 0
      const { error } = await supabase
        .from('projects')
        .update({ trial_completed: 0 })
        .eq('id', projectId)

      if (error) throw error

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] })

      toast({
        title: 'Trial reset',
        description: 'You can now run a new trial batch'
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to reset trial',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}
