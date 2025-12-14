import { useState } from 'react'
import { Webhook, Calendar, Clock, Copy, Check, Radio } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TriggersPanelProps } from './types'

const DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' }
]

const TIMES = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' }
]

export function TriggersPanel({ form, onChange, webhookSecret }: TriggersPanelProps) {
  const [copied, setCopied] = useState(false)

  const copyWebhookUrl = async () => {
    if (!webhookSecret) return

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-webhook-receiver?secret=${webhookSecret}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleDay = (day: string) => {
    const current = form.schedule_days || []
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day]
    onChange({ schedule_days: updated })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold">Triggers</h3>
      </div>

      {/* Webhook Trigger */}
      <div className={cn(
        'p-4 rounded-lg border transition-colors',
        form.webhook_enabled ? 'bg-purple-50/50 border-purple-200' : 'bg-gray-50'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              form.webhook_enabled ? 'bg-purple-100' : 'bg-gray-100'
            )}>
              <Webhook className={cn(
                'h-5 w-5',
                form.webhook_enabled ? 'text-purple-600' : 'text-gray-500'
              )} />
            </div>
            <div>
              <Label className="text-sm font-medium">Webhook Trigger</Label>
              <p className="text-xs text-muted-foreground">
                Auto-queue when new products are added to Shopify
              </p>
            </div>
          </div>
          <Switch
            checked={form.webhook_enabled}
            onCheckedChange={(checked) => onChange({ webhook_enabled: checked })}
          />
        </div>

        {form.webhook_enabled && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                Listening
              </Badge>
              <span className="text-xs text-muted-foreground">
                for product/create events
              </span>
            </div>

            {webhookSecret && (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-100 px-2 py-1.5 rounded border truncate">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-webhook...`}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWebhookUrl}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Trigger */}
      <div className={cn(
        'p-4 rounded-lg border transition-colors',
        form.schedule_enabled ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              form.schedule_enabled ? 'bg-blue-100' : 'bg-gray-100'
            )}>
              <Calendar className={cn(
                'h-5 w-5',
                form.schedule_enabled ? 'text-blue-600' : 'text-gray-500'
              )} />
            </div>
            <div>
              <Label className="text-sm font-medium">Schedule Trigger</Label>
              <p className="text-xs text-muted-foreground">
                Automatically process at scheduled times
              </p>
            </div>
          </div>
          <Switch
            checked={form.schedule_enabled}
            onCheckedChange={(checked) => onChange({ schedule_enabled: checked })}
          />
        </div>

        {form.schedule_enabled && (
          <div className="mt-4 space-y-4">
            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Select
                  value={form.schedule_frequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'twice_daily') =>
                    onChange({ schedule_frequency: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Select
                  value={form.schedule_time}
                  onValueChange={(value) => onChange({ schedule_time: value })}
                >
                  <SelectTrigger className="h-9">
                    <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMES.map(time => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Days (for weekly) */}
            {form.schedule_frequency === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Days</Label>
                <div className="flex gap-1">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                        form.schedule_days?.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Timezone</Label>
              <Select
                value={form.schedule_timezone}
                onValueChange={(value) => onChange({ schedule_timezone: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-2 py-2 px-3 bg-blue-100/50 rounded-md text-sm text-blue-700">
              <Calendar className="h-4 w-4" />
              <span>
                Runs {form.schedule_frequency === 'daily' && 'every day'}
                {form.schedule_frequency === 'twice_daily' && 'twice daily'}
                {form.schedule_frequency === 'weekly' && (
                  <>on {(form.schedule_days || []).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}</>
                )}
                {' '}at {form.schedule_time} {TIMEZONES.find(t => t.value === form.schedule_timezone)?.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
