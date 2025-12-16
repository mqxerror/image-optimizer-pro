import { useState } from 'react'
import { Lightbulb, Sparkles, ChevronDown, ChevronRight, Sliders, Layout } from 'lucide-react'
import { AIModelSelector } from './AIModelSelector'
import { cn } from '@/lib/utils'
import type { AspectRatio } from '@/types/studio'

interface QuickControlsProps {
  lighting: number
  aiModel: string
  aspectRatio: AspectRatio
  onChange: (key: string, value: number) => void
  onModelChange: (model: string) => void
  onAspectRatioChange: (ratio: AspectRatio) => void
  darkTheme?: boolean
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
  onAspectRatioChange,
  darkTheme = false
}: QuickControlsProps) {
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    output: false,
    lighting: false,
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
                  value={aiModel}
                  onChange={onModelChange}
                  mode="single"
                  compact
                  darkTheme={darkTheme}
                />
              </div>
            </div>
          )}
        </div>

        {/* Output Size Section */}
        <div className={cn("rounded-xl border overflow-hidden", cardBg, cardBorder)}>
          <button
            onClick={() => toggleSection('output')}
            className={cn("w-full flex items-center justify-between px-3 py-2.5 transition-colors", cardHover)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", darkTheme ? 'bg-purple-500/20' : 'bg-purple-50')}>
                <Layout className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className={cn("text-sm font-medium", textPrimary)}>Output Size</span>
              <span className={cn("text-xs ml-1", textSecondary)}>{aspectRatio}</span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.output
                ? (darkTheme ? 'bg-purple-500/20' : 'bg-purple-100')
                : chipBg
            )}>
              {expandedSections.output ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <ChevronRight className={cn("w-3.5 h-3.5", textSecondary)} />
              )}
            </div>
          </button>

          {expandedSections.output && (
            <div className={cn("px-3 pb-3 border-t", dividerBorder)}>
              <div className="pt-3 grid grid-cols-3 gap-1.5">
                {aspectOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onAspectRatioChange(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all",
                      aspectRatio === option.value
                        ? (darkTheme ? 'bg-purple-500/20 ring-1 ring-purple-400' : 'bg-purple-50 ring-1 ring-purple-400')
                        : (darkTheme ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100')
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-sm transition-colors",
                        aspectRatio === option.value
                          ? 'bg-purple-400'
                          : (darkTheme ? 'bg-slate-500' : 'bg-slate-300')
                      )}
                      style={{ width: option.width * 0.8, height: option.height * 0.8 }}
                    />
                    <span className={cn(
                      "text-[11px] font-semibold",
                      aspectRatio === option.value
                        ? 'text-purple-400'
                        : (darkTheme ? 'text-slate-300' : 'text-slate-600')
                    )}>
                      {option.label}
                    </span>
                    <span className={cn(
                      "text-[9px]",
                      aspectRatio === option.value
                        ? 'text-purple-300'
                        : textMuted
                    )}>
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lighting Section */}
        <div className={cn("rounded-xl border overflow-hidden", cardBg, cardBorder)}>
          <button
            onClick={() => toggleSection('lighting')}
            className={cn("w-full flex items-center justify-between px-3 py-2.5 transition-colors", cardHover)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", darkTheme ? 'bg-amber-500/20' : 'bg-amber-50')}>
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className={cn("text-sm font-medium", textPrimary)}>Lighting</span>
              <span className={cn("text-xs ml-1", textSecondary)}>{lighting}%</span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              expandedSections.lighting
                ? (darkTheme ? 'bg-amber-500/20' : 'bg-amber-100')
                : chipBg
            )}>
              {expandedSections.lighting ? (
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <ChevronRight className={cn("w-3.5 h-3.5", textSecondary)} />
              )}
            </div>
          </button>

          {expandedSections.lighting && (
            <div className={cn("px-3 pb-3 border-t", dividerBorder)}>
              <div className="pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={lighting}
                      onChange={(e) => onChange('lighting', Number(e.target.value))}
                      className={cn(
                        "w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500",
                        darkTheme ? 'bg-slate-700' : 'bg-slate-200'
                      )}
                    />
                    <div className={cn("flex justify-between text-[10px]", textMuted)}>
                      <span>Dim</span>
                      <span className={cn("font-medium", textPrimary)}>{lighting}%</span>
                      <span>Bright</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Mode Hint */}
        <div className={cn("flex items-center justify-center gap-2 py-3 text-xs", textMuted)}>
          <Sliders className="w-3.5 h-3.5" />
          <span>Switch to <strong className="text-purple-400">Advanced</strong> for more controls</span>
        </div>
      </div>
    </div>
  )
}
