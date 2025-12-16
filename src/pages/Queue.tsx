import { useState, useCallback } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ListTodo,
  Trash2,
  RefreshCw,
  Loader2,
  Clock,
  XCircle,
  Search,
  Filter,
  MoreHorizontal,
  Grid3X3,
  List,
  AlertTriangle,
  Image as ImageIcon,
  Zap,
  Timer,
  Eye,
  RotateCcw,
  Trash,
  ChevronRight,
  FolderKanban,
  Play,
  Folder
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProcessQueueButton } from '@/components/processing'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { ProxiedThumbnail } from '@/components/ui/proxied-thumbnail'
import { QueuePagination, FolderGroupedView } from '@/components/queue'
import {
  useQueuePagination,
  useQueueStats,
  useQueueFolderStats,
  QueueItem
} from '@/hooks/useQueuePagination'
import { useQueueRealtime } from '@/hooks/useQueueRealtime'

type ViewMode = 'table' | 'grid'
type StatusFilter = 'all' | 'queued' | 'processing' | 'failed'

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  queued: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Queued' },
  processing: { color: 'bg-yellow-100 text-yellow-700', icon: Loader2, label: 'Processing' },
  optimizing: { color: 'bg-purple-100 text-purple-700', icon: Zap, label: 'Optimizing' },
  failed: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
}

