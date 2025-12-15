import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import JSZip from 'jszip'
import { Play, RefreshCw, Sparkles, X, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

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

  // Use refs to prevent multiple simultaneous downloads
  const downloadInProgressRef = useRef(false)

  // Process selected items (Trial)
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
      toast({ title: 'Items requeued', description: `${data.count} failed items moved back to queue` })
      onClearSelection()
    },
    onError: (error) => {
      toast({ title: 'Cannot retry', description: error.message, variant: 'destructive' })
    }
  })

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
    // Prevent event bubbling and default behavior
    e.preventDefault()
    e.stopPropagation()

    // Guard against multiple simultaneous downloads
    if (downloadInProgressRef.current || isDownloading) {
      console.log('Download already in progress, ignoring click')
      return
    }

    downloadInProgressRef.current = true
    setIsDownloading(true)

    try {
      // Copy selectedIds to avoid issues with state changes during download
      const idsToDownload = [...selectedIds]
      console.log('Starting download for', idsToDownload.length, 'images')

      // Fetch selected images from processing_history
      const { data: images, error } = await supabase
        .from('processing_history')
        .select('id, file_name, optimized_url')
        .in('id', idsToDownload)
        .in('status', ['success', 'completed'])

      if (error) throw error
      if (!images || images.length === 0) {
        toast({
          title: 'No processed images selected',
          description: 'Select images from the Done tab to download',
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

    // First try processing_history - processed images have public URLs
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

    toast({
      title: 'Not ready for Studio',
      description: 'Process this image first, then you can edit it in Studio',
      variant: 'destructive'
    })
  }

  const isLoading = retryMutation.isPending || removeMutation.isPending || isProcessing || isDownloading

  return (
    <div className="px-4 py-3 bg-primary/5 border-t flex items-center justify-between shrink-0">
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'image' : 'images'} selected
      </span>

      <div className="flex items-center gap-2">
        {/* Download Selected - for processed images */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => handleDownloadSelected(e)}
          disabled={isLoading}
          className="gap-1.5"
          title="Download selected processed images"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download
        </Button>

        {/* Process Selected - Main action for trial */}
        <Button
          size="sm"
          onClick={handleProcessSelected}
          disabled={isLoading}
          className="gap-1.5 bg-green-600 hover:bg-green-700"
          title="Process selected images (trial)"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Process
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => retryMutation.mutate()}
          disabled={isLoading}
          className="gap-1.5"
          title="Retry failed items only"
        >
          {retryMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Retry
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
          Remove
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSendToStudio}
          disabled={selectedCount !== 1 || isLoading}
          className="gap-1.5"
          title="Edit in Studio (processed images only)"
        >
          <Sparkles className="h-4 w-4" />
          Studio
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
