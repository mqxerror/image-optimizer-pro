import { useState } from 'react'
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  User,
  Image as ImageIcon,
  Tag,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { TagMultiSelect } from './TagMultiSelect'
import { FilterStats } from './FilterStats'
import type { FilterState, FilterStats as FilterStatsType } from './types'

interface FilterSidebarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  allTags: string[]
  tagCounts: Map<string, number>
  stats: FilterStatsType
  modelImageCount: number
  onToggleSidebar: () => void
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b last:border-b-0">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {badge}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function FilterSidebar({
  filters,
  onChange,
  allTags,
  tagCounts,
  stats,
  modelImageCount,
  onToggleSidebar
}: FilterSidebarProps) {
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-3 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Filters</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleSidebar}
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Sections */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {/* Quick Filters - Always open */}
          <CollapsibleSection
            title="Quick Filters"
            icon={<User className="h-4 w-4 text-amber-500" />}
            defaultOpen={true}
            badge={
              filters.excludeModelImages && stats.modelImagesExcluded > 0 ? (
                <Badge variant="secondary" className="text-xs ml-2">
                  -{stats.modelImagesExcluded}
                </Badge>
              ) : null
            }
          >
            <div className="space-y-3">
              {/* Exclude Model Images Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="exclude-model" className="text-sm cursor-pointer">
                  Exclude model images
                </Label>
                <Switch
                  id="exclude-model"
                  checked={filters.excludeModelImages}
                  onCheckedChange={(v) => updateFilter('excludeModelImages', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-detects lifestyle & model shots by keywords in filename/alt text
              </p>
              {modelImageCount > 0 && (
                <div className={cn(
                  'text-xs rounded p-2',
                  filters.excludeModelImages
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-muted-foreground'
                )}>
                  {filters.excludeModelImages
                    ? `${stats.modelImagesExcluded} model images will be excluded`
                    : `${modelImageCount} model images detected in selection`
                  }
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Image Type */}
          <CollapsibleSection
            title="Image Type"
            icon={<ImageIcon className="h-4 w-4 text-blue-500" />}
            defaultOpen={true}
          >
            <RadioGroup
              value={filters.imageType}
              onValueChange={(v) => updateFilter('imageType', v as FilterState['imageType'])}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="type-all" />
                <Label htmlFor="type-all" className="text-sm cursor-pointer">
                  All images
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="main_only" id="type-main" />
                <Label htmlFor="type-main" className="text-sm cursor-pointer">
                  Main image only
                  <span className="text-xs text-muted-foreground ml-1">(position 1)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="variants_only" id="type-variants" />
                <Label htmlFor="type-variants" className="text-sm cursor-pointer">
                  Variant images only
                  <span className="text-xs text-muted-foreground ml-1">(position 2+)</span>
                </Label>
              </div>
            </RadioGroup>
          </CollapsibleSection>

          {/* Include Tags */}
          {allTags.length > 0 && (
            <CollapsibleSection
              title="Include Tags"
              icon={<Tag className="h-4 w-4 text-green-500" />}
              defaultOpen={false}
              badge={
                filters.includeTags.length > 0 ? (
                  <Badge variant="secondary" className="text-xs ml-2">
                    {filters.includeTags.length}
                  </Badge>
                ) : null
              }
            >
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Only process products with these tags
                </p>
                <TagMultiSelect
                  allTags={allTags}
                  tagCounts={tagCounts}
                  selectedTags={filters.includeTags}
                  onChange={(tags) => updateFilter('includeTags', tags)}
                  placeholder="Select tags to include..."
                />
              </div>
            </CollapsibleSection>
          )}

          {/* Exclude Tags */}
          {allTags.length > 0 && (
            <CollapsibleSection
              title="Exclude Tags"
              icon={<Tag className="h-4 w-4 text-red-500" />}
              defaultOpen={false}
              badge={
                filters.excludeTags.length > 0 ? (
                  <Badge variant="destructive" className="text-xs ml-2">
                    {filters.excludeTags.length}
                  </Badge>
                ) : null
              }
            >
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Skip products with these tags
                </p>
                <TagMultiSelect
                  allTags={allTags}
                  tagCounts={tagCounts}
                  selectedTags={filters.excludeTags}
                  onChange={(tags) => updateFilter('excludeTags', tags)}
                  placeholder="Select tags to exclude..."
                  variant="destructive"
                />
              </div>
            </CollapsibleSection>
          )}
        </div>
      </ScrollArea>

      {/* Live Stats Footer */}
      <FilterStats stats={stats} />
    </div>
  )
}