export default function Queue() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isClearOpen, setIsClearOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<QueueItem | null>(null)
  const [showFolders, setShowFolders] = useState(true)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Use pagination hook with filters
  const { data: queueData, isLoading, refetch } = useQueuePagination(page, {
    pageSize,
    filters: {
      status: statusFilter === 'all' ? null : statusFilter,
      projectId: projectFilter === 'all' ? null : projectFilter,
      folderPath: folderFilter,
      search: searchQuery || null
    }
  })

  // Use lightweight stats hook (updates more frequently)
  const { data: stats } = useQueueStats()

  // Use folder stats hook
  const { data: folderStats, isLoading: loadingFolders } = useQueueFolderStats()

  // Subscribe to realtime updates
  useQueueRealtime({
    showToasts: true
  })

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects-filter', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', organization.id)
        .order('name')
      return data || []
    },
    enabled: !!organization
  })

  // Extract data from pagination response
  const queueItems = queueData?.items || []
  const totalCount = queueData?.totalCount || 0
  const totalPages = queueData?.totalPages || 1

  // Reset page when filters change
  const handleFilterChange = useCallback((newFilter: string, type: 'status' | 'project' | 'folder') => {
    setPage(1) // Reset to first page
    if (type === 'status') setStatusFilter(newFilter as StatusFilter)
    else if (type === 'project') setProjectFilter(newFilter)
    else if (type === 'folder') setFolderFilter(newFilter === '' ? null : newFilter)
  }, [])

  // Handle search with debounce would be nice, but for now just reset page
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  // Clear queue mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('processing_queue')
        .delete()
        .eq('organization_id', organization.id)
        .eq('status', 'queued')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue-folder-stats'] })
      setIsClearOpen(false)
      setSelectedItems(new Set())
      toast({ title: 'Queued items cleared' })
    },
    onError: (error) => {
      toast({ title: 'Error clearing queue', description: error.message, variant: 'destructive' })
    }
  })

  // Delete single item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('processing_queue')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue-folder-stats'] })
      toast({ title: 'Item removed from queue' })
    },
    onError: (error) => {
      toast({ title: 'Error removing item', description: error.message, variant: 'destructive' })
    }
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('processing_queue')
        .delete()
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue-folder-stats'] })
      setIsBulkDeleteOpen(false)
      setSelectedItems(new Set())
      toast({ title: `${selectedItems.size} items removed` })
    },
    onError: (error) => {
      toast({ title: 'Error removing items', description: error.message, variant: 'destructive' })
    }
  })

  // Retry failed item mutation
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('processing_queue')
        .update({ status: 'queued', error_message: null, retry_count: 0, progress: 0 })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      toast({ title: 'Item requeued for processing' })
    },
    onError: (error) => {
      toast({ title: 'Error retrying item', description: error.message, variant: 'destructive' })
    }
  })

  // Bulk retry mutation
  const bulkRetryMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('processing_queue')
        .update({ status: 'queued', error_message: null, retry_count: 0, progress: 0 })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      setSelectedItems(new Set())
      toast({ title: 'Items requeued for processing' })
    },
    onError: (error) => {
      toast({ title: 'Error retrying items', description: error.message, variant: 'destructive' })
    }
  })

  // Reset stuck items mutation
  const resetStuckMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('No organization')
      const { error } = await supabase
        .from('processing_queue')
        .update({ status: 'queued' as const, error_message: '', progress: 0 })
        .eq('organization_id', organization.id)
        .eq('status', 'processing')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      toast({ title: 'Stuck items reset to queued' })
    },
    onError: (error) => {
      toast({ title: 'Error resetting items', description: error.message, variant: 'destructive' })
    }
  })

  // Process selected items mutation
  const processSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ queue_item_id: id })
            }
          )
          const result = await response.json()
          if (result.error) throw new Error(result.error)
          return result
        })
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return { succeeded, failed, total: ids.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-page'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['token-account'] })
      setSelectedItems(new Set())

      if (data.failed === 0) {
        toast({ title: `Processing ${data.total} images...` })
      } else {
        toast({
          title: 'Processing started with some errors',
          description: `${data.succeeded} started, ${data.failed} failed`,
          variant: 'destructive'
        })
      }
    },
    onError: (error) => {
      toast({ title: 'Error processing items', description: error.message, variant: 'destructive' })
    }
  })

  // Estimated time (rough estimate: 30 seconds per image)
  const estimatedMinutes = Math.ceil(((stats?.queued_count || 0) + (stats?.processing_count || 0)) * 0.5)

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedItems.size === queueItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(queueItems.map(i => i.id)))
    }
  }

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const selectedFailedItems = Array.from(selectedItems).filter(id =>
    queueItems?.find(i => i.id === id)?.status === 'failed'
  )

  const selectedQueuedItems = Array.from(selectedItems).filter(id =>
    queueItems?.find(i => i.id === id)?.status === 'queued'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Processing Queue</h1>
          <p className="text-slate-500 mt-1">Monitor and manage images being optimized</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {(stats?.processing_count || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetStuckMutation.mutate()}
              disabled={resetStuckMutation.isPending}
            >
              {resetStuckMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset Stuck ({stats?.processing_count})
            </Button>
          )}
          {(stats?.queued_count || 0) > 0 && (
            <>
              <ProcessQueueButton queuedCount={stats?.queued_count || 0} size="sm" />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsClearOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Queued
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards - Modern Gradient Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Card - Neutral gradient */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-slate-200/30 rounded-full -mr-6 -mt-6" />
          <CardContent className="pt-5 pb-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{(stats?.total_count || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-200/50">
                <ListTodo className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queued Card - Blue gradient */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -mr-6 -mt-6" />
          <CardContent className="pt-5 pb-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Waiting</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{(stats?.queued_count || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100/70">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Card - Amber gradient */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -mr-6 -mt-6" />
          <CardContent className="pt-5 pb-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Processing</p>
                <p className="text-3xl font-bold text-amber-800 mt-1">{(stats?.processing_count || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100/70">
                <Loader2 className={`h-6 w-6 text-amber-600 ${(stats?.processing_count || 0) > 0 ? 'animate-spin' : ''}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Failed Card - Red gradient (when > 0) or gray */}
        <Card className={`overflow-hidden relative ${
          (stats?.failed_count || 0) > 0
            ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            : 'bg-gradient-to-br from-slate-50 to-slate-50 border-slate-200'
        }`}>
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-6 -mt-6 ${
            (stats?.failed_count || 0) > 0 ? 'bg-red-200/30' : 'bg-slate-200/30'
          }`} />
          <CardContent className="pt-5 pb-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${
                  (stats?.failed_count || 0) > 0 ? 'text-red-600' : 'text-slate-500'
                }`}>Failed</p>
                <p className={`text-3xl font-bold mt-1 ${
                  (stats?.failed_count || 0) > 0 ? 'text-red-800' : 'text-slate-800'
                }`}>{(stats?.failed_count || 0).toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl ${
                (stats?.failed_count || 0) > 0 ? 'bg-red-100/70' : 'bg-slate-200/50'
              }`}>
                <XCircle className={`h-6 w-6 ${
                  (stats?.failed_count || 0) > 0 ? 'text-red-600' : 'text-slate-400'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Processing Card - Friendly UI like regeneration queue */}
      {(stats?.processing_count || 0) > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-green-100">
                <Zap className="h-5 w-5 text-green-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Processing in Progress</h3>
                <p className="text-sm text-green-700">
                  {stats?.processing_count} image{stats?.processing_count !== 1 ? 's' : ''} currently optimizing
                  {stats?.queued_count ? ` • ${stats.queued_count} waiting` : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-green-700">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm font-medium">~{estimatedMinutes} min</span>
                </div>
                <span className="text-xs text-green-600">remaining</span>
              </div>
            </div>

            {/* Active Processing Items */}
            <div className="space-y-2">
              {queueItems
                .filter(item => item.status === 'processing' || item.status === 'optimizing')
                .slice(0, 3)
                .map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        {item.file_id ? (
                          <ProxiedThumbnail
                            fileId={item.file_id}
                            alt={item.file_name || ''}
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{item.file_name || 'Processing...'}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {item.ai_model || 'flux-kontext-pro'}
                          </Badge>
                        </div>
                        <div className="w-full bg-green-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-green-700">{item.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}

              {(stats?.processing_count || 0) > 3 && (
                <p className="text-xs text-green-600 text-center py-1">
                  +{(stats?.processing_count || 0) - 3} more processing...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Grouped View (Collapsible) */}
      {(folderStats?.length || 0) > 0 && (
        <Collapsible open={showFolders} onOpenChange={setShowFolders}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between mb-2">
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Browse by Folder ({folderStats?.length || 0} folders)
              </span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showFolders ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FolderGroupedView
              folders={folderStats || []}
              selectedFolder={folderFilter}
              onFolderSelect={(path) => handleFilterChange(path || '', 'folder')}
              isLoading={loadingFolders}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filters & Search - Modern Pill Design */}
      <div className="bg-gradient-to-r from-slate-50 to-white border rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search with icon inside rounded pill */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 rounded-full border-slate-200 bg-white/80 h-9 focus:ring-blue-200"
            />
          </div>

          {/* Filter pills group */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(v, 'status')}>
              <SelectTrigger className="h-9 rounded-full border-slate-200 bg-white/80 min-w-[130px] hover:bg-white transition-colors">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={(v) => handleFilterChange(v, 'project')}>
              <SelectTrigger className="h-9 rounded-full border-slate-200 bg-white/80 min-w-[150px] hover:bg-white transition-colors">
                <FolderKanban className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {folderFilter && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-700 transition-colors"
              onClick={() => handleFilterChange('', 'folder')}
            >
              <Folder className="h-3 w-3 mr-1.5" />
              {folderFilter.split('/').pop()}
              <XCircle className="h-3 w-3 ml-1.5" />
            </Badge>
          )}

          {/* View toggle - pill style */}
          <div className="ml-auto bg-slate-100 rounded-full p-1 flex gap-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar - Modern Floating Design */}
      {selectedItems.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 border-0">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-white/20">
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <span className="font-medium">
                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedQueuedItems.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => processSelectedMutation.mutate(selectedQueuedItems)}
                      disabled={processSelectedMutation.isPending}
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                    >
                      {processSelectedMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1.5" />
                      )}
                      Process ({selectedQueuedItems.length})
                    </Button>
                  )}
                  {selectedFailedItems.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => bulkRetryMutation.mutate(selectedFailedItems)}
                      disabled={bulkRetryMutation.isPending}
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      Retry ({selectedFailedItems.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setIsBulkDeleteOpen(true)}
                    className="text-white/90 hover:text-white hover:bg-red-500/40 bg-transparent border-0"
                  >
                    <Trash className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedItems(new Set())}
                    className="text-white/60 hover:text-white bg-transparent border-0"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : queueItems.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <Card className="overflow-hidden border-0 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === queueItems.length && queueItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-16 font-semibold text-slate-600 uppercase text-xs tracking-wide">Preview</TableHead>
                    <TableHead className="font-semibold text-slate-600 uppercase text-xs tracking-wide">File</TableHead>
                    <TableHead className="font-semibold text-slate-600 uppercase text-xs tracking-wide">Project</TableHead>
                    <TableHead className="font-semibold text-slate-600 uppercase text-xs tracking-wide">Folder</TableHead>
                    <TableHead className="font-semibold text-slate-600 uppercase text-xs tracking-wide">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 uppercase text-xs tracking-wide">Progress</TableHead>
                    <TableHead className="font-semibold text-slate-600 uppercase text-xs tracking-wide">Added</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueItems.map((item, idx) => {
                    const StatusIcon = statusConfig[item.status]?.icon || Clock
                    const isProcessing = item.status === 'processing' || item.status === 'optimizing'

                    return (
                      <TableRow
                        key={item.id}
                        className={`
                          transition-all duration-200
                          hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent
                          ${selectedItems.has(item.id) ? 'bg-blue-50/70' : ''}
                          ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}
                        `}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className="w-12 h-12 rounded-lg overflow-hidden shadow-sm ring-1 ring-slate-200/50 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                            onClick={() => setPreviewImage(item)}
                          >
                            {item.file_id ? (
                              <ProxiedThumbnail
                                fileId={item.file_id}
                                alt={item.file_name || ''}
                                className="w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium text-slate-800 truncate" title={item.file_name || ''}>
                              {item.file_name || item.file_id}
                            </p>
                            {item.error_message && (
                              <button
                                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 mt-1"
                                onClick={() => setExpandedError(expandedError === item.id ? null : item.id)}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {expandedError === item.id ? 'Hide error' : 'View error'}
                                <ChevronRight className={`h-3 w-3 transition-transform ${expandedError === item.id ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                            {expandedError === item.id && item.error_message && (
                              <p className="text-xs text-red-600 mt-1 p-2 bg-red-50 rounded-lg">
                                {item.error_message}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {item.project_name || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.folder_path ? (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                              onClick={() => handleFilterChange(item.folder_path || '', 'folder')}
                            >
                              <Folder className="h-3 w-3 mr-1" />
                              {item.folder_path.split('/').pop()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full px-2.5 py-0.5 ${
                            item.status === 'processing' || item.status === 'optimizing'
                              ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200'
                              : item.status === 'queued'
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200'
                              : item.status === 'failed'
                              ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
                            {statusConfig[item.status]?.label || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.status === 'failed'
                                    ? 'bg-gradient-to-r from-red-400 to-rose-500'
                                    : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 mt-1 block">{item.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {format(new Date(item.started_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setPreviewImage(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              {item.status === 'failed' && (
                                <DropdownMenuItem onClick={() => retryMutation.mutate(item.id)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Retry
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => deleteMutation.mutate(item.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            /* Grid View - Modern Cards */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {queueItems.map((item) => {
                const StatusIcon = statusConfig[item.status]?.icon || Clock
                const isProcessing = item.status === 'processing' || item.status === 'optimizing'

                return (
                  <Card
                    key={item.id}
                    className={`
                      group overflow-hidden transition-all duration-300
                      hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-1
                      ${selectedItems.has(item.id) ? 'ring-2 ring-blue-400 shadow-lg' : 'shadow-sm'}
                    `}
                    onClick={() => toggleSelectItem(item.id)}
                  >
                    {/* Image area with overlay on hover */}
                    <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                      {item.file_id ? (
                        <ProxiedThumbnail
                          fileId={item.file_id}
                          alt={item.file_name || ''}
                          className="w-full h-full"
                          fallbackClassName="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-slate-300" />
                        </div>
                      )}

                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Checkbox - glassmorphism style */}
                      <div className="absolute top-2 left-2">
                        <div className="p-1 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Status badge - top right */}
                      <div className="absolute top-2 right-2">
                        <Badge className={`rounded-full shadow-sm backdrop-blur-sm text-xs ${
                          item.status === 'processing' || item.status === 'optimizing'
                            ? 'bg-amber-100/90 text-amber-700 border border-amber-200'
                            : item.status === 'queued'
                            ? 'bg-blue-100/90 text-blue-700 border border-blue-200'
                            : item.status === 'failed'
                            ? 'bg-red-100/90 text-red-700 border border-red-200'
                            : 'bg-slate-100/90 text-slate-700'
                        }`}>
                          <StatusIcon className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                        </Badge>
                      </div>

                      {/* Progress overlay - bottom */}
                      {item.progress > 0 && item.progress < 100 && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                          <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <CardContent className="p-3 bg-gradient-to-b from-white to-slate-50/50">
                      <p className="font-medium text-sm truncate text-slate-800" title={item.file_name || ''}>
                        {item.file_name || 'Untitled'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.project_name || 'No project'}
                      </p>
                      {item.status === 'failed' && (
                        <p className="text-xs text-red-600 mt-1 truncate" title={item.error_message || ''}>
                          {item.error_message}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          <QueuePagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1) // Reset to first page when changing page size
            }}
          />
        </>
      ) : (
        <Card className="border-dashed border-2 border-slate-200 bg-gradient-to-br from-slate-50/50 to-white">
          <div className="py-16 text-center">
            {/* Decorative background circles */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-50 scale-150" />
              <div className="relative p-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                <ListTodo className="h-12 w-12 text-slate-400" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-slate-800 mt-6">
              {searchQuery || statusFilter !== 'all' || projectFilter !== 'all' || folderFilter
                ? 'No matching items'
                : 'Queue is empty'}
            </h3>
            <p className="text-slate-500 mt-2 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || projectFilter !== 'all' || folderFilter
                ? 'Try adjusting your filters to see more results'
                : 'Add images from a project to start processing'}
            </p>
          </div>
        </Card>
      )}

      {/* Clear Queue Confirmation */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Queue</DialogTitle>
            <DialogDescription>
              Remove all {stats?.queued_count || 0} queued items? Items currently being processed will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clear Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Items</DialogTitle>
            <DialogDescription>
              Remove {selectedItems.size} selected item{selectedItems.size !== 1 ? 's' : ''} from the queue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedItems))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {selectedItems.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.file_name}</DialogTitle>
            <DialogDescription>
              Status: {statusConfig[previewImage?.status || '']?.label || previewImage?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              {previewImage?.file_id ? (
                <ProxiedThumbnail
                  fileId={previewImage.file_id}
                  alt={previewImage.file_name || ''}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <ImageIcon className="h-16 w-16 text-slate-300" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Project</p>
                <p className="font-medium">{previewImage?.project_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Progress</p>
                <p className="font-medium">{previewImage?.progress}%</p>
              </div>
              <div>
                <p className="text-slate-500">Added</p>
                <p className="font-medium">
                  {previewImage?.started_at && format(new Date(previewImage.started_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Retry Count</p>
                <p className="font-medium">{previewImage?.retry_count || 0}</p>
              </div>
              {previewImage?.folder_path && (
                <div className="col-span-2">
                  <p className="text-slate-500">Folder</p>
                  <p className="font-medium">{previewImage.folder_path}</p>
                </div>
              )}
            </div>
            {previewImage?.error_message && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">{previewImage.error_message}</p>
              </div>
            )}
            {previewImage?.generated_prompt && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Generated Prompt</p>
                <p className="text-sm p-3 bg-slate-50 rounded-lg">{previewImage.generated_prompt}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {previewImage?.status === 'failed' && (
              <Button
                variant="outline"
                onClick={() => {
                  retryMutation.mutate(previewImage.id)
                  setPreviewImage(null)
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            <Button onClick={() => setPreviewImage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
