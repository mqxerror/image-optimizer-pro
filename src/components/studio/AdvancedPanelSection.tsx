import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedPanelSectionProps {
  title: string
  icon: React.ReactNode
  iconBg?: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  /** Compact mode for tighter spacing */
  compact?: boolean
  /** Current value preview shown in collapsed state */
  preview?: string
}

export function AdvancedPanelSection({
  title,
  icon,
  iconBg = 'bg-slate-100',
  isExpanded,
  onToggle,
  children,
  compact = false,
  preview
}: AdvancedPanelSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
            iconBg
          )}>
            {icon}
          </div>
          <span className={cn(
            "font-medium text-slate-700 truncate",
            compact ? "text-xs" : "text-sm"
          )}>
            {title}
          </span>
          {!isExpanded && preview && (
            <span className="text-xs text-slate-400 ml-1 truncate">{preview}</span>
          )}
        </div>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0",
          isExpanded ? "bg-purple-100" : "bg-slate-100"
        )}>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Section Content with animated expand */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className={cn(
            compact ? "px-3 pb-3 pt-2" : "px-3 pb-4 pt-3"
          )}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
