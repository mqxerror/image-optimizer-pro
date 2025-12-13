import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Star, Sparkles, Sun, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { StudioPreset, PresetCategory, BackgroundType, LightingStyle, JewelryMetal } from '@/types/studio'

// Generate gradient based on preset settings
function getPresetGradient(preset: StudioPreset): string {
  const bg = preset.background_type as BackgroundType
  const lighting = preset.lighting_style as LightingStyle
  const metal = preset.jewelry_metal as JewelryMetal

  // Base gradients by background type
  const bgGradients: Record<BackgroundType, string> = {
    'white': 'from-gray-50 via-white to-gray-100',
    'black': 'from-gray-800 via-gray-900 to-black',
    'gradient': 'from-purple-100 via-pink-50 to-blue-100',
    'transparent': 'from-gray-100 via-white to-gray-200',
    'scene': 'from-amber-50 via-orange-50 to-yellow-50',
  }

  // Lighting style modifications
  const lightingOverrides: Partial<Record<LightingStyle, string>> = {
    'dramatic': 'from-gray-700 via-gray-800 to-gray-900',
    'soft': 'from-pink-50 via-rose-50 to-purple-50',
    'natural': 'from-amber-50 via-yellow-50 to-orange-50',
    'rim': 'from-purple-200 via-indigo-100 to-purple-200',
  }

  // Metal accent overrides (takes priority for jewelry-focused presets)
  const metalAccents: Partial<Record<JewelryMetal, string>> = {
    'gold': 'from-amber-100 via-yellow-50 to-amber-100',
    'rose-gold': 'from-pink-100 via-rose-50 to-pink-100',
    'silver': 'from-slate-100 via-gray-50 to-slate-100',
    'platinum': 'from-blue-50 via-slate-50 to-blue-100',
  }

  // Priority: dramatic lighting > specific metal look > background type
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

// Get icon for lighting style
function getLightingIcon(style: LightingStyle): React.ReactNode {
  switch (style) {
    case 'dramatic': return <Zap className="h-2.5 w-2.5" />
    case 'soft': return <Sun className="h-2.5 w-2.5" />
    case 'natural': return <Sun className="h-2.5 w-2.5" />
    default: return null
  }
}

// Get visual indicator color for metal
function getMetalColor(metal: JewelryMetal): string {
  switch (metal) {
    case 'gold': return 'bg-amber-400'
    case 'rose-gold': return 'bg-pink-300'
    case 'silver': return 'bg-slate-300'
    case 'platinum': return 'bg-blue-200'
    default: return 'bg-gray-300'
  }
}

interface StudioPresetsSidebarProps {
  selectedPresetId: string | null
  onSelectPreset: (preset: StudioPreset) => void
  onCreatePreset: () => void
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
  popular: <Star className="h-3 w-3" />,
  editorial: <Sparkles className="h-3 w-3" />,
  lifestyle: null,
  minimal: null,
  dramatic: null,
  custom: null,
}

export function StudioPresetsSidebar({
  selectedPresetId,
  onSelectPreset,
  onCreatePreset,
}: StudioPresetsSidebarProps) {
  const { organization } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'discover' | 'my-studios'>('discover')

  const { data: presets, isLoading } = useQuery({
    queryKey: ['studio-presets', organization?.id],
    queryFn: async () => {
      // Type assertion needed until migration is applied and types regenerated
      const { data, error } = await (supabase as any)
        .from('studio_presets')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (error) throw error
      return data as StudioPreset[]
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
  }, {} as Record<PresetCategory, StudioPreset[]>)

  const renderPresetCard = (preset: StudioPreset) => {
    const gradientClass = getPresetGradient(preset)
    const isDark = preset.lighting_style === 'dramatic' || preset.background_type === 'black'
    const lightingIcon = getLightingIcon(preset.lighting_style as LightingStyle)
    const metalColor = getMetalColor(preset.jewelry_metal as JewelryMetal)

    return (
      <button
        key={preset.id}
        onClick={() => onSelectPreset(preset)}
        className={`w-full text-left p-3 rounded-lg border transition-all hover:border-purple-300 hover:bg-purple-50/50 ${
          selectedPresetId === preset.id
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex gap-3">
          {preset.thumbnail_url ? (
            <img
              src={preset.thumbnail_url}
              alt={preset.name}
              className="w-16 h-16 rounded object-cover bg-gray-100"
            />
          ) : (
            <div className={`w-16 h-16 rounded bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center relative overflow-hidden`}>
              {/* Sparkle icon */}
              <Sparkles className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />

              {/* Settings indicators */}
              <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
                {/* Metal indicator dot */}
                {preset.jewelry_metal !== 'auto' && (
                  <div className={`w-2 h-2 rounded-full ${metalColor} ring-1 ring-white/50`}
                       title={preset.jewelry_metal} />
                )}

                {/* Lighting icon */}
                {lightingIcon && (
                  <div className={`${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    {lightingIcon}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{preset.name}</p>
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{preset.description}</p>
            {/* Quick setting tags */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {preset.background_type !== 'white' && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  preset.background_type === 'black' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'
                }`}>
                  {preset.background_type}
                </span>
              )}
              {preset.jewelry_metal !== 'auto' && preset.jewelry_metal !== 'mixed' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                  {preset.jewelry_metal.replace('-', ' ')}
                </span>
              )}
              {preset.lighting_style !== 'studio-3point' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                  {preset.lighting_style}
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
        <h2 className="font-semibold text-gray-900 mb-3">Studios</h2>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'discover' | 'my-studios')}>
          <TabsList className="w-full">
            <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
            <TabsTrigger value="my-studios" className="flex-1">My Studios</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 py-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search studios..."
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
                <Skeleton key={i} className="h-24 w-full" />
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
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onCreatePreset}
              >
                <Plus className="h-4 w-4" />
                Create New Studio
              </Button>

              {filteredUserPresets.length > 0 ? (
                <div className="space-y-2">
                  {filteredUserPresets.map(renderPresetCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No custom studios yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Save your favorite settings as a studio
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
