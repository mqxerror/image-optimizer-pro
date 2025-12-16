import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, RefreshCw, Camera, ImagePlus } from 'lucide-react'
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
          className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer md:cursor-default"
          onClick={() => {
            // On mobile, tapping the image opens capture modal to replace
            if (isMobileDevice()) {
              setShowMobileCapture(true)
            }
          }}
        >
          {/* Checkerboard background for transparency */}
          <div className="relative bg-[url('/checkerboard.png')] bg-repeat bg-[length:12px_12px]">
            <img
              src={imageUrl}
              alt="Uploaded image"
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>
        </div>
        {/* Action buttons - desktop */}
        <div className="absolute top-2 right-2 hidden md:flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-white/90 hover:bg-white border border-slate-200 shadow-sm"
            onClick={handleClick}
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-white/90 hover:bg-red-50 border border-slate-200 shadow-sm"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5 text-slate-600" />
          </Button>
        </div>
        {/* Action buttons - mobile (always visible) */}
        <div className="absolute top-2 right-2 flex md:hidden gap-1.5">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-white border border-slate-200 shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              setShowMobileCapture(true)
            }}
          >
            <Camera className="h-4 w-4 text-slate-600" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-red-50 border border-slate-200 shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
          >
            <X className="h-4 w-4 text-slate-600" />
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
        className={`rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-10 px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
          isDragging
            ? 'border-purple-400 bg-purple-50'
            : 'border-slate-300 bg-slate-50/50 hover:border-purple-300 hover:bg-purple-50/30'
        }`}
      >
        {fileInput}
        <div className={`p-3 rounded-xl ${isDragging ? 'bg-purple-100' : 'bg-white border border-slate-200'}`}>
          {isDragging ? (
            <Upload className="h-7 w-7 text-purple-500" />
          ) : (
            <>
              <Camera className="h-7 w-7 text-slate-400 md:hidden" />
              <ImagePlus className="h-7 w-7 text-slate-400 hidden md:block" />
            </>
          )}
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-700 text-sm">
            {isDragging ? 'Drop your image' : (
              <>
                <span className="md:hidden">Tap to capture or browse</span>
                <span className="hidden md:inline">Drop image here</span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="hidden md:inline">or click to browse</span>
          </p>
        </div>
        <p className="text-[10px] text-slate-400">PNG, JPG up to 10MB</p>

        {/* Step indicators for guidance */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-1">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[9px] font-bold">1</span>
            <span className="text-purple-600 font-medium">Upload</span>
          </div>
          <div className="w-3 h-px bg-slate-300" />
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-[9px] font-bold">2</span>
            <span className="text-slate-400">Style</span>
          </div>
          <div className="w-3 h-px bg-slate-300" />
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-[9px] font-bold">3</span>
            <span className="text-slate-400">Generate</span>
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
