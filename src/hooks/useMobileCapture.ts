import { useState, useCallback, useRef, ChangeEvent } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface CapturedImage {
  file: File
  previewUrl: string
  storageDestination: 'supabase' | 'google_drive'
}

interface UseMobileCaptureOptions {
  maxFiles?: number
  maxFileSizeMB?: number
  defaultStorage?: 'supabase' | 'google_drive'
}

export function useMobileCapture(options: UseMobileCaptureOptions = {}) {
  const {
    maxFiles = 50,
    maxFileSizeMB = 10,
    defaultStorage = 'supabase'
  } = options

  const { toast } = useToast()
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [isCapturing, setIsCapturing] = useState(false)

  // Refs for hidden file inputs
  const frontCameraRef = useRef<HTMLInputElement>(null)
  const backCameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Open camera with specified facing mode
  const openCamera = useCallback((facing: 'user' | 'environment') => {
    setIsCapturing(true)
    if (facing === 'user' && frontCameraRef.current) {
      frontCameraRef.current.click()
    } else if (backCameraRef.current) {
      backCameraRef.current.click()
    }
  }, [])

  // Open gallery/photo library
  const openGallery = useCallback(() => {
    setIsCapturing(true)
    galleryRef.current?.click()
  }, [])

  // Validate and process selected files
  const handleFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setIsCapturing(false)

    if (files.length === 0) return

    // Check max files limit
    const remainingSlots = maxFiles - capturedImages.length
    if (files.length > remainingSlots) {
      toast({
        title: 'Too many files',
        description: `You can only add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}`,
        variant: 'destructive'
      })
      return
    }

    // Validate and process each file
    const validFiles: CapturedImage[] = []
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024

    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not an image file`,
          variant: 'destructive'
        })
        continue
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${maxFileSizeMB}MB limit`,
          variant: 'destructive'
        })
        continue
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      validFiles.push({
        file,
        previewUrl,
        storageDestination: defaultStorage
      })
    }

    if (validFiles.length > 0) {
      setCapturedImages(prev => [...prev, ...validFiles])
    }

    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }, [capturedImages.length, maxFiles, maxFileSizeMB, defaultStorage, toast])

  // Remove an image by index
  const removeImage = useCallback((index: number) => {
    setCapturedImages(prev => {
      const newImages = [...prev]
      // Revoke object URL to free memory
      URL.revokeObjectURL(newImages[index].previewUrl)
      newImages.splice(index, 1)
      return newImages
    })
  }, [])

  // Clear all captured images
  const clearAll = useCallback(() => {
    capturedImages.forEach(img => URL.revokeObjectURL(img.previewUrl))
    setCapturedImages([])
  }, [capturedImages])

  // Set storage destination for a specific image
  const setStorageDestination = useCallback((
    index: number,
    destination: 'supabase' | 'google_drive'
  ) => {
    setCapturedImages(prev => {
      const newImages = [...prev]
      if (newImages[index]) {
        newImages[index] = { ...newImages[index], storageDestination: destination }
      }
      return newImages
    })
  }, [])

  // Set storage destination for all images
  const setAllStorageDestinations = useCallback((destination: 'supabase' | 'google_drive') => {
    setCapturedImages(prev =>
      prev.map(img => ({ ...img, storageDestination: destination }))
    )
  }, [])

  return {
    // State
    capturedImages,
    isCapturing,
    hasImages: capturedImages.length > 0,
    imageCount: capturedImages.length,
    canAddMore: capturedImages.length < maxFiles,

    // Refs for hidden inputs
    frontCameraRef,
    backCameraRef,
    galleryRef,

    // Actions
    openCamera,
    openGallery,
    handleFileSelect,
    removeImage,
    clearAll,
    setStorageDestination,
    setAllStorageDestinations,
  }
}
