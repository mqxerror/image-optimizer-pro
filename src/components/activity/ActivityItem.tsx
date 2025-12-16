import { useState } from 'react'
import { ExternalLink, Clock, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon, Wand2, Layers, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ActivityItem as ActivityItemType, ActivitySource, PipelineStep } from '@/hooks/useActivityData'

interface ActivityItemProps {
  item: ActivityItemType
  onViewResult?: (item: ActivityItemType) => void
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remainingSec = sec % 60
  return `${min}m ${remainingSec}s`
}

function getSourceIcon(source: ActivitySource) {
  switch (source) {
    case 'studio':
      return <Wand2 className="h-3 w-3" />
    case 'combination':
      return <Layers className="h-3 w-3" />
    case 'queue':
    case 'history':
      return <FolderKanban className="h-3 w-3" />
  }
}

function getSourceLabel(source: ActivitySource): string {
  switch (source) {
    case 'studio':
      return 'Studio'
    case 'combination':
      return 'Combination'
    case 'queue':
      return 'Queue'
    case 'history':
      return 'Project'
  }
}

function getStatusColor(step: PipelineStep): string {
  switch (step) {
    case 'queued':
      return 'text-slate-400'
    case 'processing':
      return 'text-blue-400'
    case 'complete':
      return 'text-green-400'
    case 'failed':
      return 'text-red-400'
  }
}

function StepDot({ active, current, failed }: { active: boolean; current: boolean; failed?: boolean }) {
  return (
    <div
      className={cn(
        'w-2.5 h-2.5 rounded-full transition-all',
        failed ? 'bg-red-500' : active ? 'bg-green-500' : 'bg-slate-300',
        current && !failed && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-white bg-blue-500 animate-pulse'
      )}
    />
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={cn(
        'h-0.5 w-4 transition-colors',
        completed ? 'bg-green-500' : 'bg-slate-200'
      )}
    />
  )
}

export function ActivityItem({ item, onViewResult }: ActivityItemProps) {
  const [imageError, setImageError] = useState(false)
  const isFailed = item.pipelineStep === 'failed'

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
        {item.thumbnailUrl && !imageError ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-slate-300" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-slate-900 truncate max-w-[200px]">
            {item.fileName || 'Untitled'}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
            {getSourceIcon(item.source)}
            {getSourceLabel(item.source)}
          </Badge>
          {item.projectName && (
            <span className="text-xs text-slate-400 truncate max-w-[100px]">
              {item.projectName}
            </span>
          )}
        </div>

        {/* Pipeline Steps */}
        <div className="flex items-center gap-1.5 mb-1">
          <StepDot
            active={item.stepNumber >= 1}
            current={item.stepNumber === 1 && item.pipelineStep !== 'failed'}
            failed={isFailed && item.stepNumber === 1}
          />
          <span className="text-[10px] text-slate-500">Queued</span>
          <StepConnector completed={item.stepNumber > 1} />

          <StepDot
            active={item.stepNumber >= 2}
            current={item.stepNumber === 2 && item.pipelineStep !== 'failed'}
            failed={isFailed && item.stepNumber === 2}
          />
          <span className="text-[10px] text-slate-500">Processing</span>
          <StepConnector completed={item.stepNumber > 2} />

          <StepDot
            active={item.stepNumber >= 3 && !isFailed}
            current={item.stepNumber === 3 && item.pipelineStep !== 'failed'}
            failed={isFailed}
          />
          <span className="text-[10px] text-slate-500">
            {isFailed ? 'Failed' : 'Done'}
          </span>
        </div>

        {/* Status & Meta */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {item.pipelineStep === 'processing' && (
            <span className="flex items-center gap-1 text-blue-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing...
            </span>
          )}
          {item.pipelineStep === 'complete' && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </span>
          )}
          {item.pipelineStep === 'failed' && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="h-3 w-3" />
              {item.errorMessage ? item.errorMessage.slice(0, 30) + '...' : 'Failed'}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(item.createdAt)}
          </span>
          {item.processingTimeMs && (
            <span className="text-slate-400">
              {formatDuration(item.processingTimeMs)}
            </span>
          )}
          {item.aiModel && (
            <span className="text-slate-400 truncate max-w-[100px]">
              {item.aiModel}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {item.resultUrl && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onViewResult?.(item)}
          >
            <ExternalLink className="h-3 w-3" />
            View
          </Button>
        )}
      </div>
    </div>
  )
}
