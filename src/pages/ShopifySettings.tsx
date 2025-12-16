import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Save,
  Loader2,
  Bell,
  Clock,
  Zap,
  Settings,
  FileText,
  AlertCircle,
  Settings2,
  ChevronRight,
  Sparkles,
  CheckCircle,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useShopifyStore, useUpdateStoreSettings } from '@/hooks/useShopify'
import { useTemplates } from '@/hooks/useTemplates'
import { useToast } from '@/hooks/use-toast'
import { AdvancedSchedulingModal } from '@/components/shopify/scheduling-modal'
import type { ShopifyStoreSettings } from '@/types/shopify'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

const SCHEDULE_TIMES = [
  { value: '00:00', label: '12:00 AM' },
  { value: '02:00', label: '2:00 AM' },
  { value: '04:00', label: '4:00 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '22:00', label: '10:00 PM' },
]

export default function ShopifySettings() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Data
  const { data: store, isLoading: storeLoading } = useShopifyStore(storeId!)
  const { data: templates } = useTemplates()
  const updateMutation = useUpdateStoreSettings()

  // Local form state
  const [settings, setSettings] = useState<ShopifyStoreSettings | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [automationModalOpen, setAutomationModalOpen] = useState(false)

  // Initialize form when store loads
  useEffect(() => {
    if (store?.settings) {
      setSettings(store.settings)
      setHasChanges(false)
    }
  }, [store])

  // Update setting helper
  const updateSetting = <K extends keyof ShopifyStoreSettings>(
    key: K,
    value: ShopifyStoreSettings[K]
  ) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  // Update schedule helper
  const updateSchedule = (
    key: 'frequency' | 'time' | 'timezone',
    value: string
  ) => {
    if (!settings) return
    const currentSchedule = settings.schedule || {
      frequency: 'daily',
      time: '02:00',
      timezone: 'America/New_York'
    }
    setSettings({
      ...settings,
      schedule: { ...currentSchedule, [key]: value }
    })
    setHasChanges(true)
  }

  // Save settings
  const handleSave = async () => {
    if (!storeId || !settings) return

    try {
      await updateMutation.mutateAsync({ storeId, settings })
      toast({ title: 'Settings saved', description: 'Your store settings have been updated.' })
      setHasChanges(false)
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description: (err as Error).message,
        variant: 'destructive'
      })
    }
  }

  if (storeLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Store not found</p>
        <Button variant="link" onClick={() => navigate('/shopify')}>
          Back to Shopify
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Shopify', href: '/shopify' },
          { label: store.shop_name || store.shop_domain, href: `/shopify/${storeId}/products` },
          { label: 'Settings' }
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Store Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure optimization settings for {store.shop_name || store.shop_domain}
        </p>
      </div>

      {/* Advanced Automation Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm border">
              <Settings2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-purple-900">Advanced Automation</h3>
                <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  New
                </span>
              </div>
              <p className="text-sm text-purple-700 mt-1">
                Configure webhooks, schedules, safety controls, and batch processing for large catalogs
              </p>
            </div>
            <Button
              onClick={() => setAutomationModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Configure
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unsaved changes warning */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Optimization Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimization Mode
          </CardTitle>
          <CardDescription>
            Choose how images should be optimized when detected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <OptimizationModeOption
              selected={settings.optimization_mode === 'manual'}
              onSelect={() => updateSetting('optimization_mode', 'manual')}
              title="Manual Only"
              description="Only optimize when you manually select products"
            />
            <OptimizationModeOption
              selected={settings.optimization_mode === 'preview'}
              onSelect={() => updateSetting('optimization_mode', 'preview')}
              title="Preview First"
              description="Auto-process new products but require approval before pushing"
              recommended
            />
            <OptimizationModeOption
              selected={settings.optimization_mode === 'auto'}
              onSelect={() => updateSetting('optimization_mode', 'auto')}
              title="Auto-Optimize"
              description="Automatically optimize and push new product images"
            />
            <OptimizationModeOption
              selected={settings.optimization_mode === 'scheduled'}
              onSelect={() => updateSetting('optimization_mode', 'scheduled')}
              title="Scheduled"
              description="Optimize products on a regular schedule"
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings (only if scheduled mode) */}
      {settings.optimization_mode === 'scheduled' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Configuration
            </CardTitle>
            <CardDescription>
              Set when optimization jobs should run
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={settings.schedule?.frequency || 'daily'}
                  onValueChange={(v) => updateSchedule('frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Select
                  value={settings.schedule?.time || '02:00'}
                  onValueChange={(v) => updateSchedule('time', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TIMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={settings.schedule?.timezone || 'America/New_York'}
                onValueChange={(v) => updateSchedule('timezone', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Preset */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Default Optimization Settings
          </CardTitle>
          <CardDescription>
            Choose a default template for image optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Template</Label>
            <Select
              value={settings.default_preset_id || '__none__'}
              onValueChange={(v) => {
                const value = v === '__none__' ? null : v
                updateSetting('default_preset_id', value)
                updateSetting('default_preset_type', value ? 'template' : null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use standard settings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Use standard settings</SelectItem>
                {(templates || []).map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This template will be applied to all automatic and scheduled optimizations
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Approval Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Approval Workflow
          </CardTitle>
          <CardDescription>
            Control how processed images are approved for pushing to Shopify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                Auto-approve Jobs
                {settings.auto_approve_jobs && (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </span>
                )}
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve and push images when processing completes
              </p>
            </div>
            <Switch
              checked={settings.auto_approve_jobs ?? false}
              onCheckedChange={(v: boolean) => updateSetting('auto_approve_jobs', v)}
            />
          </div>

          {settings.auto_approve_jobs && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Jobs will automatically push optimized images to your Shopify store once processing is complete.
                No manual approval required.
              </AlertDescription>
            </Alert>
          )}

          {!settings.auto_approve_jobs && (
            <Alert className="border-blue-200 bg-blue-50">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Jobs will wait for your manual approval before pushing images to Shopify.
                You can review all processed images before they go live.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure when you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Products</Label>
              <p className="text-sm text-muted-foreground">
                Notify when new products are detected
              </p>
            </div>
            <Switch
              checked={settings.notify_on_new_products}
              onCheckedChange={(v: boolean) => updateSetting('notify_on_new_products', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Job Completion</Label>
              <p className="text-sm text-muted-foreground">
                Notify when optimization jobs complete
              </p>
            </div>
            <Switch
              checked={settings.notify_on_completion}
              onCheckedChange={(v: boolean) => updateSetting('notify_on_completion', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Advanced Automation Modal */}
      <AdvancedSchedulingModal
        open={automationModalOpen}
        onOpenChange={setAutomationModalOpen}
        storeId={storeId!}
        storeName={store.shop_name || store.shop_domain}
      />
    </div>
  )
}

interface OptimizationModeOptionProps {
  selected: boolean
  onSelect: () => void
  title: string
  description: string
  recommended?: boolean
}

function OptimizationModeOption({
  selected,
  onSelect,
  title,
  description,
  recommended
}: OptimizationModeOptionProps) {
  return (
    <div
      className={`relative flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
        selected ? 'border-primary bg-primary' : 'border-muted-foreground'
      }`}>
        {selected && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {recommended && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
