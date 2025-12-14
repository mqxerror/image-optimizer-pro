import { MoveVertical, ZoomIn, Layers, Sun, RotateCcw } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { STUDIO_SPACING } from '@/constants/spacing'
import type { CombinationQuickSettings } from '@/types/combination'
import { AIModelSelector } from '../AIModelSelector'

interface CombinationControlsProps {
  settings: CombinationQuickSettings
  onChange: <K extends keyof CombinationQuickSettings>(
    key: K,
    value: CombinationQuickSettings[K]
  ) => void
}

export function CombinationControls({
  settings,
  onChange
}: CombinationControlsProps) {
  return (
    <div className={`${STUDIO_SPACING.quickPanel} bg-white border-l border-gray-200 ${STUDIO_SPACING.panel} ${STUDIO_SPACING.section} overflow-y-auto max-h-[calc(100vh-120px)]`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Combination Settings</h3>
        <p className="text-xs text-gray-500 mb-6">
          Adjust how the jewelry is placed on the model.
          Switch to Advanced for fine-tuning.
        </p>
      </div>

      {/* Position Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-100">
            <MoveVertical className="h-4 w-4 text-blue-600" />
          </div>
          <Label className="text-sm font-medium">Position</Label>
        </div>
        <Slider
          value={[settings.position_y]}
          onValueChange={([value]) => onChange('position_y', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          aria-label="Vertical position"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Higher</span>
          <span className="font-medium text-gray-700">{settings.position_y}%</span>
          <span>Lower</span>
        </div>
      </div>

      {/* Scale Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-green-100">
            <ZoomIn className="h-4 w-4 text-green-600" />
          </div>
          <Label className="text-sm font-medium">Scale</Label>
        </div>
        <Slider
          value={[settings.scale]}
          onValueChange={([value]) => onChange('scale', value)}
          min={50}
          max={150}
          step={1}
          className="w-full"
          aria-label="Jewelry scale"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50%</span>
          <span className="font-medium text-gray-700">{settings.scale}%</span>
          <span>150%</span>
        </div>
      </div>

      {/* Blend Intensity Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-100">
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <Label className="text-sm font-medium">Blend</Label>
        </div>
        <Slider
          value={[settings.blend_intensity]}
          onValueChange={([value]) => onChange('blend_intensity', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          aria-label="Blend intensity"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subtle</span>
          <span className="font-medium text-gray-700">{settings.blend_intensity}%</span>
          <span>Strong</span>
        </div>
      </div>

      {/* Lighting Match Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-yellow-100">
            <Sun className="h-4 w-4 text-yellow-600" />
          </div>
          <Label className="text-sm font-medium">Lighting Match</Label>
        </div>
        <Slider
          value={[settings.lighting_match]}
          onValueChange={([value]) => onChange('lighting_match', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          aria-label="Lighting match"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Natural</span>
          <span className="font-medium text-gray-700">{settings.lighting_match}%</span>
          <span>Match</span>
        </div>
      </div>

      {/* Rotation Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-orange-100">
            <RotateCcw className="h-4 w-4 text-orange-600" />
          </div>
          <Label className="text-sm font-medium">Angle</Label>
        </div>
        <Slider
          value={[settings.rotation]}
          onValueChange={([value]) => onChange('rotation', value)}
          min={-45}
          max={45}
          step={1}
          className="w-full"
          aria-label="Rotation angle"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>-45°</span>
          <span className="font-medium text-gray-700">{settings.rotation}°</span>
          <span>+45°</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* AI Model Selector - Using shared component */}
      <AIModelSelector
        value={settings.ai_model}
        onChange={(modelId) => onChange('ai_model', modelId as any)}
        mode="combination"
      />

      {/* Advanced Mode CTA */}
      <div className="pt-4 border-t">
        <p className="text-xs text-gray-600 mb-3">
          Need more control? Switch to Advanced Mode for placement presets, shadow settings, and realism options.
        </p>
      </div>
    </div>
  )
}

export default CombinationControls
