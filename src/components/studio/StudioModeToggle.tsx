import { cn } from '@/lib/utils'

interface StudioModeToggleProps {
  mode: 'quick' | 'advanced'
  onChange: (mode: 'quick' | 'advanced') => void
  darkTheme?: boolean
}

export function StudioModeToggle({ mode, onChange, darkTheme = false }: StudioModeToggleProps) {
  // Auto-detect dark theme based on current mode (advanced = dark)
  const isDark = darkTheme || mode === 'advanced'

  return (
    <div
      className={cn(
        "flex w-full rounded-xl p-1 transition-colors border",
        isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
      )}
      role="tablist"
      aria-label="Studio mode selection"
    >
      <button
        onClick={() => onChange('quick')}
        role="tab"
        aria-selected={mode === 'quick'}
        aria-controls="quick-mode-panel"
        className={cn(
          'flex-1 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1',
          mode === 'quick'
            ? 'bg-white text-gray-900 shadow-md ring-2 ring-purple-400/50 shadow-purple-200/50'
            : isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
        )}
      >
        Quick
      </button>
      <button
        onClick={() => onChange('advanced')}
        role="tab"
        aria-selected={mode === 'advanced'}
        aria-controls="advanced-mode-panel"
        className={cn(
          'flex-1 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1',
          mode === 'advanced'
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md ring-2 ring-purple-400/50 shadow-purple-500/30'
            : isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
        )}
      >
        Advanced
      </button>
    </div>
  )
}
