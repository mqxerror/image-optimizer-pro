import { AlignCenter, Grid3x3, Ratio, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultStudioSettings, type CompositionSettings, type CompositionFraming } from '@/types/studio'

interface CompositionControlsProps {
  settings: CompositionSettings
  onChange: (settings: CompositionSettings) => void
}

const defaults = defaultStudioSettings.composition

const framingOptions: { value: CompositionFraming; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'center', label: 'Center', desc: 'Balanced', icon: <AlignCenter className="w-3.5 h-3.5" /> },
  { value: 'rule-of-thirds', label: 'Thirds', desc: 'Dynamic', icon: <Grid3x3 className="w-3.5 h-3.5" /> },
  { value: 'golden-ratio', label: 'Golden', desc: 'Natural', icon: <Ratio className="w-3.5 h-3.5" /> },
]

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

export function CompositionControls({ settings, onChange }: CompositionControlsProps) {
  const updateSetting = <K extends keyof CompositionSettings>(key: K, value: CompositionSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const isPaddingModified = settings.padding !== defaults.padding

  return (
    <div className="space-y-4">
      {/* Module description */}
      <div className="pb-2 border-b border-slate-100">
        <p className="text-[10px] text-slate-400">
          Control output framing, aspect ratio, and spacing around your product.
        </p>
      </div>

      {/* Framing - 3 per row with icons */}
      <div>
        <SectionHeader
          label="Framing"
          showReset={settings.framing !== defaults.framing}
          onReset={() => updateSetting('framing', defaults.framing)}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {framingOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('framing', option.value)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all",
                settings.framing === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={settings.framing === option.value ? 'text-purple-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={cn(
                "text-[10px] font-semibold",
                settings.framing === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.framing === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Padding slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Padding</span>
            <span className={cn(
              "text-[11px] font-semibold",
              isPaddingModified ? "text-purple-600" : "text-slate-700"
            )}>
              {settings.padding}%
            </span>
          </div>
          {isPaddingModified && (
            <button
              onClick={() => updateSetting('padding', defaults.padding)}
              className="text-slate-400 hover:text-purple-500 transition-colors p-0.5"
              title={`Reset to ${defaults.padding}%`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={50}
          value={settings.padding}
          onChange={(e) => updateSetting('padding', Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>Tight</span>
          <span>Spacious</span>
        </div>
      </div>
    </div>
  )
}
