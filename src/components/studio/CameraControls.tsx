import { Label } from '@/components/ui/label'
import type { CameraSettings, CameraLens, CameraAperture, CameraAngle, CameraFocus } from '@/types/studio'

interface CameraControlsProps {
  settings: CameraSettings
  onChange: (settings: CameraSettings) => void
}

const lensOptions: { value: CameraLens; label: string }[] = [
  { value: '50mm', label: '50mm' },
  { value: '85mm', label: '85mm' },
  { value: '100mm', label: '100mm Macro' },
  { value: '135mm', label: '135mm' },
]

const apertureOptions: { value: CameraAperture; label: string }[] = [
  { value: 'f/1.4', label: 'f/1.4' },
  { value: 'f/2.8', label: 'f/2.8' },
  { value: 'f/8', label: 'f/8' },
  { value: 'f/16', label: 'f/16' },
]

const angleOptions: { value: CameraAngle; label: string }[] = [
  { value: 'top-down', label: 'Top-down' },
  { value: '45deg', label: '45°' },
  { value: 'eye-level', label: 'Eye level' },
  { value: 'low-angle', label: 'Low angle' },
]

const focusOptions: { value: CameraFocus; label: string }[] = [
  { value: 'sharp', label: 'Full sharp' },
  { value: 'shallow-dof', label: 'Shallow DOF' },
  { value: 'tilt-shift', label: 'Tilt-shift' },
]

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === option.value
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white border border-gray-600/50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function CameraControls({ settings, onChange }: CameraControlsProps) {
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-400 mb-2 block">Lens</Label>
          <ChipGroup
            options={lensOptions}
            value={settings.lens}
            onChange={(v) => updateSetting('lens', v)}
          />
        </div>

        <div>
          <Label className="text-xs text-gray-400 mb-2 block">Aperture</Label>
          <ChipGroup
            options={apertureOptions}
            value={settings.aperture}
            onChange={(v) => updateSetting('aperture', v)}
          />
        </div>

        <div>
          <Label className="text-xs text-gray-400 mb-2 block">Angle</Label>
          <ChipGroup
            options={angleOptions}
            value={settings.angle}
            onChange={(v) => updateSetting('angle', v)}
          />
        </div>

        <div>
          <Label className="text-xs text-gray-400 mb-2 block">Focus</Label>
          <ChipGroup
            options={focusOptions}
            value={settings.focus}
            onChange={(v) => updateSetting('focus', v)}
          />
        </div>
      </div>
    </div>
  )
}
