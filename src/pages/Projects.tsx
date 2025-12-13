import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Plus,
  FolderKanban,
  Loader2,
  Search,
  Pencil,
  Trash2,
  Eye,
  Play,
  Pause,
  MoreHorizontal,
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { ProjectDetailDialog, EditProjectDialog } from '@/components/project-detail'
import { CreateProjectWizard } from '@/components/project-wizard'
import type { Project } from '@/types/database'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

export default function Projects() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false })
      return data || []
    },
    enabled: !!organization
  })

  // Fetch token balance for start processing validation
  const { data: tokenAccount } = useQuery({
    queryKey: ['token-account', organization?.id],
    queryFn: async () => {
      if (!organization) return null
      const { data } = await supabase
        .from('token_accounts')
        .select('balance')
        .eq('organization_id', organization.id)
        .single()
      return data
    },
    enabled: !!organization
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] })
      toast({ title: 'Project status updated' })
    },
    onError: (error) => {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' })
    }
  })

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] })
      setIsDeleteOpen(false)
      setSelectedProject(null)
      toast({ title: 'Project deleted successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error deleting project', description: error.message, variant: 'destructive' })
    }
  })

  // Filter projects
  const filteredProjects = projects?.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setIsEditOpen(true)
  }

  const handleView = (project: Project) => {
    setSelectedProject(project)
    setIsViewOpen(true)
  }

  const handleDeleteConfirm = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteOpen(true)
  }

  const getProgressPercentage = (project: Project) => {
    if (project.total_images === 0) return 0
    return Math.round((project.processed_images / project.total_images) * 100)
  }

  // Check if user has enough tokens for a project
  const hasInsufficientTokens = (project: Project) => {
    const requiredTokens = project.total_images - project.processed_images
    return requiredTokens > (tokenAccount?.balance || 0)
  }

  const getTokenEstimate = (project: Project) => {
    return project.total_images - project.processed_images
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your image optimization projects</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map(project => (
                <TableRow key={project.id} className="cursor-pointer" onClick={() => handleView(project)}>
                  <TableCell>
                    <div className="font-medium">{project.name}</div>
                    {project.input_folder_url && (
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">
                        {project.input_folder_url}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[project.status]}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.resolution}</TableCell>
                  <TableCell>
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{project.processed_images}/{project.total_images}</span>
                        <span>{getProgressPercentage(project)}%</span>
                      </div>
                      <Progress value={getProgressPercentage(project)} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {format(new Date(project.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {project.status === 'draft' && project.total_images > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className={`
                                ${hasInsufficientTokens(project)
                                  ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700'
                                }
                              `}
                              onClick={() => {
                                if (!hasInsufficientTokens(project)) {
                                  updateStatusMutation.mutate({ id: project.id, status: 'active' })
                                }
                              }}
                              disabled={updateStatusMutation.isPending}
                            >
                              {updateStatusMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Start
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            {hasInsufficientTokens(project) ? (
                              <div className="text-center">
                                <p className="font-medium text-red-500">Insufficient tokens</p>
                                <p className="text-xs mt-1">
                                  Need {getTokenEstimate(project)} tokens, have {tokenAccount?.balance || 0}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Coins className="h-3.5 w-3.5 text-amber-500" />
                                <span>Process {getTokenEstimate(project)} images (~{getTokenEstimate(project)} tokens)</span>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : project.status === 'active' ? (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </Badge>
                    ) : project.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-700">
                        Completed
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(project)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(project)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {project.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ id: project.id, status: 'active' })}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Processing
                          </DropdownMenuItem>
                        )}
                        {project.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ id: project.id, status: 'draft' })}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {project.status !== 'archived' && (
                          <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ id: project.id, status: 'archived' })}
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteConfirm(project)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderKanban className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 mt-4">No projects found</h3>
          <p className="text-gray-500 mt-2">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first project to start optimizing images'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button className="mt-6" onClick={() => setIsCreateOpen(true)}>
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Create Project Wizard */}
      <CreateProjectWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Edit Dialog */}
      <EditProjectDialog
        project={selectedProject}
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false)
            // Only clear selectedProject if view dialog is also closed
            if (!isViewOpen) {
              setSelectedProject(null)
            }
          }
        }}
        onSaved={(updatedProject) => {
          // Update the selected project with fresh data
          setSelectedProject(updatedProject)
        }}
      />

      {/* View Dialog - Enhanced with Gallery, Timeline, and Export */}
      <ProjectDetailDialog
        project={selectedProject}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        onEdit={handleEdit}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This will also remove all associated processing history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProject && deleteMutation.mutate(selectedProject.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
