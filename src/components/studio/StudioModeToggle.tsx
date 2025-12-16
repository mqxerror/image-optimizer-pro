import { cn } from '@/lib/utils'

interface StudioModeToggleProps {
  mode: 'quick' | 'advanced'
  onChange: (mode: 'quick' | 'advanced') => void
  darkTheme?: boolean
}

export function StudioModeToggle({ mode, onChange, darkTheme = false }: StudioModeToggleProps) {
  // Use dark theme only if explicitly passed, don't auto-detect
  const isDark = darkTheme

  return (
    <div
      className={cn(
        "flex w-full rounded-xl p-1 transition-colors border",
        isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
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
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-purple-400/40'
            : isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
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
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm ring-1 ring-purple-400/40'
            : isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
        )}
      >
        Advanced
      </button>
    </div>
  )
}
