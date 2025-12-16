import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedPanelSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function AdvancedPanelSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children
}: AdvancedPanelSectionProps) {
  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-300",
      isExpanded
        ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-purple-500/30 shadow-lg shadow-purple-500/5"
        : "bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50"
    )}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-all cursor-pointer group",
          isExpanded
            ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10"
            : "hover:bg-gray-700/30"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xl transition-transform duration-300",
            isExpanded && "scale-110"
          )}>
            {icon}
          </span>
          <span className={cn(
            "text-sm font-medium transition-colors",
            isExpanded ? "text-white" : "text-gray-300 group-hover:text-white"
          )}>
            {title}
          </span>
        </div>
        <div className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300",
          isExpanded
            ? "bg-purple-500/20 rotate-180"
            : "bg-gray-700/50 group-hover:bg-gray-600/50"
        )}>
          <ChevronDown className={cn(
            "h-4 w-4 transition-colors",
            isExpanded ? "text-purple-400" : "text-gray-400"
          )} />
        </div>
      </button>

      {/* Section Content with animated expand */}
      <div className={cn(
        "grid transition-all duration-300 ease-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
