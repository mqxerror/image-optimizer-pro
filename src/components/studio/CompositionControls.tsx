import { Label } from '@/components/ui/label'
import { AlignCenter, Grid3x3, Ratio } from 'lucide-react'
import type { CompositionSettings, CompositionFraming } from '@/types/studio'

interface CompositionControlsProps {
  settings: CompositionSettings
  onChange: (settings: CompositionSettings) => void
}

const framingOptions: { value: CompositionFraming; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'center', label: 'Center', desc: 'Balanced', icon: <AlignCenter className="w-4 h-4" /> },
  { value: 'rule-of-thirds', label: 'Thirds', desc: 'Dynamic', icon: <Grid3x3 className="w-4 h-4" /> },
  { value: 'golden-ratio', label: 'Golden', desc: 'Natural', icon: <Ratio className="w-4 h-4" /> },
]

export function CompositionControls({ settings, onChange }: CompositionControlsProps) {
  const updateSetting = <K extends keyof CompositionSettings>(key: K, value: CompositionSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Framing - 3 per row with icons */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Framing</Label>
        <div className="grid grid-cols-3 gap-2">
          {framingOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('framing', option.value)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                settings.framing === option.value
                  ? 'bg-purple-50 ring-2 ring-purple-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={settings.framing === option.value ? 'text-purple-600' : 'text-gray-400'}>
                {option.icon}
              </span>
              <span className={`text-xs font-semibold ${settings.framing === option.value ? 'text-purple-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.framing === option.value ? 'text-purple-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Padding slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Padding</span>
          <span className="text-gray-700 font-semibold">{settings.padding}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          value={settings.padding}
          onChange={(e) => updateSetting('padding', Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  )
}
