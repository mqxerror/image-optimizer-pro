import { useState } from 'react'
import { Pencil, Play, Pause, Loader2, RefreshCw } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { OverviewTab } from './OverviewTab'
import { ImageGalleryTab } from './ImageGalleryTab'
import { ProcessingTimelineTab } from './ProcessingTimelineTab'
import { ExportOptionsTab } from './ExportOptionsTab'
import type { Project } from '@/types/database'

const statusConfig: Record<string, { color: string; label: string; icon?: boolean }> = {
  draft: { color: 'bg-slate-100 text-slate-700', label: 'Draft' },
  active: { color: 'bg-blue-100 text-blue-700', label: 'Processing', icon: true },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  archived: { color: 'bg-yellow-100 text-yellow-700', label: 'Archived' },
}

interface ProjectDetailDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (project: Project) => void
}

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  onEdit,
}: ProjectDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch fresh project data
  const { data: freshProject, isRefetching, refetch } = useQuery({
    queryKey: ['project-detail-dialog', project?.id],
    queryFn: async () => {
      if (!project) return null
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single()
      if (error) throw error
      return data as Project
    },
    initialData: project,
    enabled: !!project && open,
    refetchInterval: open ? 5000 : false,
  })

  // Use fresh data
  const currentProject = freshProject || project

  // Start/Pause mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'draft') => {
      if (!currentProject) throw new Error('No project')
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', currentProject.id)
      if (error) throw error
      return newStatus
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-detail-dialog', currentProject?.id] })
      toast({
        title: newStatus === 'active' ? 'Processing started' : 'Processing paused',
        description: newStatus === 'active'
          ? 'Your project is now processing images'
          : 'Processing has been paused'
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  if (!project || !currentProject) return null

  const statusInfo = statusConfig[currentProject.status] || statusConfig.draft
  const canStart = currentProject.status === 'draft' && currentProject.total_images > 0
  const canPause = currentProject.status === 'active'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <DialogTitle className="truncate">{currentProject.name}</DialogTitle>
              <Badge className={`${statusInfo.color} flex items-center gap-1 shrink-0`}>
                {statusInfo.icon && <Loader2 className="h-3 w-3 animate-spin" />}
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
              {/* Start/Pause Button */}
              {canStart && (
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate('active')}
                  disabled={statusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 h-8"
                >
                  {statusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
              )}
              {canPause && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => statusMutation.mutate('draft')}
                  disabled={statusMutation.isPending}
                  className="h-8"
                >
                  {statusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          <DialogDescription>
            {currentProject.processed_images}/{currentProject.total_images} images processed
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <OverviewTab project={currentProject} />
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="mt-0 h-[500px]">
              <ImageGalleryTab projectId={currentProject.id} />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0 h-[500px]">
              <ProcessingTimelineTab projectId={currentProject.id} />
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="mt-0">
              <ExportOptionsTab projectId={currentProject.id} projectName={currentProject.name} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2 mt-4 border-t pt-4">
          <div className="flex-1 text-xs text-slate-500">
            {isRefetching && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => onEdit(currentProject)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
