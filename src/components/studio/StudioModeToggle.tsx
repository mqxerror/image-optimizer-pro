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
    <div className={cn(
      "inline-flex rounded-xl p-1 transition-colors",
      isDark ? "bg-gray-800" : "bg-gray-100"
    )}>
      <button
        onClick={() => onChange('quick')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg transition-all',
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
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg transition-all',
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
