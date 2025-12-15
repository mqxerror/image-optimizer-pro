import { useState } from 'react'
import { Camera, ImageIcon, Smartphone, X, Play, Clock, HardDrive, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { useMobileCapture, type CapturedImage } from '@/hooks/useMobileCapture'
import { useImageUpload, type UploadResult } from '@/hooks/useImageUpload'
import { useAuthStore } from '@/stores/auth'
import { CaptureSourceSelector } from './CaptureSourceSelector'
import { StorageChoiceSheet } from './StorageChoiceSheet'

interface MobileImageCaptureProps {
  mode: 'studio' | 'project'
  projectId?: string
  projectName?: string

  // Callbacks
  onImageCapture?: (url: string, file: File) => void  // Studio: single image
  onImagesSelected?: (images: CapturedImage[]) => void // Projects: before upload
  onUploadComplete?: (results: UploadResult[]) => void // Projects: after upload

  // Constraints
  maxFiles?: number
  maxFileSizeMB?: number

  // Options
  showStorageChoice?: boolean
  defaultStorage?: 'supabase' | 'google_drive'

  // Trigger customization
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline' | 'ghost'
  hideTrigger?: boolean // Hide the trigger button (for controlled mode)

  // Controlled mode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MobileImageCapture({
  mode,
  projectId,
  projectName,
  onImageCapture,
  onImagesSelected,
  onUploadComplete,
  maxFiles = mode === 'studio' ? 1 : 50,
  maxFileSizeMB = 10,
  showStorageChoice = true,
  defaultStorage = 'supabase',
  triggerLabel,
  triggerVariant = 'outline',
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: MobileImageCaptureProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }
  const [captureMode, setCaptureMode] = useState<'camera' | 'gallery'>('camera')
  const [showStorageSheet, setShowStorageSheet] = useState(false)
  const [processingMode, setProcessingMode] = useState<'immediate' | 'queue'>('immediate')

  const { organization } = useAuthStore()

  const {
    capturedImages,
    hasImages,
    imageCount,
    frontCameraRef,
    backCameraRef,
    galleryRef,
    openCamera,
    openGallery,
    handleFileSelect,
    removeImage,
    clearAll,
    setAllStorageDestinations,
  } = useMobileCapture({
    maxFiles,
    maxFileSizeMB,
    defaultStorage,
  })

  const { isUploading, progress, uploadImages } = useImageUpload()

  // Handle confirm/submit
  const handleConfirm = async () => {
    if (!organization || !hasImages) return

    if (mode === 'studio' && capturedImages.length === 1) {
      // Studio mode: pass single image to parent directly
      onImageCapture?.(capturedImages[0].previewUrl, capturedImages[0].file)
      clearAll()
      setIsOpen(false)
    } else if (mode === 'project') {
      // Project mode: notify about selection first
      onImagesSelected?.(capturedImages)

      // Upload all images
      const results = await uploadImages({
        files: capturedImages,
        organizationId: organization.id,
        projectId,
      })

      onUploadComplete?.(results)
      clearAll()
      setIsOpen(false)
    }
  }

  // Handle storage choice for all images
  const handleStorageChoice = (destination: 'supabase' | 'google_drive') => {
    setAllStorageDestinations(destination)
    setShowStorageSheet(false)
  }

  // Get current storage label
  const getCurrentStorageLabel = () => {
    if (capturedImages.length === 0) return 'App Storage'
    const allSame = capturedImages.every(
      img => img.storageDestination === capturedImages[0].storageDestination
    )
    if (!allSame) return 'Mixed'
    return capturedImages[0].storageDestination === 'google_drive' ? 'Google Drive' : 'App Storage'
  }

  return (
    <>
      {/* Trigger Button - can be hidden for controlled mode */}
      {!hideTrigger && (
        <Button
          variant={triggerVariant}
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          {triggerLabel || (mode === 'studio' ? 'Capture' : 'From Device')}
        </Button>
      )}

      {/* Hidden file inputs for camera/gallery access */}
      <input
        ref={frontCameraRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={backCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={mode === 'project'}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main capture sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>
              {mode === 'studio' ? 'Capture Image' : `Add to ${projectName || 'Project'}`}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden py-4">
            {/* Capture mode toggle */}
            <CaptureSourceSelector
              mode={captureMode}
              onChange={setCaptureMode}
            />

            {/* Capture buttons */}
            <div className="flex gap-3">
              {captureMode === 'camera' ? (
                <>
                  <Button
                    onClick={() => openCamera('environment')}
                    className="flex-1 h-12"
                    size="lg"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Back Camera
                  </Button>
                  <Button
                    onClick={() => openCamera('user')}
                    variant="outline"
                    className="flex-1 h-12"
                    size="lg"
                  >
                    <Smartphone className="h-5 w-5 mr-2" />
                    Front
                  </Button>
                </>
              ) : (
                <Button
                  onClick={openGallery}
                  className="flex-1 h-12"
                  size="lg"
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Choose from Gallery
                </Button>
              )}
            </div>

            {/* Image preview grid */}
            {hasImages && (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 gap-2 p-1">
                  {capturedImages.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={img.previewUrl}
                        alt={`Captured ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {showStorageChoice && (
                        <Badge
                          className="absolute bottom-1 left-1 text-[10px] px-1.5 cursor-pointer"
                          variant={img.storageDestination === 'google_drive' ? 'default' : 'secondary'}
                          onClick={() => setShowStorageSheet(true)}
                        >
                          {img.storageDestination === 'google_drive' ? (
                            <><HardDrive className="h-2.5 w-2.5 mr-1" />Drive</>
                          ) : (
                            <><Cloud className="h-2.5 w-2.5 mr-1" />App</>
                          )}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Empty state */}
            {!hasImages && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {captureMode === 'camera'
                      ? 'Take a photo with your camera'
                      : 'Select photos from your gallery'
                    }
                  </p>
                  <p className="text-xs mt-1 text-gray-400">
                    Max {maxFileSizeMB}MB per image
                  </p>
                </div>
              </div>
            )}

            {/* Project mode options */}
            {mode === 'project' && hasImages && (
              <div className="flex-shrink-0 space-y-3 border-t pt-3">
                {/* Processing mode */}
                <div className="flex gap-2">
                  <Button
                    variant={processingMode === 'immediate' ? 'default' : 'outline'}
                    onClick={() => setProcessingMode('immediate')}
                    className="flex-1 h-10"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Process Now
                  </Button>
                  <Button
                    variant={processingMode === 'queue' ? 'default' : 'outline'}
                    onClick={() => setProcessingMode('queue')}
                    className="flex-1 h-10"
                    size="sm"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Add to Queue
                  </Button>
                </div>

                {/* Storage choice button */}
                {showStorageChoice && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowStorageSheet(true)}
                  >
                    <span className="text-gray-500">Save results to:</span>
                    <span className="font-medium">{getCurrentStorageLabel()}</span>
                  </Button>
                )}
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="flex-shrink-0 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-gray-500">
                  Uploading... {progress}%
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <SheetFooter className="flex-shrink-0 gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                clearAll()
                setIsOpen(false)
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!hasImages || isUploading}
              className="flex-1"
            >
              {mode === 'studio' ? (
                'Use Photo'
              ) : (
                `Add ${imageCount} Image${imageCount === 1 ? '' : 's'}`
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Storage choice sheet */}
      <StorageChoiceSheet
        open={showStorageSheet}
        onOpenChange={setShowStorageSheet}
        onSelect={handleStorageChoice}
        currentSelection={capturedImages[0]?.storageDestination || defaultStorage}
      />
    </>
  )
}
