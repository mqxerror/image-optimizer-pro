import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import type { RealtimeChannel } from '@supabase/supabase-js'
import confetti from 'canvas-confetti' // UX-015: Celebration confetti

interface UseQueueRealtimeOptions {
  onItemCompleted?: (item: any) => void
  onItemFailed?: (item: any) => void
  onProjectCompleted?: (project: { id: string; name: string; total_images: number }) => void
  showToasts?: boolean // Show individual item toasts (processing failed, etc)
  showProjectCompletionToasts?: boolean // Show project completion toasts (defaults to true)
}

export function useQueueRealtime(options: UseQueueRealtimeOptions = {}) {
  const { organization } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const notifiedProjectsRef = useRef<Set<string>>(new Set())
  const {
    onItemCompleted,
    onItemFailed,
    onProjectCompleted,
    showToasts = true,
    showProjectCompletionToasts = true
  } = options

  // Check if project is completed after an image is processed
  const checkProjectCompletion = useCallback(async (projectId: string) => {
    // Skip if we've already notified for this project
    if (notifiedProjectsRef.current.has(projectId)) return

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, total_images, processed_images, status')
      .eq('id', projectId)
      .single()

    if (project && (project.processed_images || 0) >= (project.total_images || 0) && project.status === 'active') {
      // Mark as notified to avoid duplicate toasts
      notifiedProjectsRef.current.add(projectId)

      // Call callback if provided
      onProjectCompleted?.({ id: project.id, name: project.name, total_images: project.total_images || 0 })

      // Invalidate project queries
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] })

      if (showProjectCompletionToasts) {
        // UX-015: Trigger confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981']
        })

        // Add a second burst for extra celebration
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981']
          })
        }, 200)

        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981']
          })
        }, 400)

        toast({
          title: `🎉 ${project.name} completed!`,
          description: `All ${project.total_images} images have been processed successfully!`,
          action: (
            <ToastAction
              altText="View Results"
              onClick={() => navigate(`/history?project=${projectId}`)}
            >
              View Results
            </ToastAction>
          ),
          duration: 10000, // Keep visible longer for important notification
        })
      }
    }
  }, [queryClient, navigate, toast, onProjectCompleted, showProjectCompletionToasts])

  useEffect(() => {
    if (!organization?.id) return

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to processing_queue changes
    const channel = supabase
      .channel(`queue-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_queue',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['queue-page'] })
          queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
          queryClient.invalidateQueries({ queryKey: ['queue-folder-stats'] })

          // Handle specific events
          if (eventType === 'UPDATE' && newRecord) {
            // Item status changed
            if (newRecord.status === 'failed' && oldRecord?.status !== 'failed') {
              onItemFailed?.(newRecord)
              if (showToasts) {
                toast({
                  title: 'Processing failed',
                  description: newRecord.file_name || 'An image failed to process',
                  variant: 'destructive'
                })
              }
            }
          }

          if (eventType === 'DELETE') {
            // Item was removed (completed and moved to history)
            onItemCompleted?.(oldRecord)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    // Subscribe to processing_history for completed items
    const historyChannel = supabase
      .channel(`history-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'processing_history',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          const { new: newRecord } = payload

          // Invalidate history queries
          queryClient.invalidateQueries({ queryKey: ['history'] })
          queryClient.invalidateQueries({ queryKey: ['history-page'] })
          queryClient.invalidateQueries({ queryKey: ['token-account'] })

          if (newRecord?.status === 'success') {
            // Check if this completes a project
            if (newRecord.project_id) {
              checkProjectCompletion(newRecord.project_id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      supabase.removeChannel(historyChannel)
    }
  }, [organization?.id, queryClient, toast, onItemCompleted, onItemFailed, showToasts, checkProjectCompletion])
}

// Hook specifically for project detail page
export function useProjectRealtime(projectId: string | null) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_history',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // Invalidate project-specific queries
          queryClient.invalidateQueries({ queryKey: ['project-history', projectId] })
          queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] })

          if (payload.eventType === 'INSERT' && payload.new?.status === 'success') {
            toast({
              title: 'Image completed',
              description: payload.new.file_name || 'An image was processed'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient, toast])
}
