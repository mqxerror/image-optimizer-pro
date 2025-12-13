import { useState, useEffect } from 'react'
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
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <ImageIcon className="h-12 w-12 mb-3 text-gray-300" />
          <p className="text-sm">No processed images yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add images to the queue and start processing
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border hover:border-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
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
