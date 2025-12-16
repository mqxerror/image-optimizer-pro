import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  /** Optional max height for scroll area */
  maxHeight?: string
}

interface SectionConfig {
  id: string
  title: string
  icon: string
  defaultExpanded: boolean
  component: React.ReactNode
}

export function AdvancedControls({
  settings,
  onSettingsChange,
  expandedSections,
  onToggleSection,
  darkTheme = true,
  maxHeight = 'calc(100vh - 200px)'
}: AdvancedControlsProps) {
  const sectionOrder = ['camera', 'lighting', 'background', 'jewelry', 'composition']

  const allExpanded = Object.values(expandedSections).every(val => val)

  const sectionsConfig: Record<string, SectionConfig> = {
    camera: {
      id: 'camera',
      title: 'Camera Settings',
      icon: '📷',
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
    <div className={darkTheme ? 'bg-gray-900' : 'bg-white'}>
      {/* Header with expand/collapse all */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkTheme ? 'border-gray-700/50' : 'border-gray-200'
      }`}>
        <p className={`text-xs ${darkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
          Full control over all parameters
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAllSections}
          className={`h-8 px-2 text-xs ${
            darkTheme
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {allExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Expand
            </>
          )}
        </Button>
      </div>

      {/* Scrollable sections */}
      <ScrollArea style={{ maxHeight }}>
        <div className="p-4 space-y-3">
          {sectionOrder.map((sectionId) => {
            const section = sectionsConfig[sectionId]
            if (!section) return null

            return (
              <AdvancedPanelSection
                key={sectionId}
                title={section.title}
                icon={section.icon}
                isExpanded={expandedSections[sectionId] ?? section.defaultExpanded}
                onToggle={() => onToggleSection(sectionId)}
              >
                {section.component}
              </AdvancedPanelSection>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
