import { Label } from '@/components/ui/label'
import { Sun, Cloud, Contrast, Feather, CircleDot, SplitSquareHorizontal } from 'lucide-react'
import type { LightingSettings, LightingStyle, LightingDirection } from '@/types/studio'

interface LightingMixerProps {
  settings: LightingSettings
  onChange: (settings: LightingSettings) => void
}

const styleOptions: { value: LightingStyle; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'studio-3point', label: 'Studio', desc: '3-point', icon: <Sun className="w-4 h-4" /> },
  { value: 'natural', label: 'Natural', desc: 'Window', icon: <Cloud className="w-4 h-4" /> },
  { value: 'dramatic', label: 'Dramatic', desc: 'High contrast', icon: <Contrast className="w-4 h-4" /> },
  { value: 'soft', label: 'Soft', desc: 'Diffused', icon: <Feather className="w-4 h-4" /> },
  { value: 'rim', label: 'Rim', desc: 'Edge light', icon: <CircleDot className="w-4 h-4" /> },
  { value: 'split', label: 'Split', desc: 'Half & half', icon: <SplitSquareHorizontal className="w-4 h-4" /> },
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
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="text-gray-700 font-semibold">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
      />
    </div>
  )
}

export function LightingMixer({ settings, onChange }: LightingMixerProps) {
  const updateSetting = <K extends keyof LightingSettings>(key: K, value: LightingSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Style - 3 per row with icons */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {styleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('style', option.value)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all ${
                settings.style === option.value
                  ? 'bg-yellow-50 ring-2 ring-yellow-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={settings.style === option.value ? 'text-yellow-600' : 'text-gray-400'}>
                {option.icon}
              </span>
              <span className={`text-xs font-semibold ${settings.style === option.value ? 'text-yellow-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.style === option.value ? 'text-yellow-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

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

      {/* Direction - centered grid */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Direction</Label>
        <div className="flex justify-center">
          <div className="inline-grid grid-cols-3 gap-1.5 bg-gray-100 p-2 rounded-xl">
            {directionGrid.map((row) =>
              row.map((dir) => (
                <button
                  key={dir}
                  onClick={() => updateSetting('direction', dir)}
                  className={`w-11 h-11 rounded-lg flex items-center justify-center text-base transition-all ${
                    settings.direction === dir
                      ? 'bg-yellow-400 text-yellow-900 shadow-sm ring-2 ring-yellow-500 ring-offset-1'
                      : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
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
