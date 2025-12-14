import { useState, useCallback, useRef } from 'react'
import { Upload, X, User, Gem, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DualImageState } from '@/types/combination'

interface SingleImageUploadProps {
  type: 'model' | 'jewelry'
  imageUrl: string | null
  isUploading: boolean
  onImageChange: (url: string | null, file?: File) => void
  className?: string
}

function SingleImageUpload({
  type,
  imageUrl,
  isUploading,
  onImageChange,
  className
}: SingleImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isModel = type === 'model'
  const Icon = isModel ? User : Gem
  const title = isModel ? 'Model Photo' : 'Jewelry Image'
  const subtitle = isModel
    ? 'Upload a photo of a person to wear the jewelry'
    : 'Upload the jewelry to be placed on the model'
  const hint = isModel
    ? 'Best: Clear face, visible neck/ears/hands'
    : 'Best: Transparent or white background'

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
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleInputChange}
      className="hidden"
    />
  )

  // Image uploaded state
  if (imageUrl) {
    return (
      <div className={cn("relative group", className)}>
        {fileInput}
        <div className="rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700 shadow-lg">
          {/* Label badge */}
          <div className={cn(
            "absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
            isModel ? "bg-blue-500/90 text-white" : "bg-amber-500/90 text-white"
          )}>
            <Icon className="h-3 w-3" />
            {title}
            <Check className="h-3 w-3 ml-1" />
          </div>

          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto max-h-[280px] object-contain"
          />
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-gray-900/80 hover:bg-gray-900 border-gray-700"
            onClick={handleClick}
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-300" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-gray-900/80 hover:bg-red-900 border-gray-700"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5 text-gray-300" />
          </Button>
        </div>
      </div>
    )
  }

  // Upload state
  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-10 px-4",
        isDragging
          ? isModel
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-amber-500 bg-amber-500/10'
          : isModel
            ? 'border-blue-400/40 bg-blue-500/5 hover:border-blue-400 hover:bg-blue-500/10'
            : 'border-amber-400/40 bg-amber-500/5 hover:border-amber-400 hover:bg-amber-500/10',
        className
      )}
    >
      {fileInput}

      {/* Icon */}
      <div className={cn(
        "p-3 rounded-full",
        isDragging
          ? isModel ? 'bg-blue-500/20' : 'bg-amber-500/20'
          : isModel ? 'bg-blue-500/10' : 'bg-amber-500/10'
      )}>
        {isDragging ? (
          <Upload className={cn("h-8 w-8", isModel ? "text-blue-400" : "text-amber-400")} />
        ) : isUploading ? (
          <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin border-current" />
        ) : (
          <Icon className={cn("h-8 w-8", isModel ? "text-blue-400" : "text-amber-400")} />
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <p className={cn(
          "font-medium text-base",
          isModel ? "text-blue-300" : "text-amber-300"
        )}>
          {isDragging ? 'Drop here' : title}
        </p>
        <p className="text-xs text-gray-500 mt-1 max-w-[180px]">{subtitle}</p>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-gray-600 text-center max-w-[160px]">{hint}</p>
    </div>
  )
}

// ============================================
// DUAL IMAGE UPLOADER
// ============================================

interface DualImageUploaderProps {
  images: DualImageState
  onModelChange: (url: string | null, file?: File) => void
  onJewelryChange: (url: string | null, file?: File) => void
  className?: string
}

export function DualImageUploader({
  images,
  onModelChange,
  onJewelryChange,
  className
}: DualImageUploaderProps) {
  const bothUploaded = images.model.url && images.jewelry.url

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-300">Upload Images</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {bothUploaded
              ? 'Both images ready - adjust settings and generate'
              : 'Upload a model photo and jewelry image to combine'}
          </p>
        </div>
        {bothUploaded && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-md">
            <Check className="h-3.5 w-3.5" />
            Ready
          </div>
        )}
      </div>

      {/* Side-by-side upload zones */}
      <div className="grid grid-cols-2 gap-4">
        <SingleImageUpload
          type="model"
          imageUrl={images.model.url}
          isUploading={images.model.isUploading}
          onImageChange={onModelChange}
        />
        <SingleImageUpload
          type="jewelry"
          imageUrl={images.jewelry.url}
          isUploading={images.jewelry.isUploading}
          onImageChange={onJewelryChange}
        />
      </div>

      {/* Tips when both not uploaded */}
      {!bothUploaded && (
        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-300">Tip:</span>{' '}
            For best results, use a model photo with good lighting and a jewelry image with a transparent or white background.
          </p>
        </div>
      )}
    </div>
  )
}

export default DualImageUploader
