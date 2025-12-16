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
      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Framing</Label>
        <div className="flex flex-wrap gap-1.5">
          {framingOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('framing', option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                settings.framing === option.value
                  ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500 font-medium mb-2 block">Aspect Ratio</Label>
        <div className="flex flex-wrap gap-2">
          {aspectOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('aspectRatio', option.value)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                settings.aspectRatio === option.value
                  ? 'ring-2 ring-purple-500 ring-offset-1 bg-purple-50'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div
                className={`rounded-sm transition-colors ${
                  settings.aspectRatio === option.value
                    ? 'bg-purple-400'
                    : 'bg-gray-300'
                }`}
                style={{ width: option.width, height: option.height }}
              />
              <span className={`text-xs font-medium ${settings.aspectRatio === option.value ? 'text-purple-700' : 'text-gray-600'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Padding</span>
          <span className="text-gray-700 font-semibold">{settings.padding}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          value={settings.padding}
          onChange={(e) => updateSetting('padding', Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  )
}
