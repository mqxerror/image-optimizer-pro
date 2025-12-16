import { Label } from '@/components/ui/label'
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
  { value: 'top-down', label: 'Top-down', icon: <ArrowDown className="w-4 h-4" /> },
  { value: '45deg', label: '45°', icon: <ArrowDownRight className="w-4 h-4" /> },
  { value: 'eye-level', label: 'Eye level', icon: <ArrowRight className="w-4 h-4" /> },
  { value: 'low-angle', label: 'Low angle', icon: <ArrowUp className="w-4 h-4" /> },
]

const focusOptions: { value: CameraFocus; label: string; icon: React.ReactNode }[] = [
  { value: 'sharp', label: 'All Sharp', icon: <Focus className="w-4 h-4" /> },
  { value: 'shallow-dof', label: 'Shallow', icon: <Circle className="w-4 h-4" /> },
  { value: 'tilt-shift', label: 'Tilt-shift', icon: <Eye className="w-4 h-4" /> },
]

export function CameraControls({ settings, onChange }: CameraControlsProps) {
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Lens - 2 per row with descriptions */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Lens</Label>
        <div className="grid grid-cols-2 gap-2">
          {lensOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('lens', option.value)}
              className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all ${
                settings.lens === option.value
                  ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={`text-sm font-semibold ${settings.lens === option.value ? 'text-blue-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[10px] mt-0.5 ${settings.lens === option.value ? 'text-blue-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Aperture - 4 per row with blur indicator */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Aperture</Label>
        <div className="grid grid-cols-4 gap-2">
          {apertureOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('aperture', option.value)}
              className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all ${
                settings.aperture === option.value
                  ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {/* Blur indicator circles */}
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i <= option.blur
                        ? settings.aperture === option.value
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                        : 'bg-gray-200'
                    }`}
                    style={{ filter: i <= option.blur ? `blur(${(option.blur - i) * 0.3}px)` : 'none' }}
                  />
                ))}
              </div>
              <span className={`text-xs font-semibold ${settings.aperture === option.value ? 'text-blue-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className={`text-[9px] ${settings.aperture === option.value ? 'text-blue-500' : 'text-gray-400'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Angle - 2 per row with icons */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Angle</Label>
        <div className="grid grid-cols-2 gap-2">
          {angleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('angle', option.value)}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl transition-all ${
                settings.angle === option.value
                  ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={settings.angle === option.value ? 'text-blue-600' : 'text-gray-400'}>
                {option.icon}
              </span>
              <span className={`text-xs font-medium ${settings.angle === option.value ? 'text-blue-700' : 'text-gray-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Focus - 3 per row with icons */}
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Focus</Label>
        <div className="grid grid-cols-3 gap-2">
          {focusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('focus', option.value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all ${
                settings.focus === option.value
                  ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={settings.focus === option.value ? 'text-blue-600' : 'text-gray-400'}>
                {option.icon}
              </span>
              <span className={`text-[11px] font-medium ${settings.focus === option.value ? 'text-blue-700' : 'text-gray-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
