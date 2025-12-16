import { Sun, Cloud, Contrast, Feather, CircleDot, SplitSquareHorizontal } from 'lucide-react'
import type { LightingSettings, LightingStyle, LightingDirection } from '@/types/studio'

interface LightingMixerProps {
  settings: LightingSettings
  onChange: (settings: LightingSettings) => void
}

const styleOptions: { value: LightingStyle; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'studio-3point', label: 'Studio', desc: '3-point', icon: <Sun className="w-3.5 h-3.5" /> },
  { value: 'natural', label: 'Natural', desc: 'Window', icon: <Cloud className="w-3.5 h-3.5" /> },
  { value: 'dramatic', label: 'Dramatic', desc: 'Contrast', icon: <Contrast className="w-3.5 h-3.5" /> },
  { value: 'soft', label: 'Soft', desc: 'Diffused', icon: <Feather className="w-3.5 h-3.5" /> },
  { value: 'rim', label: 'Rim', desc: 'Edge', icon: <CircleDot className="w-3.5 h-3.5" /> },
  { value: 'split', label: 'Split', desc: 'Half', icon: <SplitSquareHorizontal className="w-3.5 h-3.5" /> },
]

const directionGrid: LightingDirection[][] = [
  ['top-left', 'top', 'top-right'],
  ['left', 'center', 'right'],
  ['bottom-left', 'bottom', 'bottom-right'],
] as const

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="text-slate-700 font-semibold">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
    </div>
  )
}

export function LightingMixer({ settings, onChange }: LightingMixerProps) {
  const updateSetting = <K extends keyof LightingSettings>(key: K, value: LightingSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Style - 3 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Style</div>
        <div className="grid grid-cols-3 gap-1.5">
          {styleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('style', option.value)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all ${
                settings.style === option.value
                  ? 'bg-amber-50 ring-1 ring-amber-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={settings.style === option.value ? 'text-amber-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={`text-[10px] font-semibold ${settings.style === option.value ? 'text-amber-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.style === option.value ? 'text-amber-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <Slider
          label="Key Light"
          value={settings.keyIntensity}
          onChange={(v) => updateSetting('keyIntensity', v)}
        />
        <Slider
          label="Fill Light"
          value={settings.fillIntensity}
          onChange={(v) => updateSetting('fillIntensity', v)}
        />
        <Slider
          label="Rim Light"
          value={settings.rimIntensity}
          onChange={(v) => updateSetting('rimIntensity', v)}
        />
      </div>

      {/* Direction - centered grid */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Direction</div>
        <div className="flex justify-center">
          <div className="inline-grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-lg">
            {directionGrid.map((row) =>
              row.map((dir) => (
                <button
                  key={dir}
                  onClick={() => updateSetting('direction', dir)}
                  className={`w-9 h-9 rounded-md flex items-center justify-center text-sm transition-all ${
                    settings.direction === dir
                      ? 'bg-amber-400 text-amber-900 shadow-sm'
                      : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {dir === 'center' ? '○' : getArrow(dir)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getArrow(direction: LightingDirection): string {
  const arrows: Record<LightingDirection, string> = {
    'top-left': '↖',
    'top': '↑',
    'top-right': '↗',
    'left': '←',
    'center': '○',
    'right': '→',
    'bottom-left': '↙',
    'bottom': '↓',
    'bottom-right': '↘',
  }
  return arrows[direction]
}
