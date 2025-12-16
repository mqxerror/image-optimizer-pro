import { AlignCenter, Grid3x3, Ratio } from 'lucide-react'
import type { CompositionSettings, CompositionFraming } from '@/types/studio'

interface CompositionControlsProps {
  settings: CompositionSettings
  onChange: (settings: CompositionSettings) => void
}

const framingOptions: { value: CompositionFraming; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'center', label: 'Center', desc: 'Balanced', icon: <AlignCenter className="w-3.5 h-3.5" /> },
  { value: 'rule-of-thirds', label: 'Thirds', desc: 'Dynamic', icon: <Grid3x3 className="w-3.5 h-3.5" /> },
  { value: 'golden-ratio', label: 'Golden', desc: 'Natural', icon: <Ratio className="w-3.5 h-3.5" /> },
]

export function CompositionControls({ settings, onChange }: CompositionControlsProps) {
  const updateSetting = <K extends keyof CompositionSettings>(key: K, value: CompositionSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Framing - 3 per row with icons */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Framing</div>
        <div className="grid grid-cols-3 gap-1.5">
          {framingOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('framing', option.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all ${
                settings.framing === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={settings.framing === option.value ? 'text-purple-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={`text-[10px] font-semibold ${settings.framing === option.value ? 'text-purple-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.framing === option.value ? 'text-purple-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Padding slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Padding</span>
          <span className="text-slate-700 font-semibold">{settings.padding}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          value={settings.padding}
          onChange={(e) => updateSetting('padding', Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  )
}
