import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Settings,
  Sparkles,
  Wand2,
  FileText,
  Palette,
  PenLine,
  Check,
  Camera,
  Sun
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Project } from '@/types/database'

const AI_MODELS = [
  { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', price: '$0.04', recommended: true },
  { id: 'flux-kontext-max', name: 'Flux Kontext Max', price: '$0.08' },
  { id: 'nano-banana', name: 'Nano Banana', price: '$0.02' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', price: '$0.09' },
  { id: 'ghibli', name: 'Ghibli Style', price: '$0.05' },
]

interface SettingsPanelProps {
  project: Project
}

export function SettingsPanel({ project }: SettingsPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()

  // Local state for inline editing
  const [aiModel, setAiModel] = useState(project.ai_model || 'flux-kontext-pro')
  const [resolution, setResolution] = useState<'2K' | '4K'>((project.resolution as '2K' | '4K') || '2K')
  const [trialCount, setTrialCount] = useState(project.trial_count || 3)
  const [promptMode, setPromptMode] = useState<'template' | 'preset' | 'custom'>(
    (project.prompt_mode as 'template' | 'preset' | 'custom') ||
    (project.template_id ? 'template' : project.studio_preset_id ? 'preset' : 'custom')
  )
  const [templateId, setTemplateId] = useState(project.template_id || '')
  const [presetId, setPresetId] = useState(project.studio_preset_id || '')
  const [customPrompt, setCustomPrompt] = useState(project.custom_prompt || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Sync with project changes
  useEffect(() => {
    setAiModel(project.ai_model || 'flux-kontext-pro')
    setResolution((project.resolution as '2K' | '4K') || '2K')
    setTrialCount(project.trial_count || 3)
    setPromptMode(
      (project.prompt_mode as 'template' | 'preset' | 'custom') ||
      (project.template_id ? 'template' : project.studio_preset_id ? 'preset' : 'custom')
    )
    setTemplateId(project.template_id || '')
    setPresetId(project.studio_preset_id || '')
    setCustomPrompt(project.custom_prompt || '')
  }, [project])

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['templates-panel', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('prompt_templates')
        .select('id, name, category, subcategory, is_system, base_prompt')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return data || []
    },
    enabled: !!organization
  })

  // Fetch presets
  const { data: presets } = useQuery({
    queryKey: ['presets-panel', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('studio_presets')
        .select('id, name, description, category, is_system, camera_angle, lighting_style, background_type')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return data || []
    },
    enabled: !!organization
  })

  // Auto-save with debounce
  const saveSettings = useCallback(async (updates: Partial<Project>) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', project.id)

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['unified-project', project.id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }, [project.id, queryClient, toast])

  // Handlers with auto-save
  const handleAiModelChange = (value: string) => {
    setAiModel(value)
    saveSettings({ ai_model: value })
  }

  const handleResolutionChange = (value: '2K' | '4K') => {
    setResolution(value)
    saveSettings({ resolution: value })
  }

  const handleTrialCountChange = (value: number[]) => {
    setTrialCount(value[0])
    saveSettings({ trial_count: value[0] })
  }

  const handlePromptModeChange = (value: 'template' | 'preset' | 'custom') => {
    setPromptMode(value)
    const updates: Partial<Project> = { prompt_mode: value }

    if (value === 'template') {
      updates.studio_preset_id = null
      updates.custom_prompt = null
    } else if (value === 'preset') {
      updates.template_id = null
      updates.custom_prompt = null
    } else {
      updates.template_id = null
      updates.studio_preset_id = null
    }

    saveSettings(updates)
  }

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    saveSettings({
      template_id: id,
      studio_preset_id: null,
      custom_prompt: null,
      prompt_mode: 'template'
    })
  }

  const handlePresetChange = (id: string) => {
    setPresetId(id)
    saveSettings({
      studio_preset_id: id,
      template_id: null,
      custom_prompt: null,
      prompt_mode: 'preset'
    })
  }

  const handleCustomPromptBlur = () => {
    if (customPrompt !== project.custom_prompt) {
      saveSettings({
        custom_prompt: customPrompt,
        template_id: null,
        studio_preset_id: null,
        prompt_mode: 'custom'
      })
    }
  }

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
            current_prompt: customPrompt,
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
        const newPrompt = result.optimized_prompt || result.prompt
        setCustomPrompt(newPrompt)
        saveSettings({
          custom_prompt: newPrompt,
          template_id: null,
          studio_preset_id: null,
          prompt_mode: 'custom'
        })
        toast({ title: 'Prompt generated!' })
      }
    } catch (error) {
      toast({
        title: 'Failed to generate prompt',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedTemplate = templates?.find(t => t.id === templateId)
  const selectedPreset = presets?.find(p => p.id === presetId)

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6 relative">
        {/* Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            Settings
          </div>

          {/* AI Model */}
          <div className="space-y-2">
            <Label className="text-xs">AI Model</Label>
            <Select value={aiModel} onValueChange={handleAiModelChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{model.name}</span>
                      {model.recommended && (
                        <Badge variant="secondary" className="text-[10px]">REC</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label className="text-xs">Resolution</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={resolution === '2K' ? 'default' : 'outline'}
                onClick={() => handleResolutionChange('2K')}
                className="flex-1 h-8"
              >
                2K
              </Button>
              <Button
                size="sm"
                variant={resolution === '4K' ? 'default' : 'outline'}
                onClick={() => handleResolutionChange('4K')}
                className="flex-1 h-8"
              >
                4K
              </Button>
            </div>
          </div>

          {/* Trial Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Trial Images</Label>
              <span className="text-xs text-muted-foreground">{trialCount}</span>
            </div>
            <div
              className="touch-none"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Slider
                value={[trialCount]}
                onValueChange={handleTrialCountChange}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Prompt
          </div>

          {/* Prompt Mode Selection */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'template', icon: FileText, label: 'Template' },
              { id: 'preset', icon: Palette, label: 'Preset' },
              { id: 'custom', icon: PenLine, label: 'Custom' },
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => handlePromptModeChange(mode.id as 'template' | 'preset' | 'custom')}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all',
                  promptMode === mode.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent hover:bg-muted'
                )}
              >
                <mode.icon className="h-4 w-4" />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Template Selection */}
          {promptMode === 'template' && (
            <div className="space-y-2">
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {templates?.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateChange(template.id)}
                    className={cn(
                      'w-full flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-all',
                      templateId === template.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    {templateId === template.id && (
                      <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className={cn(templateId !== template.id && 'ml-5')}>
                      <span className="font-medium">{template.name}</span>
                      {template.category && (
                        <p className="text-muted-foreground">{template.category}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground line-clamp-2">
                  {selectedTemplate.base_prompt || 'No preview'}
                </div>
              )}
            </div>
          )}

          {/* Preset Selection */}
          {promptMode === 'preset' && (
            <div className="space-y-2">
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {presets?.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={cn(
                      'w-full flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-all',
                      presetId === preset.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    {presetId === preset.id && (
                      <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className={cn(presetId !== preset.id && 'ml-5')}>
                      <span className="font-medium">{preset.name}</span>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1">
                          <Camera className="h-2 w-2 mr-0.5" />
                          {preset.camera_angle}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-1">
                          <Sun className="h-2 w-2 mr-0.5" />
                          {preset.lighting_style?.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedPreset && (
                <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  {selectedPreset.description || `${selectedPreset.camera_angle}, ${selectedPreset.lighting_style}`}
                </div>
              )}
            </div>
          )}

          {/* Custom Prompt */}
          {promptMode === 'custom' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="h-7 text-xs gap-1"
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
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onBlur={handleCustomPromptBlur}
                placeholder="Describe how you want images transformed..."
                className="min-h-[100px] text-xs resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
