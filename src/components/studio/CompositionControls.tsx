import { Grid3X3 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { CompositionSettings, CompositionFraming, AspectRatio } from '@/types/studio'

interface CompositionControlsProps {
  settings: CompositionSettings
  onChange: (settings: CompositionSettings) => void
}

const framingOptions: { value: CompositionFraming; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'rule-of-thirds', label: 'Rule of Thirds' },
  { value: 'golden-ratio', label: 'Golden Ratio' },
]

const aspectOptions: { value: AspectRatio; label: string; width: number; height: number }[] = [
  { value: '1:1', label: '1:1', width: 20, height: 20 },
  { value: '4:5', label: '4:5', width: 16, height: 20 },
  { value: '3:4', label: '3:4', width: 15, height: 20 },
  { value: '16:9', label: '16:9', width: 24, height: 13 },
  { value: '9:16', label: '9:16', width: 11, height: 20 },
  { value: '4:3', label: '4:3', width: 20, height: 15 },
]

export function CompositionControls({ settings, onChange }: CompositionControlsProps) {
  const updateSetting = <K extends keyof CompositionSettings>(key: K, value: CompositionSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Grid3X3 className="h-4 w-4" />
        <span className="text-sm font-medium">Composition</span>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Framing</Label>
          <div className="flex flex-wrap gap-1.5">
            {framingOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('framing', option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  settings.framing === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Aspect Ratio</Label>
          <div className="flex flex-wrap gap-2">
            {aspectOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateSetting('aspectRatio', option.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  settings.aspectRatio === option.value
                    ? 'ring-2 ring-purple-500 ring-offset-1 bg-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div
                  className="border-2 border-gray-400 rounded-sm"
                  style={{ width: option.width, height: option.height }}
                />
                <span className="text-xs text-gray-600">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Padding</span>
            <span className="text-gray-700 font-medium">{settings.padding}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            value={settings.padding}
            onChange={(e) => updateSetting('padding', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>
    </div>
  )
}
