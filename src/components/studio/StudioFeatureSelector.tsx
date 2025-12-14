import { Image, Users, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StudioFeature = 'single' | 'combination'

interface StudioFeatureSelectorProps {
  feature: StudioFeature
  onChange: (feature: StudioFeature) => void
  className?: string
}

export function StudioFeatureSelector({ feature, onChange, className }: StudioFeatureSelectorProps) {
  return (
    <div className={cn("bg-gray-800/50 rounded-xl p-1 border border-gray-700", className)}>
      <div className="grid grid-cols-2 gap-1">
        {/* Single Image Mode */}
        <button
          onClick={() => onChange('single')}
          className={cn(
            'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg transition-all',
            feature === 'single'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          )}
        >
          <Image className="h-5 w-5" />
          <div className="text-center">
            <span className="text-sm font-medium block">Single Image</span>
            <span className="text-[10px] opacity-70 flex items-center justify-center gap-1 mt-0.5">
              <Coins className="h-2.5 w-2.5" />
              1 token
            </span>
          </div>
        </button>

        {/* Combination Mode */}
        <button
          onClick={() => onChange('combination')}
          className={cn(
            'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg transition-all',
            feature === 'combination'
              ? 'bg-gradient-to-r from-blue-600 to-amber-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          )}
        >
          <Users className="h-5 w-5" />
          <div className="text-center">
            <span className="text-sm font-medium block">Model + Jewelry</span>
            <span className="text-[10px] opacity-70 flex items-center justify-center gap-1 mt-0.5">
              <Coins className="h-2.5 w-2.5" />
              2 tokens
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default StudioFeatureSelector
