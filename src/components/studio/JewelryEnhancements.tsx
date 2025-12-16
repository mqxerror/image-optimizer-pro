import { Sparkles, Palette, ScanSearch } from 'lucide-react'
import type { JewelrySettings, JewelryMetal, JewelryFinish } from '@/types/studio'

interface JewelryEnhancementsProps {
  settings: JewelrySettings
  onChange: (settings: JewelrySettings) => void
}

const metalOptions: { value: JewelryMetal; label: string; desc: string; color: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Detect', color: 'bg-gradient-to-r from-yellow-400 via-slate-300 to-rose-300' },
  { value: 'gold', label: 'Gold', desc: 'Warm', color: 'bg-gradient-to-r from-yellow-300 to-yellow-500' },
  { value: 'silver', label: 'Silver', desc: 'Cool', color: 'bg-gradient-to-r from-slate-200 to-slate-400' },
  { value: 'rose-gold', label: 'Rose', desc: 'Pink', color: 'bg-gradient-to-r from-rose-200 to-rose-400' },
  { value: 'platinum', label: 'Platinum', desc: 'Bright', color: 'bg-gradient-to-r from-slate-100 to-slate-300' },
  { value: 'mixed', label: 'Mixed', desc: 'Multi', color: 'bg-gradient-to-r from-yellow-400 to-slate-300' },
]

const finishOptions: { value: JewelryFinish; label: string; desc: string }[] = [
  { value: 'high-polish', label: 'Polish', desc: 'Mirror shine' },
  { value: 'matte', label: 'Matte', desc: 'Soft finish' },
  { value: 'brushed', label: 'Brushed', desc: 'Textured' },
  { value: 'hammered', label: 'Hammered', desc: 'Artisan' },
]

function Slider({
  icon: Icon,
  label,
  value,
  onChange,
  isActive,
}: {
  icon: React.ElementType
  label: string
  value: number
  onChange: (value: number) => void
  isActive: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isActive ? 'bg-pink-100' : 'bg-slate-100'
      }`}>
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-pink-500' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 font-medium">{label}</span>
          <span className="text-slate-700 font-semibold">{value}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
      </div>
    </div>
  )
}

export function JewelryEnhancements({ settings, onChange }: JewelryEnhancementsProps) {
  const updateSetting = <K extends keyof JewelrySettings>(key: K, value: JewelrySettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Metal Type - 3 per row with color swatches */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Metal Type</div>
        <div className="grid grid-cols-3 gap-1.5">
          {metalOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('metal', option.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all ${
                settings.metal === option.value
                  ? 'ring-1 ring-pink-400 bg-pink-50'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${option.color} shadow-sm border border-slate-300`} />
              <span className={`text-[10px] font-semibold ${settings.metal === option.value ? 'text-pink-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.metal === option.value ? 'text-pink-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Finish - 2 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Finish</div>
        <div className="grid grid-cols-2 gap-1.5">
          {finishOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('finish', option.value)}
              className={`flex flex-col items-center py-2 px-2 rounded-lg transition-all ${
                settings.finish === option.value
                  ? 'bg-pink-50 ring-1 ring-pink-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`text-[10px] font-semibold ${settings.finish === option.value ? 'text-pink-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.finish === option.value ? 'text-pink-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders with icons */}
      <div className="space-y-3">
        <Slider
          icon={Sparkles}
          label="Sparkle"
          value={settings.sparkle}
          onChange={(v) => updateSetting('sparkle', v)}
          isActive={settings.sparkle > 50}
        />
        <Slider
          icon={Palette}
          label="Color Pop"
          value={settings.colorPop}
          onChange={(v) => updateSetting('colorPop', v)}
          isActive={settings.colorPop > 50}
        />
        <Slider
          icon={ScanSearch}
          label="Detail"
          value={settings.detail}
          onChange={(v) => updateSetting('detail', v)}
          isActive={settings.detail > 50}
        />
      </div>
    </div>
  )
}
