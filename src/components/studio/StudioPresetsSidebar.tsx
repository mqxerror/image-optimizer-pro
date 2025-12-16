import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Star, Sparkles, Sun, Zap, FileText, User, ChevronDown, ChevronRight, Palette, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser'
import { useToast } from '@/hooks/use-toast'
import { ContextualHint } from '@/components/onboarding'
import type { StudioPreset, PresetCategory, BackgroundType, LightingStyle, JewelryMetal } from '@/types/studio'
import type { PromptTemplate } from '@/types/database'

// Generate gradient based on preset settings
function getPresetGradient(preset: StudioPreset): string {
  const bg = preset.background_type as BackgroundType
  const lighting = preset.lighting_style as LightingStyle
  const metal = preset.jewelry_metal as JewelryMetal

  const bgGradients: Record<BackgroundType, string> = {
    'white': 'from-slate-50 via-white to-slate-100',
    'black': 'from-slate-800 via-slate-900 to-black',
    'gradient': 'from-purple-100 via-pink-50 to-blue-100',
    'transparent': 'from-slate-100 via-white to-slate-200',
    'scene': 'from-amber-50 via-orange-50 to-yellow-50',
  }

  const lightingOverrides: Partial<Record<LightingStyle, string>> = {
    'dramatic': 'from-slate-700 via-slate-800 to-slate-900',
    'soft': 'from-pink-50 via-rose-50 to-purple-50',
    'natural': 'from-amber-50 via-yellow-50 to-orange-50',
    'rim': 'from-purple-200 via-indigo-100 to-purple-200',
  }

  const metalAccents: Partial<Record<JewelryMetal, string>> = {
    'gold': 'from-amber-100 via-yellow-50 to-amber-100',
    'rose-gold': 'from-pink-100 via-rose-50 to-pink-100',
    'silver': 'from-slate-100 via-slate-50 to-slate-100',
    'platinum': 'from-blue-50 via-slate-50 to-blue-100',
  }

  if (lighting === 'dramatic' || bg === 'black') {
    return lightingOverrides['dramatic'] || bgGradients['black']
  }

  if (metal !== 'auto' && metal !== 'mixed' && metalAccents[metal]) {
    return metalAccents[metal]!
  }

  if (lightingOverrides[lighting]) {
    return lightingOverrides[lighting]!
  }

  return bgGradients[bg] || bgGradients['white']
}

function getLightingIcon(style: LightingStyle): React.ReactNode {
  switch (style) {
    case 'dramatic': return <Zap className="h-2.5 w-2.5" />
    case 'soft': return <Sun className="h-2.5 w-2.5" />
    case 'natural': return <Sun className="h-2.5 w-2.5" />
    default: return null
  }
}

function getMetalColor(metal: JewelryMetal): string {
  switch (metal) {
    case 'gold': return 'bg-amber-400'
    case 'rose-gold': return 'bg-pink-300'
    case 'silver': return 'bg-slate-300'
    case 'platinum': return 'bg-blue-200'
    default: return 'bg-slate-300'
  }
}

interface StudioPresetsSidebarProps {
  selectedPresetId: string | null
  selectedTemplateId?: string | null
  onSelectPreset: (preset: StudioPreset) => void
  onSelectTemplate?: (template: PromptTemplate) => void
  onCreatePreset: () => void
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  count: number
  defaultOpen?: boolean
  accentColor?: string
  children: React.ReactNode
}

