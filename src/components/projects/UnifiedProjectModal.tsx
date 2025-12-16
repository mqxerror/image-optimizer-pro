import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import JSZip from 'jszip'
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Archive,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

import { SettingsPanel } from './modal/SettingsPanel'
import { ImageQueueGrid } from './modal/ImageQueueGrid'
import { ProgressFooter } from './modal/ProgressFooter'
import { SelectionActionsBar } from './modal/SelectionActionsBar'
import { useProjectQueueStats, useRetryProjectFailed } from '@/components/project-detail/hooks/useProjectQueueStats'
import AddToQueue from '@/components/processing/AddToQueue'
import type { Project } from '@/types/database'

const statusConfig: Record<string, { color: string; label: string; animate?: boolean }> = {
  draft: { color: 'bg-slate-100 text-slate-700', label: 'Draft' },
  active: { color: 'bg-blue-100 text-blue-700', label: 'Processing', animate: true },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  archived: { color: 'bg-yellow-100 text-yellow-700', label: 'Archived' },
}

interface UnifiedProjectModalProps {
  projectId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnifiedProjectModal({
  projectId,
  open,
  onOpenChange,
}: UnifiedProjectModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Fetch project data with polling
  const { data: project, isLoading } = useQuery({
    queryKey: ['unified-project', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!projectId && open,
    refetchInterval: open ? 5000 : false,
  })

  // Queue stats
  const { data: queueStats } = useProjectQueueStats(projectId || undefined)
  const retryFailedMutation = useRetryProjectFailed(projectId || undefined)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open && project) {
      setEditedName(project.name)
      setSelectedImages([])
    }
  }, [open, project])

  // Update project name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!projectId) throw new Error('No project')
      const { error } = await supabase
        .from('projects')
        .update({ name })
        .eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsEditingName(false)
      toast({ title: 'Project name updated' })
    },
    onError: (error) => {
      toast({ title: 'Failed to update name', description: error.message, variant: 'destructive' })
    }
  })

  // Track if processing is running
  const [isProcessingImages, setIsProcessingImages] = useState(false)

  // Start/Pause mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'draft') => {
      if (!projectId) throw new Error('No project')

      // Update project status
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId)
      if (error) throw error

      // If starting, trigger processing for queued items
      if (newStatus === 'active') {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        // Get queued items for this project
        const { data: queueItems, error: queueError } = await supabase
          .from('processing_queue')
          .select('id, file_name')
          .eq('project_id', projectId)
          .eq('status', 'queued')
          .limit(10) // Process in batches of 10

        if (queueError) {
          console.error('Failed to fetch queue items:', queueError)
          throw queueError
        }

        console.log('Queue items found:', queueItems?.length || 0)

        if (queueItems && queueItems.length > 0) {
          setIsProcessingImages(true)

          // Process items one by one (more reliable than parallel)
          const results: { id: string; success: boolean; error?: string }[] = []

          for (const item of queueItems) {
            try {
              console.log('Processing:', item.file_name)
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
              console.log('Process result for', item.file_name, ':', result)

              if (!response.ok || result.error) {
                results.push({ id: item.id, success: false, error: result.error || 'Request failed' })
              } else {
                results.push({ id: item.id, success: true })
              }
            } catch (err) {
              console.error('Processing error for', item.file_name, ':', err)
              results.push({ id: item.id, success: false, error: (err as Error).message })
            }
          }

          setIsProcessingImages(false)
          const successCount = results.filter(r => r.success).length
          const failedCount = results.filter(r => !r.success).length

          // Log failures for debugging
          const failures = results.filter(r => !r.success)
          if (failures.length > 0) {
            console.error('Processing failures:', failures)
          }

          return { status: newStatus, processed: successCount, failed: failedCount, errors: failures }
        }
      }

      return { status: newStatus, processed: 0, failed: 0, errors: [] }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['unified-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-images-grid', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })

      if (result.status === 'active') {
        if (result.processed > 0) {
          toast({
            title: 'Processing started',
            description: `${result.processed} images submitted${result.failed > 0 ? `, ${result.failed} failed` : ''}`
          })
        } else if (result.failed > 0) {
          const firstError = result.errors?.[0]?.error || 'Unknown error'
          toast({
            title: 'Processing failed',
            description: firstError,
            variant: 'destructive'
          })
        } else {
          toast({ title: 'No queued images to process' })
        }
      } else {
        toast({ title: 'Processing paused' })
      }
    },
    onError: (error) => {
      setIsProcessingImages(false)
      console.error('Status mutation error:', error)
      toast({ title: 'Failed to start processing', description: error.message, variant: 'destructive' })
    }
  })

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project')
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project archived' })
      onOpenChange(false)
    },
    onError: (error) => {
      toast({ title: 'Failed to archive', description: error.message, variant: 'destructive' })
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project')
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project deleted' })
      onOpenChange(false)
    },
    onError: (error) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    }
  })

  // Query to get processed images count
  const { data: processedImagesData } = useQuery({
    queryKey: ['processed-images-count', projectId],
    queryFn: async () => {
      if (!projectId) return { count: 0 }
      const { count, error } = await supabase
        .from('processing_history')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', ['success', 'completed'])
      if (error) return { count: 0 }
      return { count: count || 0 }
    },
    enabled: !!projectId && open,
  })
  const processedCount = processedImagesData?.count || 0

  // Download all processed images mutation
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null)
  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project')

      // Fetch all processed images from history (no pagination limit)
      const { data: images, error } = await supabase
        .from('processing_history')
        .select('id, file_name, optimized_url')
        .eq('project_id', projectId)
        .in('status', ['success', 'completed'])
        .limit(1000) // Explicit high limit to get all images

      if (error) throw error
      if (!images || images.length === 0) {
        throw new Error('No processed images to download')
      }

      console.log(`[Download] Found ${images.length} images to download`)
      setDownloadProgress(`Preparing ${images.length} images...`)

      const zip = new JSZip()
      const folder = zip.folder(project?.name || 'processed-images')
      if (!folder) throw new Error('Failed to create zip folder')

      // Download each image and add to zip
      let downloaded = 0
      let skipped = 0
      for (const image of images) {
        if (!image.optimized_url) {
          console.log(`[Download] Skipping ${image.file_name} - no optimized_url`)
          skipped++
          continue
        }

        try {
          setDownloadProgress(`Downloading ${downloaded + 1}/${images.length}...`)
          const response = await fetch(image.optimized_url)
          if (!response.ok) {
            console.error(`[Download] Failed to fetch ${image.file_name}: ${response.status}`)
            skipped++
            continue
          }

          const blob = await response.blob()
          // Ensure unique filename by adding id suffix if needed
          const ext = image.file_name?.split('.').pop() || 'jpg'
          const baseName = image.file_name?.replace(/\.[^.]+$/, '') || `image-${image.id}`
          const fileName = `${baseName}_${image.id.slice(0, 8)}.${ext}`
          folder.file(fileName, blob)
          downloaded++
        } catch (err) {
          console.error('[Download] Failed to download:', image.file_name, err)
          skipped++
        }
      }

      console.log(`[Download] Downloaded: ${downloaded}, Skipped: ${skipped}`)

      if (downloaded === 0) {
        throw new Error('Failed to download any images')
      }

      setDownloadProgress('Creating zip file...')

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name || 'processed-images'}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { downloaded, skipped, total: images.length }
    },
    onSuccess: (result) => {
      setDownloadProgress(null)
      const desc = result.skipped > 0
        ? `${result.downloaded} images downloaded, ${result.skipped} skipped (no URL)`
        : `${result.downloaded} images downloaded`
      toast({ title: 'Download complete', description: desc })
    },
    onError: (error) => {
      setDownloadProgress(null)
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' })
    }
  })

  // Handlers
  const handleNameSave = () => {
    if (editedName.trim() && editedName !== project?.name) {
      updateNameMutation.mutate(editedName.trim())
    } else {
      setIsEditingName(false)
    }
  }

  const handleImageSelect = useCallback((imageId: string, selected: boolean) => {
    setSelectedImages(prev =>
      selected ? [...prev, imageId] : prev.filter(id => id !== imageId)
    )
  }, [])

  const handleSelectAll = useCallback((imageIds: string[]) => {
    setSelectedImages(imageIds)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedImages([])
  }, [])

  // Handler for tab changes - reset selection when switching tabs
  const handleTabChange = useCallback(() => {
    setSelectedImages([])
  }, [])

  if (!projectId || isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!project) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Project not found</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const statusInfo = statusConfig[project.status] || statusConfig.draft

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 flex flex-col overflow-hidden [&>button]:z-50">
          {/* Visually hidden title for accessibility */}
          <DialogTitle className="sr-only">{project.name} - Project Details</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {/* Project Name - Editable */}
              {isEditingName ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave()
                    if (e.key === 'Escape') {
                      setEditedName(project.name)
                      setIsEditingName(false)
                    }
                  }}
                  className="max-w-xs h-8 font-semibold"
                  autoFocus
                />
              ) : (
                <h1
                  className="font-semibold text-lg truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setIsEditingName(true)}
                  title="Click to edit name"
                >
                  {project.name}
                </h1>
              )}

              <Badge className={cn(statusInfo.color, 'shrink-0')}>
                {statusInfo.animate && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {statusInfo.label}
              </Badge>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Download Button - Prominent */}
              {processedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadMutation.mutate()}
                  disabled={downloadMutation.isPending}
                  className="gap-1.5"
                >
                  {downloadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloadProgress || `Download (${processedCount})`}
                </Button>
              )}

              {/* Add Images Button */}
              <AddToQueue
                projectId={project.id}
                projectName={project.name}
                autoProcess={false}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => archiveMutation.mutate()}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Content - Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Settings */}
            <div className={cn(
              'border-r bg-slate-50 transition-all duration-200 flex flex-col shrink-0',
              sidebarCollapsed ? 'w-12' : 'w-80'
            )}>
              {/* Collapse Toggle */}
              <div className="p-2 border-b flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="h-8 w-8 p-0"
                >
                  {sidebarCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Settings Content */}
              {!sidebarCollapsed && (
                <SettingsPanel project={project} />
              )}
            </div>

            {/* Right Panel - Images */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Image Queue Grid */}
              <ImageQueueGrid
                projectId={project.id}
                selectedImages={selectedImages}
                onImageSelect={handleImageSelect}
                onSelectAll={handleSelectAll}
                onTabChange={handleTabChange}
                queueStats={queueStats}
              />

              {/* Selection Actions Bar (when images selected) */}
              {selectedImages.length > 0 && (
                <SelectionActionsBar
                  selectedCount={selectedImages.length}
                  selectedIds={selectedImages}
                  projectId={project.id}
                  onClearSelection={handleClearSelection}
                />
              )}

              {/* Progress Footer */}
              <ProgressFooter
                project={project}
                queueStats={queueStats}
                onStart={() => statusMutation.mutate('active')}
                onPause={() => statusMutation.mutate('draft')}
                onRetryFailed={() => retryFailedMutation.mutate()}
                isUpdating={statusMutation.isPending}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This will permanently delete
              all processed images and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
