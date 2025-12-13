import { cn } from '@/lib/utils'

interface StudioModeToggleProps {
  mode: 'quick' | 'advanced'
  onChange: (mode: 'quick' | 'advanced') => void
}

export function StudioModeToggle({ mode, onChange }: StudioModeToggleProps) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('quick')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          mode === 'quick'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Quick Mode
      </button>
      <button
        onClick={() => onChange('advanced')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          mode === 'advanced'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Advanced Mode
      </button>
    </div>
  )
}
