import { Label } from '@/components/ui/label'
import type { BackgroundSettings, BackgroundType, BackgroundSurface, ShadowStyle } from '@/types/studio'

interface BackgroundSelectorProps {
  settings: BackgroundSettings
  onChange: (settings: BackgroundSettings) => void
}

const typeOptions: { value: BackgroundType; label: string; desc: string; preview: string }[] = [
  { value: 'white', label: 'White', desc: 'Clean', preview: 'bg-white' },
  { value: 'gradient', label: 'Gradient', desc: 'Smooth', preview: 'bg-gradient-to-b from-gray-200 to-gray-400' },
  { value: 'black', label: 'Black', desc: 'Bold', preview: 'bg-gray-900' },
  { value: 'transparent', label: 'None', desc: 'Cutout', preview: 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23555%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23555%22%2F%3E%3C%2Fsvg%3E")]' },
  { value: 'scene', label: 'Scene', desc: 'Lifestyle', preview: 'bg-gradient-to-br from-amber-600 to-orange-700' },
]

const surfaceOptions: { value: BackgroundSurface; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Plain' },
  { value: 'marble', label: 'Marble', desc: 'Luxury' },
  { value: 'velvet', label: 'Velvet', desc: 'Rich' },
  { value: 'wood', label: 'Wood', desc: 'Natural' },
  { value: 'mirror', label: 'Mirror', desc: 'Reflective' },
  { value: 'silk', label: 'Silk', desc: 'Elegant' },
  { value: 'concrete', label: 'Concrete', desc: 'Modern' },
]

const shadowOptions: { value: ShadowStyle; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Flat' },
  { value: 'soft', label: 'Soft', desc: 'Subtle' },
  { value: 'hard', label: 'Hard', desc: 'Defined' },
  { value: 'floating', label: 'Float', desc: 'Lifted' },
]

export function BackgroundSelector({ settings, onChange }: BackgroundSelectorProps) {
  const updateSetting = <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Type - 3 per row with preview */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {typeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('type', option.value)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                settings.type === option.value
                  ? 'ring-2 ring-green-500 ring-offset-1 bg-green-50'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${option.preview} border border-gray-300`} />
              <span className={`text-xs font-semibold ${settings.type === option.value ? 'text-green-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.type === option.value ? 'text-green-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Surface - 4 per row with descriptions */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Surface</Label>
        <div className="grid grid-cols-4 gap-2">
          {surfaceOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('surface', option.value)}
              className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all ${
                settings.surface === option.value
                  ? 'bg-green-50 ring-2 ring-green-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={`text-xs font-semibold ${settings.surface === option.value ? 'text-green-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.surface === option.value ? 'text-green-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Shadow - 4 per row with descriptions */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Shadow</Label>
        <div className="grid grid-cols-4 gap-2">
          {shadowOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('shadow', option.value)}
              className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all ${
                settings.shadow === option.value
                  ? 'bg-green-50 ring-2 ring-green-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={`text-xs font-semibold ${settings.shadow === option.value ? 'text-green-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.shadow === option.value ? 'text-green-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reflection slider */}
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
