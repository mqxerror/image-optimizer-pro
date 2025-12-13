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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform duration-200',
            isExpanded && 'transform rotate-180'
          )}
        />
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}
