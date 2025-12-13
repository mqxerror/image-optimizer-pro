import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { format } from 'date-fns'
import {
  CheckCircle,
  XCircle,
  Clock,
  Coins,
  Cpu,
  Loader2,
  Activity,
  ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useProjectHistory, flattenHistoryPages } from './hooks/useProjectHistory'

interface ProcessingTimelineTabProps {
  projectId: string
}

export function ProcessingTimelineTab({ projectId }: ProcessingTimelineTabProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useProjectHistory(projectId)

  const { ref: loadMoreRef, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const items = flattenHistoryPages(data?.pages)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <Activity className="h-12 w-12 mb-3 text-gray-300" />
        <p className="text-sm">No processing history yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Processing events will appear here
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3">
        {items.map((item) => {
          const isSuccess = item.status === 'success' || item.status === 'completed'
          const hasFailed = item.status === 'failed'

          return (
            <div
              key={item.id}
              className={`relative pl-6 pb-3 border-l-2 ${
                isSuccess ? 'border-green-200' : hasFailed ? 'border-red-200' : 'border-gray-200'
              }`}
            >
              {/* Status Dot */}
              <div
                className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                  isSuccess ? 'bg-green-500' : hasFailed ? 'bg-red-500' : 'bg-gray-400'
                }`}
              />

              {/* Content */}
              <div className="bg-gray-50 rounded-lg p-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSuccess ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">
                      {item.file_name || 'Untitled'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {item.completed_at
                      ? format(new Date(item.completed_at), 'MMM d, HH:mm')
                      : 'Processing...'}
                  </span>
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {item.ai_model && (
                    <Badge variant="outline" className="text-xs">
                      <Cpu className="h-3 w-3 mr-1" />
                      {item.ai_model}
                    </Badge>
                  )}
                  {item.tokens_used !== undefined && item.tokens_used !== null && (
                    <Badge variant="outline" className="text-xs">
                      <Coins className="h-3 w-3 mr-1" />
                      {item.tokens_used} tokens
                    </Badge>
                  )}
                  {item.processing_time_sec && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.processing_time_sec}s
                    </Badge>
                  )}
                </div>

                {/* Error Message */}
                {item.error_message && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 mt-2 text-xs text-red-600 hover:text-red-700">
                      <ChevronDown className="h-3 w-3" />
                      View error details
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                        {item.error_message}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>
          )
        })}

        {/* Load More */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
