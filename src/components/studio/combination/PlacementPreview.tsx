import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { CombinationQuickSettings } from '@/types/combination'

interface PlacementPreviewProps {
  modelImageUrl: string | null
  jewelryImageUrl: string | null
  settings: CombinationQuickSettings
  className?: string
}

export function PlacementPreview({
  modelImageUrl,
  jewelryImageUrl,
  settings,
  className
}: PlacementPreviewProps) {
  // Calculate jewelry position and transform
  const jewelryStyle = useMemo(() => {
    // Position: 0 = top, 100 = bottom, 50 = center
    const topPercent = settings.position_y
    // Scale: 50-150 maps to 0.3-0.9 of container width
    const scalePercent = ((settings.scale - 50) / 100) * 0.6 + 0.3
    // Rotation
    const rotation = settings.rotation

    return {
      top: `${topPercent}%`,
      left: '50%',
      transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scalePercent})`,
      opacity: settings.blend_intensity / 100 * 0.5 + 0.5, // 50-100% opacity
    }
  }, [settings])

  if (!modelImageUrl) {
    return (
      <div className={cn(
        "aspect-[3/4] bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-center",
        className
      )}>
        <p className="text-xs text-slate-500 text-center px-4">
          Upload model photo to see placement preview
        </p>
      </div>
    )
  }

  return (
    <div className={cn("relative rounded-xl overflow-hidden bg-slate-900", className)}>
      {/* Model Image */}
      <img
        src={modelImageUrl}
        alt="Model"
        className="w-full h-auto max-h-[350px] object-contain"
      />

      {/* Jewelry Overlay */}
      {jewelryImageUrl && (
        <div
          className="absolute pointer-events-none transition-all duration-200 ease-out"
          style={jewelryStyle}
        >
          <img
            src={jewelryImageUrl}
            alt="Jewelry preview"
            className="max-w-[120px] max-h-[120px] object-contain drop-shadow-lg"
            style={{
              filter: `brightness(${0.7 + settings.lighting_match / 100 * 0.6})`,
            }}
          />
        </div>
      )}

      {/* Overlay guides */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Center crosshair */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-purple-500/20" />
        <div
          className="absolute left-0 right-0 h-px bg-purple-500/30"
          style={{ top: `${settings.position_y}%` }}
        />
      </div>

      {/* Preview badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-slate-300">
        Preview • Adjust sliders to reposition
      </div>
    </div>
  )
}

export default PlacementPreview
