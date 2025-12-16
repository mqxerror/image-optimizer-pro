import { Lightbulb, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { AIModelSelector } from './AIModelSelector'
import type { AspectRatio } from '@/types/studio'

interface QuickControlsProps {
  lighting: number
  aiModel: string
  aspectRatio: AspectRatio
  onChange: (key: string, value: number) => void
  onModelChange: (model: string) => void
  onAspectRatioChange: (ratio: AspectRatio) => void
}

const aspectOptions: { value: AspectRatio; label: string; width: number; height: number; desc: string }[] = [
  { value: '1:1', label: '1:1', width: 20, height: 20, desc: 'Square' },
  { value: '4:5', label: '4:5', width: 16, height: 20, desc: 'Instagram' },
  { value: '3:4', label: '3:4', width: 15, height: 20, desc: 'Portrait' },
  { value: '16:9', label: '16:9', width: 24, height: 14, desc: 'Widescreen' },
  { value: '9:16', label: '9:16', width: 11, height: 20, desc: 'Story' },
  { value: '4:3', label: '4:3', width: 20, height: 15, desc: 'Landscape' },
]

export function QuickControls({
  lighting,
  aiModel,
  aspectRatio,
  onChange,
  onModelChange,
  onAspectRatioChange
}: QuickControlsProps) {
  return (
    <div className="bg-white flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* AI Model Selection */}
        <AIModelSelector
          value={aiModel}
          onChange={onModelChange}
          mode="single"
        />

        {/* Aspect Ratio - 3 per row compact grid */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Output Size</Label>
          <div className="grid grid-cols-3 gap-2">
            {aspectOptions.map(option => (
              <button
                key={option.value}
                onClick={() => onAspectRatioChange(option.value)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                  aspectRatio === option.value
                    ? 'bg-purple-50 ring-2 ring-purple-400 ring-offset-1'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div
                  className={`rounded-sm transition-colors ${
                    aspectRatio === option.value
                      ? 'bg-purple-500'
                      : 'bg-gray-300'
                  }`}
                  style={{ width: option.width, height: option.height }}
                />
                <span className={`text-xs font-semibold ${
                  aspectRatio === option.value ? 'text-purple-700' : 'text-gray-700'
                }`}>
                  {option.label}
                </span>
                <span className={`text-[10px] ${
                  aspectRatio === option.value ? 'text-purple-500' : 'text-gray-400'
                }`}>
                  {option.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lighting Control */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Lighting</Label>
          <div className="flex items-center gap-3">
            <Lightbulb className={`w-4 h-4 flex-shrink-0 ${lighting > 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={0}
                max={100}
                value={lighting}
                onChange={(e) => onChange('lighting', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Dim</span>
                <span className="font-semibold text-gray-700">{lighting}%</span>
                <span>Bright</span>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Mode CTA */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Switch to <strong className="text-purple-600">Advanced</strong> for more</span>
          </div>
        </div>
      </div>
    </div>
  )
}
