import { useState, useEffect, useRef, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectHistory, flattenHistoryPages, type StatusFilter } from './hooks/useProjectHistory'
import { ImageComparisonViewer } from './ImageComparisonViewer'
import type { ProcessingHistoryItem } from '@/types/database'

interface ImageGalleryTabProps {
  projectId: string
}

export function ImageGalleryTab({ projectId }: ImageGalleryTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedImage, setSelectedImage] = useState<ProcessingHistoryItem | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const gridRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useProjectHistory(projectId, { statusFilter })

  const { ref: loadMoreRef, inView } = useInView()

  // Auto-fetch next page when scroll reaches bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const images = flattenHistoryPages(data?.pages)

  // Find current image index for navigation
  const currentIndex = selectedImage ? images.findIndex(img => img.id === selectedImage.id) : -1

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1])
    }
  }

  // Keyboard navigation for grid
  // Calculate columns based on viewport (matches grid-cols-2 sm:grid-cols-3 md:grid-cols-4)
  const getColumnsCount = useCallback(() => {
    if (typeof window === 'undefined') return 4
    if (window.innerWidth >= 768) return 4 // md breakpoint
    if (window.innerWidth >= 640) return 3 // sm breakpoint
    return 2
  }, [])

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (images.length === 0) return

    const columns = getColumnsCount()
    let newIndex = focusedIndex

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        newIndex = focusedIndex < images.length - 1 ? focusedIndex + 1 : focusedIndex
        break
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = focusedIndex > 0 ? focusedIndex - 1 : focusedIndex
        break
      case 'ArrowDown':
        e.preventDefault()
        newIndex = focusedIndex + columns < images.length ? focusedIndex + columns : focusedIndex
        break
      case 'ArrowUp':
        e.preventDefault()
        newIndex = focusedIndex - columns >= 0 ? focusedIndex - columns : focusedIndex
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = images.length - 1
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < images.length) {
          setSelectedImage(images[focusedIndex])
        }
        return
      default:
        return
    }

    if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < images.length) {
      setFocusedIndex(newIndex)
      buttonRefs.current.get(newIndex)?.focus()
    }
  }, [focusedIndex, images, getColumnsCount])

  // Store button ref for keyboard navigation
  const setButtonRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    if (el) {
      buttonRefs.current.set(index, el)
    } else {
      buttonRefs.current.delete(index)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Filter */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {images.length} {images.length === 1 ? 'image' : 'images'}
        </p>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center p-8 rounded-xl bg-gradient-to-b from-gray-50 to-gray-100/50 border border-dashed border-gray-200 max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="font-medium text-gray-700 mb-1">No processed images yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              {statusFilter !== 'all'
                ? `No ${statusFilter === 'success' ? 'successful' : 'failed'} images to display. Try changing the filter.`
                : 'Your processed images will appear here. Head to the Overview tab to start processing.'}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                <span>Success</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                <span>Failed</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            role="grid"
            aria-label="Image gallery. Use arrow keys to navigate, Enter to view."
            onKeyDown={handleGridKeyDown}
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                ref={(el) => setButtonRef(index, el)}
                onClick={() => setSelectedImage(image)}
                onFocus={() => setFocusedIndex(index)}
                tabIndex={focusedIndex === index || (focusedIndex === -1 && index === 0) ? 0 : -1}
                role="gridcell"
                aria-label={`${image.file_name || 'Image'}, ${image.status === 'success' || image.status === 'completed' ? 'successful' : 'failed'}. Press Enter to view.`}
                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border hover:border-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {image.optimized_url ? (
                  <img
                    src={image.optimized_url}
                    alt={image.file_name || 'Processed image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : image.original_url ? (
                  <img
                    src={image.original_url}
                    alt={image.file_name || 'Original image'}
                    className="w-full h-full object-cover opacity-50"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {image.status === 'success' || image.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 drop-shadow-md" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 drop-shadow-md" />
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view
                  </span>
                </div>

                {/* File Name */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">
                    {image.file_name || 'Untitled'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Load More Trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Image Comparison Viewer */}
      {selectedImage && (
        <ImageComparisonViewer
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onPrevious={currentIndex > 0 ? handlePrevious : undefined}
          onNext={currentIndex < images.length - 1 ? handleNext : undefined}
        />
      )}
    </div>
  )
}
