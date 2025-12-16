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
        "inline-flex rounded-xl p-1 transition-colors",
        isDark ? "bg-gray-800" : "bg-gray-100"
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
          'px-4 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1',
          mode === 'quick'
            ? isDark
              ? 'bg-white text-gray-900 shadow-md'
              : 'bg-white text-gray-900 shadow-sm'
            : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Quick Mode
      </button>
      <button
        onClick={() => onChange('advanced')}
        role="tab"
        aria-selected={mode === 'advanced'}
        aria-controls="advanced-mode-panel"
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1',
          mode === 'advanced'
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/20'
            : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Advanced Mode
      </button>
    </div>
  )
}
