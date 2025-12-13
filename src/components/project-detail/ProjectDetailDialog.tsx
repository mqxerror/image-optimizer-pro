import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OverviewTab } from './OverviewTab'
import { ImageGalleryTab } from './ImageGalleryTab'
import { ProcessingTimelineTab } from './ProcessingTimelineTab'
import { ExportOptionsTab } from './ExportOptionsTab'
import type { Project } from '@/types/database'

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

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>
            Project details, processed images, and export options
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
              <OverviewTab project={project} />
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="mt-0 h-[500px]">
              <ImageGalleryTab projectId={project.id} />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0 h-[500px]">
              <ProcessingTimelineTab projectId={project.id} />
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="mt-0">
              <ExportOptionsTab projectId={project.id} projectName={project.name} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onEdit(project)}
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
