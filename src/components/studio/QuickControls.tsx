import { Lightbulb, Contrast as ContrastIcon, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface QuickControlsProps {
  lighting: number
  contrast: number
  sharpness: number
  onChange: (key: string, value: number) => void
}

export function QuickControls({
  lighting,
  contrast,
  sharpness,
  onChange
}: QuickControlsProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Adjustments</h3>
        <p className="text-xs text-gray-500 mb-6">
          Fine-tune your image with these essential controls.
          Switch to Advanced Mode for full control.
        </p>
      </div>

      {/* Lighting Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
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
          <ContrastIcon className="h-4 w-4 text-purple-600" />
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
          <Sparkles className="h-4 w-4 text-blue-600" />
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
