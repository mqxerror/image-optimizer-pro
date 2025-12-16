import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Plus,
  FolderKanban,
  Loader2,
  Search,
  Eye,
  Play,
  Pause,
  MoreHorizontal,
  Coins,
  FileEdit,
  CheckCircle2,
  Archive,
  Cog,
  LayoutGrid,
  List,
  ArrowUpDown,
  ImageIcon
} from 'lucide-react'
import { VisualProjectCard } from '@/components/projects/VisualProjectCard'
import { ProjectStatusTabs, type ProjectStatusTab } from '@/components/projects/ProjectStatusTabs'
import { useProjectPreviewImages } from '@/hooks/useProjectPreviewImages'
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
import { UnifiedProjectModal } from '@/components/projects/UnifiedProjectModal'
import { CreateProjectWizard } from '@/components/project-wizard'
import { InsufficientTokensPrompt } from '@/components/tokens/InsufficientTokensPrompt'
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
  const [statusFilter, setStatusFilter] = useState<ProjectStatusTab>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'progress' | 'created'>('updated')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    const saved = localStorage.getItem('projectsViewMode')
    return (saved === 'grid' ? 'grid' : 'table') as 'table' | 'grid'
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isInsufficientTokensOpen, setIsInsufficientTokensOpen] = useState(false)
  const [projectToStart, setProjectToStart] = useState<Project | null>(null)

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

  // Fetch preview images for all projects
  const projectIds = useMemo(() => (projects || []).map(p => p.id), [projects])
  const { data: previewImagesMap = {} } = useProjectPreviewImages(projectIds)

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
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first
      await supabase.from('processing_queue').delete().eq('project_id', id)
      await supabase.from('processing_history').delete().eq('project_id', id)

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] })
      toast({ title: 'Project deleted' })
    },
    onError: (error) => {
      toast({ title: 'Error deleting project', description: error.message, variant: 'destructive' })
    }
  })

  // Handle delete project - called after VisualProjectCard's own confirmation dialog
  const handleDeleteProject = (project: Project) => {
    deleteProjectMutation.mutate(project.id)
  }


  // Calculate project stats
  const projectStats = useMemo(() => {
    if (!projects) return { total: 0, draft: 0, active: 0, completed: 0, archived: 0, totalImages: 0, processedImages: 0 }
    return {
      total: projects.length,
      draft: projects.filter(p => p.status === 'draft').length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      archived: projects.filter(p => p.status === 'archived').length,
      totalImages: projects.reduce((sum, p) => sum + p.total_images, 0),
      processedImages: projects.reduce((sum, p) => sum + p.processed_images, 0),
    }
  }, [projects])

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode)
  }, [viewMode])

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    if (!projects) return []

    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'progress':
          const progressA = a.total_images > 0 ? a.processed_images / a.total_images : 0
          const progressB = b.total_images > 0 ? b.processed_images / b.total_images : 0
          return progressB - progressA
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    return filtered
  }, [projects, searchQuery, statusFilter, sortBy])

  // Unified modal - opens for both view and edit
  const handleOpenProject = (project: Project) => {
    setSelectedProjectId(project.id)
  }

  // Handle start project with token check
  const handleStartProject = (project: Project) => {
    const tokensNeeded = project.total_images - project.processed_images
    const tokensAvailable = tokenAccount?.balance || 0

    if (tokensNeeded > tokensAvailable) {
      setProjectToStart(project)
      setIsInsufficientTokensOpen(true)
    } else {
      // Sufficient tokens, start processing
      updateStatusMutation.mutate({ id: project.id, status: 'active' })
    }
  }

  // Start with available tokens (partial processing)
  const handleStartWithAvailableTokens = () => {
    if (projectToStart) {
      updateStatusMutation.mutate({ id: projectToStart.id, status: 'active' })
      setProjectToStart(null)
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-50 shadow-sm">
            <FolderKanban className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Manage your image optimization projects</p>
          </div>
        </div>
        <Button className="gap-2 shadow-sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-white border-gray-200 hover:shadow-md transition-all hover:border-gray-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100">
              <FolderKanban className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{projectStats.total}</p>
              <p className="text-xs font-medium text-gray-500">Total</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 hover:shadow-md transition-all ${projectStats.draft > 0 ? 'bg-white border-gray-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100">
              <FileEdit className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-700">{projectStats.draft}</p>
              <p className="text-xs font-medium text-gray-500">Draft</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 hover:shadow-md transition-all ${projectStats.active > 0 ? 'bg-gradient-to-br from-blue-50 to-white border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${projectStats.active > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Cog className={`h-4 w-4 ${projectStats.active > 0 ? 'text-blue-600 animate-spin' : 'text-gray-600'}`} style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <p className={`text-xl font-bold ${projectStats.active > 0 ? 'text-blue-700' : 'text-gray-700'}`}>{projectStats.active}</p>
              <p className={`text-xs font-medium ${projectStats.active > 0 ? 'text-blue-600' : 'text-gray-500'}`}>Active</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 hover:shadow-md transition-all ${projectStats.completed > 0 ? 'bg-gradient-to-br from-green-50 to-white border-green-200 ring-1 ring-green-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${projectStats.completed > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
              <CheckCircle2 className={`h-4 w-4 ${projectStats.completed > 0 ? 'text-green-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${projectStats.completed > 0 ? 'text-green-700' : 'text-gray-700'}`}>{projectStats.completed}</p>
              <p className={`text-xs font-medium ${projectStats.completed > 0 ? 'text-green-600' : 'text-gray-500'}`}>Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200 ring-1 ring-purple-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100">
              <ImageIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-purple-700">
                {projectStats.processedImages}
                <span className="text-sm font-normal text-purple-500">/{projectStats.totalImages}</span>
              </p>
              <p className="text-xs font-medium text-purple-600">
                Images ({projectStats.totalImages > 0 ? Math.round((projectStats.processedImages / projectStats.totalImages) * 100) : 0}%)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Tabs */}
      <ProjectStatusTabs
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        counts={{
          all: projectStats.total,
          draft: projectStats.draft,
          active: projectStats.active,
          completed: projectStats.completed,
          archived: projectStats.archived
        }}
      />

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-gray-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
          </SelectContent>
        </Select>
        {/* View Toggle - hidden on mobile (always cards on mobile) */}
        <div className="hidden sm:flex border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 ${viewMode === 'table' ? 'bg-gray-100' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <>
          {/* Mobile Card View - Always visible on mobile, also on desktop when grid mode */}
          <div className={`space-y-4 ${viewMode === 'grid' ? 'block' : 'block sm:hidden'}`}>
            {filteredProjects.map(project => (
              <VisualProjectCard
                key={project.id}
                project={project}
                previewImages={previewImagesMap[project.id] || []}
                onView={handleOpenProject}
                onEdit={handleOpenProject}
                onDelete={handleDeleteProject}
                onStart={handleStartProject}
                onPause={(p) => updateStatusMutation.mutate({ id: p.id, status: 'draft' })}
                onArchive={(p) => updateStatusMutation.mutate({ id: p.id, status: 'archived' })}
              />
            ))}
          </div>

          {/* Table View - Only on desktop when table mode */}
          <Card className={viewMode === 'table' ? 'hidden sm:block' : 'hidden'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Est. Tokens</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map(project => (
                <TableRow key={project.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleOpenProject(project)}>
                  <TableCell>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-gray-400">{project.resolution}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[project.status]} flex items-center gap-1 w-fit`}>
                      {project.status === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-28">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{project.processed_images}/{project.total_images}</span>
                        <span>{getProgressPercentage(project)}%</span>
                      </div>
                      <Progress value={getProgressPercentage(project)} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.status === 'completed' ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : getTokenEstimate(project) > 0 ? (
                      <div className="flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        <span className={`text-sm font-medium ${hasInsufficientTokens(project) ? 'text-red-500' : 'text-gray-700'}`}>
                          {getTokenEstimate(project)}
                        </span>
                        {hasInsufficientTokens(project) && (
                          <span className="text-xs text-red-400">(insufficient)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {format(new Date(project.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {/* Start button for draft projects */}
                      {project.status === 'draft' && project.total_images > 0 && !hasInsufficientTokens(project) && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                          onClick={() => updateStatusMutation.mutate({ id: project.id, status: 'active' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {/* Pause button for active projects */}
                      {project.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => updateStatusMutation.mutate({ id: project.id, status: 'draft' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenProject(project)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Open Project
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
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Card>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-2xl mx-auto">
          {searchQuery || statusFilter !== 'all' ? (
            <>
              <FolderKanban className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900 mt-4">No projects found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </>
          ) : (
            <>
              {/* Visual illustration */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <FolderKanban className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Create your first project</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Projects help you batch process multiple images with consistent settings. Perfect for product catalogs and collections.
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-left">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <Play className="h-4 w-4 text-green-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Batch Process</h4>
                  <p className="text-xs text-gray-500 mt-1">Process hundreds of images with one click</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <Cog className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Consistent Settings</h4>
                  <p className="text-xs text-gray-500 mt-1">Same AI model and prompts across all images</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                    <Coins className="h-4 w-4 text-purple-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Token Tracking</h4>
                  <p className="text-xs text-gray-500 mt-1">See exactly how many tokens you'll use</p>
                </div>
              </div>

              <Button className="mt-8 gap-2" size="lg" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </>
          )}
        </div>
      )}

      {/* Create Project Wizard */}
      <CreateProjectWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Unified Project Modal - Combines view, edit, and management */}
      <UnifiedProjectModal
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProjectId(null)
          }
        }}
      />

      {/* Insufficient Tokens Prompt */}
      <InsufficientTokensPrompt
        open={isInsufficientTokensOpen}
        onOpenChange={(open) => {
          setIsInsufficientTokensOpen(open)
          if (!open) setProjectToStart(null)
        }}
        tokensNeeded={projectToStart ? (projectToStart.total_images - projectToStart.processed_images) : 0}
        tokensAvailable={tokenAccount?.balance || 0}
        onProceedWithAvailable={handleStartWithAvailableTokens}
        itemName="project"
      />
    </div>
  )
}
