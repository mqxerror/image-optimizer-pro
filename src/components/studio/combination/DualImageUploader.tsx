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
    ? 'Upload a photo of a person'
    : 'Upload the jewelry piece'
  const hint = isModel
    ? 'Clear face, visible neck/ears'
    : 'Transparent background best'

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
        <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
          {/* Label badge */}
          <div className={cn(
            "absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium",
            isModel ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
          )}>
            <Icon className="h-2.5 w-2.5" />
            {title}
            <Check className="h-2.5 w-2.5 ml-0.5" />
          </div>

          {/* Checkerboard for transparency */}
          <div className="relative bg-[url('/checkerboard.png')] bg-repeat bg-[length:12px_12px]">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-auto max-h-[200px] object-contain"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 bg-white/90 hover:bg-white border border-slate-200 shadow-sm"
            onClick={handleClick}
          >
            <RefreshCw className="h-3 w-3 text-slate-600" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 bg-white/90 hover:bg-red-50 border border-slate-200 shadow-sm"
            onClick={handleClear}
          >
            <X className="h-3 w-3 text-slate-600" />
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
        "rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-5 px-2",
        isDragging
          ? isModel
            ? 'border-blue-400 bg-blue-50'
            : 'border-amber-400 bg-amber-50'
          : isModel
            ? 'border-slate-300 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50'
            : 'border-slate-300 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50',
        className
      )}
    >
      {fileInput}

      {/* Icon */}
      <div className={cn(
        "p-2 rounded-lg",
        isDragging
          ? isModel ? 'bg-blue-100' : 'bg-amber-100'
          : isModel ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'
      )}>
        {isDragging ? (
          <Upload className={cn("h-5 w-5", isModel ? "text-blue-500" : "text-amber-500")} />
        ) : isUploading ? (
          <div className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin border-current" />
        ) : (
          <Icon className={cn("h-5 w-5", isModel ? "text-blue-500" : "text-amber-500")} />
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <p className={cn(
          "font-medium text-xs",
          isModel ? "text-blue-700" : "text-amber-700"
        )}>
          {isDragging ? 'Drop here' : title}
        </p>
        <p className="text-[9px] text-slate-500 mt-0.5 max-w-[100px]">{subtitle}</p>
      </div>
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
  return (
    <div className={cn("space-y-2", className)}>
      {/* Side-by-side upload zones */}
      <div className="grid grid-cols-2 gap-2">
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
    </div>
  )
}

export default DualImageUploader
