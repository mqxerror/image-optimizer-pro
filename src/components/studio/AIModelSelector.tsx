import { Star, Zap, Coins, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type AIModelDefinition,
  type StudioMode,
  getModelsForMode,
  formatModelDisplayName,
} from '@/constants/aiModels'

interface AIModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  mode?: StudioMode
  className?: string
  compact?: boolean
}

/**
 * Reusable AI Model Selector Component
 *
 * Displays available AI models as toggle cards with quality/speed ratings.
 * Can be filtered by mode (single, combination, or all).
 */
export function AIModelSelector({
  value,
  onChange,
  mode,
  className,
  compact = false,
}: AIModelSelectorProps) {
  // Get models filtered by mode, or all models if no mode specified
  const models = mode ? getModelsForMode(mode) : getModelsForMode('single')

  // Sort: recommended first, then by quality
  const sortedModels = [...models].sort((a, b) => {
    if (a.recommended && !b.recommended) return -1
    if (!a.recommended && b.recommended) return 1
    return b.quality - a.quality
  })

  return (
    <div className={cn('space-y-2', className)}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-indigo-100">
          <Sparkles className="h-4 w-4 text-indigo-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">AI Model</span>
      </div>

      {/* Model Cards */}
      <div className="space-y-2">
        {sortedModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={value === model.id}
            onSelect={() => onChange(model.id)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}

interface ModelCardProps {
  model: AIModelDefinition
  isSelected: boolean
  onSelect: () => void
  compact?: boolean
}

function ModelCard({ model, isSelected, onSelect, compact }: ModelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border transition-all',
        compact ? 'p-2.5' : 'p-3',
        isSelected
          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Selection indicator */}
          <div
            className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              isSelected
                ? 'border-indigo-500 bg-indigo-500'
                : 'border-gray-300'
            )}
          >
            {isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </div>

          {/* Model Name */}
          <span className={cn(
            'font-medium truncate',
            compact ? 'text-xs' : 'text-sm',
            isSelected ? 'text-indigo-900' : 'text-gray-900'
          )}>
            {formatModelDisplayName(model)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {model.recommended && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
              Recommended
            </span>
          )}
          {model.isNew && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
              New
            </span>
          )}
          {model.isPremium && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {!compact && (
        <p className={cn(
          'text-xs mt-1 ml-6',
          isSelected ? 'text-indigo-600' : 'text-gray-500'
        )}>
          {model.description}
        </p>
      )}

      {/* Ratings Row */}
      <div className={cn(
        'flex items-center gap-4 ml-6',
        compact ? 'mt-1' : 'mt-2'
      )}>
        {/* Quality */}
        <div className="flex items-center gap-1">
          <Star className={cn(
            'flex-shrink-0',
            compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
            isSelected ? 'text-indigo-500' : 'text-gray-400'
          )} />
          <span className={cn(
            'font-mono tracking-tight',
            compact ? 'text-[10px]' : 'text-xs',
            isSelected ? 'text-indigo-600' : 'text-gray-500'
          )}>
            {renderRating(model.quality)}
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1">
          <Zap className={cn(
            'flex-shrink-0',
            compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
            isSelected ? 'text-indigo-500' : 'text-gray-400'
          )} />
          <span className={cn(
            'font-mono tracking-tight',
            compact ? 'text-[10px]' : 'text-xs',
            isSelected ? 'text-indigo-600' : 'text-gray-500'
          )}>
            {renderRating(model.speed)}
          </span>
        </div>

        {/* Token Cost */}
        <div className="flex items-center gap-1">
          <Coins className={cn(
            'flex-shrink-0',
            compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
            isSelected ? 'text-indigo-500' : 'text-gray-400'
          )} />
          <span className={cn(
            compact ? 'text-[10px]' : 'text-xs',
            isSelected ? 'text-indigo-600' : 'text-gray-500'
          )}>
            {model.tokenCost}
          </span>
        </div>
      </div>
    </button>
  )
}

/**
 * Render rating as visual dots
 */
function renderRating(rating: number): string {
  return '●'.repeat(rating) + '○'.repeat(5 - rating)
}

export default AIModelSelector
