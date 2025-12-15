import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Star, Sparkles, Zap, Sun, Layers, ChevronDown, ChevronRight, Trash2, Loader2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

// Preset type from database
interface CombinationPreset {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  thumbnail_url: string | null
  category: string
  is_system: boolean
  is_active: boolean
  is_favorite?: boolean
  usage_count: number
  position_y: number
  scale: number
  blend_intensity: number
  lighting_match: number
  rotation: number
  ai_model?: string
  advanced_settings?: any
  created_by: string | null
  created_at: string
}

type PresetCategory = 'popular' | 'editorial' | 'lifestyle' | 'minimal' | 'dramatic' | 'custom'

interface CombinationPresetsSidebarProps {
  selectedPresetId: string | null
  onSelectPreset: (preset: CombinationPreset) => void
  onSaveCurrentSettings: () => void
}

const categoryLabels: Record<PresetCategory, string> = {
  popular: 'Popular',
  editorial: 'Editorial',
  lifestyle: 'Lifestyle',
  minimal: 'Minimal',
  dramatic: 'Dramatic',
  custom: 'My Presets',
}

const categoryIcons: Record<PresetCategory, React.ReactNode> = {
  popular: <Star className="h-3.5 w-3.5" />,
  editorial: <Sparkles className="h-3.5 w-3.5" />,
  lifestyle: <Sun className="h-3.5 w-3.5" />,
  minimal: <Layers className="h-3.5 w-3.5" />,
  dramatic: <Zap className="h-3.5 w-3.5" />,
  custom: null,
}

// Get gradient based on settings
function getPresetGradient(preset: CombinationPreset): string {
  const blend = preset.blend_intensity
  const lighting = preset.lighting_match

  if (blend > 80 && lighting > 80) {
    return 'from-purple-100 via-indigo-50 to-purple-100'
  }
  if (preset.category === 'dramatic') {
    return 'from-gray-700 via-gray-800 to-gray-900'
  }
  if (preset.category === 'minimal') {
    return 'from-gray-50 via-white to-gray-100'
  }
  if (preset.category === 'lifestyle') {
    return 'from-amber-50 via-yellow-50 to-orange-50'
  }
  if (preset.category === 'editorial') {
    return 'from-pink-50 via-rose-50 to-purple-50'
  }
  return 'from-blue-50 via-indigo-50 to-purple-50'
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
    gray: 'text-gray-500 hover:text-gray-700',
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

export function CombinationPresetsSidebar({
  selectedPresetId,
  onSelectPreset,
  onSaveCurrentSettings,
}: CombinationPresetsSidebarProps) {
  const { organization } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)

  const { data: presets, isLoading } = useQuery({
    queryKey: ['combination-presets', organization?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('combination_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (error) throw error
      return data as CombinationPreset[]
    },
    enabled: !!organization,
  })

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('combination_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combination-presets'] })
      toast({ title: 'Preset deleted' })
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    }
  })

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await (supabase as any).from('combination_templates').update({ is_favorite: !isFavorite }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combination-presets'] })
    }
  })

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    deletePresetMutation.mutate(itemToDelete.id)
  }

  const systemPresets = presets?.filter(p => p.is_system) || []
  const userPresets = presets?.filter(p => !p.is_system && p.organization_id === organization?.id) || []

  const filteredSystemPresets = systemPresets.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUserPresets = userPresets.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedPresets = filteredSystemPresets.reduce((acc, preset) => {
    const cat = preset.category as PresetCategory
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(preset)
    return acc
  }, {} as Record<PresetCategory, CombinationPreset[]>)

  const totalPresets = Object.values(groupedPresets).reduce((sum, arr) => sum + arr.length, 0)

  const renderPresetCard = (preset: CombinationPreset) => {
    const gradientClass = getPresetGradient(preset)
    const isDark = preset.category === 'dramatic'
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
                className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0"
              />
            ) : (
              <div className={cn(
                'w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center relative overflow-hidden flex-shrink-0',
                gradientClass
              )}>
                <Layers className={cn('h-4 w-4', isDark ? 'text-gray-300' : 'text-gray-500')} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-gray-900 text-sm truncate">{preset.name}</p>
                {preset.is_system && (
                  <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
                )}
                {isFavorite && (
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {preset.scale !== 100 && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600">
                    {preset.scale}%
                  </span>
                )}
                {preset.blend_intensity !== 75 && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-600">
                    blend {preset.blend_intensity}%
                  </span>
                )}
                {preset.rotation !== 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-orange-50 text-orange-600">
                    {preset.rotation}°
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
                toggleFavoriteMutation.mutate({ id: preset.id, isFavorite })
              }}
              className="p-1 rounded hover:bg-gray-100"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick(preset.id, preset.name)
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

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-gray-900 mb-3">Combination Presets</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* My Presets Section - Always First */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Presets</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
                    onClick={onSaveCurrentSettings}
                  >
                    <Plus className="h-3 w-3" />
                    Save
                  </Button>
                </div>

                {filteredUserPresets.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredUserPresets.map(renderPresetCard)}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-100/50 text-center">
                    <p className="text-xs text-gray-500">No saved presets yet</p>
                    <button
                      onClick={onSaveCurrentSettings}
                      className="text-xs text-purple-600 hover:underline mt-1"
                    >
                      Save current settings
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4" />

              {/* System Presets Section */}
              {totalPresets > 0 && (
                <CollapsibleSection
                  title="Discover"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
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
                          <span className="text-[10px] font-medium text-gray-400 uppercase">
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

              {/* Empty State */}
              {totalPresets === 0 && filteredUserPresets.length === 0 && (
                <div className="text-center py-8">
                  <Layers className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">No presets found</p>
                  <p className="text-xs text-gray-400 mt-1">
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
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
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
              {deletePresetMutation.isPending && (
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

export default CombinationPresetsSidebar
