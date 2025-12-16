import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromptModeIndicatorProps {
  mode: 'preset' | 'template' | 'custom'
  selectedName?: string | null
  onClear?: () => void
  className?: string
}

export function PromptModeIndicator({
  mode,
  selectedName,
  onClear,
  className,
}: PromptModeIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-lg transition-all duration-200',
        mode === 'template' && 'bg-blue-500/10 border border-blue-500/30',
        mode === 'preset' && selectedName && 'bg-purple-500/10 border border-purple-500/30',
        mode === 'custom' && 'bg-slate-500/10 border border-slate-500/30',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {mode === 'template' && (
          <>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm text-blue-400">Using Template:</span>
            <span className="text-sm text-white font-medium truncate max-w-[180px]">
              {selectedName || 'Selected'}
            </span>
          </>
        )}
        {mode === 'preset' && selectedName && (
          <>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-sm text-purple-400">Using Preset:</span>
            <span className="text-sm text-white font-medium truncate max-w-[180px]">
              {selectedName}
            </span>
          </>
        )}
        {mode === 'preset' && !selectedName && (
          <>
            <span className="w-2 h-2 rounded-full bg-purple-400/50" />
            <span className="text-sm text-purple-400/70">Default Settings</span>
          </>
        )}
        {mode === 'custom' && (
          <>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-sm text-slate-400">Custom Settings</span>
            {selectedName && (
              <span className="text-xs text-slate-500">(modified from {selectedName})</span>
            )}
          </>
        )}
      </div>

      {(mode === 'template' || (mode === 'preset' && selectedName)) && onClear && (
        <button
          onClick={onClear}
          className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
            mode === 'template'
              ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20'
              : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20'
          )}
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  )
}
