import { Gem } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { JewelrySettings, JewelryMetal, JewelryFinish } from '@/types/studio'

interface JewelryEnhancementsProps {
  settings: JewelrySettings
  onChange: (settings: JewelrySettings) => void
}

const metalOptions: { value: JewelryMetal; label: string; color: string }[] = [
  { value: 'auto', label: 'Auto', color: 'bg-gradient-to-r from-yellow-400 via-gray-300 to-rose-300' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-400' },
  { value: 'silver', label: 'Silver', color: 'bg-gray-300' },
  { value: 'rose-gold', label: 'Rose', color: 'bg-rose-300' },
  { value: 'platinum', label: 'Platinum', color: 'bg-gray-200' },
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
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700 font-medium">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
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
      <div className="flex items-center gap-2 text-gray-700">
        <Gem className="h-4 w-4" />
        <span className="text-sm font-medium">Jewelry</span>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Metal</Label>
          <div className="flex flex-wrap gap-2">
            {metalOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('metal', option.value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  settings.metal === option.value
                    ? 'ring-2 ring-purple-500 ring-offset-1 bg-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${option.color}`} />
                <span className="text-xs font-medium text-gray-700">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Finish</Label>
          <div className="flex flex-wrap gap-1.5">
            {finishOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('finish', option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  settings.finish === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Sparkle"
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
    </div>
  )
}
