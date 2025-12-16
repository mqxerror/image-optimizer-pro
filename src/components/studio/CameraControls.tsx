import { Circle, Eye, Focus, ArrowUp, ArrowDownRight, ArrowRight, ArrowDown, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultStudioSettings, type CameraSettings, type CameraLens, type CameraAperture, type CameraAngle, type CameraFocus } from '@/types/studio'

interface CameraControlsProps {
  settings: CameraSettings
  onChange: (settings: CameraSettings) => void
}

const defaults = defaultStudioSettings.camera

const lensOptions: { value: CameraLens; label: string; desc: string }[] = [
  { value: '50mm', label: '50mm', desc: 'Natural' },
  { value: '85mm', label: '85mm', desc: 'Portrait' },
  { value: '100mm', label: '100mm', desc: 'Macro' },
  { value: '135mm', label: '135mm', desc: 'Bokeh' },
]

const apertureOptions: { value: CameraAperture; label: string; desc: string; blur: number }[] = [
  { value: 'f/1.4', label: 'f/1.4', desc: 'Max blur', blur: 4 },
  { value: 'f/2.8', label: 'f/2.8', desc: 'Soft blur', blur: 3 },
  { value: 'f/8', label: 'f/8', desc: 'Balanced', blur: 2 },
  { value: 'f/16', label: 'f/16', desc: 'All sharp', blur: 1 },
]

const angleOptions: { value: CameraAngle; label: string; icon: React.ReactNode }[] = [
  { value: 'top-down', label: 'Top-down', icon: <ArrowDown className="w-3.5 h-3.5" /> },
  { value: '45deg', label: '45°', icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  { value: 'eye-level', label: 'Eye level', icon: <ArrowRight className="w-3.5 h-3.5" /> },
  { value: 'low-angle', label: 'Low angle', icon: <ArrowUp className="w-3.5 h-3.5" /> },
]

const focusOptions: { value: CameraFocus; label: string; icon: React.ReactNode }[] = [
  { value: 'sharp', label: 'All Sharp', icon: <Focus className="w-3.5 h-3.5" /> },
  { value: 'shallow-dof', label: 'Shallow', icon: <Circle className="w-3.5 h-3.5" /> },
  { value: 'tilt-shift', label: 'Tilt-shift', icon: <Eye className="w-3.5 h-3.5" /> },
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

export function CameraControls({ settings, onChange }: CameraControlsProps) {
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Module description */}
      <div className="pb-2 border-b border-slate-100">
        <p className="text-[10px] text-slate-400">
          Control virtual camera settings for perspective and depth of field.
        </p>
      </div>

      {/* Lens - 2 per row */}
      <div>
        <SectionHeader
          label="Lens"
          showReset={settings.lens !== defaults.lens}
          onReset={() => updateSetting('lens', defaults.lens)}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {lensOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('lens', option.value)}
              className={cn(
                "flex flex-col items-center py-2 px-2 rounded-lg transition-all",
                settings.lens === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={cn(
                "text-xs font-semibold",
                settings.lens === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[9px]",
                settings.lens === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Aperture - 4 per row */}
      <div>
        <SectionHeader
          label="Aperture"
          showReset={settings.aperture !== defaults.aperture}
          onReset={() => updateSetting('aperture', defaults.aperture)}
        />
        <div className="grid grid-cols-4 gap-1.5">
          {apertureOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('aperture', option.value)}
              className={cn(
                "flex flex-col items-center py-2 px-1 rounded-lg transition-all",
                settings.aperture === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {/* Blur indicator dots */}
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 h-1 rounded-full transition-all",
                      i <= option.blur
                        ? settings.aperture === option.value
                          ? 'bg-purple-500'
                          : 'bg-slate-400'
                        : 'bg-slate-200'
                    )}
                  />
                ))}
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                settings.aperture === option.value ? 'text-purple-700' : 'text-slate-700'
              )}>
                {option.label}
              </span>
              <span className={cn(
                "text-[8px]",
                settings.aperture === option.value ? 'text-purple-500' : 'text-slate-400'
              )}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Angle - 2 per row */}
      <div>
        <SectionHeader
          label="Angle"
          showReset={settings.angle !== defaults.angle}
          onReset={() => updateSetting('angle', defaults.angle)}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {angleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('angle', option.value)}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all",
                settings.angle === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={settings.angle === option.value ? 'text-purple-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={cn(
                "text-[11px] font-medium",
                settings.angle === option.value ? 'text-purple-700' : 'text-slate-600'
              )}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Focus - 3 per row */}
      <div>
        <SectionHeader
          label="Focus"
          showReset={settings.focus !== defaults.focus}
          onReset={() => updateSetting('focus', defaults.focus)}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {focusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('focus', option.value)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all",
                settings.focus === option.value
                  ? 'bg-purple-50 ring-1 ring-purple-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span className={settings.focus === option.value ? 'text-purple-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={cn(
                "text-[10px] font-medium",
                settings.focus === option.value ? 'text-purple-700' : 'text-slate-600'
              )}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
