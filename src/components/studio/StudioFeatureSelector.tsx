import { Image, Users, Coins, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StudioFeature = 'single' | 'combination' | 'edit'

interface StudioFeatureSelectorProps {
  feature: StudioFeature
  onChange: (feature: StudioFeature) => void
  className?: string
}

export function StudioFeatureSelector({ feature, onChange, className }: StudioFeatureSelectorProps) {
  return (
    <div className={cn("bg-slate-800/50 rounded-xl p-1 border border-slate-700", className)}>
      <div className="grid grid-cols-3 gap-1">
        {/* Single Image Mode */}
        <button
          onClick={() => onChange('single')}
          className={cn(
            'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg transition-all',
            feature === 'single'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          )}
        >
          <Image className="h-5 w-5" />
          <div className="text-center">
            <span className="text-sm font-medium block">AI Enhance</span>
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
            'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg transition-all',
            feature === 'combination'
              ? 'bg-gradient-to-r from-blue-600 to-amber-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          )}
        >
          <Users className="h-5 w-5" />
          <div className="text-center">
            <span className="text-sm font-medium block">Combine</span>
            <span className="text-[10px] opacity-70 flex items-center justify-center gap-1 mt-0.5">
              <Coins className="h-2.5 w-2.5" />
              2 tokens
            </span>
          </div>
        </button>

        {/* Edit Mode */}
        <button
          onClick={() => onChange('edit')}
          className={cn(
            'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg transition-all relative',
            feature === 'edit'
              ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          )}
        >
          <span className="absolute -top-1 -right-1 text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">
            NEW
          </span>
          <Wand2 className="h-5 w-5" />
          <div className="text-center">
            <span className="text-sm font-medium block">Edit</span>
            <span className="text-[10px] opacity-70 flex items-center justify-center gap-1 mt-0.5">
              <Coins className="h-2.5 w-2.5" />
              0.5-2 tokens
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default StudioFeatureSelector
