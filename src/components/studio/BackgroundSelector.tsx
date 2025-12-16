import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultStudioSettings, type BackgroundSettings, type BackgroundType, type BackgroundSurface, type ShadowStyle } from '@/types/studio'

interface BackgroundSelectorProps {
  settings: BackgroundSettings
  onChange: (settings: BackgroundSettings) => void
}

const defaults = defaultStudioSettings.background

const typeOptions: { value: BackgroundType; label: string; desc: string; preview: string }[] = [
  { value: 'white', label: 'White', desc: 'Clean', preview: 'bg-white border-slate-300' },
  { value: 'gradient', label: 'Gradient', desc: 'Smooth', preview: 'bg-gradient-to-b from-slate-200 to-slate-400' },
  { value: 'black', label: 'Black', desc: 'Bold', preview: 'bg-slate-800' },
  { value: 'transparent', label: 'None', desc: 'Cutout', preview: 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23cbd5e1%22%2F%3E%3C%2Fsvg%3E")]' },
  { value: 'scene', label: 'Scene', desc: 'Lifestyle', preview: 'bg-gradient-to-br from-amber-500 to-orange-600' },
]

const surfaceOptions: { value: BackgroundSurface; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Plain' },
  { value: 'marble', label: 'Marble', desc: 'Luxury' },
  { value: 'velvet', label: 'Velvet', desc: 'Rich' },
  { value: 'wood', label: 'Wood', desc: 'Natural' },
  { value: 'mirror', label: 'Mirror', desc: 'Reflect' },
  { value: 'silk', label: 'Silk', desc: 'Elegant' },
  { value: 'concrete', label: 'Concrete', desc: 'Modern' },
]

const shadowOptions: { value: ShadowStyle; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Flat' },
  { value: 'soft', label: 'Soft', desc: 'Subtle' },
  { value: 'hard', label: 'Hard', desc: 'Defined' },
  { value: 'floating', label: 'Float', desc: 'Lifted' },
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

export function BackgroundSelector({ settings, onChange }: BackgroundSelectorProps) {
  const updateSetting = <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const isReflectionModified = settings.reflection !== defaults.reflection

  return (
    <div className="space-y-4">
      {/* Module description */}
      <div className="pb-2 border-b border-slate-100">
        <p className="text-[10px] text-slate-400">
          Controls the scene and realism of the background environment.
        </p>
      </div>

      {/* Type - 3 per row with preview */}
      <div>
        <SectionHeader
          label="Type"
          showReset={settings.type !== defaults.type}
          onReset={() => updateSetting('type', defaults.type)}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {typeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('type', option.value)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all",
                settings.type === option.value
                  ? 'ring-1 ring-purple-400 bg-purple-50'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <div className={cn("w-8 h-8 rounded-md border border-slate-300", option.preview)} />
              <span className={cn(
                "text-[10px] font-semibold",
                settings.type === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.type === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Surface - 4 per row */}
      <div>
        <SectionHeader
          label="Surface"
          showReset={settings.surface !== defaults.surface}
          onReset={() => updateSetting('surface', defaults.surface)}
        />
        <div className="grid grid-cols-4 gap-1">
          {surfaceOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('surface', option.value)}
              className={cn(
                "flex flex-col items-center py-2 px-0.5 rounded-lg transition-all",
                settings.surface === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold",
                settings.surface === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.surface === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Shadow - 4 per row */}
      <div>
        <SectionHeader
          label="Shadow"
          showReset={settings.shadow !== defaults.shadow}
          onReset={() => updateSetting('shadow', defaults.shadow)}
        />
        <div className="grid grid-cols-4 gap-1">
          {shadowOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('shadow', option.value)}
              className={cn(
                "flex flex-col items-center py-2 px-0.5 rounded-lg transition-all",
                settings.shadow === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold",
                settings.shadow === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.shadow === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reflection slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Reflection</span>
            <span className={cn(
              "text-[11px] font-semibold",
              isReflectionModified ? "text-purple-600" : "text-slate-700"
            )}>
              {settings.reflection}%
            </span>
          </div>
          {isReflectionModified && (
            <button
              onClick={() => updateSetting('reflection', defaults.reflection)}
              className="text-slate-400 hover:text-purple-500 transition-colors p-0.5"
              title={`Reset to ${defaults.reflection}%`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.reflection}
          onChange={(e) => updateSetting('reflection', Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  )
}
