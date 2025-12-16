import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedPanelSectionProps {
  title: string
  icon: string
  iconBg?: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  /** Compact mode for tighter spacing */
  compact?: boolean
}

export function AdvancedPanelSection({
  title,
  icon,
  iconBg = 'bg-gray-100',
  isExpanded,
  onToggle,
  children,
  compact = false
}: AdvancedPanelSectionProps) {
  return (
    <div className={cn(
      "rounded-lg overflow-hidden transition-all duration-200",
      isExpanded
        ? "bg-white border border-gray-200 shadow-sm"
        : "bg-gray-50 border border-gray-200 hover:border-gray-300"
    )}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between transition-all cursor-pointer group",
          compact ? "p-2.5" : "p-4",
          isExpanded
            ? "bg-gradient-to-r from-purple-50/50 to-blue-50/50"
            : "hover:bg-gray-50"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "rounded-md flex items-center justify-center transition-transform duration-200",
            compact ? "h-7 w-7" : "h-9 w-9",
            iconBg,
            isExpanded && "scale-105"
          )}>
            <span className={compact ? "text-sm" : "text-lg"}>{icon}</span>
          </div>
          <span className={cn(
            "font-medium transition-colors",
            compact ? "text-xs" : "text-sm",
            isExpanded ? "text-gray-900" : "text-gray-700 group-hover:text-gray-900"
          )}>
            {title}
          </span>
        </div>
        <div className={cn(
          "rounded-full flex items-center justify-center transition-all duration-200",
          compact ? "h-5 w-5" : "h-7 w-7",
          isExpanded
            ? "bg-purple-100 rotate-180"
            : "bg-gray-100 group-hover:bg-gray-200"
        )}>
          <ChevronDown className={cn(
            "transition-colors",
            compact ? "h-3 w-3" : "h-4 w-4",
            isExpanded ? "text-purple-600" : "text-gray-500"
          )} />
        </div>
      </button>

      {/* Section Content with animated expand */}
      <div className={cn(
        "grid transition-all duration-200 ease-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className={cn(
            "border-t border-gray-100",
            compact ? "px-3 pb-3 pt-2" : "px-4 pb-4 pt-2"
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
