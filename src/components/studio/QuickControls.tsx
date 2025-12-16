import { useState } from 'react'
import { Lightbulb, Sparkles, ChevronDown, ChevronRight, Sliders, Layout } from 'lucide-react'
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
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    output: false,
    lighting: false,
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
                  value={aiModel}
                  onChange={onModelChange}
                  mode="single"
                  compact
                />
              </div>
            </div>
          )}
        </div>

        {/* Output Size Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('output')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Layout className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Output Size</span>
              <span className="text-xs text-slate-400 ml-1">{aspectRatio}</span>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              expandedSections.output ? 'bg-purple-100' : 'bg-slate-100'
            }`}>
              {expandedSections.output ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.output && (
            <div className="px-3 pb-3 border-t border-slate-100">
              <div className="pt-3 grid grid-cols-3 gap-1.5">
                {aspectOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onAspectRatioChange(option.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all ${
                      aspectRatio === option.value
                        ? 'bg-purple-50 ring-1 ring-purple-400'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`rounded-sm transition-colors ${
                        aspectRatio === option.value
                          ? 'bg-purple-500'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: option.width * 0.8, height: option.height * 0.8 }}
                    />
                    <span className={`text-[11px] font-semibold ${
                      aspectRatio === option.value ? 'text-purple-700' : 'text-slate-600'
                    }`}>
                      {option.label}
                    </span>
                    <span className={`text-[9px] ${
                      aspectRatio === option.value ? 'text-purple-400' : 'text-slate-400'
                    }`}>
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lighting Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('lighting')}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Lighting</span>
              <span className="text-xs text-slate-400 ml-1">{lighting}%</span>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              expandedSections.lighting ? 'bg-amber-100' : 'bg-slate-100'
            }`}>
              {expandedSections.lighting ? (
                <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {expandedSections.lighting && (
            <div className="px-3 pb-3 border-t border-slate-100">
              <div className="pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={lighting}
                      onChange={(e) => onChange('lighting', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Dim</span>
                      <span className="font-medium text-slate-700">{lighting}%</span>
                      <span>Bright</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Mode Hint */}
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
          <Sliders className="w-3.5 h-3.5" />
          <span>Switch to <strong className="text-purple-500">Advanced</strong> for more controls</span>
        </div>
      </div>
    </div>
  )
}
