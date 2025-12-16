import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Activity as ActivityIcon, CheckCircle2, AlertCircle, RefreshCw, ListOrdered, Cog, Trash2, Sparkles, Inbox, Clock, XCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/ui/empty-state'
import { useActivityData, type ActivityFilter, type ActivityItem as ActivityItemType } from '@/hooks/useActivityData'
import { ActivityItem } from '@/components/activity/ActivityItem'
import { GenerationDetailModal, type GenerationDetail } from '@/components/shared/GenerationDetailModal'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/auth'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'error' | 'warning'
  pulse?: boolean
}

function StatCard({ label, value, icon, variant = 'default', pulse }: StatCardProps) {
  const variantStyles = {
    default: 'bg-slate-50 border-slate-200 text-slate-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
  }

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`${pulse ? 'animate-pulse' : ''}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Convert ActivityItem to GenerationDetail for the modal
function activityToGenerationDetail(item: ActivityItemType): GenerationDetail {
  return {
    id: item.id,
    source: item.source as 'studio' | 'combination' | 'queue' | 'history',
    originalUrl: item.imageUrl,
    resultUrl: item.resultUrl,
    thumbnailUrl: item.thumbnailUrl,
    modelImageUrl: item.modelImageUrl,
    jewelryImageUrl: item.jewelryImageUrl,
    prompt: item.prompt,
    aiModel: item.aiModel,
    fileName: item.fileName,
    status: item.status,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    processingTimeSec: item.processingTimeMs ? item.processingTimeMs / 1000 : null,
    tokensUsed: item.tokensUsed,
    errorMessage: item.errorMessage,
    positionY: item.positionY,
    scale: item.scale,
    rotation: item.rotation,
    blendIntensity: item.blendIntensity,
    lightingMatch: item.lightingMatch,
    settingsSnapshot: item.settingsSnapshot,
    projectName: item.projectName,
  }
}

export default function Activity() {
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const { items, isLoading, stats, refetch } = useActivityData({ filter, limit: 100 })
  const [selectedItem, setSelectedItem] = useState<ActivityItemType | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()
  const navigate = useNavigate()

  // Delete an activity item
  const handleDelete = async (item: ActivityItemType) => {
    // Determine table based on source
    let table = ''
    if (item.source === 'studio') {
      table = 'studio_generations'
    } else if (item.source === 'combination') {
      table = 'combination_jobs'
    } else if (item.source === 'queue') {
      table = 'processing_queue'
    } else if (item.source === 'history') {
      table = 'processing_history'
    }

    if (!table) return

    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq('id', item.sourceId)

    if (error) {
      toast({
        title: 'Failed to delete',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Item removed' })
      queryClient.invalidateQueries({ queryKey: ['activity-data'] })
    }
  }

  // Clear all failed items
  const clearAllFailed = async () => {
    if (!organization) return
    setIsDeletingAll(true)

    try {
      // Delete from all tables with failed status
      await Promise.all([
        (supabase as any)
          .from('studio_generations')
          .delete()
          .eq('organization_id', organization.id)
          .in('status', ['failed', 'timeout', 'error']),
        (supabase as any)
          .from('combination_jobs')
          .delete()
          .eq('organization_id', organization.id)
          .in('status', ['failed', 'timeout', 'error']),
        (supabase as any)
          .from('processing_queue')
          .delete()
          .eq('organization_id', organization.id)
          .in('status', ['failed', 'timeout', 'error']),
        (supabase as any)
          .from('processing_history')
          .delete()
          .eq('organization_id', organization.id)
          .eq('status', 'failed'),
      ])

      toast({ title: 'All failed items cleared' })
      queryClient.invalidateQueries({ queryKey: ['activity-data'] })
    } catch (error) {
      toast({
        title: 'Failed to clear',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAll(false)
    }
  }

  const handleViewResult = (item: ActivityItemType) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  // Convert selected item to GenerationDetail for the modal
  const selectedGenerationDetail = useMemo(() => {
    return selectedItem ? activityToGenerationDetail(selectedItem) : null
  }, [selectedItem])

  // Items are already filtered by the hook based on the current filter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track all your image processing across Studio, Projects, and Combinations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFailed}
              disabled={isDeletingAll}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              {isDeletingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear {stats.failed} failed
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/studio">
            <Button size="sm" className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-4 w-4" />
              Back to Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<ActivityIcon className="h-5 w-5 opacity-50" />}
        />
        <StatCard
          label="Queued"
          value={stats.queued}
          icon={<ListOrdered className="h-5 w-5" />}
          variant={stats.queued > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Processing"
          value={stats.processing}
          icon={<Cog className="h-5 w-5" />}
          variant={stats.processing > 0 ? 'warning' : 'default'}
          pulse={stats.processing > 0}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={stats.failed > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as ActivityFilter)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              {stats.total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="queued" className="gap-2">
            Queued
            {stats.queued > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                {stats.queued}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            Processing
            {stats.processing > 0 && (
              <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {stats.processing}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="complete" className="gap-2">
            Complete
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              {stats.completed}
            </span>
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-2">
            Failed
            {stats.failed > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                {stats.failed}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" role="status" aria-label="Loading activity">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={
                filter === 'all' ? Inbox :
                filter === 'queued' ? ListOrdered :
                filter === 'processing' ? Clock :
                filter === 'complete' ? CheckCircle2 :
                XCircle
              }
              title={
                filter === 'all' ? 'No activity yet' :
                filter === 'queued' ? 'Queue is empty' :
                filter === 'processing' ? 'Nothing processing' :
                filter === 'complete' ? 'No completed items' :
                'No failed items'
              }
              description={
                filter === 'all'
                  ? 'Start processing images in Studio or create a Project to see activity here.'
                  : filter === 'queued'
                  ? 'Items you add to the processing queue will appear here.'
                  : filter === 'processing'
                  ? 'Currently processing items will show progress here.'
                  : filter === 'complete'
                  ? 'Successfully processed images will be listed here.'
                  : 'Any processing errors will appear here for review.'
              }
              variant={
                filter === 'complete' ? 'success' :
                filter === 'failed' ? 'warning' :
                'brand'
              }
              actions={filter === 'all' ? [
                { label: 'Open Studio', onClick: () => navigate('/studio'), variant: 'brand', icon: Sparkles },
                { label: 'Create Project', onClick: () => navigate('/projects'), variant: 'outline' }
              ] : undefined}
              compact
            />
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-2 pr-4">
                {items.map((item) => (
                  <ActivityItem
                    key={item.id}
                    item={item}
                    onViewResult={handleViewResult}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Generation Detail Modal */}
      <GenerationDetailModal
        generation={selectedGenerationDetail}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedItem(null)
        }}
        onDelete={selectedItem ? () => {
          handleDelete(selectedItem)
          setModalOpen(false)
          setSelectedItem(null)
        } : undefined}
      />
    </div>
  )
}
