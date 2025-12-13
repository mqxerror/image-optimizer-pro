import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Image as ImageIcon } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { GoogleDriveBrowser } from '@/components/google-drive'
import type { GoogleDriveFile } from '@/types/database'

interface AddToQueueProps {
  projectId: string
  projectName: string
  onQueued?: (count: number) => void
}

const CHUNK_SIZE = 100 // Insert 100 items at a time

export default function AddToQueue({
  projectId,
  projectName,
  onQueued
}: AddToQueueProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Add to queue mutation with chunked inserts
  const addToQueueMutation = useMutation({
    mutationFn: async (files: GoogleDriveFile[]) => {
      if (!organization) throw new Error('No organization')

      setIsUploading(true)
      setUploadProgress(0)

      const totalFiles = files.length
      let insertedCount = 0

      // Split files into chunks
      const chunks: GoogleDriveFile[][] = []
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        chunks.push(files.slice(i, i + CHUNK_SIZE))
      }

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        // Prepare basic items (backwards compatible - without new columns)
        const basicItems = chunk.map(file => ({
          organization_id: organization.id,
          project_id: projectId,
          file_id: file.id,
          file_name: file.name,
          file_url: file.webViewLink || null,
          status: 'queued',
          progress: 0,
          tokens_reserved: 1
        }))

        // Try insert with basic fields first (always works)
        const { error: insertError } = await supabase
          .from('processing_queue')
          .insert(basicItems)

        if (insertError) throw insertError
        insertedCount += chunk.length

        // Update progress
        const progress = Math.round(((i + 1) / chunks.length) * 100)
        setUploadProgress(progress)
      }

      return { inserted: insertedCount, total: totalFiles }
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
      toast({
        title: 'Images added to queue',
        description: `${data.inserted} images queued for processing`
      })
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
            Select up to 500 images from Google Drive to add to the processing queue
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <GoogleDriveBrowser
            onSelectFiles={handleSelectFiles}
            selectionMode="files"
            maxFiles={500}
            projectId={projectId}
          />
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Adding {selectedFiles.length} images to queue...
              </span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

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
      </DialogContent>
    </Dialog>
  )
}
