import { Label } from '@/components/ui/label'
import type { JewelrySettings, JewelryMetal, JewelryFinish } from '@/types/studio'

interface JewelryEnhancementsProps {
  settings: JewelrySettings
  onChange: (settings: JewelrySettings) => void
}

const metalOptions: { value: JewelryMetal; label: string; color: string }[] = [
  { value: 'auto', label: 'Auto', color: 'bg-gradient-to-r from-yellow-400 via-gray-300 to-rose-300' },
  { value: 'gold', label: 'Gold', color: 'bg-gradient-to-r from-yellow-300 to-yellow-500' },
  { value: 'silver', label: 'Silver', color: 'bg-gradient-to-r from-gray-200 to-gray-400' },
  { value: 'rose-gold', label: 'Rose', color: 'bg-gradient-to-r from-rose-200 to-rose-400' },
  { value: 'platinum', label: 'Platinum', color: 'bg-gradient-to-r from-gray-100 to-gray-300' },
  { value: 'mixed', label: 'Mixed', color: 'bg-gradient-to-r from-yellow-400 to-gray-300' },
]

const finishOptions: { value: JewelryFinish; label: string }[] = [
  { value: 'high-polish', label: 'High Polish' },
  { value: 'matte', label: 'Matte' },
  { value: 'brushed', label: 'Brushed' },
  { value: 'hammered', label: 'Hammered' },
]

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="text-gray-700 font-semibold">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
      />
    </div>
  )
}

export function JewelryEnhancements({ settings, onChange }: JewelryEnhancementsProps) {
  const updateSetting = <K extends keyof JewelrySettings>(key: K, value: JewelrySettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Metal Type</Label>
        <div className="flex flex-wrap gap-2">
          {metalOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('metal', option.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                settings.metal === option.value
                  ? 'ring-2 ring-pink-400 ring-offset-1 bg-pink-50'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${option.color} shadow-sm border border-gray-300`} />
              <span className={`text-xs font-medium ${settings.metal === option.value ? 'text-pink-700' : 'text-gray-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Finish</Label>
        <div className="flex flex-wrap gap-1.5">
          {finishOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('finish', option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                settings.finish === option.value
                  ? 'bg-pink-50 text-pink-700 ring-1 ring-pink-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label="Sparkle Intensity"
        value={settings.sparkle}
        onChange={(v) => updateSetting('sparkle', v)}
      />

      <Slider
        label="Color Pop"
        value={settings.colorPop}
        onChange={(v) => updateSetting('colorPop', v)}
      />

      <Slider
        label="Detail Level"
        value={settings.detail}
        onChange={(v) => updateSetting('detail', v)}
      />
    </div>
  )
}
