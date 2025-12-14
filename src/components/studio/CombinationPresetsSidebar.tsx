import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Star, Sparkles, Zap, Sun, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

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
  popular: <Star className="h-3 w-3" />,
  editorial: <Sparkles className="h-3 w-3" />,
  lifestyle: <Sun className="h-3 w-3" />,
  minimal: <Layers className="h-3 w-3" />,
  dramatic: <Zap className="h-3 w-3" />,
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

export function CombinationPresetsSidebar({
  selectedPresetId,
  onSelectPreset,
  onSaveCurrentSettings,
}: CombinationPresetsSidebarProps) {
  const { organization } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'discover' | 'my-presets'>('discover')

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

  const renderPresetCard = (preset: CombinationPreset) => {
    const gradientClass = getPresetGradient(preset)
    const isDark = preset.category === 'dramatic'

    return (
      <button
        key={preset.id}
        onClick={() => onSelectPreset(preset)}
        className={`w-full text-left p-3 rounded-lg border transition-all hover:border-blue-300 hover:bg-blue-50/50 ${
          selectedPresetId === preset.id
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex gap-3">
          {preset.thumbnail_url ? (
            <img
              src={preset.thumbnail_url}
              alt={preset.name}
              className="w-14 h-14 rounded object-cover bg-gray-100"
            />
          ) : (
            <div className={`w-14 h-14 rounded bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
              <Layers className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{preset.name}</p>
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{preset.description}</p>
            {/* Settings preview */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                Scale {preset.scale}%
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                Blend {preset.blend_intensity}%
              </span>
              {preset.rotation !== 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">
                  {preset.rotation}°
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-gray-900 mb-3">Combination Presets</h2>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'discover' | 'my-presets')}>
          <TabsList className="w-full">
            <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
            <TabsTrigger value="my-presets" className="flex-1">My Presets</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 py-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activeTab === 'discover' ? (
            <div className="space-y-6">
              {(['popular', 'editorial', 'lifestyle', 'minimal', 'dramatic'] as PresetCategory[]).map(category => {
                const categoryPresets = groupedPresets[category]
                if (!categoryPresets?.length) return null

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      {categoryIcons[category]}
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {categoryLabels[category]}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {categoryPresets.map(renderPresetCard)}
                    </div>
                  </div>
                )
              })}

              {Object.keys(groupedPresets).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No presets found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onSaveCurrentSettings}
              >
                <Plus className="h-4 w-4" />
                Save Current Settings
              </Button>

              {filteredUserPresets.length > 0 ? (
                <div className="space-y-2">
                  {filteredUserPresets.map(renderPresetCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No saved presets yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Adjust settings and save them for later
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default CombinationPresetsSidebar
