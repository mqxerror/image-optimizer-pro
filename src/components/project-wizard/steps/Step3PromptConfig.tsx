import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { HelpCircle, Sparkles, Loader2, FileText, Wand2, Palette, Check, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { WizardFormData } from '../types'
import { FIELD_TOOLTIPS } from '../constants'

// Enhanced prompt options with descriptions and tooltips
const promptOptions = [
  {
    id: 'template' as const,
    title: 'Use Template',
    description: 'Pre-built prompts optimized for specific product categories',
    icon: FileText,
    recommended: true,
    tooltip: 'Templates are professionally crafted prompts for jewelry, fashion, food, and more. Best for consistent results across many images.',
    gradient: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'preset' as const,
    title: 'Studio Preset',
    description: 'Your saved visual settings from Studio experiments',
    icon: Palette,
    recommended: false,
    tooltip: 'Presets capture your exact Studio settings including lighting, camera angles, and backgrounds. Great for recreating a specific look you created.',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'custom' as const,
    title: 'Custom Prompt',
    description: 'Write your own AI instructions for full control',
    icon: Wand2,
    recommended: false,
    tooltip: 'Full control over the AI prompt. Best for advanced users who want precise control over the output.',
    gradient: 'from-amber-500 to-orange-500'
  }
]

interface Step3Props {
  form: UseFormReturn<WizardFormData>
}

export function Step3PromptConfig({ form }: Step3Props) {
  const { organization } = useAuthStore()
  const { watch, setValue } = form
  const promptMode = watch('prompt_mode')
  const templateId = watch('template_id')
  const presetId = watch('studio_preset_id')
  const customPrompt = watch('custom_prompt')
  const [isGenerating, setIsGenerating] = useState(false)

  // Fetch templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['prompt-templates', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .or(`is_system.eq.true,organization_id.eq.${organization?.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!organization
  })

  // Fetch studio presets
  const { data: presets, isLoading: loadingPresets } = useQuery({
    queryKey: ['studio-presets', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('studio_presets')
        .select('id, name, description, category, is_system, thumbnail_url, camera_angle, lighting_style, background_type')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
      return data || []
    },
    enabled: !!organization
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
            settings: {
              background_type: 'white',
              lighting_style: 'studio',
              enhancement_level: 'high'
            }
          })
        }
      )

      const result = await response.json()
      if (result.prompt) {
        setValue('custom_prompt', result.prompt)
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle - Enhanced Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">How should your images be transformed?</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Choose Your Approach</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Templates are recommended for consistent, professional results.
                  Use presets if you've already created a look you love in Studio.
                  Custom prompts give you full control but require more expertise.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <RadioGroup
          value={promptMode}
          onValueChange={(value: string) => setValue('prompt_mode', value as 'template' | 'preset' | 'custom')}
          className="space-y-3"
        >
          {promptOptions.map((option) => {
            const isSelected = promptMode === option.id
            const Icon = option.icon

            return (
              <label
                key={option.id}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                )}
              >
                <RadioGroupItem value={option.id} className="mt-1" />

                {/* Icon with gradient background */}
                <div className={cn(
                  'p-2.5 rounded-lg',
                  isSelected
                    ? `bg-gradient-to-br ${option.gradient} text-white`
                    : 'bg-slate-100 text-slate-500'
                )}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{option.title}</span>
                    {option.recommended && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5 py-0">
                        Recommended
                      </Badge>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-auto" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px]">
                          <p className="text-xs">{option.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </label>
            )
          })}
        </RadioGroup>
      </div>

      {/* Template Selection */}
      {promptMode === 'template' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Select Template</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{FIELD_TOOLTIPS.template.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {FIELD_TOOLTIPS.template.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
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
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0',
                    templateId === template.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )}>
                    {templateId === template.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{template.name}</span>
                      {template.is_system && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    {template.category && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.category}{template.subcategory ? ` - ${template.subcategory}` : ''}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {templates?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No templates available</p>
                  <p className="text-xs mt-1">Create templates in Settings</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Studio Preset Selection */}
      {promptMode === 'preset' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Select Studio Preset</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Studio Presets</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pre-configured visual settings for camera angle, lighting, and background.
                    Created in the Studio page.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {loadingPresets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
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
                  {preset.thumbnail_url ? (
                    <div className="w-full aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={preset.thumbnail_url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Palette className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{preset.name}</span>
                      {preset.is_system && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground shrink-0">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    {preset.category && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {preset.category}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {preset.lighting_style && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {preset.lighting_style}
                        </span>
                      )}
                      {preset.background_type && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {preset.background_type}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {presets?.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No presets available</p>
                  <p className="text-xs mt-1">Create presets in the Studio page</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Prompt */}
      {promptMode === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Custom Prompt</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">{FIELD_TOOLTIPS.custom_prompt.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {FIELD_TOOLTIPS.custom_prompt.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAIGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              AI Generate
            </Button>
          </div>

          <Textarea
            placeholder="Describe how you want your jewelry images transformed. Be specific about background, lighting, style..."
            value={customPrompt}
            onChange={(e) => setValue('custom_prompt', e.target.value)}
            className="min-h-[150px] resize-none"
          />

          <p className="text-xs text-muted-foreground">
            Tip: Be specific about what to preserve (jewelry details, colors) and what to change (background, lighting)
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Prompt tips for jewelry</p>
          <p className="mt-1">
            Templates are optimized for consistent results. Custom prompts work best when you specify:
            background type, lighting style, what to preserve, and desired enhancements.
          </p>
        </div>
      </div>
    </div>
  )
}
