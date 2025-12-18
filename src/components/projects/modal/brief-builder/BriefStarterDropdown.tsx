import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, FileText, Palette, Clock, Check, Sparkles } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useBriefBuilder } from './BriefBuilderContext'
import { DEFAULT_BRIEF, type JewelryBrief, type BriefStarter } from './types'
import { cn } from '@/lib/utils'

// Built-in quick starters
const QUICK_STARTERS: BriefStarter[] = [
  {
    id: 'clean-studio',
    name: 'Clean Studio',
    category: 'preset',
    description: 'Pure white background, soft shadows, professional e-commerce look',
    briefOverrides: {
      background: 'pure-white',
      shadow: 'soft',
      retouch: { ...DEFAULT_BRIEF.retouch, dustRemoval: true, reflectionControl: 60 },
      compliance: { gmcSafe: true, noWatermarks: true },
    },
  },
  {
    id: 'premium-sparkle',
    name: 'Premium Sparkle',
    category: 'preset',
    description: 'Enhanced gemstone brilliance, warm metals, luxury look',
    briefOverrides: {
      background: 'light-gray',
      shadow: 'product-grounded',
      retouch: { dustRemoval: true, reflectionControl: 40, metalWarmth: 70, stoneSparkle: 80 },
    },
  },
  {
    id: 'google-ads-pack',
    name: 'Google Ads Ready',
    category: 'preset',
    description: 'GMC compliant, crop-safe margins, optimized for PMax',
    briefOverrides: {
      background: 'pure-white',
      shadow: 'soft',
      framing: { position: 'centered', marginPercent: 15, cropSafe: true },
      compliance: { gmcSafe: true, noWatermarks: true },
    },
  },
  {
    id: 'lifestyle-shot',
    name: 'Lifestyle',
    category: 'preset',
    description: 'Natural setting, ambient lighting, social media ready',
    briefOverrides: {
      background: 'lifestyle',
      shadow: 'none',
      retouch: { dustRemoval: true, reflectionControl: 30, metalWarmth: 50, stoneSparkle: 40 },
    },
  },
]

interface BriefStarterDropdownProps {
  className?: string
}

export function BriefStarterDropdown({ className }: BriefStarterDropdownProps) {
  const [open, setOpen] = useState(false)
  const { applyStarter } = useBriefBuilder()
  const { organization } = useAuthStore()

  // Fetch templates from database
  const { data: templates } = useQuery({
    queryKey: ['brief-starters-templates', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('prompt_templates')
        .select('id, name, category, base_prompt')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('name')
        .limit(10)
      return data || []
    },
    enabled: !!organization,
  })

  // Fetch presets from database
  const { data: presets } = useQuery({
    queryKey: ['brief-starters-presets', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('studio_presets')
        .select('id, name, category, background_type, background_shadow, jewelry_sparkle')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('name')
        .limit(10)
      return data || []
    },
    enabled: !!organization,
  })

  // Convert database items to BriefStarters
  const dbStarters = useMemo(() => {
    const result: BriefStarter[] = []

    // Add templates
    templates?.forEach((t) => {
      result.push({
        id: `template-${t.id}`,
        name: t.name,
        category: 'template',
        description: t.category || 'Custom template',
        sourceId: t.id,
        sourceType: 'template',
        briefOverrides: {}, // Templates use raw prompt, not brief overrides
      })
    })

    // Add presets
    presets?.forEach((p) => {
      result.push({
        id: `preset-${p.id}`,
        name: p.name,
        category: 'preset',
        description: p.category || 'Custom preset',
        sourceId: p.id,
        sourceType: 'preset',
        briefOverrides: {
          background: (p.background_type as JewelryBrief['background']) || 'pure-white',
          shadow: (p.background_shadow as JewelryBrief['shadow']) || 'soft',
          retouch: {
            ...DEFAULT_BRIEF.retouch,
            stoneSparkle: p.jewelry_sparkle || 50,
          },
        },
      })
    })

    return result
  }, [templates, presets])

  // Group all starters
  const groupedStarters = useMemo(() => {
    const groups: Record<string, BriefStarter[]> = {
      'Quick Start': QUICK_STARTERS,
      'Your Templates': dbStarters.filter((s) => s.sourceType === 'template'),
      'Your Presets': dbStarters.filter((s) => s.sourceType === 'preset'),
    }

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, items]) => items.length > 0)
    )
  }, [dbStarters])

  const handleSelect = (starter: BriefStarter) => {
    applyStarter(starter.briefOverrides)
    setOpen(false)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'template':
        return <FileText className="h-3.5 w-3.5" />
      case 'preset':
        return <Palette className="h-3.5 w-3.5" />
      case 'recent':
        return <Clock className="h-3.5 w-3.5" />
      default:
        return <Sparkles className="h-3.5 w-3.5" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span>Start from...</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-80">
          <div className="p-2">
            {Object.entries(groupedStarters).map(([group, starters]) => (
              <div key={group} className="mb-4 last:mb-0">
                <p className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {group}
                </p>
                <div className="space-y-1">
                  {starters.map((starter) => (
                    <button
                      key={starter.id}
                      onClick={() => handleSelect(starter)}
                      className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(starter.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{starter.name}</p>
                        {starter.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {starter.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default BriefStarterDropdown
