import { Sun, Cloud, Contrast, Feather, CircleDot, SplitSquareHorizontal, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultStudioSettings, type LightingSettings, type LightingStyle, type LightingDirection } from '@/types/studio'

interface LightingMixerProps {
  settings: LightingSettings
  onChange: (settings: LightingSettings) => void
}

const defaults = defaultStudioSettings.lighting

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

// Section header with reset
function SectionHeader({
  label,
  showReset,
  onReset
}: {
  label: string
  showReset?: boolean
  onReset?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      {showReset && onReset && (
        <button
          onClick={onReset}
          className="text-slate-400 hover:text-purple-500 transition-colors p-0.5"
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

// Slider with value display and reset
function Slider({
  label,
  value,
  onChange,
  onReset,
  defaultValue,
  min = 0,
  max = 100,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  onReset?: () => void
  defaultValue?: number
  min?: number
  max?: number
}) {
  const isModified = defaultValue !== undefined && value !== defaultValue

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium">{label}</span>
          <span className={cn(
            "text-[11px] font-semibold",
            isModified ? "text-purple-600" : "text-slate-700"
          )}>
            {value}%
          </span>
        </div>
        {isModified && onReset && (
          <button
            onClick={onReset}
            className="text-slate-400 hover:text-purple-500 transition-colors p-0.5"
            title={`Reset to ${defaultValue}%`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
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
      {/* Module description */}
      <div className="pb-2 border-b border-slate-100">
        <p className="text-[10px] text-slate-400">
          Adjust lighting style, intensity, and direction for professional results.
        </p>
      </div>

      {/* Style - 3 per row */}
      <div>
        <SectionHeader
          label="Style"
          showReset={settings.style !== defaults.style}
          onReset={() => updateSetting('style', defaults.style)}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {styleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('style', option.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all",
                settings.style === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={settings.style === option.value ? 'text-purple-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={cn(
                "text-[10px] font-semibold",
                settings.style === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.style === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Sliders */}
      <div>
        <SectionHeader label="Intensity" />
        <div className="space-y-3">
          <Slider
            label="Key Light"
            value={settings.keyIntensity}
            onChange={(v) => updateSetting('keyIntensity', v)}
            onReset={() => updateSetting('keyIntensity', defaults.keyIntensity)}
            defaultValue={defaults.keyIntensity}
          />
          <Slider
            label="Fill Light"
            value={settings.fillIntensity}
            onChange={(v) => updateSetting('fillIntensity', v)}
            onReset={() => updateSetting('fillIntensity', defaults.fillIntensity)}
            defaultValue={defaults.fillIntensity}
          />
          <Slider
            label="Rim Light"
            value={settings.rimIntensity}
            onChange={(v) => updateSetting('rimIntensity', v)}
            onReset={() => updateSetting('rimIntensity', defaults.rimIntensity)}
            defaultValue={defaults.rimIntensity}
          />
        </div>
      </div>

      {/* Direction - centered grid */}
      <div>
        <SectionHeader
          label="Direction"
          showReset={settings.direction !== defaults.direction}
          onReset={() => updateSetting('direction', defaults.direction)}
        />
        <div className="flex justify-center">
          <div className="inline-grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-lg">
            {directionGrid.map((row) =>
              row.map((dir) => (
                <button
                  key={dir}
                  onClick={() => updateSetting('direction', dir)}
                  className={cn(
                    "w-9 h-9 rounded-md flex items-center justify-center text-sm transition-all",
                    settings.direction === dir
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
                  )}
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
