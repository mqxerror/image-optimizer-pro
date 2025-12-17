import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Image as ImageIcon, HardDrive, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { GoogleDriveBrowser } from '@/components/google-drive'
import { MobileImageCapture } from '@/components/shared'
import type { GoogleDriveFile } from '@/types/database'
import type { UploadResult } from '@/hooks/useImageUpload'

interface AddToQueueProps {
  projectId: string
  projectName: string
  onQueued?: (count: number) => void
  autoProcess?: boolean // Auto-start processing after adding
  autoProcessBatchSize?: number // How many to auto-process (default: 10)
}

const CHUNK_SIZE = 100 // Insert 100 items at a time

export default function AddToQueue({
  projectId,
  projectName,
  onQueued,
  autoProcess = true, // Default to auto-processing
  autoProcessBatchSize = 10
}: AddToQueueProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'google-drive' | 'device'>('google-drive')
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Function to trigger processing for queue items
  const triggerProcessing = async (queueItemIds: string[]) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Update project status to 'active' when processing starts
    await supabase
      .from('projects')
      .update({ status: 'active' })
      .eq('id', projectId)

    // Fire-and-forget processing calls (don't await)
    queueItemIds.forEach((id) => {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ queue_item_id: id })
        }
      ).catch(err => console.error('Auto-processing error for', id, err))
    })
  }

  // Add to queue mutation with chunked inserts
  const addToQueueMutation = useMutation({
    mutationFn: async (files: GoogleDriveFile[]) => {
      if (!organization) throw new Error('No organization')

      setIsUploading(true)
      setUploadProgress(0)

      const totalFiles = files.length
      let insertedCount = 0
      const allInsertedIds: string[] = []

      // Split files into chunks
      const chunks: GoogleDriveFile[][] = []
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        chunks.push(files.slice(i, i + CHUNK_SIZE))
      }

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        // Prepare basic items with thumbnail URLs from Google Drive
        const basicItems = chunk.map(file => ({
          organization_id: organization.id,
          project_id: projectId,
          file_id: file.id,
          file_name: file.name,
          file_url: file.webViewLink || null,
          thumbnail_url: file.thumbnailLink || null, // Use Google Drive thumbnail
          status: 'queued',
          progress: 0,
          tokens_reserved: 1
        }))

        // Insert and return the IDs
        const { data: insertedItems, error: insertError } = await supabase
          .from('processing_queue')
          .insert(basicItems)
          .select('id')

        if (insertError) throw insertError

        if (insertedItems) {
          allInsertedIds.push(...insertedItems.map(item => item.id))
        }
        insertedCount += chunk.length

        // Update progress
        const progress = Math.round(((i + 1) / chunks.length) * 100)
        setUploadProgress(progress)
      }

      return { inserted: insertedCount, total: totalFiles, insertedIds: allInsertedIds }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue-folder-stats'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsOpen(false)
      setSelectedFiles([])
      setUploadProgress(0)
      setIsUploading(false)

      // Auto-process a batch of items if enabled (trial run)
      if (autoProcess && data.insertedIds.length > 0) {
        const idsToProcess = data.insertedIds.slice(0, autoProcessBatchSize)
        await triggerProcessing(idsToProcess)

        // Invalidate project queries to show "Processing" status
        queryClient.invalidateQueries({ queryKey: ['unified-project', projectId] })
        queryClient.invalidateQueries({ queryKey: ['project-queue-stats', projectId] })

        const remainingCount = data.inserted - idsToProcess.length
        toast({
          title: 'Trial batch started',
          description: remainingCount > 0
            ? `Processing ${idsToProcess.length} trial images, ${remainingCount} more in queue`
            : `Processing ${idsToProcess.length} trial images`
        })
      } else {
        toast({
          title: 'Images added to queue',
          description: `${data.inserted} images queued for processing`
        })
      }

      onQueued?.(data.inserted)
    },
    onError: (error) => {
      setIsUploading(false)
      setUploadProgress(0)
      toast({
        title: 'Failed to add to queue',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handleSelectFiles = (files: GoogleDriveFile[]) => {
    setSelectedFiles(files)
  }

  const handleAddToQueue = () => {
    if (selectedFiles.length > 0) {
      addToQueueMutation.mutate(selectedFiles)
    }
  }

  // Handle device upload completion
  const handleDeviceUploadComplete = async (results: UploadResult[]) => {
    if (!organization) return

    const successfulUploads = results.filter(r => r.success)
    if (successfulUploads.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create queue items for successfully uploaded images
      const queueItems = successfulUploads.map(result => ({
        organization_id: organization.id,
        project_id: projectId,
        file_id: result.storagePath || `local_${Date.now()}_${result.fileName}`,
        file_name: result.fileName,
        file_url: result.url || null,
        thumbnail_url: result.url || null, // Use same URL for thumbnail
        status: 'queued',
        progress: 0,
        tokens_reserved: 1
      }))

      const { data: insertedItems, error: insertError } = await supabase
        .from('processing_queue')
        .insert(queueItems)
        .select('id')

      if (insertError) throw insertError

      const insertedIds = insertedItems?.map(item => item.id) || []

      // Auto-process if enabled
      if (autoProcess && insertedIds.length > 0) {
        const idsToProcess = insertedIds.slice(0, autoProcessBatchSize)
        triggerProcessing(idsToProcess)

        const remainingCount = insertedIds.length - idsToProcess.length
        toast({
          title: 'Processing started',
          description: remainingCount > 0
            ? `Processing ${idsToProcess.length} images, ${remainingCount} more in queue`
            : `Processing ${idsToProcess.length} images`
        })
      } else {
        toast({
          title: 'Images added to queue',
          description: `${insertedIds.length} images queued for processing`
        })
      }

      // Invalidate queries and close
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue-folder-stats'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })

      setIsOpen(false)
      onQueued?.(insertedIds.length)
    } catch (error) {
      toast({
        title: 'Failed to add to queue',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Images
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Images to {projectName}</DialogTitle>
          <DialogDescription>
            Select images from Google Drive or capture from your device
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'google-drive' | 'device')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google-drive" className="gap-2">
              <HardDrive className="h-4 w-4" />
              Google Drive
            </TabsTrigger>
            <TabsTrigger value="device" className="gap-2">
              <Smartphone className="h-4 w-4" />
              From Device
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google-drive" className="flex-1 overflow-hidden mt-4">
            <GoogleDriveBrowser
              onSelectFiles={handleSelectFiles}
              selectionMode="files"
              maxFiles={500}
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="device" className="flex-1 overflow-hidden mt-4">
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-lg p-8">
              <Smartphone className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Upload from your device
              </h3>
              <p className="text-sm text-slate-500 text-center mb-6 max-w-sm">
                Take a photo with your camera or select images from your gallery to add to this project
              </p>
              <MobileImageCapture
                mode="project"
                projectId={projectId}
                projectName={projectName}
                onUploadComplete={handleDeviceUploadComplete}
                maxFiles={50}
                triggerLabel="Select or Capture Photos"
                triggerVariant="default"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Adding images to queue...
              </span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Footer - only show for Google Drive tab */}
        {activeTab === 'google-drive' && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToQueue}
              disabled={selectedFiles.length === 0 || addToQueueMutation.isPending}
            >
              {addToQueueMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Add {selectedFiles.length} to Queue
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
