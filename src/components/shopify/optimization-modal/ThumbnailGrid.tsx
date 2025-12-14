import { useMemo } from 'react'
import { User, Image as ImageIcon } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { FilteredImage } from './types'

interface ThumbnailGridProps {
  images: FilteredImage[]
  maxDisplay?: number
  showExcluded?: boolean
}

export function ThumbnailGrid({
  images,
  maxDisplay = 200,
  showExcluded = true
}: ThumbnailGridProps) {
  const { displayedImages, remainingCount, includedCount, excludedCount } = useMemo(() => {
    // Separate included and excluded
    const included = images.filter(img => !img.isExcluded)
    const excluded = images.filter(img => img.isExcluded)

    // Prioritize showing included images
    let toDisplay: FilteredImage[] = []

    if (showExcluded) {
      // Show included first, then excluded with lower opacity
      toDisplay = [...included, ...excluded].slice(0, maxDisplay)
    } else {
      toDisplay = included.slice(0, maxDisplay)
    }

    return {
      displayedImages: toDisplay,
      remainingCount: Math.max(0, (showExcluded ? images.length : included.length) - maxDisplay),
      includedCount: included.length,
      excludedCount: excluded.length
    }
  }, [images, maxDisplay, showExcluded])

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images match the current filters</p>
          <p className="text-xs mt-1">Try adjusting your filter settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 p-2">
          {displayedImages.map((item, index) => (
            <ThumbnailItem key={`${item.productId}-${item.image.id}-${index}`} item={item} />
          ))}
        </div>

        {remainingCount > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground border-t mx-2">
            + {remainingCount.toLocaleString()} more images
          </div>
        )}
      </ScrollArea>

      {/* Summary bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-xs text-muted-foreground">
        <span>
          Showing {displayedImages.length.toLocaleString()} of {images.length.toLocaleString()} images
        </span>
        <div className="flex items-center gap-3">
          <span className="text-green-600">
            {includedCount.toLocaleString()} included
          </span>
          {excludedCount > 0 && (
            <span className="text-amber-600">
              {excludedCount.toLocaleString()} excluded
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface ThumbnailItemProps {
  item: FilteredImage
}

function ThumbnailItem({ item }: ThumbnailItemProps) {
  const isMain = item.image.position === 1

  return (
    <div
      className={cn(
        'aspect-square rounded border overflow-hidden relative group',
        item.isExcluded ? 'opacity-40' : 'hover:ring-2 hover:ring-primary/50',
        item.isSvg && 'bg-gray-200'
      )}
      title={`${item.productTitle} - ${isMain ? 'Main' : `Variant ${item.image.position}`}${item.isModel ? ' (Model)' : ''}${item.isSvg ? ' (SVG - skipped)' : ''}`}
    >
      <img
        src={item.image.src}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Model badge */}
      {item.isModel && !item.isSvg && (
        <div className="absolute top-0.5 right-0.5 bg-amber-500 rounded-full p-0.5">
          <User className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      {/* SVG overlay */}
      {item.isSvg && (
        <div className="absolute inset-0 bg-gray-600/70 flex items-center justify-center">
          <span className="text-white text-[10px] font-medium">SVG</span>
        </div>
      )}

      {/* Main image indicator */}
      {isMain && !item.isSvg && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5">
          Main
        </div>
      )}

      {/* Excluded overlay */}
      {item.isExcluded && !item.isSvg && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
          <div className="w-6 h-0.5 bg-red-500 rotate-45 absolute" />
          <div className="w-6 h-0.5 bg-red-500 -rotate-45 absolute" />
        </div>
      )}
    </div>
  )
}
