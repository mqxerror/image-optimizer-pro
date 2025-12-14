import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SafetyControlsPanelProps } from './types'

export function SafetyControlsPanel({
  config,
  form,
  onChange,
  stats
}: SafetyControlsPanelProps) {
  const approvalComplete = config
    ? config.batches_completed >= config.approval_threshold
    : false

  const dailyProgress = config
    ? Math.min((config.daily_processed / form.daily_limit) * 100, 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold">Safety Controls</h3>
      </div>

      {/* Trust Building - Approval Requirement */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Trust Building</Label>
            <p className="text-xs text-muted-foreground">
              Require manual approval for first batches
            </p>
          </div>
          <Switch
            checked={form.require_approval}
            onCheckedChange={(checked) => onChange({ require_approval: checked })}
          />
        </div>

        {form.require_approval && (
          <div className="space-y-3 pl-0">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground min-w-fit">
                Require approval for first
              </Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.approval_threshold}
                onChange={(e) => onChange({ approval_threshold: parseInt(e.target.value) || 5 })}
                className="w-16 h-8 text-center"
              />
              <Label className="text-xs text-muted-foreground">batches</Label>
            </div>

            {/* Progress indicator */}
            {config && (
              <div className={cn(
                'flex items-center gap-2 py-2 px-3 rounded-md text-sm',
                approvalComplete
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              )}>
                {approvalComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Trust established! ({config.batches_completed} batches completed)</span>
                    <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-200">
                      Auto-approve enabled
                    </Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {config.batches_completed}/{config.approval_threshold} batches completed
                    </span>
                    <Badge variant="outline" className="ml-auto bg-amber-100 text-amber-700 border-amber-200">
                      Manual review
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Limits */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Daily Limit</Label>
            <p className="text-xs text-muted-foreground">
              Maximum images to process per day
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Slider
              value={[form.daily_limit]}
              onValueChange={([value]) => onChange({ daily_limit: value })}
              min={50}
              max={5000}
              step={50}
              className="flex-1"
            />
            <Input
              type="number"
              min={50}
              max={10000}
              value={form.daily_limit}
              onChange={(e) => onChange({ daily_limit: parseInt(e.target.value) || 500 })}
              className="w-24 h-8 text-center"
            />
          </div>

          {/* Today's progress */}
          {config && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Today's usage</span>
                <span>{config.daily_processed} / {form.daily_limit}</span>
              </div>
              <Progress
                value={dailyProgress}
                className={cn(
                  'h-2',
                  dailyProgress > 80 && 'bg-amber-100',
                  dailyProgress >= 100 && 'bg-red-100'
                )}
              />
              {dailyProgress >= 100 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Daily limit reached - automation paused until tomorrow
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auto-Pause on Failures */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Auto-Pause</Label>
            <p className="text-xs text-muted-foreground">
              Automatically pause if failure rate exceeds threshold
            </p>
          </div>
          <Switch
            checked={form.auto_pause_enabled}
            onCheckedChange={(checked) => onChange({ auto_pause_enabled: checked })}
          />
        </div>

        {form.auto_pause_enabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground min-w-fit">
                Pause if failure rate exceeds
              </Label>
              <Input
                type="number"
                min={5}
                max={50}
                value={Math.round(form.auto_pause_threshold * 100)}
                onChange={(e) => onChange({
                  auto_pause_threshold: (parseInt(e.target.value) || 15) / 100
                })}
                className="w-16 h-8 text-center"
              />
              <Label className="text-xs text-muted-foreground">%</Label>
            </div>

            {/* Current status */}
            {stats && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Current success rate:</span>
                <Badge
                  variant="outline"
                  className={cn(
                    stats.successRate >= 0.95 && 'bg-green-100 text-green-700 border-green-200',
                    stats.successRate >= 0.85 && stats.successRate < 0.95 && 'bg-amber-100 text-amber-700 border-amber-200',
                    stats.successRate < 0.85 && 'bg-red-100 text-red-700 border-red-200'
                  )}
                >
                  {(stats.successRate * 100).toFixed(1)}%
                </Badge>
                {stats.successRate < (1 - form.auto_pause_threshold) && (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Below threshold!
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paused indicator */}
        {config?.is_paused && (
          <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-red-50 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <span className="font-medium">Automation is paused</span>
              {config.paused_reason && (
                <span className="text-red-600 ml-1">- {config.paused_reason}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
