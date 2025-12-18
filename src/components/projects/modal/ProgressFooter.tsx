import { useState, useMemo } from 'react'
import {
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Timer,
  Coins,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'
import type { ProjectQueueStats } from '@/components/project-detail/hooks/useProjectQueueStats'
import { AI_MODEL_CONFIG } from './RunActionBar'

// Processing pipeline steps with AI-native explanations
const PROCESSING_STEPS = [
  {
    id: 'background',
    label: 'Background',
    shortLabel: 'BG',
    description: 'Isolating product and normalizing to pure white'
  },
  {
    id: 'shadow',
    label: 'Shadow',
    shortLabel: 'Shadow',
    description: 'Generating soft grounded shadow for depth'
  },
  {
    id: 'retouch',
    label: 'Retouch',
    shortLabel: 'Retouch',
    description: 'Dust removal, reflection control, metal enhancement'
  },
  {
    id: 'framing',
    label: 'Framing',
    shortLabel: 'Frame',
    description: 'Crop-safe padding for ads and product pages'
  },
  {
    id: 'output',
    label: 'Output',
    shortLabel: 'Output',
    description: 'Exporting web-ready optimized assets'
  },
]

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
  const [detailsOpen, setDetailsOpen] = useState(false)

  const progress = project.total_images > 0
    ? Math.round((project.processed_images / project.total_images) * 100)
    : 0

  const isActive = project.status === 'active'
  const isPaused = project.status === 'draft' && project.processed_images > 0
  const hasQueuedImages = (queueStats?.queued || 0) > 0
  const canStart = !isActive && hasQueuedImages
  const failedCount = queueStats?.failed || 0
  const processingCount = queueStats?.processing || 0
  // Completed count = total - (queued + processing + failed)
  const completedCount = project.processed_images || 0

  // Calculate current step based on processing progress
  const currentStep = useMemo(() => {
    if (!isActive && processingCount === 0) return null

    // Simulate step progression based on total progress
    // Each step represents ~20% of the work
    const stepIndex = Math.min(Math.floor(progress / 20), PROCESSING_STEPS.length - 1)
    return {
      index: stepIndex + 1,
      total: PROCESSING_STEPS.length,
      current: PROCESSING_STEPS[stepIndex],
      next: stepIndex < PROCESSING_STEPS.length - 1 ? PROCESSING_STEPS[stepIndex + 1] : null,
    }
  }, [isActive, processingCount, progress])

  // Calculate ETA with better granularity
  const eta = useMemo(() => {
    if (!isActive && processingCount === 0) return null

    // Use unified config for time per image
    const modelId = project.ai_model || 'flux-kontext-pro'
    const modelConfig = AI_MODEL_CONFIG[modelId]
    const secondsPerImage = modelConfig?.timePerImage || 15

    const remainingImages = (queueStats?.queued || 0) + (queueStats?.processing || 0)
    const remainingSeconds = remainingImages * secondsPerImage

    if (remainingSeconds < 60) return { text: '< 1 min', seconds: remainingSeconds }
    if (remainingSeconds < 3600) {
      const mins = Math.ceil(remainingSeconds / 60)
      return { text: `${mins} min`, seconds: remainingSeconds }
    }
    const hours = Math.round(remainingSeconds / 3600 * 10) / 10
    return { text: `${hours} hrs`, seconds: remainingSeconds }
  }, [isActive, processingCount, queueStats, project.ai_model])

  // Token estimate
  const tokenMultiplier = project.resolution === '4K' ? 2 : 1
  const remainingTokens = ((queueStats?.queued || 0) + (queueStats?.processing || 0)) * tokenMultiplier

  return (
    <div className="border-t bg-slate-50 shrink-0">
      {/* Main Progress Bar */}
      <div className="px-4 py-3 space-y-2">
        {/* Step-based progress header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            {(isActive || processingCount > 0) && currentStep ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Step {currentStep.index}/{currentStep.total}:
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentStep.current.label}
                  {currentStep.next && ` → ${currentStep.next.label}`}
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {completedCount} / {project.total_images || (queueStats?.total || 0)} processed
              </span>
            )}

            {/* ETA */}
            {eta && (isActive || processingCount > 0) && (
              <span className="flex items-center gap-1 text-sm text-blue-600">
                <Timer className="h-3.5 w-3.5" />
                {eta.text} remaining
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
                className="h-8 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retry {failedCount}
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
            ) : null}
          </div>
        </div>

        {/* Progress Bar with Steps */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />

          {/* Step markers */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
            {PROCESSING_STEPS.map((step, idx) => {
              const stepProgress = ((idx + 1) / PROCESSING_STEPS.length) * 100
              const isComplete = progress >= stepProgress
              const isCurrent = currentStep?.index === idx + 1

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-0.5",
                    isComplete ? "text-green-600" : isCurrent ? "text-blue-600" : ""
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="h-2.5 w-2.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Circle className="h-2.5 w-2.5" />
                  )}
                  <span className="hidden sm:inline">{step.shortLabel}</span>
                </div>
              )
            })}
          </div>

          {/* Live step explanation - shows what the AI is doing */}
          {(isActive || processingCount > 0) && currentStep && (
            <p className="text-[11px] text-blue-600/80 italic text-center pt-1">
              {currentStep.current.description}
            </p>
          )}
        </div>

        {/* Summary stats */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          <div className="flex gap-3">
            {(queueStats?.queued || 0) > 0 && (
              <span>{queueStats?.queued} to process</span>
            )}
            {processingCount > 0 && (
              <span className="text-blue-600">{processingCount} running</span>
            )}
            {failedCount > 0 && (
              <span className="text-amber-600">{failedCount} need fix</span>
            )}
            {remainingTokens > 0 && (
              <span className="flex items-center gap-0.5">
                <Coins className="h-3 w-3" />
                ~{remainingTokens} tokens
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {(processingCount > 0 || failedCount > 0) && (
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-slate-100 border-t transition-colors">
              {detailsOpen ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show details
                </>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-3 border-t bg-white space-y-2 max-h-32 overflow-y-auto">
              {/* Processing items */}
              {processingCount > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Currently Processing
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    <span>{processingCount} images in progress...</span>
                  </div>
                </div>
              )}

              {/* Failed items summary */}
              {failedCount > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Need Attention
                  </p>
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>{failedCount} images failed - click "Retry" to reprocess</span>
                  </div>
                </div>
              )}

              {/* Recent completions */}
              {completedCount > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Ready for Review
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>{completedCount} images completed successfully</span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
