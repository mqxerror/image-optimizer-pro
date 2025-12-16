import { Label } from '@/components/ui/label'
import { Sparkles, Palette, ScanSearch } from 'lucide-react'
import type { JewelrySettings, JewelryMetal, JewelryFinish } from '@/types/studio'

interface JewelryEnhancementsProps {
  settings: JewelrySettings
  onChange: (settings: JewelrySettings) => void
}

const metalOptions: { value: JewelryMetal; label: string; desc: string; color: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Detect', color: 'bg-gradient-to-r from-yellow-400 via-gray-300 to-rose-300' },
  { value: 'gold', label: 'Gold', desc: 'Warm', color: 'bg-gradient-to-r from-yellow-300 to-yellow-500' },
  { value: 'silver', label: 'Silver', desc: 'Cool', color: 'bg-gradient-to-r from-gray-200 to-gray-400' },
  { value: 'rose-gold', label: 'Rose', desc: 'Pink', color: 'bg-gradient-to-r from-rose-200 to-rose-400' },
  { value: 'platinum', label: 'Platinum', desc: 'Bright', color: 'bg-gradient-to-r from-gray-100 to-gray-300' },
  { value: 'mixed', label: 'Mixed', desc: 'Multi', color: 'bg-gradient-to-r from-yellow-400 to-gray-300' },
]

const finishOptions: { value: JewelryFinish; label: string; desc: string }[] = [
  { value: 'high-polish', label: 'Polish', desc: 'Mirror shine' },
  { value: 'matte', label: 'Matte', desc: 'Soft finish' },
  { value: 'brushed', label: 'Brushed', desc: 'Textured' },
  { value: 'hammered', label: 'Hammered', desc: 'Artisan' },
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
    <div className="flex-1 space-y-1.5">
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
    <div className="space-y-5">
      {/* Metal Type - 3 per row with color swatches */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Metal Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {metalOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('metal', option.value)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                settings.metal === option.value
                  ? 'ring-2 ring-pink-400 ring-offset-1 bg-pink-50'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${option.color} shadow-sm border border-gray-300`} />
              <span className={`text-xs font-semibold ${settings.metal === option.value ? 'text-pink-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.metal === option.value ? 'text-pink-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Finish - 2 per row with descriptions */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Finish</Label>
        <div className="grid grid-cols-2 gap-2">
          {finishOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('finish', option.value)}
              className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all ${
                settings.finish === option.value
                  ? 'bg-pink-50 ring-2 ring-pink-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={`text-xs font-semibold ${settings.finish === option.value ? 'text-pink-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.finish === option.value ? 'text-pink-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders with icons */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className={`w-3.5 h-3.5 ${settings.sparkle > 50 ? 'text-pink-500' : 'text-gray-400'}`} />
          <Slider
            label="Sparkle"
            value={settings.sparkle}
            onChange={(v) => updateSetting('sparkle', v)}
          />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Palette className={`w-3.5 h-3.5 ${settings.colorPop > 50 ? 'text-pink-500' : 'text-gray-400'}`} />
          <Slider
            label="Color Pop"
            value={settings.colorPop}
            onChange={(v) => updateSetting('colorPop', v)}
          />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <ScanSearch className={`w-3.5 h-3.5 ${settings.detail > 50 ? 'text-pink-500' : 'text-gray-400'}`} />
          <Slider
            label="Detail"
            value={settings.detail}
            onChange={(v) => updateSetting('detail', v)}
          />
        </div>
      </div>
    </div>
  )
}
