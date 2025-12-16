import { formatDistanceToNow, format } from 'date-fns'
import {
  History,
  CheckCircle,
  XCircle,
  Loader2,
  Pause,
  AlertCircle,
  Webhook,
  Calendar,
  Hand,
  Beaker
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AutomationHistoryPanelProps, AutomationRun } from './types'

const triggerIcons: Record<string, typeof Webhook> = {
  webhook: Webhook,
  scheduled: Calendar,
  manual: Hand,
  test: Beaker
}

const triggerLabels: Record<string, string> = {
  webhook: 'Webhook',
  scheduled: 'Scheduled',
  manual: 'Manual',
  test: 'Test Run'
}

const statusConfig: Record<string, {
  icon: typeof CheckCircle
  color: string
  bgColor: string
  label: string
}> = {
  running: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Running'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Completed'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed'
  },
  paused: {
    icon: Pause,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Paused'
  },
  cancelled: {
    icon: AlertCircle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    label: 'Cancelled'
  }
}

export function AutomationHistoryPanel({
  runs,
  isLoading,
  stats
}: AutomationHistoryPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold">Automation History</h3>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold">{(stats.successRate * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold">{stats.totalRuns}</p>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold">
              {stats.totalImagesProcessed >= 1000
                ? `${(stats.totalImagesProcessed / 1000).toFixed(1)}k`
                : stats.totalImagesProcessed}
            </p>
            <p className="text-xs text-muted-foreground">Images Processed</p>
          </div>
        </div>
      )}

      {/* Recent runs */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Recent Runs</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : runs.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {runs.map(run => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg">
            <History className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">No runs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              History will appear here after automation runs
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function RunRow({ run }: { run: AutomationRun }) {
  const status = statusConfig[run.status] || statusConfig.completed
  const StatusIcon = status.icon
  const TriggerIcon = triggerIcons[run.trigger_type] || Hand

  const totalImages = run.images_processed + run.images_failed
  const progress = totalImages > 0
    ? (run.images_processed / totalImages) * 100
    : run.status === 'completed' ? 100 : 0

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
      {/* Status icon */}
      <div className={cn('p-2 rounded-lg', status.bgColor)}>
        <StatusIcon className={cn(
          'h-4 w-4',
          status.color,
          run.status === 'running' && 'animate-spin'
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs px-1.5">
            <TriggerIcon className="h-3 w-3 mr-1" />
            {triggerLabels[run.trigger_type]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-xs px-1.5',
              status.bgColor,
              status.color
            )}
          >
            {status.label}
          </Badge>
        </div>

        {/* Progress/stats */}
        <div className="flex items-center gap-3">
          {run.status === 'running' ? (
            <div className="flex-1 flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1 max-w-32" />
              <span className="text-xs text-muted-foreground">
                {run.images_processed}/{run.images_queued}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {run.images_processed} images
              {run.images_failed > 0 && (
                <span className="text-red-600 ml-1">
                  ({run.images_failed} failed)
                </span>
              )}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            {run.completed_at
              ? format(new Date(run.completed_at), 'MMM d')
              : formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}
