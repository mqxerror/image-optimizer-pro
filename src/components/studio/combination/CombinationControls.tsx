import { useState } from 'react'
import { MoveVertical, ZoomIn, Layers, Sun, RotateCcw, Sparkles, ChevronDown, ChevronRight, Sliders, Settings2 } from 'lucide-react'
import type { CombinationQuickSettings } from '@/types/combination'
import { AIModelSelector } from '../AIModelSelector'

interface CombinationControlsProps {
  settings: CombinationQuickSettings
  onChange: <K extends keyof CombinationQuickSettings>(
    key: K,
    value: CombinationQuickSettings[K]
  ) => void
}

// Reusable slider component for iPhone-style
function SliderControl({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  min,
  max,
  minLabel,
  maxLabel,
  formatValue,
  onChange,
  accentColor,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  label: string
  value: number
  min: number
  max: number
  minLabel: string
  maxLabel: string
  formatValue?: (v: number) => string
  onChange: (v: number) => void
  accentColor: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">{label}</span>
          <span className="text-xs font-semibold text-slate-700">
            {formatValue ? formatValue(value) : `${value}%`}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${accentColor}`}
        />
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function CombinationControls({
  settings,
  onChange
}: CombinationControlsProps) {
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    placement: false,
    blending: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* AI Model Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('model')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">AI Model</span>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              expandedSections.model ? 'bg-indigo-100' : 'bg-slate-100'
            }`}>
              {expandedSections.model ? (
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.model && (
            <div className="px-3 pb-3 border-t border-slate-100">
              <div className="pt-3">
                <AIModelSelector
                  value={settings.ai_model}
                  onChange={(modelId) => onChange('ai_model', modelId as any)}
                  mode="combination"
                  compact
                />
              </div>
            </div>
          )}
        </div>

        {/* Placement Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('placement')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <MoveVertical className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Placement</span>
              <span className="text-xs text-slate-400 ml-1">
                {settings.scale}% · {settings.rotation}°
              </span>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              expandedSections.placement ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              {expandedSections.placement ? (
                <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.placement && (
            <div className="px-3 pb-3 border-t border-slate-100 space-y-4 pt-3">
              <SliderControl
                icon={MoveVertical}
                iconColor="text-blue-500"
                iconBg="bg-blue-50"
                label="Position"
                value={settings.position_y}
                min={0}
                max={100}
                minLabel="Higher"
                maxLabel="Lower"
                onChange={(v) => onChange('position_y', v)}
                accentColor="accent-blue-500"
              />
              <SliderControl
                icon={ZoomIn}
                iconColor="text-green-500"
                iconBg="bg-green-50"
                label="Scale"
                value={settings.scale}
                min={50}
                max={150}
                minLabel="50%"
                maxLabel="150%"
                onChange={(v) => onChange('scale', v)}
                accentColor="accent-green-500"
              />
              <SliderControl
                icon={RotateCcw}
                iconColor="text-orange-500"
                iconBg="bg-orange-50"
                label="Angle"
                value={settings.rotation}
                min={-45}
                max={45}
                minLabel="-45°"
                maxLabel="+45°"
                formatValue={(v) => `${v}°`}
                onChange={(v) => onChange('rotation', v)}
                accentColor="accent-orange-500"
              />
            </div>
          )}
        </div>

        {/* Blending Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('blending')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Blending</span>
              <span className="text-xs text-slate-400 ml-1">
                {settings.blend_intensity}%
              </span>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              expandedSections.blending ? 'bg-purple-100' : 'bg-slate-100'
            }`}>
              {expandedSections.blending ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.blending && (
            <div className="px-3 pb-3 border-t border-slate-100 space-y-4 pt-3">
              <SliderControl
                icon={Layers}
                iconColor="text-purple-500"
                iconBg="bg-purple-50"
                label="Blend"
                value={settings.blend_intensity}
                min={0}
                max={100}
                minLabel="Subtle"
                maxLabel="Strong"
                onChange={(v) => onChange('blend_intensity', v)}
                accentColor="accent-purple-500"
              />
              <SliderControl
                icon={Sun}
                iconColor="text-amber-500"
                iconBg="bg-amber-50"
                label="Lighting"
                value={settings.lighting_match}
                min={0}
                max={100}
                minLabel="Natural"
                maxLabel="Match"
                onChange={(v) => onChange('lighting_match', v)}
                accentColor="accent-amber-500"
              />
            </div>
          )}
        </div>

        {/* Advanced Mode Hint */}
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
          <Settings2 className="w-3.5 h-3.5" />
          <span>Switch to <strong className="text-purple-500">Advanced</strong> for fine-tuning</span>
        </div>
      </div>
    </div>
  )
}

export default CombinationControls
