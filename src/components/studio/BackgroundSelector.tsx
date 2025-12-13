import { Square } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { BackgroundSettings, BackgroundType, BackgroundSurface, ShadowStyle } from '@/types/studio'

interface BackgroundSelectorProps {
  settings: BackgroundSettings
  onChange: (settings: BackgroundSettings) => void
}

const typeOptions: { value: BackgroundType; label: string; preview: string }[] = [
  { value: 'white', label: 'White', preview: 'bg-white border' },
  { value: 'gradient', label: 'Gradient', preview: 'bg-gradient-to-b from-gray-100 to-gray-300' },
  { value: 'black', label: 'Black', preview: 'bg-gray-900' },
  { value: 'transparent', label: 'Transparent', preview: 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E")]' },
  { value: 'scene', label: 'Scene', preview: 'bg-gradient-to-br from-amber-100 to-orange-200' },
]

const surfaceOptions: { value: BackgroundSurface; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'marble', label: 'Marble' },
  { value: 'velvet', label: 'Velvet' },
  { value: 'wood', label: 'Wood' },
  { value: 'mirror', label: 'Mirror' },
  { value: 'silk', label: 'Silk' },
  { value: 'concrete', label: 'Concrete' },
]

const shadowOptions: { value: ShadowStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft' },
  { value: 'hard', label: 'Hard' },
  { value: 'floating', label: 'Floating' },
]

export function BackgroundSelector({ settings, onChange }: BackgroundSelectorProps) {
  const updateSetting = <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Square className="h-4 w-4" />
        <span className="text-sm font-medium">Background</span>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Type</Label>
          <div className="flex gap-2">
            {typeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('type', option.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  settings.type === option.value
                    ? 'ring-2 ring-purple-500 ring-offset-2'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 rounded ${option.preview}`} />
                <span className="text-xs text-gray-600">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Surface</Label>
          <div className="flex flex-wrap gap-1.5">
            {surfaceOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('surface', option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  settings.surface === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Shadow</Label>
          <div className="flex flex-wrap gap-1.5">
            {shadowOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('shadow', option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  settings.shadow === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Reflection</span>
            <span className="text-gray-700 font-medium">{settings.reflection}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.reflection}
            onChange={(e) => updateSetting('reflection', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>
    </div>
  )
}
