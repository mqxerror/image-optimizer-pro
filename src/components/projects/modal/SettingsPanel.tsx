import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Sparkles,
  Layout,
  Eye,
  ChevronDown,
  ChevronRight,
  Zap,
  Star,
  Crown,
  Check
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/database'
import { BriefBuilderInline } from './brief-builder'
import { AI_MODEL_CONFIG } from './RunActionBar'

// Convert unified config to array for selection
const AI_MODELS = Object.entries(AI_MODEL_CONFIG).map(([id, config]) => ({
  id,
  name: config.displayName,
  internalName: config.internalName,
  price: config.pricePerImage,
  tier: config.tier,
  bestFor: config.bestFor,
  recommended: config.recommended || false,
}))

interface SettingsPanelProps {
  project: Project
}

export function SettingsPanel({ project }: SettingsPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Local state for run config
  const [aiModel, setAiModel] = useState(project.ai_model || 'flux-kontext-pro')
  const [resolution, setResolution] = useState<'2K' | '4K'>((project.resolution as '2K' | '4K') || '2K')
  const [previewCount, setPreviewCount] = useState(project.trial_count || 5)
  const [isSaving, setIsSaving] = useState(false)

  // Expanded sections state (Studio-style)
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    resolution: false,
    preview: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Sync with project changes
  useEffect(() => {
    setAiModel(project.ai_model || 'flux-kontext-pro')
    setResolution((project.resolution as '2K' | '4K') || '2K')
    setPreviewCount(project.trial_count || 5)
  }, [project])

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

  const handlePreviewCountChange = (value: number[]) => {
    setPreviewCount(value[0])
    saveSettings({ trial_count: value[0] })
  }

  const selectedModel = AI_MODELS.find(m => m.id === aiModel)

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {/* Saving indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mb-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}

        {/* AI Model Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('model')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">AI Model</span>
              {!expandedSections.model && selectedModel && (
                <span className="text-xs text-slate-400 ml-1">{selectedModel.name}</span>
              )}
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.model ? "bg-indigo-100" : "bg-slate-100"
            )}>
              {expandedSections.model ? (
                <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.model && (
            <div className="border-t border-slate-100 px-3 pb-3 pt-3">
              <div className="space-y-1.5">
                {AI_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => handleAiModelChange(model.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      aiModel === model.id
                        ? "bg-indigo-50 ring-1 ring-indigo-400"
                        : "bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center",
                      model.tier === 'fast' ? 'bg-amber-100' :
                      model.tier === 'balanced' ? 'bg-blue-100' : 'bg-purple-100'
                    )}>
                      {model.tier === 'fast' && <Zap className="w-3 h-3 text-amber-600" />}
                      {model.tier === 'balanced' && <Star className="w-3 h-3 text-blue-600" />}
                      {model.tier === 'premium' && <Crown className="w-3 h-3 text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          aiModel === model.id ? "text-indigo-700" : "text-slate-700"
                        )}>
                          {model.name}
                        </span>
                        {model.recommended && (
                          <Badge className="text-[9px] py-0 h-4 bg-green-100 text-green-700 border-0">
                            Recommended
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">{model.price}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {model.bestFor}
                      </p>
                    </div>
                    {aiModel === model.id && (
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resolution Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('resolution')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Layout className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Resolution</span>
              <span className="text-xs text-slate-400 ml-1">{resolution}</span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.resolution ? "bg-purple-100" : "bg-slate-100"
            )}>
              {expandedSections.resolution ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.resolution && (
            <div className="border-t border-slate-100 px-3 pb-3 pt-3">
              <div className="grid grid-cols-2 gap-2">
                {(['2K', '4K'] as const).map(res => (
                  <button
                    key={res}
                    onClick={() => handleResolutionChange(res)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all",
                      resolution === res
                        ? "bg-purple-50 ring-1 ring-purple-400"
                        : "bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <span className={cn(
                      "text-lg font-semibold",
                      resolution === res ? "text-purple-600" : "text-slate-600"
                    )}>
                      {res}
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      resolution === res ? "text-purple-500" : "text-slate-400"
                    )}>
                      {res === '2K' ? 'Web-ready' : 'High detail'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview Sample Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('preview')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Preview Sample</span>
              <span className="text-xs text-slate-400 ml-1">{previewCount} images</span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.preview ? "bg-amber-100" : "bg-slate-100"
            )}>
              {expandedSections.preview ? (
                <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.preview && (
            <div className="border-t border-slate-100 px-3 pb-3 pt-3">
              <div className="space-y-3">
                <div
                  className="touch-none"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Slider
                    value={[previewCount]}
                    onValueChange={handlePreviewCountChange}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1</span>
                  <span className="font-medium text-amber-600">{previewCount} images</span>
                  <span>10</span>
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  We'll pick representative images to validate the look
                </p>
              </div>
            </div>
          )}
          </div>

          {/* Brief Builder - Inline without its own scroll */}
          <BriefBuilderInline project={project} />
        </div>
      </ScrollArea>
    </div>
  )
}
