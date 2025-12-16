import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedPanelSectionProps {
  title: string
  icon: string
  iconBg?: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function AdvancedPanelSection({
  title,
  icon,
  iconBg = 'bg-gray-100',
  isExpanded,
  onToggle,
  children
}: AdvancedPanelSectionProps) {
  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-300",
      isExpanded
        ? "bg-white border border-gray-200 shadow-md ring-1 ring-purple-100"
        : "bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-white"
    )}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-all cursor-pointer group",
          isExpanded
            ? "bg-gradient-to-r from-purple-50/50 to-blue-50/50"
            : "hover:bg-gray-50"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-300",
            iconBg,
            isExpanded && "scale-105 shadow-sm"
          )}>
            <span className="text-lg">{icon}</span>
          </div>
          <span className={cn(
            "text-sm font-semibold transition-colors",
            isExpanded ? "text-gray-900" : "text-gray-700 group-hover:text-gray-900"
          )}>
            {title}
          </span>
        </div>
        <div className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300",
          isExpanded
            ? "bg-purple-100 rotate-180"
            : "bg-gray-100 group-hover:bg-gray-200"
        )}>
          <ChevronDown className={cn(
            "h-4 w-4 transition-colors",
            isExpanded ? "text-purple-600" : "text-gray-500"
          )} />
        </div>
      </button>

      {/* Section Content with animated expand */}
      <div className={cn(
        "grid transition-all duration-300 ease-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
