import { Package, Image as ImageIcon, User, FileX } from 'lucide-react'
import type { FilterStats as FilterStatsType } from './types'

interface FilterStatsProps {
  stats: FilterStatsType
  compact?: boolean
}

export function FilterStats({ stats, compact = false }: FilterStatsProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats.filteredProducts}</span>
        </span>
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats.filteredImages}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="p-3 border-t bg-white space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Will Process
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-blue-500" />
          <span>
            <span className="font-semibold">{stats.filteredProducts}</span>
            <span className="text-muted-foreground"> products</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ImageIcon className="h-4 w-4 text-green-500" />
          <span>
            <span className="font-semibold">{stats.filteredImages}</span>
            <span className="text-muted-foreground"> images</span>
          </span>
        </div>
      </div>

      {(stats.modelImagesExcluded > 0 || stats.svgImagesSkipped > 0) && (
        <>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">
            Excluded
          </div>
          <div className="space-y-1">
            {stats.modelImagesExcluded > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <User className="h-4 w-4" />
                <span>{stats.modelImagesExcluded} model images</span>
              </div>
            )}
            {stats.svgImagesSkipped > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileX className="h-4 w-4" />
                <span>{stats.svgImagesSkipped} SVG files</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
