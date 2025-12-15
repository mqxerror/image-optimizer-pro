import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { CapturedImage } from './useMobileCapture'

export interface UploadResult {
  fileName: string
  success: boolean
  url?: string
  storagePath?: string
  error?: string
  storageLocation: 'supabase' | 'google_drive'
}

interface UploadOptions {
  files: CapturedImage[]
  organizationId: string
  projectId?: string
  onProgress?: (progress: number) => void
}

export function useImageUpload() {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Upload a single file to Supabase storage
  const uploadToSupabase = useCallback(async (
    file: File,
    path: string
  ): Promise<{ url: string; storagePath: string }> => {
    const { error } = await supabase.storage
      .from('processed-images')
      .upload(path, file, {
        contentType: file.type,
        upsert: true
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('processed-images')
      .getPublicUrl(path)

    return { url: publicUrl, storagePath: path }
  }, [])

  // Upload a single file to Google Drive
  const uploadToGoogleDrive = useCallback(async (
    file: File,
    folderId: string,
    connectionId: string
  ): Promise<{ url: string; fileId: string }> => {
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix to get just the base64 content
        const base64Content = result.split(',')[1]
        resolve(base64Content)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'upload',
          connection_id: connectionId,
          folder_id: folderId,
          file_name: file.name,
          file_data: base64,
          content_type: file.type
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${errorText}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error)
    }

    return {
      url: result.webViewLink || result.webContentLink,
      fileId: result.id
    }
  }, [])

  // Get active Google Drive connection
  const getActiveDriveConnection = useCallback(async (organizationId: string) => {
    const { data, error } = await supabase
      .from('google_drive_connections')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return data.id
  }, [])

  // Upload multiple images with progress tracking
  const uploadImages = useCallback(async (options: UploadOptions): Promise<UploadResult[]> => {
    const { files, organizationId, projectId, onProgress } = options

    if (files.length === 0) {
      return []
    }

    setIsUploading(true)
    setProgress(0)

    const results: UploadResult[] = []
    const total = files.length
    let driveConnectionId: string | null = null

    // Check if any files need Google Drive upload
    const needsDrive = files.some(f => f.storageDestination === 'google_drive')
    if (needsDrive) {
      driveConnectionId = await getActiveDriveConnection(organizationId)
      if (!driveConnectionId) {
        toast({
          title: 'Google Drive not connected',
          description: 'Please connect Google Drive in Settings to save files there',
          variant: 'destructive'
        })
        // Fall back all Drive files to Supabase
        files.forEach(f => {
          if (f.storageDestination === 'google_drive') {
            f.storageDestination = 'supabase'
          }
        })
      }
    }

    for (let i = 0; i < files.length; i++) {
      const img = files[i]

      try {
        if (img.storageDestination === 'supabase') {
          // Upload to Supabase
          const timestamp = Date.now()
          const safeName = img.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const path = projectId
            ? `${organizationId}/${projectId}/${timestamp}_${safeName}`
            : `${organizationId}/studio/${timestamp}_${safeName}`

          const { url, storagePath } = await uploadToSupabase(img.file, path)

          results.push({
            fileName: img.file.name,
            success: true,
            url,
            storagePath,
            storageLocation: 'supabase'
          })
        } else if (img.storageDestination === 'google_drive' && driveConnectionId) {
          // Upload to Google Drive
          const { url, fileId } = await uploadToGoogleDrive(
            img.file,
            'root', // TODO: Allow folder selection
            driveConnectionId
          )

          results.push({
            fileName: img.file.name,
            success: true,
            url,
            storagePath: fileId,
            storageLocation: 'google_drive'
          })
        }
      } catch (error) {
        console.error(`Failed to upload ${img.file.name}:`, error)
        results.push({
          fileName: img.file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
          storageLocation: img.storageDestination
        })
      }

      // Update progress
      const newProgress = Math.round(((i + 1) / total) * 100)
      setProgress(newProgress)
      onProgress?.(newProgress)
    }

    setIsUploading(false)

    // Show summary toast
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    if (failCount > 0) {
      toast({
        title: `Upload completed with errors`,
        description: `${successCount} succeeded, ${failCount} failed`,
        variant: 'destructive'
      })
    } else if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} image${successCount === 1 ? '' : 's'} uploaded successfully`
      })
    }

    return results
  }, [uploadToSupabase, uploadToGoogleDrive, getActiveDriveConnection, toast])

  // Upload a single image (convenience method for Studio)
  const uploadSingleImage = useCallback(async (
    file: File,
    organizationId: string,
    storageDestination: 'supabase' | 'google_drive' = 'supabase'
  ): Promise<UploadResult> => {
    const results = await uploadImages({
      files: [{
        file,
        previewUrl: '',
        storageDestination
      }],
      organizationId
    })

    return results[0] || {
      fileName: file.name,
      success: false,
      error: 'Unknown error',
      storageLocation: storageDestination
    }
  }, [uploadImages])

  return {
    isUploading,
    progress,
    uploadImages,
    uploadSingleImage,
    uploadToSupabase,
    uploadToGoogleDrive,
  }
}
