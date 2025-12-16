import { Label } from '@/components/ui/label'
import type { BackgroundSettings, BackgroundType, BackgroundSurface, ShadowStyle } from '@/types/studio'

interface BackgroundSelectorProps {
  settings: BackgroundSettings
  onChange: (settings: BackgroundSettings) => void
}

const typeOptions: { value: BackgroundType; label: string; preview: string }[] = [
  { value: 'white', label: 'White', preview: 'bg-white' },
  { value: 'gradient', label: 'Gradient', preview: 'bg-gradient-to-b from-gray-200 to-gray-400' },
  { value: 'black', label: 'Black', preview: 'bg-gray-900' },
  { value: 'transparent', label: 'None', preview: 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23555%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23555%22%2F%3E%3C%2Fsvg%3E")]' },
  { value: 'scene', label: 'Scene', preview: 'bg-gradient-to-br from-amber-600 to-orange-700' },
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
  { value: 'floating', label: 'Float' },
]

export function BackgroundSelector({ settings, onChange }: BackgroundSelectorProps) {
  const updateSetting = <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Type</Label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {typeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('type', option.value)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all flex-shrink-0 ${
                settings.type === option.value
                  ? 'ring-2 ring-green-500 ring-offset-1 bg-green-50'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${option.preview} border border-gray-300`} />
              <span className={`text-xs font-medium ${settings.type === option.value ? 'text-green-700' : 'text-gray-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Surface</Label>
        <div className="flex flex-wrap gap-1.5">
          {surfaceOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('surface', option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                settings.surface === option.value
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Shadow</Label>
        <div className="flex flex-wrap gap-1.5">
          {shadowOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('shadow', option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                settings.shadow === option.value
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Reflection</span>
          <span className="text-gray-700 font-semibold">{settings.reflection}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.reflection}
          onChange={(e) => updateSetting('reflection', Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
        />
      </div>
    </div>
  )
}
