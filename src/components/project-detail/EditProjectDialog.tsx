import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Wand2,
  FileText,
  Sparkles,
  Palette,
  PenLine,
  Camera,
  Sun,
  ImageIcon,
  Folder,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import GoogleDriveBrowser from '@/components/google-drive/GoogleDriveBrowser'
import type { Project } from '@/types/database'

const RESOLUTIONS = ['2K', '4K'] as const

const AI_MODELS = [
  { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', description: 'Professional image editing', price: '$0.04' },
  { id: 'flux-kontext-max', name: 'Flux Kontext Max', description: 'Maximum quality editing', price: '$0.08' },
  { id: 'nano-banana', name: 'Nano Banana', description: 'Fast & affordable', price: '$0.02' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: 'Best quality, 4K support', price: '$0.09' },
  { id: 'ghibli', name: 'Ghibli Style', description: 'Artistic transformation', price: '$0.05' },
] as const

const editProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  output_folder_id: z.string().optional(),
  output_folder_name: z.string().optional(),
  ai_model: z.string(),
  resolution: z.enum(RESOLUTIONS),
  trial_count: z.number().min(0).max(10),
  prompt_mode: z.enum(['template', 'preset', 'custom']),
  template_id: z.string().optional(),
  studio_preset_id: z.string().optional(),
  custom_prompt: z.string().optional(),
})

type EditProjectForm = z.infer<typeof editProjectSchema>

// Types for Supabase query results
interface TemplateRow {
  id: string
  name: string
  category: string | null
  subcategory: string | null
  is_system: boolean
  base_prompt: string | null
}

interface PresetRow {
  id: string
  name: string
  description: string | null
  category: string | null
  is_system: boolean
  thumbnail_url: string | null
  camera_angle: string
  lighting_style: string
  background_type: string
}

interface EditProjectDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (updatedProject: Project) => void
}

