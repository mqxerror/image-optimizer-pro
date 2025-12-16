import { useState } from 'react'
import { MoveVertical, ZoomIn, Layers, Sun, RotateCcw, Sparkles, ChevronDown, ChevronRight, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CombinationQuickSettings } from '@/types/combination'
import { AIModelSelector } from '../AIModelSelector'

interface CombinationControlsProps {
  settings: CombinationQuickSettings
  onChange: <K extends keyof CombinationQuickSettings>(
    key: K,
    value: CombinationQuickSettings[K]
  ) => void
  darkTheme?: boolean
}

// Reusable slider component with dark theme support
function SliderControl({
  icon: Icon,
  iconColor,
  label,
  value,
  min,
  max,
  minLabel,
  maxLabel,
  formatValue,
  onChange,
  accentColor,
  darkTheme = false,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: number
  min: number
  max: number
  minLabel: string
  maxLabel: string
  formatValue?: (v: number) => string
  onChange: (v: number) => void
  accentColor: string
  darkTheme?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        darkTheme ? `${iconColor.replace('text-', 'bg-').replace('-500', '-500/20')}` : `${iconColor.replace('text-', 'bg-').replace('-500', '-50')}`
      )}>
        <Icon className={cn("w-4 h-4", iconColor.replace('-500', '-400'))} />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-medium", darkTheme ? 'text-slate-300' : 'text-slate-600')}>{label}</span>
          <span className={cn("text-xs font-semibold", darkTheme ? 'text-slate-200' : 'text-slate-700')}>
            {formatValue ? formatValue(value) : `${value}%`}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
            darkTheme ? 'bg-slate-700' : 'bg-slate-200',
            accentColor
          )}
        />
        <div className={cn("flex justify-between text-[9px]", darkTheme ? 'text-slate-500' : 'text-slate-400')}>
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function CombinationControls({
  settings,
  onChange,
  darkTheme = false
}: CombinationControlsProps) {
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    placement: false,
    blending: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Theme-aware classes
  const bg = darkTheme ? 'bg-slate-900' : 'bg-slate-50/50'
  const cardBg = darkTheme ? 'bg-slate-800/80' : 'bg-white'
  const cardBorder = darkTheme ? 'border-slate-700/50' : 'border-slate-200'
  const cardHover = darkTheme ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/50'
  const textPrimary = darkTheme ? 'text-slate-200' : 'text-slate-700'
  const textSecondary = darkTheme ? 'text-slate-400' : 'text-slate-400'
  const textMuted = darkTheme ? 'text-slate-500' : 'text-slate-500'
  const dividerBorder = darkTheme ? 'border-slate-700/50' : 'border-slate-100'
  const chipBg = darkTheme ? 'bg-slate-700' : 'bg-slate-100'

  return (
    <div className={cn("flex flex-col h-full", bg)}>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* AI Model Section */}
        <div className={cn("rounded-xl border overflow-hidden", cardBg, cardBorder)}>
          <button
            onClick={() => toggleSection('model')}
            className={cn("w-full flex items-center justify-between px-3 py-2.5 transition-colors", cardHover)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", darkTheme ? 'bg-indigo-500/20' : 'bg-indigo-50')}>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className={cn("text-sm font-medium", textPrimary)}>AI Model</span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.model
                ? (darkTheme ? 'bg-indigo-500/20' : 'bg-indigo-100')
                : chipBg
            )}>
              {expandedSections.model ? (
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <ChevronRight className={cn("w-3.5 h-3.5", textSecondary)} />
              )}
            </div>
          </button>

          {expandedSections.model && (
            <div className={cn("px-3 pb-3 border-t", dividerBorder)}>
              <div className="pt-3">
                <AIModelSelector
                  value={settings.ai_model}
                  onChange={(modelId) => onChange('ai_model', modelId as any)}
                  mode="combination"
                  compact
                  darkTheme={darkTheme}
                />
              </div>
            </div>
          )}
        </div>

        {/* Placement Section */}
        <div className={cn("rounded-xl border overflow-hidden", cardBg, cardBorder)}>
          <button
            onClick={() => toggleSection('placement')}
            className={cn("w-full flex items-center justify-between px-3 py-2.5 transition-colors", cardHover)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", darkTheme ? 'bg-blue-500/20' : 'bg-blue-50')}>
                <MoveVertical className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className={cn("text-sm font-medium", textPrimary)}>Placement</span>
              <span className={cn("text-xs ml-1", textSecondary)}>
                {settings.scale}% · {settings.rotation}°
              </span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.placement
                ? (darkTheme ? 'bg-blue-500/20' : 'bg-blue-100')
                : chipBg
            )}>
              {expandedSections.placement ? (
                <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <ChevronRight className={cn("w-3.5 h-3.5", textSecondary)} />
              )}
            </div>
          </button>

          {expandedSections.placement && (
            <div className={cn("px-3 pb-3 border-t space-y-4 pt-3", dividerBorder)}>
              <SliderControl
                icon={MoveVertical}
                iconColor="text-blue-500"
                label="Position"
                value={settings.position_y}
                min={0}
                max={100}
                minLabel="Higher"
                maxLabel="Lower"
                onChange={(v) => onChange('position_y', v)}
                accentColor="accent-blue-500"
                darkTheme={darkTheme}
              />
              <SliderControl
                icon={ZoomIn}
                iconColor="text-green-500"
                label="Scale"
                value={settings.scale}
                min={50}
                max={150}
                minLabel="50%"
                maxLabel="150%"
                onChange={(v) => onChange('scale', v)}
                accentColor="accent-green-500"
                darkTheme={darkTheme}
              />
              <SliderControl
                icon={RotateCcw}
                iconColor="text-orange-500"
                label="Angle"
                value={settings.rotation}
                min={-45}
                max={45}
                minLabel="-45°"
                maxLabel="+45°"
                formatValue={(v) => `${v}°`}
                onChange={(v) => onChange('rotation', v)}
                accentColor="accent-orange-500"
                darkTheme={darkTheme}
              />
            </div>
          )}
        </div>

        {/* Blending Section */}
        <div className={cn("rounded-xl border overflow-hidden", cardBg, cardBorder)}>
          <button
            onClick={() => toggleSection('blending')}
            className={cn("w-full flex items-center justify-between px-3 py-2.5 transition-colors", cardHover)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", darkTheme ? 'bg-purple-500/20' : 'bg-purple-50')}>
                <Layers className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className={cn("text-sm font-medium", textPrimary)}>Blending</span>
              <span className={cn("text-xs ml-1", textSecondary)}>
                {settings.blend_intensity}%
              </span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.blending
                ? (darkTheme ? 'bg-purple-500/20' : 'bg-purple-100')
                : chipBg
            )}>
              {expandedSections.blending ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <ChevronRight className={cn("w-3.5 h-3.5", textSecondary)} />
              )}
            </div>
          </button>

          {expandedSections.blending && (
            <div className={cn("px-3 pb-3 border-t space-y-4 pt-3", dividerBorder)}>
              <SliderControl
                icon={Layers}
                iconColor="text-purple-500"
                label="Blend"
                value={settings.blend_intensity}
                min={0}
                max={100}
                minLabel="Subtle"
                maxLabel="Strong"
                onChange={(v) => onChange('blend_intensity', v)}
                accentColor="accent-purple-500"
                darkTheme={darkTheme}
              />
              <SliderControl
                icon={Sun}
                iconColor="text-amber-500"
                label="Lighting"
                value={settings.lighting_match}
                min={0}
                max={100}
                minLabel="Natural"
                maxLabel="Match"
                onChange={(v) => onChange('lighting_match', v)}
                accentColor="accent-amber-500"
                darkTheme={darkTheme}
              />
            </div>
          )}
        </div>

        {/* Advanced Mode Hint */}
        <div className={cn("flex items-center justify-center gap-2 py-3 text-xs", textMuted)}>
          <Settings2 className="w-3.5 h-3.5" />
          <span>Switch to <strong className="text-purple-400">Advanced</strong> for fine-tuning</span>
        </div>
      </div>
    </div>
  )
}

export default CombinationControls
