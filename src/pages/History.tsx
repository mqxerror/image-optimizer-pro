import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  History as HistoryIcon,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Loader2,
  GitBranch,
  LayoutGrid,
  LayoutList,
  Download,
  ChevronDown,
  FileText,
  Palette,
  Wand2,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { generateTemplatePrompt, generateStudioPresetPrompt, type StudioPreset } from '@/lib/prompt-utils'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/hooks/use-toast'
import type { ProcessingHistoryItem } from '@/types/database'

// Available AI models with pricing (Kie.ai credit costs)
// Note: Midjourney removed - no longer available on Kie.ai API
const AI_MODELS = [
  { value: 'flux-kontext-pro', label: 'Flux Kontext Pro', description: 'Best for general image enhancement', price: '$0.025' },
  { value: 'flux-kontext-max', label: 'Flux Kontext Max', description: 'Maximum quality, slower', price: '$0.05' },
  { value: 'nano-banana', label: 'Nano Banana', description: 'Fast image editing', price: '$0.02' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro', description: 'High quality 2K output (Gemini 3)', price: '$0.12' },
  { value: 'ghibli', label: 'Ghibli Style', description: 'Transform to anime style', price: '$0.04' },
]

// Track regeneration tasks
interface RegenerationTask {
  id: string
  historyItemId: string
  fileName: string
  model: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt: Date
}

export default function History() {
  const { organization } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // UX-016: Quality feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ itemId, rating }: { itemId: string; rating: 'thumbs_up' | 'thumbs_down' }) => {
      const { error } = await supabase
        .from('processing_history')
        .update({
          quality_rating: rating,
          feedback_submitted_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      toast({
        title: 'Feedback submitted',
        description: `Thank you for rating this result!`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to submit feedback',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive'
      })
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isReoptimizeOpen, setIsReoptimizeOpen] = useState(false)
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)
  const [isBatchReoptimizeOpen, setIsBatchReoptimizeOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ProcessingHistoryItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reoptimizePrompt, setReoptimizePrompt] = useState('')
  const [reoptimizeModel, setReoptimizeModel] = useState('flux-kontext-pro')
  const [reoptimizeMode, setReoptimizeMode] = useState<'template' | 'preset' | 'custom'>('custom')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [regenerationTasks, setRegenerationTasks] = useState<RegenerationTask[]>([])
  const [selectedQuickPresetId, setSelectedQuickPresetId] = useState<string | null>(null)
  const [isSavePresetDialogOpen, setIsSavePresetDialogOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [useSameSettings, setUseSameSettings] = useState(true) // UX-012: Default to same settings

  // Fetch history
  const { data: historyItems, isLoading } = useQuery({
    queryKey: ['history', organization?.id, statusFilter],
    queryFn: async () => {
      if (!organization) return []

      let query = supabase
        .from('processing_history')
        .select('*, projects(name)')
        .eq('organization_id', organization.id)
        .order('completed_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query
      return data || []
    },
    enabled: !!organization
  })

  // Fetch versions for selected item
  const { data: versions } = useQuery({
    queryKey: ['history-versions', selectedItem?.id, selectedItem?.parent_id],
    queryFn: async () => {
      if (!selectedItem) return []

      // Get the root parent ID (original item)
      const rootId = selectedItem.parent_id || selectedItem.id

      const { data } = await supabase
        .from('processing_history')
        .select('*')
        .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
        .order('version', { ascending: true })

      return data || []
    },
    enabled: !!selectedItem && isVersionsOpen
  })

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects', organization?.id],
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

  // Fetch templates for re-optimize dialog
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['prompt-templates', organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('prompt_templates')
        .select('*')
        .or(`is_system.eq.true,organization_id.eq.${organization?.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return data || []
    },
    enabled: !!organization && isReoptimizeOpen
  })

  // Fetch studio presets for re-optimize dialog
  const { data: presets, isLoading: loadingPresets } = useQuery({
    queryKey: ['studio-presets', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('studio_presets')
        .select('*')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return data || []
    },
    enabled: !!organization && isReoptimizeOpen
  })

  // Interface for regenerate presets (table not yet in generated types)
  interface RegeneratePreset {
    id: string
    organization_id: string
    name: string
    ai_model: string
    prompt_mode: 'template' | 'preset' | 'custom'
    template_id: string | null
    studio_preset_id: string | null
    custom_prompt: string | null
    created_by: string | null
    created_at: string
    updated_at: string
  }

  // Fetch saved regenerate presets (quick apply)
  // Note: This will work after running the create_regenerate_presets migration
  const { data: quickPresets } = useQuery<RegeneratePreset[]>({
    queryKey: ['regenerate-presets', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      try {
        const { data, error } = await (supabase as any)
          .from('regenerate_presets')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
        if (error) {
          // Table might not exist yet
          console.log('regenerate_presets table not available:', error.message)
          return []
        }
        return (data || []) as RegeneratePreset[]
      } catch {
        return []
      }
    },
    enabled: !!organization
  })

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!organization) throw new Error('No organization')
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await (supabase as any)
        .from('regenerate_presets')
        .insert({
          organization_id: organization.id,
          name,
          ai_model: reoptimizeModel,
          prompt_mode: reoptimizeMode,
          template_id: reoptimizeMode === 'template' ? selectedTemplateId : null,
          studio_preset_id: reoptimizeMode === 'preset' ? selectedPresetId : null,
          custom_prompt: reoptimizeMode === 'custom' ? reoptimizePrompt : null,
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regenerate-presets'] })
      setIsSavePresetDialogOpen(false)
      setNewPresetName('')
      toast({
        title: 'Preset saved',
        description: 'Your settings have been saved for quick access'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save preset',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Load a quick preset
  const loadQuickPreset = (presetId: string) => {
    const preset = quickPresets?.find((p) => p.id === presetId)
    if (!preset) return

    setReoptimizeModel(preset.ai_model)
    setReoptimizeMode(preset.prompt_mode)

    if (preset.prompt_mode === 'template' && preset.template_id) {
      setSelectedTemplateId(preset.template_id)
      setSelectedPresetId(null)
    } else if (preset.prompt_mode === 'preset' && preset.studio_preset_id) {
      setSelectedPresetId(preset.studio_preset_id)
      setSelectedTemplateId(null)
    } else if (preset.prompt_mode === 'custom') {
      setReoptimizePrompt(preset.custom_prompt || '')
      setSelectedTemplateId(null)
      setSelectedPresetId(null)
    }

    setSelectedQuickPresetId(presetId)
  }

  // Helper to process regeneration task asynchronously
  const processRegeneration = async (taskId: string, item: ProcessingHistoryItem, prompt: string, model: string) => {
    const updateTask = (updates: Partial<RegenerationTask>) => {
      setRegenerationTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    }

    try {
      updateTask({ status: 'processing', progress: 10 })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const imageUrl = item.original_url
      if (!imageUrl) throw new Error('No original image URL found')

      updateTask({ progress: 20 })

      // Call optimize-image function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: imageUrl,
            prompt: prompt,
            ai_model: model,
            settings: {
              enhance_quality: true,
              remove_background: true,
              enhance_lighting: true,
              enhance_colors: true
            }
          })
        }
      )

      updateTask({ progress: 60 })

      const result = await response.json()

      if (!result.success || !result.optimized_url) {
        throw new Error(result.error || result.message || 'Re-optimization failed')
      }

      updateTask({ progress: 70 })

      // Get the root parent ID
      const rootId = item.parent_id || item.id

      // Get current max version
      const { data: versionData } = await supabase
        .from('processing_history')
        .select('version')
        .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      const newVersion = (versionData?.version || 1) + 1

      updateTask({ progress: 80 })

      // Download and re-upload optimized image to storage
      let optimizedPublicUrl = result.optimized_url
      let optimizedPath = null

      try {
        const optimizedImageResponse = await fetch(result.optimized_url)
        if (optimizedImageResponse.ok) {
          const blob = await optimizedImageResponse.blob()
          const arrayBuffer = await blob.arrayBuffer()
          const optimizedBuffer = new Uint8Array(arrayBuffer)
          optimizedPath = `${item.organization_id}/${item.project_id}/reopt_v${newVersion}_${Date.now()}.png`

          const { error: uploadError } = await supabase.storage
            .from('processed-images')
            .upload(optimizedPath, optimizedBuffer, {
              contentType: 'image/png',
              upsert: true
            })

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('processed-images')
              .getPublicUrl(optimizedPath)
            optimizedPublicUrl = publicUrl
          }
        }
      } catch (e) {
        console.error('Failed to re-upload optimized image:', e)
      }

      updateTask({ progress: 90 })

      // Use the actual prompt that was sent to Kie.ai (includes enhancement settings)
      const actualPromptUsed = result.final_prompt || prompt

      // Create new history record
      const { error: insertError } = await supabase
        .from('processing_history')
        .insert({
          organization_id: item.organization_id,
          project_id: item.project_id,
          file_id: item.file_id,
          file_name: item.file_name,
          original_url: item.original_url,
          optimized_url: optimizedPublicUrl,
          optimized_storage_path: optimizedPath,
          generated_prompt: actualPromptUsed,
          ai_model: model,
          status: 'success',
          tokens_used: 1,
          parent_id: rootId,
          version: newVersion,
          completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      updateTask({ status: 'completed', progress: 100 })
      queryClient.invalidateQueries({ queryKey: ['history'] })

      toast({
        title: 'Re-optimization complete',
        description: `${item.file_name} - New version created`,
      })

      // Remove completed task after 3 seconds
      setTimeout(() => {
        setRegenerationTasks(prev => prev.filter(t => t.id !== taskId))
      }, 3000)

    } catch (err) {
      const error = err as Error
      updateTask({ status: 'failed', error: error.message })
      toast({
        title: 'Re-optimization failed',
        description: `${item.file_name}: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  // Re-optimize mutation - now async (closes dialog immediately)
  const reoptimizeMutation = useMutation({
    mutationFn: async ({ item, prompt, model }: { item: ProcessingHistoryItem, prompt: string, model: string }) => {
      // Create a task ID and add to queue
      const taskId = `regen-${item.id}-${Date.now()}`
      const task: RegenerationTask = {
        id: taskId,
        historyItemId: item.id,
        fileName: item.file_name || 'Image',
        model,
        status: 'pending',
        progress: 0,
        startedAt: new Date()
      }

      setRegenerationTasks(prev => [...prev, task])

      // Process asynchronously (don't await)
      processRegeneration(taskId, item, prompt, model)

      return { taskId }
    },
    onSuccess: () => {
      toast({
        title: 'Processing started',
        description: 'Re-optimization is running in the background',
      })
      setIsReoptimizeOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to start re-optimization: ${error.message}`,
        variant: 'destructive',
      })
    }
  })

  // Filter by search, model, and project
  const filteredItems = historyItems?.filter(item => {
    const matchesSearch = (item.file_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesModel = modelFilter === 'all' || (item.ai_model || 'flux-kontext-pro') === modelFilter
    const matchesProject = projectFilter === 'all' || item.project_id === projectFilter
    return matchesSearch && matchesModel && matchesProject
  })

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems?.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems?.map(item => item.id) || []))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // Get selected items
  const selectedItems = filteredItems?.filter(item => selectedIds.has(item.id)) || []

  // Get resolved prompt for re-optimize based on mode
  const getResolvedPrompt = () => {
    if (reoptimizeMode === 'template' && selectedTemplateId) {
      const template = templates?.find(t => t.id === selectedTemplateId)
      return template ? generateTemplatePrompt(template) : ''
    }
    if (reoptimizeMode === 'preset' && selectedPresetId) {
      const preset = presets?.find(p => p.id === selectedPresetId)
      return preset ? generateStudioPresetPrompt(preset as StudioPreset) : ''
    }
    return reoptimizePrompt
  }

  const handleView = (item: ProcessingHistoryItem) => {
    setSelectedItem(item)
    setIsViewOpen(true)
  }

  const handleReoptimize = (item: ProcessingHistoryItem) => {
    setSelectedItem(item)
    setReoptimizePrompt(item.generated_prompt || '')
    setReoptimizeModel(item.ai_model || 'flux-kontext-pro')
    setReoptimizeMode('custom')
    setSelectedTemplateId(null)
    setSelectedPresetId(null)
    setUseSameSettings(true) // UX-012: Default to same settings
    setIsReoptimizeOpen(true)
  }

  const handleViewVersions = (item: ProcessingHistoryItem) => {
    setSelectedItem(item)
    setIsVersionsOpen(true)
  }

  const submitReoptimize = () => {
    if (!selectedItem) return
    const resolvedPrompt = getResolvedPrompt()
    const finalPrompt = resolvedPrompt.trim() || selectedItem.generated_prompt || 'Enhance this image for professional e-commerce presentation with clean background, sharp details, and good lighting.'
    reoptimizeMutation.mutate({
      item: selectedItem,
      prompt: finalPrompt,
      model: reoptimizeModel
    })
  }

  // Get selected model info
  const selectedModelInfo = AI_MODELS.find(m => m.value === reoptimizeModel)

  const successCount = historyItems?.filter(item =>
    item.status === 'success' || item.status === 'completed' || item.status === 'completed_passthrough'
  ).length || 0
  const failedCount = historyItems?.filter(item => item.status === 'failed').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processing History</h1>
          <p className="text-gray-500 mt-1">View all completed image optimizations</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                // Export CSV
                const items = selectedIds.size > 0 ? selectedItems : filteredItems || []
                const headers = ['File Name', 'Project', 'AI Model', 'Status', 'Version', 'Tokens', 'Completed At']
                const rows = items.map((item: any) => [
                  item.file_name || '',
                  item.projects?.name || '',
                  item.ai_model || 'flux-kontext-pro',
                  item.status,
                  item.version || 1,
                  item.tokens_used || 0,
                  format(new Date(item.completed_at), 'yyyy-MM-dd HH:mm:ss')
                ])
                const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `history-${format(new Date(), 'yyyy-MM-dd')}.csv`
                a.click()
                URL.revokeObjectURL(url)
                toast({ title: 'Export complete', description: `${items.length} items exported to CSV` })
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <HistoryIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{historyItems?.length || 0}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{successCount}</p>
              <p className="text-sm text-gray-500">Successful</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Regeneration Queue */}
      {regenerationTasks.length > 0 && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
            <h3 className="font-medium text-purple-900">Re-optimization Queue ({regenerationTasks.length})</h3>
          </div>
          <div className="space-y-2">
            {regenerationTasks.map(task => (
              <div key={task.id} className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate max-w-[200px]">{task.fileName}</span>
                    <Badge variant="outline" className="text-xs">{task.model}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'processing' && (
                      <span className="text-xs text-purple-600">{task.progress}%</span>
                    )}
                    {task.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {task.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'failed' ? 'bg-red-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                {task.error && (
                  <p className="text-xs text-red-600 mt-1">{task.error}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.size === filteredItems?.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="font-medium text-sm">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchReoptimizeOpen(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-optimize ({selectedIds.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {AI_MODELS.map(model => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[160px]">
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

      {/* History List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredItems && filteredItems.length > 0 ? (
        viewMode === 'table' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any) => (
                  <TableRow key={item.id} className={selectedIds.has(item.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {item.optimized_url ? (
                        <img
                          src={item.optimized_url}
                          alt={item.file_name}
                          className="w-10 h-10 object-cover rounded border bg-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = ''
                            ;(e.target as HTMLImageElement).className = 'hidden'
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium truncate max-w-[180px]">
                        {item.file_name || item.file_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.projects?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.ai_model || 'flux-kontext-pro'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        item.status === 'success' || item.status === 'completed' || item.status === 'completed_passthrough'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }>
                        {item.status === 'completed_passthrough' ? 'passthrough' : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.version > 1 || item.parent_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleViewVersions(item)}
                        >
                          <GitBranch className="h-3 w-3 mr-1" />
                          v{item.version || 1}
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">v1</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {format(new Date(item.completed_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(item)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReoptimize(item)} title="Re-optimize">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item: any) => (
              <Card
                key={item.id}
                className={`overflow-hidden group cursor-pointer transition-all hover:shadow-md ${
                  selectedIds.has(item.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleView(item)}
              >
                <div className="relative aspect-square bg-gray-100">
                  {item.optimized_url ? (
                    <img
                      src={item.optimized_url}
                      alt={item.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                      className="bg-white/90"
                    />
                  </div>
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className={
                      item.status === 'success' || item.status === 'completed' || item.status === 'completed_passthrough'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }>
                      {item.status === 'success' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    </Badge>
                  </div>
                  {/* Version Badge */}
                  {item.version > 1 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge
                        className="bg-purple-100 text-purple-700 text-[10px] cursor-pointer hover:bg-purple-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewVersions(item)
                        }}
                      >
                        v{item.version}
                      </Badge>
                    </div>
                  )}
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); handleView(item) }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); handleReoptimize(item) }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Re-opt
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{item.file_name || item.file_id}</p>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {item.ai_model || 'flux-pro'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(item.completed_at), 'MMM d')}
                    </span>
                  </div>

                  {/* UX-016: Quality Feedback Buttons */}
                  {item.status === 'success' && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          feedbackMutation.mutate({ itemId: item.id, rating: 'thumbs_up' })
                        }}
                        className={`flex-1 p-1.5 rounded transition-colors ${
                          (item as any).quality_rating === 'thumbs_up'
                            ? 'bg-green-100 text-green-600'
                            : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                        }`}
                        title="Good result"
                      >
                        <ThumbsUp className="h-3.5 w-3.5 mx-auto" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          feedbackMutation.mutate({ itemId: item.id, rating: 'thumbs_down' })
                        }}
                        className={`flex-1 p-1.5 rounded transition-colors ${
                          (item as any).quality_rating === 'thumbs_down'
                            ? 'bg-red-100 text-red-600'
                            : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                        }`}
                        title="Needs improvement"
                      >
                        <ThumbsDown className="h-3.5 w-3.5 mx-auto" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <HistoryIcon className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 mt-4">No history yet</h3>
          <p className="text-gray-500 mt-2">
            {searchQuery || statusFilter !== 'all'
              ? 'No items match your search'
              : 'Completed optimizations will appear here'}
          </p>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.file_name || 'Processing Details'}</DialogTitle>
            <DialogDescription>
              View optimization details and results
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={
                    selectedItem.status === 'success' || selectedItem.status === 'completed' || selectedItem.status === 'completed_passthrough'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }>
                    {selectedItem.status === 'completed_passthrough' ? 'passthrough' : selectedItem.status}
                  </Badge>
                  <Badge variant="outline">
                    {selectedItem.ai_model || 'flux-kontext-pro'}
                  </Badge>
                  {(selectedItem.version > 1 || selectedItem.parent_id) && (
                    <Badge variant="secondary">
                      Version {selectedItem.version || 1}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {selectedItem.tokens_used || 0} tokens
                </span>
              </div>

              {selectedItem.error_message && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-red-700 text-sm">Error</Label>
                  <p className="text-sm text-red-600 mt-1">{selectedItem.error_message}</p>
                </div>
              )}

              {selectedItem.generated_prompt && (
                <div>
                  <Label className="text-sm text-gray-500">Prompt Used</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm max-h-32 overflow-y-auto">
                    {selectedItem.generated_prompt}
                  </div>
                </div>
              )}

              {/* Before/After Image Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {selectedItem.original_url && (
                  <div>
                    <Label className="text-gray-500 text-sm mb-2 block">Original</Label>
                    <a href={selectedItem.original_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedItem.original_url}
                        alt="Original"
                        className="w-full h-40 object-contain bg-gray-100 rounded-lg border hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
                {selectedItem.optimized_url && (
                  <div>
                    <Label className="text-gray-500 text-sm mb-2 block">Optimized</Label>
                    <a href={selectedItem.optimized_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedItem.optimized_url}
                        alt="Optimized"
                        className="w-full h-40 object-contain bg-gray-100 rounded-lg border hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
              </div>

              {selectedItem.processing_time_sec && (
                <div className="text-sm text-gray-500">
                  Processing time: {selectedItem.processing_time_sec}s
                </div>
              )}

              <div className="text-xs text-gray-500">
                Completed: {format(new Date(selectedItem.completed_at), 'MMM d, yyyy HH:mm:ss')}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewOpen(false)
                  handleReoptimize(selectedItem)
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-optimize
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Re-optimize Dialog */}
      <Dialog open={isReoptimizeOpen} onOpenChange={setIsReoptimizeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Re-optimize Image
            </DialogTitle>
            <DialogDescription>
              Adjust the prompt and model to create a new version. The original will be preserved.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2">
              {/* UX-012: Simplified Flow Toggle */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="use-same-settings"
                    checked={useSameSettings}
                    onCheckedChange={(checked) => setUseSameSettings(checked === true)}
                  />
                  <Label htmlFor="use-same-settings" className="text-sm font-medium cursor-pointer">
                    Try again with same settings
                  </Label>
                </div>
                {useSameSettings && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedItem.ai_model || 'flux-kontext-pro'}
                  </Badge>
                )}
              </div>

              {useSameSettings && selectedItem.generated_prompt && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs text-gray-500 mb-1">Will use previous prompt:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{selectedItem.generated_prompt}</p>
                </div>
              )}

              {/* Change Settings Section - Collapsible */}
              {!useSameSettings && (
                <>
                  {/* Top row: Image preview + Quick preset */}
                  <div className="flex gap-4 items-start">
                    {/* Compact image preview */}
                    {selectedItem.original_url && (
                      <div className="shrink-0">
                    <img
                      src={selectedItem.original_url}
                      alt="Original"
                      className="w-20 h-20 object-cover bg-gray-100 rounded-lg border"
                    />
                  </div>
                )}
                {/* Quick Apply + Model in column */}
                <div className="flex-1 space-y-3">
                  {/* Quick Apply Presets */}
                  {quickPresets && quickPresets.length > 0 && (
                    <Select value={selectedQuickPresetId || ''} onValueChange={loadQuickPreset}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Quick Apply Saved Preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {quickPresets.map((preset: any) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            <div className="flex items-center gap-2">
                              <span>{preset.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {preset.ai_model}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* AI Model Selection - compact */}
                  <Select value={reoptimizeModel} onValueChange={setReoptimizeModel}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-center gap-3">
                            <span>{model.label}</span>
                            <Badge variant="secondary" className="text-xs font-mono">
                              {model.price}
                            </Badge>
                          </div>
                        </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              {/* Prompt Mode Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Prompt Source</Label>
                <RadioGroup
                  value={reoptimizeMode}
                  onValueChange={(v) => setReoptimizeMode(v as 'template' | 'preset' | 'custom')}
                  className="grid grid-cols-3 gap-2"
                >
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    reoptimizeMode === 'template' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="template" />
                    <div>
                      <span className="font-medium text-sm flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Template
                      </span>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    reoptimizeMode === 'preset' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="preset" />
                    <div>
                      <span className="font-medium text-sm flex items-center gap-1">
                        <Palette className="h-3.5 w-3.5" />
                        Studio Preset
                      </span>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    reoptimizeMode === 'custom' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="custom" />
                    <div>
                      <span className="font-medium text-sm flex items-center gap-1">
                        <Wand2 className="h-3.5 w-3.5" />
                        Custom
                      </span>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Template Selection - Dropdown */}
              {reoptimizeMode === 'template' && (
                <div className="space-y-2">
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.category && (
                                <span className="text-xs text-muted-foreground">({template.category})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedTemplateId && templates?.find(t => t.id === selectedTemplateId) && (
                    <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-white p-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 mb-1.5">
                        <FileText className="h-3 w-3" />
                        Prompt Preview
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {generateTemplatePrompt(templates.find(t => t.id === selectedTemplateId)!)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Studio Preset Selection - Dropdown */}
              {reoptimizeMode === 'preset' && (
                <div className="space-y-2">
                  {loadingPresets ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select value={selectedPresetId || ''} onValueChange={setSelectedPresetId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose a studio preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {presets?.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            <div className="flex items-center gap-2">
                              {preset.thumbnail_url ? (
                                <img src={preset.thumbnail_url} alt="" className="w-6 h-6 rounded object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                  <Palette className="h-3 w-3 text-primary/40" />
                                </div>
                              )}
                              <span>{preset.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedPresetId && presets?.find(p => p.id === selectedPresetId) && (
                    <div className="rounded-lg border bg-gradient-to-br from-pink-50 to-white p-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-pink-700 mb-1.5">
                        <Palette className="h-3 w-3" />
                        Generated Prompt
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {generateStudioPresetPrompt(presets.find(p => p.id === selectedPresetId) as StudioPreset)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Prompt Editor */}
              {reoptimizeMode === 'custom' && (
                <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-white p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mb-2">
                    <Wand2 className="h-3 w-3" />
                    Custom Prompt
                  </div>
                  <Textarea
                    value={reoptimizePrompt}
                    onChange={(e) => setReoptimizePrompt(e.target.value)}
                    placeholder={selectedItem?.generated_prompt || "Describe how you want the image enhanced..."}
                    rows={5}
                    className="resize-none text-sm border-0 bg-white/50 focus-visible:ring-1 focus-visible:ring-blue-200"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Leave empty to use the previous prompt.
                  </p>
                </div>
              )}

                  {/* Save Preset Button (only in change settings mode) */}
                  <div className="flex items-center justify-start pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSavePresetDialogOpen(true)}
                      className="text-muted-foreground"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Save Preset
                    </Button>
                  </div>
                </>
              )}

              {/* Footer - always visible */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsReoptimizeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={submitReoptimize}
                  disabled={reoptimizeMutation.isPending}
                >
                  {reoptimizeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Re-optimize
                      {selectedModelInfo && (
                        <Badge className="ml-1.5 bg-green-500/20 text-green-700 hover:bg-green-500/20">
                          {selectedModelInfo.price}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-500" />
              Version History
            </DialogTitle>
            <DialogDescription>
              Compare all versions of this optimization
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {versions && versions.length > 0 ? (
              <div className="grid gap-4">
                {versions.map((version: any) => (
                  <Card key={version.id} className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Version info */}
                      <div className="flex-shrink-0">
                        <Badge variant={version.id === selectedItem?.id ? 'default' : 'outline'}>
                          v{version.version || 1}
                        </Badge>
                      </div>

                      {/* Images */}
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Original</Label>
                          {version.original_url && (
                            <img
                              src={version.original_url}
                              alt="Original"
                              className="w-full h-24 object-contain bg-gray-100 rounded border"
                            />
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Optimized</Label>
                          {version.optimized_url && (
                            <img
                              src={version.optimized_url}
                              alt="Optimized"
                              className="w-full h-24 object-contain bg-gray-100 rounded border"
                            />
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex-shrink-0 text-right text-sm">
                        <div className="text-gray-500">{version.ai_model || 'flux-kontext-pro'}</div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(version.completed_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </div>

                    {version.generated_prompt && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <strong>Prompt:</strong> {version.generated_prompt.substring(0, 150)}
                        {version.generated_prompt.length > 150 && '...'}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No version history available</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Re-optimize Dialog */}
      <Dialog open={isBatchReoptimizeOpen} onOpenChange={setIsBatchReoptimizeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              Batch Re-optimize ({selectedIds.size} images)
            </DialogTitle>
            <DialogDescription>
              Re-optimize all selected images with the same settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selected Images Preview */}
            <div>
              <Label className="text-sm text-gray-500 mb-2 block">Selected Images</Label>
              <div className="flex gap-2 flex-wrap">
                {selectedItems.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="relative w-12 h-12">
                    {item.optimized_url ? (
                      <img
                        src={item.optimized_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover rounded border"
                      />
                    ) : (
                      <div className="w-full h-full rounded border bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
                {selectedItems.length > 5 && (
                  <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    +{selectedItems.length - 5}
                  </div>
                )}
              </div>
            </div>

            {/* AI Model Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">AI Model</Label>
              <Select value={reoptimizeModel} onValueChange={setReoptimizeModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{model.label}</span>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {model.price}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Prompt Source</Label>
              <RadioGroup
                value={reoptimizeMode}
                onValueChange={(v) => setReoptimizeMode(v as 'template' | 'preset' | 'custom')}
                className="grid grid-cols-3 gap-2"
              >
                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  reoptimizeMode === 'template' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="template" />
                  <span className="font-medium text-sm flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Template
                  </span>
                </label>
                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  reoptimizeMode === 'preset' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="preset" />
                  <span className="font-medium text-sm flex items-center gap-1">
                    <Palette className="h-3.5 w-3.5" />
                    Preset
                  </span>
                </label>
                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  reoptimizeMode === 'custom' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="custom" />
                  <span className="font-medium text-sm flex items-center gap-1">
                    <Wand2 className="h-3.5 w-3.5" />
                    Custom
                  </span>
                </label>
              </RadioGroup>
            </div>

            {/* Custom Prompt for batch */}
            {reoptimizeMode === 'custom' && (
              <div>
                <Textarea
                  value={reoptimizePrompt}
                  onChange={(e) => setReoptimizePrompt(e.target.value)}
                  placeholder="Describe how you want the images enhanced..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}

            {/* Cost Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total estimated cost:</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-base">
                    ${(parseFloat(selectedModelInfo?.price?.replace('$', '') || '0.025') * selectedIds.size).toFixed(3)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedIds.size} images x {selectedModelInfo?.price} per image
                </p>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBatchReoptimizeOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Process all selected items
                  const finalPrompt = getResolvedPrompt() || 'Enhance this image for professional e-commerce presentation with clean background, sharp details, and good lighting.'
                  selectedItems.forEach((item: ProcessingHistoryItem) => {
                    reoptimizeMutation.mutate({
                      item,
                      prompt: finalPrompt,
                      model: reoptimizeModel
                    })
                  })
                  setIsBatchReoptimizeOpen(false)
                  clearSelection()
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Re-optimize All ({selectedIds.size})
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={isSavePresetDialogOpen} onOpenChange={setIsSavePresetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Settings Preset</DialogTitle>
            <DialogDescription>
              Save your current model and prompt settings for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Preset Name</Label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g., High Quality Jewelry"
              />
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span>{selectedModelInfo?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="capitalize">{reoptimizeMode}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSavePresetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => savePresetMutation.mutate(newPresetName)}
              disabled={!newPresetName.trim() || savePresetMutation.isPending}
            >
              {savePresetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preset'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
