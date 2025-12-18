import { useMemo } from 'react'
import { Play, Eye, Loader2, Clock, DollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'
import type { ProjectQueueStats } from '@/components/project-detail/hooks/useProjectQueueStats'

// Unified AI model configuration - single source of truth
// User-facing names use tier system: Fast / Balanced / Premium
// Internal names kept for tooltips/technical reference
export const AI_MODEL_CONFIG: Record<string, {
  displayName: string      // User-facing tier name
  internalName: string     // Technical name for tooltips
  tier: 'fast' | 'balanced' | 'premium'
  tokenCost: number
  timePerImage: number     // seconds
  pricePerImage: string
  bestFor: string
  recommended?: boolean
}> = {
  'flux-kontext-pro': {
    displayName: 'Balanced',
    internalName: 'Kontext Pro',
    tier: 'balanced',
    tokenCost: 4,
    timePerImage: 15,
    pricePerImage: '$0.04',
    bestFor: 'Best for most images. Clean backgrounds, accurate metal tones.',
    recommended: true,
  },
  'flux-kontext-max': {
    displayName: 'Premium',
    internalName: 'Kontext Max',
    tier: 'premium',
    tokenCost: 8,
    timePerImage: 30,
    pricePerImage: '$0.08',
    bestFor: 'Higher quality for complex scenes. Maximum detail, intricate pieces.',
  },
  'nano-banana': {
    displayName: 'Fast',
    internalName: 'Nano',
    tier: 'fast',
    tokenCost: 2,
    timePerImage: 8,
    pricePerImage: '$0.02',
    bestFor: 'Quick batch processing. May miss fine details on complex pieces.',
  },
}

interface RunActionBarProps {
  project: Project
  queueStats?: ProjectQueueStats
  onPreviewRun: () => void
  onRunBatch: () => void
  isRunning: boolean
  isProcessing: boolean
}

export function RunActionBar({
  project,
  queueStats,
  onPreviewRun,
  onRunBatch,
  isRunning,
  isProcessing,
}: RunActionBarProps) {
  const previewCount = project.trial_count || 5
  const queuedCount = queueStats?.queued || 0
  const processingCount = queueStats?.processing || 0
  const aiModel = project.ai_model || 'flux-kontext-pro'
  const modelConfig = AI_MODEL_CONFIG[aiModel] || AI_MODEL_CONFIG['flux-kontext-pro']

  // Calculate cost and time estimates
  const estimates = useMemo(() => {
    const { tokenCost, timePerImage } = modelConfig

    // Preview run estimates - actual images to process
    const previewImages = Math.min(previewCount, queuedCount)
    const previewTokens = previewImages * tokenCost
    const previewCost = (previewTokens * 0.01).toFixed(2)
    const previewSeconds = previewImages * timePerImage

    // Full batch estimates
    const batchTokens = queuedCount * tokenCost
    const batchCost = (batchTokens * 0.01).toFixed(2)
    const batchSeconds = queuedCount * timePerImage

    return {
      preview: { images: previewImages, cost: previewCost, seconds: previewSeconds },
      batch: { images: queuedCount, cost: batchCost, seconds: batchSeconds },
    }
  }, [previewCount, queuedCount, modelConfig])

  // Format time estimate
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `~${Math.ceil(seconds)}s`
    const minutes = Math.ceil(seconds / 60)
    if (minutes < 60) return `~${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`
  }

  const hasQueuedImages = queuedCount > 0
  const isCurrentlyProcessing = processingCount > 0
  const canPreview = hasQueuedImages && estimates.preview.images > 0

  // Determine button states and labels
  const getPreviewLabel = () => {
    if (!hasQueuedImages) return 'Preview (add images)'
    return `Preview ${estimates.preview.images}`
  }

  return (
    <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
      <div className="flex items-center justify-between gap-4">
        {/* Preview Run */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  onClick={onPreviewRun}
                  disabled={!canPreview || isRunning || isProcessing || isCurrentlyProcessing}
                  className={cn(
                    "gap-2",
                    !hasQueuedImages && "text-muted-foreground"
                  )}
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : !hasQueuedImages ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {getPreviewLabel()}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p className="text-xs">
                  {!hasQueuedImages
                    ? 'Add images to your project to enable preview runs.'
                    : `Test your settings on ${estimates.preview.images} images before processing the full batch.`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Preview cost/time - only show when there are images */}
          {canPreview && (
            <span className="text-xs text-muted-foreground">
              {formatTime(estimates.preview.seconds)} • ${estimates.preview.cost}
            </span>
          )}
        </div>

        {/* Run Full Batch */}
        <div className="flex items-center gap-3">
          {/* Batch stats - only show when there are images */}
          {hasQueuedImages && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{queuedCount} images</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {formatTime(estimates.batch.seconds)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" />
                {estimates.batch.cost}
              </span>
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="default"
                  onClick={onRunBatch}
                  disabled={!hasQueuedImages || isRunning || isProcessing}
                  className={cn(
                    "gap-2 min-w-[120px]",
                    isCurrentlyProcessing && "bg-amber-600 hover:bg-amber-700"
                  )}
                >
                  {isProcessing || isCurrentlyProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isCurrentlyProcessing ? `Running (${processingCount})` : 'Starting...'}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Batch
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p className="text-xs">
                  {!hasQueuedImages
                    ? 'Add images to enable batch processing.'
                    : isCurrentlyProcessing
                    ? `${processingCount} images currently processing.`
                    : `Process all ${queuedCount} images with ${modelConfig.displayName}.`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Empty state - clear call to action for manual run behavior */}
      {!hasQueuedImages && !isCurrentlyProcessing && (
        <div className="mt-3 py-3 px-4 bg-slate-100 rounded-lg text-center space-y-1">
          <p className="text-sm text-foreground font-medium">
            Add images to enable Run Batch
          </p>
          <p className="text-xs text-muted-foreground">
            Run a Preview first to validate the look. Nothing processes until you click Run Batch.
          </p>
        </div>
      )}
    </div>
  )
}

export default RunActionBar
