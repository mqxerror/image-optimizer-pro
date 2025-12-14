import { useEffect } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AdvancedPanelSection } from './AdvancedPanelSection'
import { CameraControls } from './CameraControls'
import { LightingMixer } from './LightingMixer'
import { BackgroundSelector } from './BackgroundSelector'
import { JewelryEnhancements } from './JewelryEnhancements'
import { CompositionControls } from './CompositionControls'
import { STUDIO_SPACING } from '@/constants/spacing'
import type { StudioSettings } from '@/types/studio'

interface AdvancedPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: StudioSettings
  onSettingsChange: (settings: StudioSettings) => void
  expandedSections: Record<string, boolean>
  onToggleSection: (section: string) => void
}

interface SectionConfig {
  id: string
  title: string
  icon: string
  defaultExpanded: boolean
  component: React.ReactNode
}

export function AdvancedPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  expandedSections,
  onToggleSection
}: AdvancedPanelProps) {
  // Section order (static)
  const sectionOrder = ['camera', 'lighting', 'background', 'jewelry', 'composition']

  // All sections expanded/collapsed state
  const allExpanded = Object.values(expandedSections).every(val => val)

  // Define sections configuration - all collapsed by default for better spacing
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

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Toggle all sections
  const toggleAllSections = () => {
    const newState = allExpanded ? false : true
    Object.keys(expandedSections).forEach(section => {
      if (expandedSections[section] !== newState) {
        onToggleSection(section)
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Fixed Panel (no dragging) */}
      <div
        className={`
          fixed right-0 top-0 w-[400px] bg-white shadow-2xl z-50 overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          height: '100vh',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-panel-title"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 flex-1">
            <div>
              <h2 id="advanced-panel-title" className="text-lg font-semibold text-gray-900">
                Advanced Settings
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Full control over all parameters</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllSections}
              className="hover:bg-white/80 h-8 px-2 text-xs"
              title={allExpanded ? "Collapse all sections" : "Expand all sections"}
            >
              {allExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Expand All
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/80 shrink-0 h-8 w-8"
              aria-label="Close advanced settings"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className={`${STUDIO_SPACING.panel} ${STUDIO_SPACING.control}`}>
            {/* Render sections in order */}
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
    </>
  )
}
