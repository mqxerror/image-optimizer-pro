import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, RefreshCw, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MobileImageCapture } from '@/components/shared'

interface ImageUploaderProps {
  imageUrl: string | null
  onImageChange: (url: string | null, file?: File) => void
}

// Check if device is mobile/touch
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
}

export function ImageUploader({ imageUrl, onImageChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showMobileCapture, setShowMobileCapture] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onImageChange(dataUrl, file)
    }
    reader.readAsDataURL(file)
  }, [onImageChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    // On mobile, open the capture modal instead of native file picker
    if (isMobileDevice()) {
      setShowMobileCapture(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = () => {
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Hidden file input (always rendered)
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleInputChange}
      className="hidden"
    />
  )

  if (imageUrl) {
    return (
      <div className="relative group">
        {fileInput}
        <div
          className="rounded-2xl overflow-hidden bg-gray-800/50 border border-gray-700 shadow-2xl cursor-pointer md:cursor-default"
          onClick={() => {
            // On mobile, tapping the image opens capture modal to replace
            if (isMobileDevice()) {
              setShowMobileCapture(true)
            }
          }}
        >
          <img
            src={imageUrl}
            alt="Uploaded image"
            className="w-full h-auto max-h-[400px] object-contain"
          />
        </div>
        {/* Action buttons - desktop */}
        <div className="absolute top-3 right-3 hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-gray-900/80 hover:bg-gray-900 border-gray-700"
            onClick={handleClick}
          >
            <RefreshCw className="h-4 w-4 text-gray-300" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-gray-900/80 hover:bg-red-900 border-gray-700"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-gray-300" />
          </Button>
        </div>
        {/* Action buttons - mobile (always visible) */}
        <div className="absolute top-3 right-3 flex md:hidden gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-gray-900/80 hover:bg-gray-900 border-gray-700"
            onClick={(e) => {
              e.stopPropagation()
              setShowMobileCapture(true)
            }}
          >
            <Camera className="h-4 w-4 text-gray-300" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-gray-900/80 hover:bg-red-900 border-gray-700"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
          >
            <X className="h-4 w-4 text-gray-300" />
          </Button>
        </div>
        {/* Mobile capture modal */}
        <MobileImageCapture
          mode="studio"
          onImageCapture={(url, file) => onImageChange(url, file)}
          hideTrigger={true}
          open={showMobileCapture}
          onOpenChange={setShowMobileCapture}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload image. Press Enter to browse files."
        className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-4 py-16 px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-600 bg-gray-800/30 hover:border-purple-400 hover:bg-purple-500/5'
        }`}
      >
        {fileInput}
        <div className={`p-4 rounded-full ${isDragging ? 'bg-purple-500/20' : 'bg-gray-700/50'}`}>
          {isDragging ? (
            <Upload className="h-10 w-10 text-purple-400" />
          ) : (
            <Camera className="h-10 w-10 text-gray-500 md:hidden" />
          )}
          {!isDragging && (
            <ImageIcon className="h-10 w-10 text-gray-500 hidden md:block" />
          )}
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-300 text-lg">
            {isDragging ? 'Drop your image' : (
              <>
                <span className="md:hidden">Tap to capture or browse</span>
                <span className="hidden md:inline">Drop image here</span>
              </>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            <span className="hidden md:inline">or click to browse</span>
          </p>
        </div>
        <p className="text-xs text-gray-600 mb-4">PNG, JPG up to 10MB</p>

        {/* Step indicators for guidance */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">1</span>
            <span className="text-purple-400 font-medium">Upload</span>
          </div>
          <div className="w-4 h-px bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-500 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Style</span>
          </div>
          <div className="w-4 h-px bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-500 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Generate</span>
          </div>
        </div>
      </div>

      {/* Mobile capture modal - controlled by tap on the box */}
      <MobileImageCapture
        mode="studio"
        onImageCapture={(url, file) => onImageChange(url, file)}
        hideTrigger={true}
        open={showMobileCapture}
        onOpenChange={setShowMobileCapture}
      />
    </div>
  )
}
