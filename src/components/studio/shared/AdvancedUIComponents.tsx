import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Unified selection styling for Advanced panel
 *
 * Design system:
 * - Purple as primary accent for all selections
 * - Consistent ring + fill pattern
 * - "Auto" options get special treatment
 */

// Selection tile for options (buttons)
interface SelectionTileProps {
  selected: boolean
  onClick: () => void
  isAuto?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export function SelectionTile({
  selected,
  onClick,
  isAuto = false,
  disabled = false,
  className,
  children,
}: SelectionTileProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center rounded-lg transition-all",
        selected
          ? "bg-purple-50 ring-1 ring-purple-400"
          : "bg-slate-50 hover:bg-slate-100 border border-slate-200",
        disabled && "opacity-50 cursor-not-allowed",
        isAuto && selected && "bg-purple-50/70 ring-purple-300",
        className
      )}
    >
      {children}
    </button>
  )
}

// Tile label (main text)
export function TileLabel({
  selected,
  children,
  className,
}: {
  selected: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-semibold",
        selected ? "text-purple-700" : "text-slate-700",
        className
      )}
    >
      {children}
    </span>
  )
}

// Tile description (sub text)
export function TileDesc({
  selected,
  children,
  className,
}: {
  selected: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        selected ? "text-purple-500" : "text-slate-400",
        className
      )}
    >
      {children}
    </span>
  )
}

// Tile icon wrapper
export function TileIcon({
  selected,
  children,
  className,
}: {
  selected: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn(selected ? "text-purple-500" : "text-slate-400", className)}>
      {children}
    </span>
  )
}

// Section header with optional description
interface SectionHeaderProps {
  label: string
  description?: string
  onReset?: () => void
  showReset?: boolean
}

export function SectionHeader({ label, description, onReset, showReset }: SectionHeaderProps) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
        {showReset && onReset && (
          <button
            onClick={onReset}
            className="text-[10px] text-slate-400 hover:text-purple-500 flex items-center gap-0.5 transition-colors"
            title={`Reset ${label}`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
      {description && (
        <p className="text-[9px] text-slate-400 mt-0.5">{description}</p>
      )}
    </div>
  )
}

// Slider with integrated label, value, and reset
interface SliderControlProps {
  label: string
  value: number
  onChange: (value: number) => void
  onReset?: () => void
  min?: number
  max?: number
  defaultValue?: number
  unit?: string
  icon?: React.ReactNode
  showResetOnChange?: boolean
  semantic?: 'intensity' | 'amount' | 'percentage'
  warning?: string
}

export function SliderControl({
  label,
  value,
  onChange,
  onReset,
  min = 0,
  max = 100,
  defaultValue,
  unit = '%',
  icon,
  showResetOnChange = true,
  semantic,
  warning,
}: SliderControlProps) {
  const isModified = defaultValue !== undefined && value !== defaultValue
  const showWarning = warning && value > 85

  return (
    <div className="flex items-center gap-2">
      {icon && (
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
            isModified ? "bg-purple-100" : "bg-slate-100"
          )}
        >
          <span className={cn("w-3.5 h-3.5", isModified ? "text-purple-500" : "text-slate-400")}>
            {icon}
          </span>
        </div>
      )}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">{label}</span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                isModified ? "text-purple-600" : "text-slate-700"
              )}
            >
              {value}{unit}
            </span>
          </div>
          {showResetOnChange && isModified && onReset && (
            <button
              onClick={onReset}
              className="text-slate-400 hover:text-purple-500 transition-colors p-0.5"
              title={`Reset to ${defaultValue}${unit}`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        {showWarning && (
          <p className="text-[9px] text-amber-600">{warning}</p>
        )}
      </div>
    </div>
  )
}

// Module wrapper with description and reset all
interface ModuleWrapperProps {
  title?: string
  description?: string
  onResetAll?: () => void
  children: React.ReactNode
}

export function ModuleWrapper({ title, description, onResetAll, children }: ModuleWrapperProps) {
  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            {title && <h3 className="text-xs font-semibold text-slate-700">{title}</h3>}
            {description && <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>}
          </div>
          {onResetAll && (
            <button
              onClick={onResetAll}
              className="text-[10px] text-slate-400 hover:text-purple-500 flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Summary chip (for showing active settings)
interface SummaryChipProps {
  label: string
  onRemove?: () => void
  variant?: 'default' | 'modified'
}

export function SummaryChip({ label, onRemove, variant = 'default' }: SummaryChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
        variant === 'modified'
          ? "bg-purple-100 text-purple-700"
          : "bg-slate-100 text-slate-600"
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-purple-500 transition-colors ml-0.5"
        >
          ×
        </button>
      )}
    </span>
  )
}

// Auto badge for "Auto detect" options
export function AutoBadge() {
  return (
    <span className="text-[8px] px-1 py-0.5 bg-slate-200 text-slate-500 rounded font-medium">
      AUTO
    </span>
  )
}
