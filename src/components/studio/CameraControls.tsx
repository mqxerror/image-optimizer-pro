import { Circle, Eye, Focus, ArrowUp, ArrowDownRight, ArrowRight, ArrowDown } from 'lucide-react'
import type { CameraSettings, CameraLens, CameraAperture, CameraAngle, CameraFocus } from '@/types/studio'

interface CameraControlsProps {
  settings: CameraSettings
  onChange: (settings: CameraSettings) => void
}

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

export function CameraControls({ settings, onChange }: CameraControlsProps) {
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Lens - 2 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Lens</div>
        <div className="grid grid-cols-2 gap-1.5">
          {lensOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('lens', option.value)}
              className={`flex flex-col items-center py-2 px-2 rounded-lg transition-all ${
                settings.lens === option.value
                  ? 'bg-blue-50 ring-1 ring-blue-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`text-xs font-semibold ${settings.lens === option.value ? 'text-blue-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.lens === option.value ? 'text-blue-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Aperture - 4 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Aperture</div>
        <div className="grid grid-cols-4 gap-1.5">
          {apertureOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('aperture', option.value)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                settings.aperture === option.value
                  ? 'bg-blue-50 ring-1 ring-blue-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {/* Blur indicator */}
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full transition-all ${
                      i <= option.blur
                        ? settings.aperture === option.value
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-semibold ${settings.aperture === option.value ? 'text-blue-700' : 'text-slate-700'}`}>
                {option.label}
              </span>
              <span className={`text-[8px] ${settings.aperture === option.value ? 'text-blue-500' : 'text-slate-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Angle - 2 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Angle</div>
        <div className="grid grid-cols-2 gap-1.5">
          {angleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('angle', option.value)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                settings.angle === option.value
                  ? 'bg-blue-50 ring-1 ring-blue-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={settings.angle === option.value ? 'text-blue-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={`text-[11px] font-medium ${settings.angle === option.value ? 'text-blue-700' : 'text-slate-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Focus - 3 per row */}
      <div>
        <div className="text-[11px] text-slate-500 font-medium mb-1.5">Focus</div>
        <div className="grid grid-cols-3 gap-1.5">
          {focusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('focus', option.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all ${
                settings.focus === option.value
                  ? 'bg-blue-50 ring-1 ring-blue-400'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={settings.focus === option.value ? 'text-blue-500' : 'text-slate-400'}>
                {option.icon}
              </span>
              <span className={`text-[10px] font-medium ${settings.focus === option.value ? 'text-blue-700' : 'text-slate-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
