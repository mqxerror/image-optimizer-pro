import { Camera, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaptureSourceSelectorProps {
  mode: 'camera' | 'gallery'
  onChange: (mode: 'camera' | 'gallery') => void
}

export function CaptureSourceSelector({ mode, onChange }: CaptureSourceSelectorProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
      <button
        type="button"
        onClick={() => onChange('camera')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all',
          mode === 'camera'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <Camera className="h-4 w-4" />
        Camera
      </button>
      <button
        type="button"
        onClick={() => onChange('gallery')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all',
          mode === 'gallery'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <ImageIcon className="h-4 w-4" />
        Gallery
      </button>
    </div>
  )
}
