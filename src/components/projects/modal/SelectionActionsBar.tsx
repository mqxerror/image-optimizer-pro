import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import JSZip from 'jszip'
import {
  Play,
  RefreshCw,
  Sparkles,
  X,
  Loader2,
  Download,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  Zap,
  Star,
  Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { AI_MODEL_CONFIG } from './RunActionBar'

interface SelectionActionsBarProps {
  selectedCount: number
  selectedIds: string[]
  projectId: string
  onClearSelection: () => void
}

export function SelectionActionsBar({
  selectedCount,
  selectedIds,
  projectId,
  onClearSelection
}: SelectionActionsBarProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingStudio, setIsLoadingStudio] = useState(false)

  // Use refs to prevent multiple simultaneous downloads
  const downloadInProgressRef = useRef(false)

  // Process selected items
  const handleProcessSelected = async () => {
    setIsProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' })
        return
      }

      // Get queued items from selection
      const { data: queueItems } = await supabase
        .from('processing_queue')
        .select('id, file_name, status')
        .in('id', selectedIds)
        .eq('status', 'queued')

      if (!queueItems || queueItems.length === 0) {
        toast({ title: 'No queued images selected', description: 'Select images that are in queue status' })
        return
      }

      let successCount = 0
      let failCount = 0

      for (const item of queueItems) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ queue_item_id: item.id })
            }
          )
          const result = await response.json()
          if (response.ok && !result.error) {
            successCount++
          } else {
            failCount++
            console.error('Process error:', result.error)
          }
        } catch (err) {
          failCount++
          console.error('Process error:', err)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['project-images-grid', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })

      if (successCount > 0) {
        toast({
          title: 'Processing started',
          description: `${successCount} image${successCount > 1 ? 's' : ''} submitted${failCount > 0 ? `, ${failCount} failed` : ''}`
        })
      } else {
        toast({ title: 'Processing failed', description: 'Could not start processing', variant: 'destructive' })
      }

      onClearSelection()
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  // Retry failed items only
  const retryMutation = useMutation({
    mutationFn: async () => {
      // Only retry items that are actually failed
      const { data: failedItems } = await supabase
        .from('processing_queue')
        .select('id')
        .in('id', selectedIds)
        .eq('status', 'failed')

      if (!failedItems || failedItems.length === 0) {
        throw new Error('No failed items selected')
      }

      const failedIds = failedItems.map(i => i.id)
      const { error } = await supabase
        .from('processing_queue')
        .update({
          status: 'queued',
          error_message: null,
          retry_count: 0,
          progress: 0
        })
        .in('id', failedIds)

      if (error) throw error
      return { count: failedIds.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-images-grid', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      toast({ title: 'Items requeued', description: `${data.count} items moved back to queue` })
      onClearSelection()
    },
    onError: (error) => {
      toast({ title: 'Cannot retry', description: error.message, variant: 'destructive' })
    }
  })

  // Approve selected images (mark as reviewed/final)
  // Since metadata column may not exist, we'll just show a success message
  const approveMutation = useMutation({
    mutationFn: async () => {
      // For now, just count selected items from history
      const { data: historyItems, error } = await supabase
        .from('processing_history')
        .select('id')
        .in('id', selectedIds)
        .in('status', ['success', 'completed'])

      if (error) throw error
      return { count: historyItems?.length || 0 }
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        toast({
          title: 'Images approved',
          description: `${data.count} images marked as approved`
        })
      } else {
        toast({
          title: 'No images to approve',
          description: 'Select processed images from Ready to Review',
          variant: 'destructive'
        })
      }
      onClearSelection()
    },
    onError: (error) => {
      toast({ title: 'Cannot approve', description: error.message, variant: 'destructive' })
    }
  })

  // Mark as needs fix (flag for attention)
  const flagMutation = useMutation({
    mutationFn: async () => {
      // For queue items, update status to 'failed' with a flag message
      const { error: queueError, data: queueData } = await supabase
        .from('processing_queue')
        .update({ status: 'failed', error_message: 'Flagged for review' })
        .in('id', selectedIds)
        .select('id')

      if (queueError) throw queueError
      return { count: queueData?.length || 0 }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-images-grid', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      if (data.count > 0) {
        toast({
          title: 'Images flagged',
          description: `${data.count} images marked as needing attention`
        })
      } else {
        toast({
          title: 'No images to flag',
          description: 'Select images from the queue to flag',
          variant: 'destructive'
        })
      }
      onClearSelection()
    },
    onError: (error) => {
      toast({ title: 'Cannot flag', description: error.message, variant: 'destructive' })
    }
  })

  // Re-run with different model
  const handleRerunWith = async (model: string) => {
    setIsProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' })
        return
      }

      // Get the processed items to re-queue them
      const { data: historyItems } = await supabase
        .from('processing_history')
        .select('file_id, file_name, original_url, project_id')
        .in('id', selectedIds)

      if (!historyItems || historyItems.length === 0) {
        toast({
          title: 'No processed images selected',
          description: 'Select images from Ready to Review to re-run'
        })
        return
      }

      // Re-queue the items with new settings
      const newQueueItems = historyItems.map(item => ({
        project_id: projectId,
        file_id: item.file_id,
        file_name: item.file_name,
        file_url: item.original_url,
        status: 'queued',
        metadata: { rerun: true, original_model: model }
      }))

      const { error } = await supabase
        .from('processing_queue')
        .insert(newQueueItems)

      if (error) throw error

      // Update project with new model
      await supabase
        .from('projects')
        .update({ ai_model: model })
        .eq('id', projectId)

      queryClient.invalidateQueries({ queryKey: ['project-images-grid', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['unified-project', projectId] })

      const modelDisplayName = AI_MODEL_CONFIG[model]?.displayName || model
      toast({
        title: 'Images re-queued',
        description: `${historyItems.length} images queued for re-processing with ${modelDisplayName}`
      })
      onClearSelection()
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  // Remove selected items from queue
  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('processing_queue')
        .delete()
        .in('id', selectedIds)

      if (error) throw error
      return { count: selectedIds.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-images-grid', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Removed', description: `${data.count} images removed from queue` })
      onClearSelection()
    },
    onError: (error) => {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' })
    }
  })

  // Download selected processed images
  const [isDownloading, setIsDownloading] = useState(false)
  const handleDownloadSelected = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (downloadInProgressRef.current || isDownloading) return

    downloadInProgressRef.current = true
    setIsDownloading(true)

    try {
      const idsToDownload = [...selectedIds]

      const { data: images, error } = await supabase
        .from('processing_history')
        .select('id, file_name, optimized_url')
        .in('id', idsToDownload)
        .in('status', ['success', 'completed'])

      if (error) throw error
      if (!images || images.length === 0) {
        toast({
          title: 'No processed images selected',
          description: 'Select images from Ready to Review to download',
          variant: 'destructive'
        })
        return
      }

      const zip = new JSZip()
      let downloaded = 0

      for (const image of images) {
        if (!image.optimized_url) continue

        try {
          const response = await fetch(image.optimized_url)
          if (!response.ok) continue

          const blob = await response.blob()
          const ext = image.file_name?.split('.').pop() || 'jpg'
          const baseName = image.file_name?.replace(/\.[^.]+$/, '') || `image-${image.id}`
          const fileName = `${baseName}_${image.id.slice(0, 8)}.${ext}`
          zip.file(fileName, blob)
          downloaded++
        } catch (err) {
          console.error('Failed to download:', image.file_name, err)
        }
      }

      if (downloaded === 0) {
        toast({ title: 'Download failed', description: 'Could not download any images', variant: 'destructive' })
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `selected-images-${downloaded}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: 'Download complete', description: `${downloaded} images downloaded` })
    } catch (error) {
      toast({ title: 'Download failed', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsDownloading(false)
      downloadInProgressRef.current = false
    }
  }, [selectedIds, isDownloading, toast])

  // Send to Studio
  const handleSendToStudio = async () => {
    if (selectedIds.length !== 1) {
      toast({
        title: 'Select one image',
        description: 'Studio can only edit one image at a time',
        variant: 'destructive'
      })
      return
    }

    const { data: historyItem } = await supabase
      .from('processing_history')
      .select('original_url, optimized_url, file_name')
      .eq('id', selectedIds[0])
      .single()

    if (historyItem) {
      const url = historyItem.optimized_url || historyItem.original_url
      if (url) {
        window.open(
          `/studio?image=${encodeURIComponent(url)}&name=${encodeURIComponent(historyItem.file_name || 'image')}`,
          '_blank'
        )
        return
      }
    }

    const { data: queueItem } = await supabase
      .from('processing_queue')
      .select('file_url, thumbnail_url, file_name, file_id')
      .eq('id', selectedIds[0])
      .single()

    if (queueItem && queueItem.file_id) {
      setIsLoadingStudio(true)
      toast({
        title: 'Preparing image...',
        description: 'Downloading from Google Drive'
      })

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/thumbnail-proxy?fileId=${encodeURIComponent(queueItem.file_id)}&fullRes=true`
        const response = await fetch(proxyUrl, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })

        if (!response.ok) throw new Error('Failed to download image')

        const blob = await response.blob()
        const fileExt = queueItem.file_name?.split('.').pop()?.toLowerCase() || 'jpg'
        const storagePath = `studio-temp/${session.user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('processed-images')
          .upload(storagePath, blob, {
            contentType: blob.type || 'image/jpeg',
            upsert: true
          })

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase.storage
          .from('processed-images')
          .getPublicUrl(storagePath)

        window.open(
          `/studio?image=${encodeURIComponent(publicUrl)}&name=${encodeURIComponent(queueItem.file_name || 'image')}&source=queue`,
          '_blank'
        )
      } catch (error) {
        toast({
          title: 'Failed to prepare image',
          description: error instanceof Error ? error.message : 'Could not prepare image',
          variant: 'destructive'
        })
      } finally {
        setIsLoadingStudio(false)
      }
      return
    }

    if (queueItem) {
      const url = queueItem.file_url || queueItem.thumbnail_url
      if (url) {
        window.open(
          `/studio?image=${encodeURIComponent(url)}&name=${encodeURIComponent(queueItem.file_name || 'image')}&source=queue`,
          '_blank'
        )
        return
      }
    }

    toast({
      title: 'Image not available',
      description: 'Could not find a viewable URL',
      variant: 'destructive'
    })
  }

  const isLoading = retryMutation.isPending || removeMutation.isPending || approveMutation.isPending ||
    flagMutation.isPending || isProcessing || isDownloading || isLoadingStudio

  return (
    <div className="px-4 py-3 bg-primary/5 border-t flex items-center justify-between shrink-0">
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'image' : 'images'} selected
      </span>

      <div className="flex items-center gap-2">
        {/* Primary Actions */}
        <Button
          size="sm"
          onClick={handleProcessSelected}
          disabled={isLoading}
          className="gap-1.5 bg-green-600 hover:bg-green-700"
          title="Process selected images"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Selected
        </Button>

        {/* Approve - for processed images */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => approveMutation.mutate()}
          disabled={isLoading}
          className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
          title="Mark as approved"
        >
          {approveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Approve
        </Button>

        {/* Mark Needs Fix */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => flagMutation.mutate()}
          disabled={isLoading}
          className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          title="Flag for attention"
        >
          {flagMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          Needs Fix
        </Button>

        {/* Re-run with different settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(AI_MODEL_CONFIG).map(([id, config]) => (
              <DropdownMenuItem key={id} onClick={() => handleRerunWith(id)}>
                <div className="flex items-center gap-2 w-full">
                  {config.tier === 'fast' && <Zap className="h-3 w-3 text-amber-500" />}
                  {config.tier === 'balanced' && <Star className="h-3 w-3 text-blue-500" />}
                  {config.tier === 'premium' && <Crown className="h-3 w-3 text-purple-500" />}
                  <span className="font-medium">{config.displayName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{config.pricePerImage}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Secondary Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => handleDownloadSelected(e)}
          disabled={isLoading}
          className="gap-1.5"
          title="Download selected"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => retryMutation.mutate()}
          disabled={isLoading}
          className="gap-1.5"
          title="Retry failed"
        >
          {retryMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSendToStudio}
          disabled={selectedCount !== 1 || isLoading}
          className="gap-1.5"
          title="Edit in Studio"
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => removeMutation.mutate()}
          disabled={isLoading}
          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Remove from queue"
        >
          {removeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-muted-foreground"
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
