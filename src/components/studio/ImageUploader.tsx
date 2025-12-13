import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageUploaderProps {
  imageUrl: string | null
  onImageChange: (url: string | null, file?: File) => void
}

export function ImageUploader({ imageUrl, onImageChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
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
    fileInputRef.current?.click()
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
        <div className="rounded-2xl overflow-hidden bg-gray-800/50 border border-gray-700 shadow-2xl">
          <img
            src={imageUrl}
            alt="Uploaded image"
            className="w-full h-auto max-h-[400px] object-contain"
          />
        </div>
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-4 py-16 px-8 ${
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
          <ImageIcon className="h-10 w-10 text-gray-500" />
        )}
      </div>
      <div className="text-center">
        <p className="font-medium text-gray-300 text-lg">
          {isDragging ? 'Drop your image' : 'Drop image here'}
        </p>
        <p className="text-sm text-gray-500 mt-1">or click to browse</p>
      </div>
      <p className="text-xs text-gray-600">PNG, JPG up to 10MB</p>
    </div>
  )
}
