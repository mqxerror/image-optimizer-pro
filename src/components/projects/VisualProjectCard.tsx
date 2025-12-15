import { useState, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Clock,
  Loader2,
  CheckCircle,
  Archive,
  FileEdit,
  Trash2,
  Eye,
  Play,
  Pause,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Timer
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'

interface VisualProjectCardProps {
  project: Project
  previewImages?: string[]
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  selectionMode?: boolean
  onView?: (project: Project) => void
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onStart?: (project: Project) => void
  onPause?: (project: Project) => void
  onArchive?: (project: Project) => void
}

const statusConfig: Record<string, {
  color: string
  bgColor: string
  icon: typeof Clock
  label: string
  animate?: boolean
}> = {
  draft: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: FileEdit,
    label: 'Draft'
  },
  active: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Loader2,
    label: 'Processing',
    animate: true
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
    label: 'Completed'
  },
  archived: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: Archive,
    label: 'Archived'
  }
}

export function VisualProjectCard({
  project,
  previewImages = [],
  isSelected = false,
  onSelect,
  selectionMode = false,
  onView,
  onEdit,
  onDelete,
  onStart,
  onPause,
  onArchive
}: VisualProjectCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const status = statusConfig[project.status] || statusConfig.draft
  const StatusIcon = status.icon

  const progress = project.total_images > 0
    ? Math.round((project.processed_images / project.total_images) * 100)
    : 0

  const isActive = project.status === 'active'
  const isDraft = project.status === 'draft'
  const isCompleted = project.status === 'completed'

  // Calculate ETA for active projects
  const eta = useMemo(() => {
    if (!isActive || project.processed_images === 0) return null

    // Average time per image: ~30 seconds (can be refined with actual metrics)
    const averageSecondsPerImage = 30
    const remainingImages = project.total_images - project.processed_images
    const remainingSeconds = remainingImages * averageSecondsPerImage

    if (remainingSeconds < 60) return 'Less than 1 min'
    if (remainingSeconds < 3600) return `~${Math.ceil(remainingSeconds / 60)} min`
    return `~${Math.round(remainingSeconds / 3600 * 10) / 10} hrs`
  }, [isActive, project.processed_images, project.total_images])

  return (
    <>
      <Card className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        isActive && 'border-blue-200 bg-blue-50/30',
        isSelected && 'ring-2 ring-primary'
      )}>
        <CardContent className="p-0">
          <div className="flex">
            {/* Selection Checkbox */}
            {selectionMode && (
              <div className="flex items-center justify-center px-4 border-r bg-gray-50">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect?.(project.id, checked as boolean)}
                />
              </div>
            )}

            {/* Preview Images */}
            <div
              className="w-40 h-28 flex-shrink-0 bg-gray-100 grid grid-cols-2 gap-0.5 overflow-hidden"
              role="img"
              aria-label={`Preview images for ${project.name}`}
            >
              {previewImages.length > 0 ? (
                previewImages.slice(0, 4).map((src, idx) => (
                  <div key={idx} className="relative overflow-hidden">
                    <img
                      src={src}
                      alt={`${project.name} preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 row-span-2 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden="true" />
                  <span className="sr-only">No preview images available</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col min-w-0">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {project.name}
                    </h3>
                    <Badge className={`${status.bgColor} ${status.color} border-0 flex-shrink-0`}>
                      <StatusIcon className={cn('h-3 w-3 mr-1', status.animate && 'animate-spin')} />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{project.total_images} images</span>
                    <span>{project.resolution}</span>
                    {project.total_tokens > 0 && (
                      <span>{project.total_tokens.toLocaleString()} tokens</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isDraft && (
                    <Button
                      size="sm"
                      onClick={() => onStart?.(project)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}

                  {isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPause?.(project)}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}

                  {isCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView?.(project)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(project)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(project)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {project.status !== 'archived' && (
                        <DropdownMenuItem onClick={() => onArchive?.(project)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Progress bar for active projects */}
              {isActive && project.total_images > 0 && (
                <div className="space-y-1.5 mb-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{project.processed_images} / {project.total_images} processed</span>
                    <div className="flex items-center gap-3">
                      {eta && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Timer className="h-3 w-3" />
                          {eta}
                        </span>
                      )}
                      <span>{progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats for completed projects */}
              {isCompleted && (
                <div className="flex items-center gap-4 text-sm mb-2">
                  <span className="text-green-600">
                    <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                    {project.processed_images} processed
                  </span>
                  {project.failed_images > 0 && (
                    <span className="text-red-600">
                      {project.failed_images} failed
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto pt-1 text-xs text-muted-foreground">
                Updated {format(new Date(project.updated_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This will permanently delete
              all processed images and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(project)
                setDeleteDialogOpen(false)
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
