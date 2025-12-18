import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  Image,
  CloudFog,
  Sparkles,
  Crop,
  ShieldCheck,
  Code2
} from 'lucide-react'
import { BriefBuilderProvider, useBriefBuilder } from './BriefBuilderContext'
import { BriefStarterDropdown } from './BriefStarterDropdown'
import { RawPromptPanel } from './RawPromptPanel'
import {
  BackgroundSection,
  ShadowSection,
  RetouchSection,
  FramingSection,
  ComplianceSection,
} from './sections'
import type { Project } from '@/types/database'
import { cn } from '@/lib/utils'

// Section configuration with icons and colors
const BRIEF_SECTIONS = [
  { id: 'background', label: 'Background', icon: Image, color: 'green', preview: (brief: any) => brief.background },
  { id: 'shadow', label: 'Shadow', icon: CloudFog, color: 'slate', preview: (brief: any) => brief.shadow },
  { id: 'retouch', label: 'Retouch', icon: Sparkles, color: 'pink', preview: (brief: any) => brief.retouch?.dustRemoval ? 'On' : 'Custom' },
  { id: 'framing', label: 'Framing', icon: Crop, color: 'blue', preview: (brief: any) => brief.framing?.position },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck, color: 'emerald', preview: (brief: any) => brief.compliance?.gmcSafe ? 'GMC Safe' : 'Custom' },
] as const

const colorMap: Record<string, { bg: string; text: string; activeBg: string }> = {
  green: { bg: 'bg-green-50', text: 'text-green-500', activeBg: 'bg-green-100' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-500', activeBg: 'bg-slate-200' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-500', activeBg: 'bg-pink-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', activeBg: 'bg-blue-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', activeBg: 'bg-emerald-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500', activeBg: 'bg-purple-100' },
}

interface BriefBuilderProps {
  project: Project
  className?: string
}

/**
 * Main Brief Builder component (legacy - use BriefBuilderInline instead)
 * Wraps content in provider and renders the structured creative brief UI
 */
export function BriefBuilder({ project, className }: BriefBuilderProps) {
  return (
    <BriefBuilderProvider project={project}>
      <div className={cn("space-y-1.5", className)}>
        <BriefBuilderInlineContent />
      </div>
    </BriefBuilderProvider>
  )
}

/**
 * Inner content component that uses the context - inline version (no scroll)
 */
function BriefBuilderInlineContent() {
  const { state, toggleAdvanced, isDirty } = useBriefBuilder()
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    background: true,
    shadow: false,
    retouch: false,
    framing: false,
    compliance: false,
    advanced: false,
  })

  const toggleSection = (section: string) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Map section IDs to components
  const sectionComponents: Record<string, React.ReactNode> = {
    background: <BackgroundSection />,
    shadow: <ShadowSection />,
    retouch: <RetouchSection />,
    framing: <FramingSection />,
    compliance: <ComplianceSection />,
  }

  return (
    <>
      {/* Brief Starter Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-2.5 py-2 flex items-center justify-between">
          <BriefStarterDropdown className="max-w-[140px]" />
          <div className="flex items-center gap-1.5">
            {state.isSaving ? (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving</span>
              </div>
            ) : isDirty ? (
              <div className="flex items-center gap-1 text-[10px] text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Unsaved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-green-600">
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brief Sections - Studio style cards */}
      {BRIEF_SECTIONS.map((section) => {
        const Icon = section.icon
        const colors = colorMap[section.color]
        const isOpen = sectionsOpen[section.id]
        const previewValue = section.preview(state.brief)

        return (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", colors.bg)}>
                  <Icon className={cn("w-3 h-3", colors.text)} />
                </div>
                <span className="text-xs font-medium text-slate-700">{section.label}</span>
                {!isOpen && previewValue && (
                  <span className="text-[10px] text-slate-400 truncate ml-1">{previewValue}</span>
                )}
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                isOpen ? colors.activeBg : "bg-slate-100"
              )}>
                {isOpen ? (
                  <ChevronDown className={cn("w-3 h-3", colors.text)} />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-2.5 pb-2.5 pt-2">
                {sectionComponents[section.id]}
              </div>
            )}
          </div>
        )
      })}

      {/* Advanced: Raw Prompt - separate styling */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => {
            toggleSection('advanced')
            toggleAdvanced()
          }}
          className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", colorMap.purple.bg)}>
              <Code2 className={cn("w-3 h-3", colorMap.purple.text)} />
            </div>
            <span className="text-xs font-medium text-slate-500">Raw Prompt</span>
            {state.syncStatus === 'manual-override' && (
              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            state.isAdvancedOpen ? colorMap.purple.activeBg : "bg-slate-100"
          )}>
            {state.isAdvancedOpen ? (
              <ChevronDown className={cn("w-3 h-3", colorMap.purple.text)} />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </div>
        </button>

        {state.isAdvancedOpen && (
          <div className="border-t border-slate-100 px-2.5 pb-2.5 pt-2">
            <RawPromptPanel />
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Inline Brief Builder - for use within parent ScrollArea
 */
export function BriefBuilderInline({ project }: { project: Project }) {
  return (
    <BriefBuilderProvider project={project}>
      <BriefBuilderInlineContent />
    </BriefBuilderProvider>
  )
}

