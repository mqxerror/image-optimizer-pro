import type { BackgroundSettings, BackgroundType, BackgroundSurface, ShadowStyle } from '@/types/studio'

interface BackgroundSelectorProps {
  settings: BackgroundSettings
  onChange: (settings: BackgroundSettings) => void
}

const typeOptions: { value: BackgroundType; label: string; desc: string; preview: string }[] = [
  { value: 'white', label: 'White', desc: 'Clean', preview: 'bg-white border-slate-300' },
  { value: 'gradient', label: 'Gradient', desc: 'Smooth', preview: 'bg-gradient-to-b from-slate-200 to-slate-400' },
  { value: 'black', label: 'Black', desc: 'Bold', preview: 'bg-slate-800' },
  { value: 'transparent', label: 'None', desc: 'Cutout', preview: 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23cbd5e1%22%2F%3E%3C%2Fsvg%3E")]' },
  { value: 'scene', label: 'Scene', desc: 'Lifestyle', preview: 'bg-gradient-to-br from-amber-500 to-orange-600' },
]

const surfaceOptions: { value: BackgroundSurface; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Plain' },
  { value: 'marble', label: 'Marble', desc: 'Luxury' },
  { value: 'velvet', label: 'Velvet', desc: 'Rich' },
  { value: 'wood', label: 'Wood', desc: 'Natural' },
  { value: 'mirror', label: 'Mirror', desc: 'Reflect' },
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
    <div className="space-y-4">
      {/* Type - 3 per row with preview */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Type</div>
        <div className="grid grid-cols-3 gap-1.5">
          {typeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('type', option.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all ${
                settings.type === option.value
                  ? 'ring-1 ring-emerald-400 bg-emerald-50'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-md ${option.preview} border border-slate-300`} />
              <span className={`text-[10px] font-semibold ${settings.type === option.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.type === option.value ? 'text-emerald-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Surface - 4 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Surface</div>
        <div className="grid grid-cols-4 gap-1">
          {surfaceOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('surface', option.value)}
              className={`flex flex-col items-center py-2 px-0.5 rounded-lg transition-all ${
                settings.surface === option.value
                  ? 'bg-emerald-50 ring-1 ring-emerald-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`text-[10px] font-semibold ${settings.surface === option.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.surface === option.value ? 'text-emerald-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Shadow - 4 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Shadow</div>
        <div className="grid grid-cols-4 gap-1">
          {shadowOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('shadow', option.value)}
              className={`flex flex-col items-center py-2 px-0.5 rounded-lg transition-all ${
                settings.shadow === option.value
                  ? 'bg-emerald-50 ring-1 ring-emerald-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`text-[10px] font-semibold ${settings.shadow === option.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.shadow === option.value ? 'text-emerald-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reflection slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Reflection</span>
          <span className="text-slate-700 font-semibold">{settings.reflection}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.reflection}
          onChange={(e) => updateSetting('reflection', Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>
    </div>
  )
}
