import { useState, useEffect } from 'react'
import {
  Settings2,
  Pause,
  Play,
  Loader2,
  Clock,
  AlertTriangle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  useAutomationConfig,
  useAutomationStats
} from '@/hooks/useAutomationConfig'
import { usePendingQueue, useExcludedProducts } from '@/hooks/usePendingQueue'
import { useAutomationHistory } from '@/hooks/useAutomationHistory'
import { SafetyControlsPanel } from './SafetyControlsPanel'
import { TriggersPanel } from './TriggersPanel'
import { PendingQueuePanel } from './PendingQueuePanel'
import { AutomationHistoryPanel } from './AutomationHistoryPanel'
import { ExcludedProductsPanel } from './ExcludedProductsPanel'
import { TestRunCard } from './TestRunCard'
import type { AdvancedSchedulingModalProps, AutomationConfigForm, QueueFilters } from './types'
import { formatDistanceToNow } from 'date-fns'

export function AdvancedSchedulingModal({
  open,
  onOpenChange,
  storeId,
  storeName
}: AdvancedSchedulingModalProps) {
  const { toast } = useToast()

  // Data hooks
  const {
    config,
    isLoading: loadingConfig,
    defaultForm,
    configToForm,
    updateConfig,
    isUpdating,
    togglePause,
    isTogglingPause
  } = useAutomationConfig(storeId)

  const { data: stats } = useAutomationStats(storeId)
  const { data: runs = [], isLoading: loadingHistory } = useAutomationHistory(storeId)

  // Queue state
  const [queueFilters, setQueueFilters] = useState<QueueFilters>({})
  const {
    items: queueItems,
    isLoading: loadingQueue,
    updatePriority,
    excludeProducts,
    removeFromQueue,
    processNow
  } = usePendingQueue(storeId, queueFilters)

  const {
    products: excludedProducts,
    isLoading: loadingExcluded,
    restoreProducts
  } = useExcludedProducts(storeId)

  // Form state
  const [form, setForm] = useState<AutomationConfigForm>(defaultForm)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form from config
  useEffect(() => {
    if (config) {
      setForm(configToForm(config))
      setHasChanges(false)
    }
  }, [config])

  // Track changes
  const handleFormChange = (updates: Partial<AutomationConfigForm>) => {
    setForm(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  // Save changes
  const handleSave = async () => {
    try {
      await updateConfig(form)
      setHasChanges(false)
      toast({
        title: 'Settings saved',
        description: 'Your automation settings have been updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Toggle pause
  const handleTogglePause = async () => {
    try {
      await togglePause(!config?.is_paused)
      toast({
        title: config?.is_paused ? 'Automation resumed' : 'Automation paused',
        description: config?.is_paused
          ? 'Automation will continue processing.'
          : 'Automation has been paused.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle pause. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Queue actions
  const handlePriorityChange = async (ids: string[], priority: 'high' | 'normal' | 'low') => {
    try {
      await updatePriority({ itemIds: ids, priority })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update priority.', variant: 'destructive' })
    }
  }

  const handleExclude = async (ids: string[]) => {
    try {
      await excludeProducts({ itemIds: ids })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to exclude products.', variant: 'destructive' })
    }
  }

  const handleRemove = async (ids: string[]) => {
    try {
      await removeFromQueue(ids)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove items.', variant: 'destructive' })
    }
  }

  const handleProcess = async (ids: string[]) => {
    try {
      await processNow(ids)
      toast({
        title: 'Processing started',
        description: `${ids.length} products queued for immediate processing.`
      })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process items.', variant: 'destructive' })
    }
  }

  const handleRestore = async (productIds: string[]) => {
    try {
      await restoreProducts(productIds)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to restore products.', variant: 'destructive' })
    }
  }

  const isLoading = loadingConfig

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">Advanced Automation Settings</DialogTitle>
                <p className="text-sm text-muted-foreground">{storeName}</p>
              </div>
            </div>

            {/* Status header */}
            {config && (
              <div className="flex items-center gap-3">
                {/* Master toggle */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <span className="text-sm font-medium">
                    Automation:
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      form.is_enabled && !config.is_paused
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    )}
                  >
                    {config.is_paused ? 'PAUSED' : form.is_enabled ? 'ACTIVE' : 'OFF'}
                  </Badge>
                  <Switch
                    checked={form.is_enabled}
                    onCheckedChange={(checked) => handleFormChange({ is_enabled: checked })}
                    disabled={isUpdating}
                  />
                </div>

                {/* Pause button */}
                {form.is_enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePause}
                    disabled={isTogglingPause}
                  >
                    {isTogglingPause ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : config.is_paused ? (
                      <>
                        <Play className="h-4 w-4 mr-1.5" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-1.5" />
                        Pause All
                      </>
                    )}
                  </Button>
                )}

                {/* Last run time */}
                {config.schedule_last_run_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Last run:{' '}
                    {formatDistanceToNow(new Date(config.schedule_last_run_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Paused warning */}
          {config?.is_paused && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Automation is paused.</span>
              {config.paused_reason && (
                <span className="text-amber-600">Reason: {config.paused_reason}</span>
              )}
            </div>
          )}
        </DialogHeader>

        <Separator />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Two column layout for Safety + History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SafetyControlsPanel
                  config={config ?? null}
                  form={form}
                  onChange={handleFormChange}
                  stats={stats ?? null}
                />
                <AutomationHistoryPanel
                  runs={runs}
                  isLoading={loadingHistory}
                  stats={stats ?? null}
                />
              </div>

              {/* Triggers */}
              <TriggersPanel
                form={form}
                onChange={handleFormChange}
                webhookSecret={config?.webhook_secret}
              />

              {/* Pending Queue */}
              <PendingQueuePanel
                storeId={storeId}
                items={queueItems}
                isLoading={loadingQueue}
                filters={queueFilters}
                onFiltersChange={setQueueFilters}
                onPriorityChange={handlePriorityChange}
                onExclude={handleExclude}
                onRemove={handleRemove}
                onProcess={handleProcess}
              />

              {/* Excluded Products */}
              <ExcludedProductsPanel
                storeId={storeId}
                products={excludedProducts}
                isLoading={loadingExcluded}
                onRestore={handleRestore}
              />

              {/* Test Run Card */}
              <TestRunCard
                storeId={storeId}
                config={config ?? null}
              />
            </>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600">Unsaved changes</span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
