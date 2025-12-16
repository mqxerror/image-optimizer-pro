import { Label } from '@/components/ui/label'
import type { LightingSettings, LightingStyle, LightingDirection } from '@/types/studio'

interface LightingMixerProps {
  settings: LightingSettings
  onChange: (settings: LightingSettings) => void
}

const styleOptions: { value: LightingStyle; label: string }[] = [
  { value: 'studio-3point', label: 'Studio' },
  { value: 'natural', label: 'Natural' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'soft', label: 'Soft' },
  { value: 'rim', label: 'Rim' },
  { value: 'split', label: 'Split' },
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
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
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
      <div>
        <Label className="text-xs text-gray-400 mb-2 block">Style</Label>
        <div className="flex flex-wrap gap-1.5">
          {styleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('style', option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                settings.style === option.value
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md shadow-yellow-500/20'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white border border-gray-600/50'
              }`}
            >
              {option.label}
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

      <div>
        <Label className="text-xs text-gray-400 mb-2 block">Direction</Label>
        <div className="inline-grid grid-cols-3 gap-1 bg-gray-800/80 p-1.5 rounded-xl">
          {directionGrid.map((row) =>
            row.map((dir) => (
              <button
                key={dir}
                onClick={() => updateSetting('direction', dir)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
                  settings.direction === dir
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-md'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'
                }`}
              >
                {dir === 'center' ? '○' : getArrow(dir)}
              </button>
            ))
          )}
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
