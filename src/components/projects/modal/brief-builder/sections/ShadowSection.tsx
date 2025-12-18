import { useBriefBuilder } from '../BriefBuilderContext'
import { SHADOW_OPTIONS } from '../types'
import { cn } from '@/lib/utils'

export function ShadowSection() {
  const { state, updateShadow } = useBriefBuilder()
  const selected = state.brief.shadow

  return (
    <div className="flex gap-1.5">
      {SHADOW_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => updateShadow(option.id)}
          className={cn(
            "flex-1 flex flex-col items-center py-2 px-2 rounded-lg transition-all",
            selected === option.id
              ? "bg-slate-200 ring-1 ring-slate-400"
              : "bg-slate-50 hover:bg-slate-100"
          )}
        >
          <span className={cn(
            "text-xs font-medium",
            selected === option.id ? "text-slate-800" : "text-slate-600"
          )}>
            {option.label}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5 text-center leading-tight">
            {option.description}
          </span>
        </button>
      ))}
    </div>
  )
}

export default ShadowSection
