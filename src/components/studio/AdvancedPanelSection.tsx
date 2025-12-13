import { ChevronDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedPanelSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  isDragging?: boolean
  isDragOver?: boolean
}

export function AdvancedPanelSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  isDragging = false,
  isDragOver = false
}: AdvancedPanelSectionProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg border overflow-hidden transition-all cursor-move",
      isDragging && "opacity-50 border-blue-300",
      isDragOver && "border-blue-500 shadow-lg ring-2 ring-blue-200",
      !isDragging && !isDragOver && "border-gray-200"
    )}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
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
