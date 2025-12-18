import { useBriefBuilder } from '../BriefBuilderContext'
import { BACKGROUND_OPTIONS, type BackgroundType } from '../types'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function BackgroundSection() {
  const { state, updateBackground } = useBriefBuilder()
  const selected = state.brief.background

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {BACKGROUND_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => updateBackground(option.id)}
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left",
            selected === option.id
              ? "bg-green-50 ring-1 ring-green-400"
              : "bg-slate-50 hover:bg-slate-100"
          )}
        >
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-xs font-medium block",
              selected === option.id ? "text-green-700" : "text-slate-700"
            )}>
              {option.label}
            </span>
            <span className="text-[9px] text-slate-400 block truncate">
              {option.description}
            </span>
          </div>
          {selected === option.id && (
            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  )
}

export default BackgroundSection
