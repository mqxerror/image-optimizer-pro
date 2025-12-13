import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Columns, SlidersHorizontal, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import type { ProcessingHistoryItem } from '@/types/database'

interface ImageComparisonViewerProps {
  image: ProcessingHistoryItem
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
}

type ViewMode = 'side-by-side' | 'slider'

export function ImageComparisonViewer({
  image,
  onClose,
  onPrevious,
  onNext,
}: ImageComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const sliderContainerRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()

      // In slider mode, use arrow keys to move the slider
      if (viewMode === 'slider') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setSliderPosition(p => Math.max(0, p - 2))
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setSliderPosition(p => Math.min(100, p + 2))
          return
        }
      }

      // In side-by-side mode, use arrow keys for navigation
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious()
      if (e.key === 'ArrowRight' && onNext) onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrevious, onNext, viewMode])

  // Calculate slider position from client coordinates
  const updateSliderFromClientX = useCallback((clientX: number) => {
    const container = sliderContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  // Slider drag handling
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      updateSliderFromClientX(e.clientX)
    },
    [isDragging, updateSliderFromClientX]
  )

  // Touch handling
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()
      updateSliderFromClientX(e.touches[0].clientX)
    },
    [isDragging, updateSliderFromClientX]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  // Download optimized image
  const handleDownload = async () => {
    if (!image.optimized_url) return

    try {
      const response = await fetch(image.optimized_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = image.file_name || 'optimized-image.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const isSuccess = image.status === 'success' || image.status === 'completed'

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-medium truncate max-w-md">
            {image.file_name || 'Image'}
          </h3>
          <Badge className={isSuccess ? 'bg-green-600' : 'bg-red-600'}>
            {image.status}
          </Badge>
          {image.ai_model && (
            <Badge variant="outline" className="text-gray-300 border-gray-600">
              {image.ai_model}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`p-2 rounded ${viewMode === 'side-by-side' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Side by side"
            >
              <Columns className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('slider')}
              className={`p-2 rounded ${viewMode === 'slider' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Slider comparison"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {image.optimized_url && (
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Navigation Buttons */}
        {onPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {viewMode === 'side-by-side' ? (
          /* Side by Side View */
          <div className="grid grid-cols-2 gap-4 max-w-6xl w-full h-full max-h-[70vh]">
            <div className="flex flex-col">
              <Label className="text-gray-400 text-sm mb-2 text-center">Original</Label>
              {image.original_url ? (
                <img
                  src={image.original_url}
                  alt="Original"
                  className="flex-1 object-contain bg-gray-900 rounded-lg"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg text-gray-500">
                  No original image
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <Label className="text-gray-400 text-sm mb-2 text-center">Optimized</Label>
              {image.optimized_url ? (
                <img
                  src={image.optimized_url}
                  alt="Optimized"
                  className="flex-1 object-contain bg-gray-900 rounded-lg"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg text-gray-500">
                  No optimized image
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Slider View */
          <div
            ref={sliderContainerRef}
            className="relative max-w-4xl w-full aspect-square max-h-[70vh] bg-gray-900 rounded-lg overflow-hidden cursor-ew-resize select-none touch-none"
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
            role="slider"
            aria-valuenow={sliderPosition}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Image comparison slider. Use arrow keys to adjust."
            tabIndex={0}
          >
            {/* Original Image (background) */}
            {image.original_url && (
              <img
                src={image.original_url}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />
            )}

            {/* Optimized Image (clipped) */}
            {image.optimized_url && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={image.optimized_url}
                  alt="Optimized"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
            )}

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-ew-resize pointer-events-none"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-white/50 pointer-events-auto">
                <GripVertical className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/70 rounded text-white text-xs">
              Original
            </div>
            <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/70 rounded text-white text-xs">
              Optimized
            </div>
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      {(image.tokens_used || image.processing_time_sec || image.error_message) && (
        <div className="p-4 bg-black/50 flex items-center justify-center gap-6 text-sm text-gray-400">
          {image.tokens_used && <span>Tokens: {image.tokens_used}</span>}
          {image.processing_time_sec && <span>Time: {image.processing_time_sec}s</span>}
          {image.error_message && (
            <span className="text-red-400 max-w-md truncate" title={image.error_message}>
              Error: {image.error_message}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
