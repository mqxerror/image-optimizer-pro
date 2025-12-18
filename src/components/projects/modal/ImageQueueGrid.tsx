import { useState, useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import type { LucideIcon } from 'lucide-react'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  CheckSquare,
  Square
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImageCard } from '@/components/ui/image-card'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { ProjectQueueStats } from '@/components/project-detail/hooks/useProjectQueueStats'

type ImageStatus = 'all' | 'queued' | 'processing' | 'success' | 'failed'

interface QueueImage {
  id: string
  file_id: string
  file_name: string | null
  thumbnail_url: string | null
  optimized_url: string | null
  status: string | null
  error_message: string | null
}

interface ImageQueueGridProps {
  projectId: string
  selectedImages: string[]
  onImageSelect: (imageId: string, selected: boolean) => void
  onSelectAll: (imageIds: string[]) => void
  onTabChange?: () => void // Called when tab changes to reset selection
  queueStats?: ProjectQueueStats
}

interface StatusTab {
  id: ImageStatus
  label: string
  color: string
  icon?: LucideIcon
  animate?: boolean
}

const statusTabs: StatusTab[] = [
  { id: 'all', label: 'All', color: 'bg-slate-100 text-slate-700' },
  { id: 'queued', label: 'Queue', color: 'bg-slate-100 text-slate-700', icon: Clock },
  { id: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Loader2, animate: true },
  { id: 'success', label: 'Done', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { id: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
]

export function ImageQueueGrid({
  projectId,
  selectedImages,
  onImageSelect,
  onSelectAll,
  onTabChange,
  queueStats
}: ImageQueueGridProps) {
  const [activeTab, setActiveTab] = useState<ImageStatus>('all')

  // Handle tab change - notify parent to reset selection
  const handleTabChange = useCallback((tab: ImageStatus) => {
    setActiveTab(tab)
    onTabChange?.()
  }, [onTabChange])
  const { ref: loadMoreRef, inView } = useInView()

  // Fetch images with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['project-images-grid', projectId, activeTab],
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 50
      const offset = pageParam * pageSize

      // For success tab, fetch from processing_history
      if (activeTab === 'success') {
        const { data: historyData } = await supabase
          .from('processing_history')
          .select('id, file_id, file_name, original_url, optimized_url, status')
          .eq('project_id', projectId)
          .in('status', ['success', 'completed'])
          .order('completed_at', { ascending: false })
          .range(offset, offset + pageSize - 1)

        return {
          images: (historyData || []).map(h => ({
            id: h.id,
            file_id: h.file_id,
            file_name: h.file_name,
            thumbnail_url: h.optimized_url || h.original_url,
            optimized_url: h.optimized_url,
            status: h.status,
            error_message: null
          })) as QueueImage[],
          nextPage: (historyData?.length || 0) === pageSize ? pageParam + 1 : undefined
        }
      }

      // For other tabs, fetch from processing_queue
      let query = supabase
        .from('processing_queue')
        .select('id, file_id, file_name, file_url, thumbnail_url, status, error_message')
        .eq('project_id', projectId)
        .order('last_updated', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (activeTab === 'queued') {
        query = query.eq('status', 'queued')
      } else if (activeTab === 'processing') {
        // Include all in-flight statuses
        query = query.in('status', ['processing', 'optimizing', 'submitted'])
      } else if (activeTab === 'failed') {
        query = query.eq('status', 'failed')
      }
      // For 'all', no status filter

      const { data: queueData } = await query

      return {
        images: (queueData || []).map(q => ({
          id: q.id,
          file_id: q.file_id,
          file_name: q.file_name,
          thumbnail_url: q.thumbnail_url || q.file_url,
          optimized_url: null,
          status: q.status,
          error_message: q.error_message
        })) as QueueImage[],
        nextPage: (queueData?.length || 0) === pageSize ? pageParam + 1 : undefined
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    refetchInterval: 5000
  })

  // Flatten pages into single array
  const images = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap(page => page.images)
  }, [data])

  // Load more when scrolling
  const handleLoadMore = useCallback(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Trigger load more
  if (inView && hasNextPage && !isFetchingNextPage) {
    handleLoadMore()
  }

  // Get counts for tabs
  const tabCounts = useMemo(() => ({
    all: queueStats?.total || 0,
    queued: queueStats?.queued || 0,
    processing: queueStats?.processing || 0,
    success: queueStats?.completed || 0,
    failed: queueStats?.failed || 0
  }), [queueStats])

  // Handle select all visible
  const handleSelectAllVisible = () => {
    const allIds = images.map(img => img.id)
    const allSelected = allIds.every(id => selectedImages.includes(id))

    if (allSelected) {
      onSelectAll([])
    } else {
      onSelectAll(allIds)
    }
  }

  const allVisibleSelected = images.length > 0 && images.every(img => selectedImages.includes(img.id))

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Status Tabs */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-2 shrink-0 overflow-x-auto">
        {statusTabs.map(tab => {
          const count = tabCounts[tab.id as keyof typeof tabCounts]
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0',
                activeTab === tab.id
                  ? tab.color
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              )}
            >
              {Icon && (
                <Icon className={cn('h-3 w-3', tab.animate && activeTab === tab.id && 'animate-spin')} />
              )}
              {tab.label}
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'h-4 min-w-4 px-1 text-[10px]',
                    activeTab === tab.id ? 'bg-white/50' : ''
                  )}
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}

        {/* Select All */}
        {images.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAllVisible}
            className="ml-auto h-7 text-xs gap-1"
          >
            {allVisibleSelected ? (
              <CheckSquare className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </div>

      {/* Image Grid */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No images in this category</p>
            <p className="text-xs">
              {activeTab === 'all' && 'Add images to start processing'}
              {activeTab === 'queued' && 'No images waiting in queue'}
              {activeTab === 'processing' && 'No images currently processing'}
              {activeTab === 'success' && 'No images processed yet'}
              {activeTab === 'failed' && 'No failed images'}
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {images.map((image) => (
                <ImageCard
                  key={image.id}
                  id={image.id}
                  fileId={image.file_id}
                  fileName={image.file_name}
                  thumbnailUrl={image.thumbnail_url}
                  optimizedUrl={image.optimized_url}
                  status={image.status}
                  errorMessage={image.error_message}
                  isSelected={selectedImages.includes(image.id)}
                  onSelect={(id, selected) => onImageSelect(id, selected)}
                />
              ))}
            </div>

            {/* Load More Trigger */}
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                {isFetchingNextPage && (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