export function EditProjectDialog({ project, open, onOpenChange, onSaved }: EditProjectDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'prompt'>('basic')

  const [showOutputFolderBrowser, setShowOutputFolderBrowser] = useState(false)

  const form = useForm<EditProjectForm>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: '',
      output_folder_id: '',
      output_folder_name: '',
      ai_model: 'flux-kontext-pro',
      resolution: '2K',
      trial_count: 3,
      prompt_mode: 'custom',
      template_id: '',
      studio_preset_id: '',
      custom_prompt: '',
    }
  })

  const { watch, setValue, reset, handleSubmit, formState: { errors } } = form
  const promptMode = watch('prompt_mode')
  const templateId = watch('template_id')
  const presetId = watch('studio_preset_id')

  // Helper to extract folder ID from Google Drive URL
  const extractFolderId = (url: string | null | undefined): string => {
    if (!url) return ''
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : ''
  }

  // Helper to extract folder name from URL (last segment or generic name)
  const extractFolderName = (url: string | null | undefined): string => {
    if (!url) return ''
    return 'Google Drive Folder'
  }

  // Reset form when project changes
  useEffect(() => {
    if (project && open) {
      reset({
        name: project.name,
        output_folder_id: project.output_folder_id || extractFolderId(project.output_folder_url),
        output_folder_name: project.output_folder_url ? extractFolderName(project.output_folder_url) : '',
        ai_model: project.ai_model || 'flux-kontext-pro',
        resolution: (project.resolution as '2K' | '4K') || '2K',
        trial_count: project.trial_count || 3,
        prompt_mode: project.prompt_mode || (project.template_id ? 'template' : project.studio_preset_id ? 'preset' : 'custom'),
        template_id: project.template_id || '',
        studio_preset_id: project.studio_preset_id || '',
        custom_prompt: project.custom_prompt || '',
      })
      setActiveTab('basic')
      setShowOutputFolderBrowser(false)
    }
  }, [project, open, reset])

  // Fetch templates
  const { data: templates, isLoading: loadingTemplates } = useQuery<TemplateRow[]>({
    queryKey: ['templates-edit', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('prompt_templates')
        .select('id, name, category, subcategory, is_system, base_prompt')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return (data as TemplateRow[]) || []
    },
    enabled: !!organization && open
  })

  // Fetch studio presets
  const { data: presets, isLoading: loadingPresets } = useQuery<PresetRow[]>({
    queryKey: ['studio-presets-edit', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('studio_presets')
        .select('id, name, description, category, is_system, thumbnail_url, camera_angle, lighting_style, background_type')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return (data as PresetRow[]) || []
    },
    enabled: !!organization && open
  })

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditProjectForm): Promise<Project> => {
      if (!project) throw new Error('No project')

      // Build Google Drive URL from folder ID
      const buildFolderUrl = (folderId: string | undefined): string | null => {
        if (!folderId) return null
        return `https://drive.google.com/drive/folders/${folderId}`
      }

      const updateData: Record<string, unknown> = {
        name: data.name,
        output_folder_url: buildFolderUrl(data.output_folder_id),
        output_folder_id: data.output_folder_id || null,
        ai_model: data.ai_model,
        resolution: data.resolution,
        trial_count: data.trial_count,
        prompt_mode: data.prompt_mode,
      }

      // Set the appropriate prompt source based on mode
      if (data.prompt_mode === 'template') {
        updateData.template_id = data.template_id || null
        updateData.studio_preset_id = null
        updateData.custom_prompt = null
      } else if (data.prompt_mode === 'preset') {
        updateData.template_id = null
        updateData.studio_preset_id = data.studio_preset_id || null
        updateData.custom_prompt = null
      } else {
        updateData.template_id = null
        updateData.studio_preset_id = null
        updateData.custom_prompt = data.custom_prompt || null
      }

      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id)
        .select()
        .single()

      if (error) throw error
      return updatedProject as Project
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] })
      toast({ title: 'Project updated successfully' })
      onSaved?.(updatedProject)
      onOpenChange(false)
    },
    onError: (error) => {
      toast({ title: 'Error updating project', description: error.message, variant: 'destructive' })
    }
  })

  // AI Generate prompt
  const handleAIGenerate = async () => {
    setIsGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-prompt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_prompt: watch('custom_prompt'),
            settings: {
              background_type: 'white',
              lighting_style: 'studio',
              enhancement_level: 'high'
            }
          })
        }
      )

      const result = await response.json()
      if (result.optimized_prompt || result.prompt) {
        setValue('custom_prompt', result.optimized_prompt || result.prompt)
        toast({
          title: 'Prompt generated!',
          description: 'AI created a professional prompt for your images'
        })
      }
    } catch (error: unknown) {
      const err = error as Error
      toast({
        title: 'Failed to generate prompt',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const onSubmit = (data: EditProjectForm) => {
    updateMutation.mutate(data)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const selectedTemplate = templates?.find(t => t.id === templateId)
  const selectedPreset = presets?.find(p => p.id === presetId)

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project settings and prompt configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'prompt')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Basic Settings
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Prompt Config
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto py-4 px-1">
              {/* Basic Settings Tab */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="e.g., Summer Collection 2024"
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Output Folder (Google Drive)</Label>
                  {watch('output_folder_id') ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                      <Folder className="h-5 w-5 text-yellow-500" />
                      <span className="flex-1 text-sm font-medium truncate">
                        {watch('output_folder_name') || 'Selected Folder'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setValue('output_folder_id', '')
                          setValue('output_folder_name', '')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowOutputFolderBrowser(true)}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Select Output Folder
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Optimized images will be saved here with "_optimized" suffix (e.g., ring_optimized.jpg)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select
                    value={watch('ai_model')}
                    onValueChange={(value) => setValue('ai_model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.price}/img</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <Select
                      value={watch('resolution')}
                      onValueChange={(value) => setValue('resolution', value as '2K' | '4K')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2K">2K (2048px)</SelectItem>
                        <SelectItem value="4K">4K (4096px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Trial Images</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      {...form.register('trial_count', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Prompt Config Tab */}
              <TabsContent value="prompt" className="mt-0 space-y-4">
                {/* Prompt Mode Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">How should images be transformed?</Label>

                  <RadioGroup
                    value={promptMode}
                    onValueChange={(value) => setValue('prompt_mode', value as 'template' | 'preset' | 'custom')}
                    className="grid grid-cols-3 gap-3"
                  >
                    {/* Template Option */}
                    <label
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all text-center',
                        promptMode === 'template'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-muted hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="template" className="sr-only" />
                      <FileText className={cn('h-6 w-6', promptMode === 'template' ? 'text-primary' : 'text-muted-foreground')} />
                      <div>
                        <span className="font-medium text-sm">Template</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Pre-built prompts</p>
                      </div>
                    </label>

                    {/* Studio Preset Option */}
                    <label
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all text-center',
                        promptMode === 'preset'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-muted hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="preset" className="sr-only" />
                      <Palette className={cn('h-6 w-6', promptMode === 'preset' ? 'text-primary' : 'text-muted-foreground')} />
                      <div>
                        <span className="font-medium text-sm">Studio Preset</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Camera & lighting</p>
                      </div>
                    </label>

                    {/* Custom Option */}
                    <label
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all text-center',
                        promptMode === 'custom'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-muted hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="custom" className="sr-only" />
                      <PenLine className={cn('h-6 w-6', promptMode === 'custom' ? 'text-primary' : 'text-muted-foreground')} />
                      <div>
                        <span className="font-medium text-sm">Custom</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Write your own</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {/* Template Selection */}
                {promptMode === 'template' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Template</Label>
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {templates?.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setValue('template_id', template.id)}
                            className={cn(
                              'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                              templateId === template.id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-muted hover:border-primary/50'
                            )}
                          >
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{template.name}</span>
                                {template.is_system && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">SYSTEM</Badge>
                                )}
                              </div>
                              {template.category && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {template.category}{template.subcategory ? ` - ${template.subcategory}` : ''}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedTemplate && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {selectedTemplate.base_prompt || 'No preview available'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Studio Preset Selection */}
                {promptMode === 'preset' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Studio Preset</Label>
                    {loadingPresets ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                        {presets?.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setValue('studio_preset_id', preset.id)}
                            className={cn(
                              'flex flex-col items-start gap-2 p-3 rounded-lg border text-left transition-all',
                              presetId === preset.id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-muted hover:border-primary/50'
                            )}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm truncate">{preset.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[10px]">
                                <Camera className="h-2.5 w-2.5 mr-1" />
                                {preset.camera_angle}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                <Sun className="h-2.5 w-2.5 mr-1" />
                                {preset.lighting_style?.replace('-', ' ')}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedPreset && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          {selectedPreset.description || `${selectedPreset.camera_angle} angle, ${selectedPreset.lighting_style} lighting, ${selectedPreset.background_type} background`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Prompt */}
                {promptMode === 'custom' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Custom Prompt</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAIGenerate}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        AI Generate
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Describe how you want your jewelry images transformed..."
                      value={watch('custom_prompt')}
                      onChange={(e) => setValue('custom_prompt', e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Be specific about background, lighting, and what details to preserve
                    </p>
                  </div>
                )}

                {/* Info box */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Prompt Priority</p>
                    <p className="mt-1">
                      {promptMode === 'template' && 'Template prompts are professionally crafted for consistent results.'}
                      {promptMode === 'preset' && 'Studio presets apply camera, lighting, and background settings automatically.'}
                      {promptMode === 'custom' && 'Custom prompts give you full control over the transformation.'}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>

            <DialogFooter className="border-t pt-4 mt-auto">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Output Folder Browser Dialog */}
    <Dialog open={showOutputFolderBrowser} onOpenChange={setShowOutputFolderBrowser}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Output Folder</DialogTitle>
          <DialogDescription>
            Choose where processed images will be exported
          </DialogDescription>
        </DialogHeader>
        <GoogleDriveBrowser
          selectionMode="folder"
          onSelectFolder={(folderId, folderName) => {
            setValue('output_folder_id', folderId)
            setValue('output_folder_name', folderName)
            setShowOutputFolderBrowser(false)
          }}
        />
      </DialogContent>
    </Dialog>
  </>
  )
}
