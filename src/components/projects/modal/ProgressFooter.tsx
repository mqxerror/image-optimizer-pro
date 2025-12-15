import { useMemo } from 'react'
import { Play, Pause, RefreshCw, Loader2, Timer, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Project } from '@/types/database'
import type { ProjectQueueStats } from '@/components/project-detail/hooks/useProjectQueueStats'

interface ProgressFooterProps {
  project: Project
  queueStats?: ProjectQueueStats
  onStart: () => void
  onPause: () => void
  onRetryFailed: () => void
  isUpdating: boolean
}

export function ProgressFooter({
  project,
  queueStats,
  onStart,
  onPause,
  onRetryFailed,
  isUpdating
}: ProgressFooterProps) {
  const progress = project.total_images > 0
    ? Math.round((project.processed_images / project.total_images) * 100)
    : 0

  const isActive = project.status === 'active'
  const isDraft = project.status === 'draft'
  const isPaused = project.status === 'draft' && project.processed_images > 0
  // Can start if draft/paused and has images in queue
  const hasQueuedImages = (queueStats?.queued || 0) > 0
  const canStart = !isActive && hasQueuedImages
  const failedCount = queueStats?.failed || 0

  // Calculate ETA
  const eta = useMemo(() => {
    if (!isActive || project.processed_images === 0) return null

    // Average time per image: ~30 seconds
    const averageSecondsPerImage = 30
    const remainingImages = project.total_images - project.processed_images
    const remainingSeconds = remainingImages * averageSecondsPerImage

    if (remainingSeconds < 60) return 'Less than 1 min'
    if (remainingSeconds < 3600) return `~${Math.ceil(remainingSeconds / 60)} min`
    return `~${Math.round(remainingSeconds / 3600 * 10) / 10} hrs`
  }, [isActive, project.processed_images, project.total_images])

  // Token estimate
  const tokenMultiplier = project.resolution === '4K' ? 2 : 1
  const estimatedTokens = (project.total_images - project.processed_images) * tokenMultiplier

  return (
    <div className="px-4 py-3 border-t bg-gray-50 shrink-0 space-y-2">
      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="font-medium text-foreground">
            {project.processed_images} / {project.total_images} processed
          </span>

          {project.total_tokens > 0 && (
            <span className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              {project.total_tokens} used
            </span>
          )}

          {estimatedTokens > 0 && (
            <span className="text-xs">
              (~{estimatedTokens} remaining)
            </span>
          )}

          {eta && isActive && (
            <span className="flex items-center gap-1 text-blue-600">
              <Timer className="h-3.5 w-3.5" />
              {eta}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryFailed}
              className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
              Retry {failedCount} Failed
            </Button>
          )}

          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              disabled={isUpdating}
              className="h-8 gap-1.5"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pause
            </Button>
          ) : canStart ? (
            <Button
              size="sm"
              onClick={onStart}
              disabled={isUpdating}
              className="h-8 gap-1.5 bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPaused ? 'Resume' : 'Start All'}
            </Button>
          ) : !isActive && !hasQueuedImages ? (
            <span className="text-sm text-muted-foreground">No images in queue</span>
          ) : null}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          {queueStats && (
            <div className="flex gap-3">
              {queueStats.queued > 0 && (
                <span>{queueStats.queued} queued</span>
              )}
              {queueStats.processing > 0 && (
                <span className="text-blue-600">{queueStats.processing} processing</span>
              )}
              {queueStats.failed > 0 && (
                <span className="text-red-600">{queueStats.failed} failed</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
