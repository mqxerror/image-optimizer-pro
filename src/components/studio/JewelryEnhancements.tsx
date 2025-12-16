import { Sparkles, Palette, ScanSearch, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultStudioSettings, type JewelrySettings, type JewelryMetal, type JewelryFinish } from '@/types/studio'

interface JewelryEnhancementsProps {
  settings: JewelrySettings
  onChange: (settings: JewelrySettings) => void
}

const defaults = defaultStudioSettings.jewelry

const metalOptions: { value: JewelryMetal; label: string; desc: string; color: string; isAuto?: boolean }[] = [
  { value: 'auto', label: 'Auto', desc: 'Detect', color: 'bg-gradient-to-r from-yellow-400 via-slate-300 to-rose-300', isAuto: true },
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

// Enhanced slider with icon, value display, reset, and optional warning
function Slider({
  icon: Icon,
  label,
  value,
  onChange,
  onReset,
  defaultValue,
  warning,
  warningThreshold = 85,
}: {
  icon: React.ElementType
  label: string
  value: number
  onChange: (value: number) => void
  onReset?: () => void
  defaultValue?: number
  warning?: string
  warningThreshold?: number
}) {
  const isModified = defaultValue !== undefined && value !== defaultValue
  const showWarning = warning && value > warningThreshold

  return (
    <div className="flex items-start gap-2">
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        isModified ? 'bg-purple-100' : 'bg-slate-100'
      )}>
        <Icon className={cn("w-3.5 h-3.5", isModified ? 'text-purple-500' : 'text-slate-400')} />
      </div>
      <div className="flex-1 space-y-1">
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
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        {showWarning && (
          <div className="flex items-center gap-1 text-[9px] text-amber-600">
            <AlertTriangle className="w-2.5 h-2.5" />
            {warning}
          </div>
        )}
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
      {/* Module description */}
      <div className="pb-2 border-b border-slate-100">
        <p className="text-[10px] text-slate-400">
          Enhance metal appearance, sparkle, and detail for jewelry products.
        </p>
      </div>

      {/* Metal Type - 3 per row with color swatches */}
      <div>
        <SectionHeader
          label="Metal Type"
          showReset={settings.metal !== defaults.metal}
          onReset={() => updateSetting('metal', defaults.metal)}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {metalOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('metal', option.value)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all relative",
                settings.metal === option.value
                  ? 'ring-1 ring-purple-400 bg-purple-50'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <div className={cn("w-5 h-5 rounded-full shadow-sm border border-slate-300", option.color)} />
              <span className={cn(
                "text-[10px] font-semibold",
                settings.metal === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.metal === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
              {option.isAuto && (
                <span className="absolute top-1 right-1 text-[7px] px-1 py-0.5 bg-slate-200 text-slate-500 rounded font-medium">
                  AUTO
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Finish - 2 per row */}
      <div>
        <SectionHeader
          label="Finish"
          showReset={settings.finish !== defaults.finish}
          onReset={() => updateSetting('finish', defaults.finish)}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {finishOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('finish', option.value)}
              className={cn(
                "flex flex-col items-center py-2 px-2 rounded-lg transition-all",
                settings.finish === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold",
                settings.finish === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.finish === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhancement Sliders with warnings */}
      <div>
        <SectionHeader label="Enhancements" />
        <div className="space-y-3">
          <Slider
            icon={Sparkles}
            label="Sparkle"
            value={settings.sparkle}
            onChange={(v) => updateSetting('sparkle', v)}
            onReset={() => updateSetting('sparkle', defaults.sparkle)}
            defaultValue={defaults.sparkle}
            warning="High sparkle may look artificial"
            warningThreshold={90}
          />
          <Slider
            icon={Palette}
            label="Color Pop"
            value={settings.colorPop}
            onChange={(v) => updateSetting('colorPop', v)}
            onReset={() => updateSetting('colorPop', defaults.colorPop)}
            defaultValue={defaults.colorPop}
          />
          <Slider
            icon={ScanSearch}
            label="Detail"
            value={settings.detail}
            onChange={(v) => updateSetting('detail', v)}
            onReset={() => updateSetting('detail', defaults.detail)}
            defaultValue={defaults.detail}
            warning="May cause over-sharpening"
            warningThreshold={95}
          />
        </div>
      </div>

      {/* Balanced preset suggestion */}
      {(settings.sparkle > 85 || settings.detail > 90) && (
        <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-[10px] text-amber-700">
            Consider balanced settings for natural results
          </span>
          <button
            onClick={() => {
              updateSetting('sparkle', 70)
              updateSetting('detail', 80)
            }}
            className="text-[10px] font-medium text-purple-600 hover:text-purple-700"
          >
            Apply Balanced
          </button>
        </div>
      )}
    </div>
  )
}
