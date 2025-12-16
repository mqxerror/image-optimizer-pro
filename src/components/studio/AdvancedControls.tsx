import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdvancedPanelSection } from './AdvancedPanelSection'
import { CameraControls } from './CameraControls'
import { LightingMixer } from './LightingMixer'
import { BackgroundSelector } from './BackgroundSelector'
import { JewelryEnhancements } from './JewelryEnhancements'
import { CompositionControls } from './CompositionControls'
import type { StudioSettings } from '@/types/studio'

interface AdvancedControlsProps {
  settings: StudioSettings
  onSettingsChange: (settings: StudioSettings) => void
  expandedSections: Record<string, boolean>
  onToggleSection: (section: string) => void
  /** If true, uses dark theme styling (for overlay panel) */
  darkTheme?: boolean
}

interface SectionConfig {
  id: string
  title: string
  icon: string
  iconBg: string
  defaultExpanded: boolean
  component: React.ReactNode
}

export function AdvancedControls({
  settings,
  onSettingsChange,
  expandedSections,
  onToggleSection,
  darkTheme = false
}: AdvancedControlsProps) {
  const sectionOrder = ['camera', 'lighting', 'background', 'jewelry', 'composition']

  const allExpanded = Object.values(expandedSections).every(val => val)

  const sectionsConfig: Record<string, SectionConfig> = {
    camera: {
      id: 'camera',
      title: 'Camera Settings',
      icon: '📷',
      iconBg: 'bg-blue-100',
      defaultExpanded: false,
      component: (
        <CameraControls
          settings={settings.camera}
          onChange={(camera) => onSettingsChange({ ...settings, camera })}
        />
      )
    },
    lighting: {
      id: 'lighting',
      title: 'Lighting',
      icon: '💡',
      iconBg: 'bg-yellow-100',
      defaultExpanded: false,
      component: (
        <LightingMixer
          settings={settings.lighting}
          onChange={(lighting) => onSettingsChange({ ...settings, lighting })}
        />
      )
    },
    background: {
      id: 'background',
      title: 'Background',
      icon: '🖼️',
      iconBg: 'bg-green-100',
      defaultExpanded: false,
      component: (
        <BackgroundSelector
          settings={settings.background}
          onChange={(background) => onSettingsChange({ ...settings, background })}
        />
      )
    },
    jewelry: {
      id: 'jewelry',
      title: 'Jewelry Enhancements',
      icon: '💎',
      iconBg: 'bg-pink-100',
      defaultExpanded: false,
      component: (
        <JewelryEnhancements
          settings={settings.jewelry}
          onChange={(jewelry) => onSettingsChange({ ...settings, jewelry })}
        />
      )
    },
    composition: {
      id: 'composition',
      title: 'Composition',
      icon: '📐',
      iconBg: 'bg-purple-100',
      defaultExpanded: false,
      component: (
        <CompositionControls
          settings={settings.composition}
          onChange={(composition) => onSettingsChange({ ...settings, composition })}
        />
      )
    }
  }

  const toggleAllSections = () => {
    const newState = !allExpanded
    Object.keys(expandedSections).forEach(section => {
      if (expandedSections[section] !== newState) {
        onToggleSection(section)
      }
    })
  }

  return (
    <div className={darkTheme ? 'bg-slate-900' : 'bg-white'}>
      {/* Compact Header with expand/collapse all */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${
        darkTheme ? 'border-slate-700/50' : 'border-slate-100'
      }`}>
        <p className={`text-[10px] ${darkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
          Full control over all parameters
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAllSections}
          className={`h-6 px-2 text-[10px] ${
            darkTheme
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {allExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Expand
            </>
          )}
        </Button>
      </div>

      {/* Sections - parent handles scrolling */}
      <div className="p-3 space-y-2">
        {sectionOrder.map((sectionId) => {
          const section = sectionsConfig[sectionId]
          if (!section) return null

          return (
            <AdvancedPanelSection
              key={sectionId}
              title={section.title}
              icon={section.icon}
              iconBg={section.iconBg}
              isExpanded={expandedSections[sectionId] ?? section.defaultExpanded}
              onToggle={() => onToggleSection(sectionId)}
              compact
            >
              {section.component}
            </AdvancedPanelSection>
          )
        })}
      </div>
    </div>
  )
}