function CollapsibleSection({ title, icon, count, defaultOpen = true, accentColor = 'gray', children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const colorClasses: Record<string, string> = {
    gray: 'text-slate-500 hover:text-slate-700',
    purple: 'text-purple-600 hover:text-purple-700',
    blue: 'text-blue-600 hover:text-blue-700',
    amber: 'text-amber-600 hover:text-amber-700',
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between py-2 px-1 rounded transition-colors',
          colorClasses[accentColor]
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {count}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isOpen && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

const categoryLabels: Record<PresetCategory, string> = {
  popular: 'Popular',
  editorial: 'Editorial',
  lifestyle: 'Lifestyle',
  minimal: 'Minimal',
  dramatic: 'Dramatic',
  custom: 'My Studios',
}

const categoryIcons: Record<PresetCategory, React.ReactNode> = {
  popular: <Star className="h-3.5 w-3.5" />,
  editorial: <Sparkles className="h-3.5 w-3.5" />,
  lifestyle: <Sun className="h-3.5 w-3.5" />,
  minimal: <Palette className="h-3.5 w-3.5" />,
  dramatic: <Zap className="h-3.5 w-3.5" />,
  custom: <User className="h-3.5 w-3.5" />,
}

export function StudioPresetsSidebar({
  selectedPresetId,
  selectedTemplateId,
  onSelectPreset,
  onSelectTemplate,
  onCreatePreset,
}: StudioPresetsSidebarProps) {
  const { organization } = useAuthStore()
  const { shouldShowHint, markAsSeen } = useFirstTimeUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'preset' | 'template'; id: string; name: string } | null>(null)

  const showHint = shouldShowHint('preset') || shouldShowHint('template')

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('studio_presets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-presets'] })
      toast({ title: 'Preset deleted' })
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    },
    onError: (error) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    }
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prompt_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast({ title: 'Template deleted' })
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    },
    onError: (error) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    }
  })

  // Toggle favorite mutation for presets
  const togglePresetFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase.from('studio_presets').update({ is_favorite: !isFavorite }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-presets'] })
    }
  })

  // Toggle favorite mutation for templates
  const toggleTemplateFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase.from('prompt_templates').update({ is_favorite: !isFavorite }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    }
  })

  const handleDeleteClick = (type: 'preset' | 'template', id: string, name: string) => {
    setItemToDelete({ type, id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    if (itemToDelete.type === 'preset') {
      deletePresetMutation.mutate(itemToDelete.id)
    } else {
      deleteTemplateMutation.mutate(itemToDelete.id)
    }
  }

  const { data: presets, isLoading } = useQuery({
    queryKey: ['studio-presets', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_presets')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (error) throw error
      return data as StudioPreset[]
    },
    enabled: !!organization,
  })

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['prompt-templates', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('usage_count', { ascending: false })

      if (error) throw error
      return data as PromptTemplate[]
    },
    enabled: !!organization,
  })

  const systemPresets = presets?.filter(p => p.is_system) || []
  const userPresets = presets?.filter(p => !p.is_system && p.organization_id === organization?.id) || []
  const userTemplates = templates?.filter(t => !t.is_system) || []
  const systemTemplates = templates?.filter(t => t.is_system) || []

  // Filter by search
  const filterItems = <T extends { name: string }>(items: T[]): T[] =>
    items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredUserPresets = filterItems(userPresets)
  const filteredSystemPresets = filterItems(systemPresets)
  const filteredUserTemplates = filterItems(userTemplates)
  const filteredSystemTemplates = filterItems(systemTemplates)

  // Group system presets by category
  const groupedPresets = filteredSystemPresets.reduce((acc, preset) => {
    const cat = preset.category as PresetCategory
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(preset)
    return acc
  }, {} as Record<PresetCategory, StudioPreset[]>)

  const renderTemplateCard = (template: PromptTemplate & { is_favorite?: boolean }) => {
    const isSelected = selectedTemplateId === template.id
    const isSystem = template.is_system
    const isFavorite = template.is_favorite || false

    const getTemplateGradient = () => {
      if (template.style === 'Dramatic') return 'from-slate-700 via-slate-800 to-slate-900'
      if (template.style === 'Elegant') return 'from-purple-100 via-pink-50 to-purple-100'
      if (template.background === 'Gradient') return 'from-blue-100 via-purple-50 to-pink-100'
      if (template.background === 'Black') return 'from-slate-800 via-slate-900 to-black'
      return 'from-blue-50 via-sky-50 to-blue-100'
    }

    return (
      <div
        key={template.id}
        className={cn(
          'w-full text-left p-2.5 rounded-xl border-2 transition-all group relative',
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : 'border-transparent bg-white hover:border-blue-200 hover:shadow-sm'
        )}
      >
        <button
          onClick={() => onSelectTemplate?.(template)}
          className="w-full text-left"
        >
          <div className="flex gap-3">
            <div className={cn(
              'w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
              getTemplateGradient()
            )}>
              <FileText className="h-5 w-5 text-blue-600/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-slate-900 text-sm truncate">{template.name}</p>
                {isSystem && (
                  <Sparkles className="h-3 w-3 text-blue-500 flex-shrink-0" />
                )}
                {isFavorite && (
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {template.style || template.category}
              </p>
            </div>
          </div>
        </button>
        {/* Action buttons - visible on hover for non-system templates */}
        {!isSystem && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleTemplateFavoriteMutation.mutate({ id: template.id, isFavorite })
              }}
              className="p-1 rounded hover:bg-slate-100"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick('template', template.id, template.name)
              }}
              className="p-1 rounded hover:bg-red-50"
              title="Delete template"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderPresetCard = (preset: StudioPreset & { is_favorite?: boolean }) => {
    const gradientClass = getPresetGradient(preset)
    const isDark = preset.lighting_style === 'dramatic' || preset.background_type === 'black'
    const lightingIcon = getLightingIcon(preset.lighting_style as LightingStyle)
    const metalColor = getMetalColor(preset.jewelry_metal as JewelryMetal)
    const isSelected = selectedPresetId === preset.id
    const isFavorite = preset.is_favorite || false

    return (
      <div
        key={preset.id}
        className={cn(
          'w-full text-left p-2.5 rounded-xl border-2 transition-all group relative',
          isSelected
            ? 'border-purple-500 bg-purple-50 shadow-sm'
            : 'border-transparent bg-white hover:border-purple-200 hover:shadow-sm'
        )}
      >
        <button
          onClick={() => onSelectPreset(preset)}
          className="w-full text-left"
        >
          <div className="flex gap-3">
            {preset.thumbnail_url ? (
              <img
                src={preset.thumbnail_url}
                alt={preset.name}
                className="w-11 h-11 rounded-lg object-cover bg-slate-100 flex-shrink-0"
              />
            ) : (
              <div className={cn(
                'w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center relative overflow-hidden flex-shrink-0',
                gradientClass
              )}>
                <Sparkles className={cn('h-4 w-4', isDark ? 'text-slate-300' : 'text-slate-500')} />
                <div className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5">
                  {preset.jewelry_metal !== 'auto' && (
                    <div className={cn('w-1.5 h-1.5 rounded-full ring-1 ring-white/50', metalColor)} />
                  )}
                  {lightingIcon && (
                    <div className={isDark ? 'text-slate-300' : 'text-slate-500'}>
                      {lightingIcon}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-slate-900 text-sm truncate">{preset.name}</p>
                {preset.is_system && (
                  <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
                )}
                {isFavorite && (
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {preset.background_type !== 'white' && (
                  <span className={cn(
                    'text-[9px] px-1 py-0.5 rounded',
                    preset.background_type === 'black' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  )}>
                    {preset.background_type}
                  </span>
                )}
                {preset.lighting_style !== 'studio-3point' && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-600">
                    {preset.lighting_style}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
        {/* Action buttons - visible on hover for non-system presets */}
        {!preset.is_system && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePresetFavoriteMutation.mutate({ id: preset.id, isFavorite })
              }}
              className="p-1 rounded hover:bg-slate-100"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick('preset', preset.id, preset.name)
              }}
              className="p-1 rounded hover:bg-red-50"
              title="Delete preset"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const hasUserContent = filteredUserPresets.length > 0 || filteredUserTemplates.length > 0
  const totalPresets = Object.values(groupedPresets).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="h-full flex flex-col bg-slate-50 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-slate-900 mb-3">Style Library</h2>
        <ContextualHint
          id="sidebar-hint"
          hint="Choose a Visual Preset to adjust settings, or a Prompt Template for pre-written AI instructions."
          position="bottom"
          visible={showHint}
          onDismiss={() => {
            markAsSeen('hasSeenPresetHint')
            markAsSeen('hasSeenTemplateHint')
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
        </ContextualHint>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading || templatesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* My Stuff Section - Always First */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Stuff</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
                    onClick={onCreatePreset}
                  >
                    <Plus className="h-3 w-3" />
                    Save
                  </Button>
                </div>

                {hasUserContent ? (
                  <div className="space-y-1.5">
                    {filteredUserPresets.map(renderPresetCard)}
                    {filteredUserTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100/50 text-center">
                    <p className="text-xs text-slate-500">No saved styles yet</p>
                    <button
                      onClick={onCreatePreset}
                      className="text-xs text-purple-600 hover:underline mt-1"
                    >
                      Save current settings
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 my-4" />

              {/* Visual Presets Section */}
              {totalPresets > 0 && (
                <CollapsibleSection
                  title="Visual Presets"
                  icon={<Palette className="h-3.5 w-3.5" />}
                  count={totalPresets}
                  accentColor="purple"
                  defaultOpen={true}
                >
                  {(['popular', 'editorial', 'lifestyle', 'minimal', 'dramatic'] as PresetCategory[]).map(category => {
                    const categoryPresets = groupedPresets[category]
                    if (!categoryPresets?.length) return null

                    return (
                      <div key={category} className="mb-3">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                          {categoryIcons[category]}
                          <span className="text-[10px] font-medium text-slate-400 uppercase">
                            {categoryLabels[category]}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {categoryPresets.map(renderPresetCard)}
                        </div>
                      </div>
                    )
                  })}
                </CollapsibleSection>
              )}

              {/* Prompt Templates Section */}
              {filteredSystemTemplates.length > 0 && (
                <CollapsibleSection
                  title="Prompt Templates"
                  icon={<FileText className="h-3.5 w-3.5" />}
                  count={filteredSystemTemplates.length}
                  accentColor="blue"
                  defaultOpen={false}
                >
                  <div className="p-2 mb-2 bg-blue-50/50 rounded-lg border border-blue-100">
                    <p className="text-[10px] text-blue-600">
                      Templates use pre-written prompts instead of visual settings.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {filteredSystemTemplates.map(renderTemplateCard)}
                  </div>
                </CollapsibleSection>
              )}

              {/* Empty State */}
              {totalPresets === 0 && filteredSystemTemplates.length === 0 && !hasUserContent && (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No styles found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === 'preset' ? 'Preset' : 'Template'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {(deletePresetMutation.isPending || deleteTemplateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
