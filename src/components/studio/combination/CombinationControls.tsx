import { MoveVertical, ZoomIn, Layers, Sun, RotateCcw, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
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
    <div className="bg-white flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* AI Model Selection */}
        <AIModelSelector
          value={settings.ai_model}
          onChange={(modelId) => onChange('ai_model', modelId as any)}
          mode="combination"
        />

        {/* Position Control */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Position</Label>
          <div className="flex items-center gap-3">
            <MoveVertical className={`w-4 h-4 flex-shrink-0 ${settings.position_y !== 50 ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.position_y}
                onChange={(e) => onChange('position_y', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Higher</span>
                <span className="font-semibold text-gray-700">{settings.position_y}%</span>
                <span>Lower</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scale Control */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Scale</Label>
          <div className="flex items-center gap-3">
            <ZoomIn className={`w-4 h-4 flex-shrink-0 ${settings.scale !== 100 ? 'text-green-500' : 'text-gray-400'}`} />
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={50}
                max={150}
                value={settings.scale}
                onChange={(e) => onChange('scale', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>50%</span>
                <span className="font-semibold text-gray-700">{settings.scale}%</span>
                <span>150%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Blend Intensity Control */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Blend</Label>
          <div className="flex items-center gap-3">
            <Layers className={`w-4 h-4 flex-shrink-0 ${settings.blend_intensity > 50 ? 'text-purple-500' : 'text-gray-400'}`} />
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.blend_intensity}
                onChange={(e) => onChange('blend_intensity', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Subtle</span>
                <span className="font-semibold text-gray-700">{settings.blend_intensity}%</span>
                <span>Strong</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lighting Match Control */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Lighting</Label>
          <div className="flex items-center gap-3">
            <Sun className={`w-4 h-4 flex-shrink-0 ${settings.lighting_match > 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.lighting_match}
                onChange={(e) => onChange('lighting_match', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Natural</span>
                <span className="font-semibold text-gray-700">{settings.lighting_match}%</span>
                <span>Match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rotation Control */}
        <div>
          <Label className="text-xs text-gray-500 font-medium mb-2 block">Angle</Label>
          <div className="flex items-center gap-3">
            <RotateCcw className={`w-4 h-4 flex-shrink-0 ${settings.rotation !== 0 ? 'text-orange-500' : 'text-gray-400'}`} />
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={-45}
                max={45}
                value={settings.rotation}
                onChange={(e) => onChange('rotation', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>-45°</span>
                <span className="font-semibold text-gray-700">{settings.rotation}°</span>
                <span>+45°</span>
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

export default CombinationControls
