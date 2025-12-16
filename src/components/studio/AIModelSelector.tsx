import { Star, Zap, Coins } from 'lucide-react'
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
  darkTheme?: boolean
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
  darkTheme = false,
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
    <div className={cn('space-y-1.5', className)}>
      {/* Model Cards */}
      {sortedModels.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          isSelected={value === model.id}
          onSelect={() => onChange(model.id)}
          compact={compact}
          darkTheme={darkTheme}
        />
      ))}
    </div>
  )
}

interface ModelCardProps {
  model: AIModelDefinition
  isSelected: boolean
  onSelect: () => void
  compact?: boolean
  darkTheme?: boolean
}

function ModelCard({ model, isSelected, onSelect, compact, darkTheme = false }: ModelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border transition-all',
        compact ? 'p-2' : 'p-2.5',
        isSelected
          ? (darkTheme
            ? 'border-purple-400 bg-purple-500/20 ring-1 ring-purple-400'
            : 'border-purple-400 bg-purple-50 ring-1 ring-purple-400')
          : (darkTheme
            ? 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-700/50 bg-slate-800/50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white')
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Selection indicator */}
          <div
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              isSelected
                ? 'border-purple-400 bg-purple-400'
                : (darkTheme ? 'border-slate-500' : 'border-slate-300')
            )}
          >
            {isSelected && (
              <div className="w-1 h-1 rounded-full bg-white" />
            )}
          </div>

          {/* Model Name */}
          <span className={cn(
            'font-medium truncate',
            compact ? 'text-xs' : 'text-sm',
            isSelected
              ? (darkTheme ? 'text-purple-300' : 'text-purple-900')
              : (darkTheme ? 'text-slate-200' : 'text-slate-700')
          )}>
            {formatModelDisplayName(model)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {model.recommended && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-medium",
              darkTheme ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            )}>
              Best
            </span>
          )}
          {model.isNew && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-medium",
              darkTheme ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            )}>
              New
            </span>
          )}
          {model.isPremium && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-medium",
              darkTheme ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            )}>
              Pro
            </span>
          )}
        </div>
      </div>

      {/* Description - only show when not compact */}
      {!compact && (
        <p className={cn(
          'text-[11px] mt-1 ml-5',
          isSelected
            ? (darkTheme ? 'text-purple-300' : 'text-purple-600')
            : (darkTheme ? 'text-slate-400' : 'text-slate-500')
        )}>
          {model.description}
        </p>
      )}

      {/* Ratings Row */}
      <div className={cn(
        'flex items-center gap-3 ml-5',
        compact ? 'mt-1' : 'mt-1.5'
      )}>
        {/* Quality */}
        <div className="flex items-center gap-1">
          <Star className={cn(
            'flex-shrink-0 h-2.5 w-2.5',
            isSelected ? 'text-purple-400' : (darkTheme ? 'text-slate-500' : 'text-slate-400')
          )} />
          <span className={cn(
            'font-mono tracking-tight text-[9px]',
            isSelected ? 'text-purple-400' : (darkTheme ? 'text-slate-500' : 'text-slate-400')
          )}>
            {renderRating(model.quality)}
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1">
          <Zap className={cn(
            'flex-shrink-0 h-2.5 w-2.5',
            isSelected ? 'text-purple-400' : (darkTheme ? 'text-slate-500' : 'text-slate-400')
          )} />
          <span className={cn(
            'font-mono tracking-tight text-[9px]',
            isSelected ? 'text-purple-400' : (darkTheme ? 'text-slate-500' : 'text-slate-400')
          )}>
            {renderRating(model.speed)}
          </span>
        </div>

        {/* Token Cost */}
        <div className="flex items-center gap-1">
          <Coins className={cn(
            'flex-shrink-0 h-2.5 w-2.5',
            isSelected ? 'text-purple-400' : (darkTheme ? 'text-slate-500' : 'text-slate-400')
          )} />
          <span className={cn(
            'text-[9px]',
            isSelected ? 'text-purple-400' : (darkTheme ? 'text-slate-500' : 'text-slate-400')
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
