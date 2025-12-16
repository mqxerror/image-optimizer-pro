import { Lightbulb, Contrast as ContrastIcon, Sparkles, RatioIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { STUDIO_SPACING } from '@/constants/spacing'
import { AIModelSelector } from './AIModelSelector'
import type { AspectRatio } from '@/types/studio'

interface QuickControlsProps {
  lighting: number
  contrast: number
  sharpness: number
  aiModel: string
  aspectRatio: AspectRatio
  onChange: (key: string, value: number) => void
  onModelChange: (model: string) => void
  onAspectRatioChange: (ratio: AspectRatio) => void
}

const aspectOptions: { value: AspectRatio; label: string; width: number; height: number; desc: string }[] = [
  { value: '1:1', label: '1:1', width: 24, height: 24, desc: 'Square' },
  { value: '4:5', label: '4:5', width: 20, height: 25, desc: 'Instagram' },
  { value: '3:4', label: '3:4', width: 18, height: 24, desc: 'Portrait' },
  { value: '16:9', label: '16:9', width: 32, height: 18, desc: 'Wide' },
  { value: '9:16', label: '9:16', width: 14, height: 25, desc: 'Story' },
  { value: '4:3', label: '4:3', width: 28, height: 21, desc: 'Landscape' },
]

export function QuickControls({
  lighting,
  contrast,
  sharpness,
  aiModel,
  aspectRatio,
  onChange,
  onModelChange,
  onAspectRatioChange
}: QuickControlsProps) {
  return (
    <div className={`${STUDIO_SPACING.quickPanel} bg-white border-l border-gray-200 ${STUDIO_SPACING.panel} ${STUDIO_SPACING.section} overflow-y-auto max-h-[calc(100vh-120px)]`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Adjustments</h3>
        <p className="text-xs text-gray-500 mb-6">
          Fine-tune your image with these essential controls.
          Switch to Advanced Mode for full control.
        </p>
      </div>

      {/* AI Model Selection - Using shared component */}
      <AIModelSelector
        value={aiModel}
        onChange={onModelChange}
        mode="single"
      />

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Aspect Ratio - Prominent placement */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-100">
            <RatioIcon className="h-4 w-4 text-purple-600" />
          </div>
          <Label className="text-sm font-medium">Output Size</Label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {aspectOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onAspectRatioChange(option.value)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                aspectRatio === option.value
                  ? 'bg-purple-50 ring-2 ring-purple-500 ring-offset-1'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div
                className={`rounded-sm transition-colors ${
                  aspectRatio === option.value
                    ? 'bg-purple-500'
                    : 'bg-gray-300'
                }`}
                style={{
                  width: option.width * 0.8,
                  height: option.height * 0.8
                }}
              />
              <div className="text-center">
                <span className={`text-xs font-semibold block ${
                  aspectRatio === option.value ? 'text-purple-700' : 'text-gray-700'
                }`}>
                  {option.label}
                </span>
                <span className={`text-[10px] ${
                  aspectRatio === option.value ? 'text-purple-500' : 'text-gray-400'
                }`}>
                  {option.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Lighting Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-yellow-100">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
          </div>
          <Label className="text-sm font-medium">Lighting Intensity</Label>
        </div>
        <Slider
          value={[lighting]}
          onValueChange={([value]) => onChange('lighting', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          aria-label="Lighting intensity"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={lighting}
          aria-valuetext={`${lighting} percent`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Dim</span>
          <span className="font-medium text-gray-700">{lighting}%</span>
          <span>Bright</span>
        </div>
      </div>

      {/* Contrast Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-100">
            <ContrastIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <Label className="text-sm font-medium">Contrast</Label>
        </div>
        <Slider
          value={[contrast]}
          onValueChange={([value]) => onChange('contrast', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          aria-label="Contrast"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={contrast}
          aria-valuetext={`${contrast} percent`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Soft</span>
          <span className="font-medium text-gray-700">{contrast}%</span>
          <span>High</span>
        </div>
      </div>

      {/* Sharpness Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-100">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <Label className="text-sm font-medium">Sharpness</Label>
        </div>
        <Slider
          value={[sharpness]}
          onValueChange={([value]) => onChange('sharpness', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          aria-label="Sharpness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sharpness}
          aria-valuetext={`${sharpness} percent`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Smooth</span>
          <span className="font-medium text-gray-700">{sharpness}%</span>
          <span>Sharp</span>
        </div>
      </div>

      {/* Advanced Mode CTA */}
      <div className="pt-4 border-t">
        <p className="text-xs text-gray-600 mb-3">
          Need more control? Switch to Advanced Mode for camera, background, and composition settings.
        </p>
      </div>
    </div>
  )
}
