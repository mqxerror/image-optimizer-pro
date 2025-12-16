import { useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Sparkles, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AdvancedPanelSection } from './AdvancedPanelSection'
import { CameraControls } from './CameraControls'
import { LightingMixer } from './LightingMixer'
import { BackgroundSelector } from './BackgroundSelector'
import { JewelryEnhancements } from './JewelryEnhancements'
import { CompositionControls } from './CompositionControls'
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
      {/* Backdrop with blur - higher z-index to cover mobile sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Futuristic Panel - z-[70] to always be on top of mobile sheets */}
      <div
        className={`
          fixed right-0 top-0 w-full sm:w-[420px] z-[70] overflow-hidden
          transition-transform duration-500 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          height: '100vh',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-panel-title"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800" />

        {/* Animated glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Content */}
        <div className="relative h-full flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Settings2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 id="advanced-panel-title" className="text-lg font-semibold text-white">
                  Advanced Mode
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  Full control over all parameters
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllSections}
                className="text-gray-400 hover:text-white hover:bg-gray-800/80 h-9 px-3 text-xs rounded-lg"
                title={allExpanded ? "Collapse all sections" : "Expand all sections"}
              >
                {allExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                    Expand
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800/80 shrink-0 h-9 w-9 rounded-lg"
                aria-label="Close advanced settings"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick info bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border-b border-gray-700/30">
            <p className="text-xs text-gray-400 text-center">
              Configure camera, lighting, background, jewelry, and composition settings
            </p>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
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

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white h-11 rounded-xl font-medium shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/30"
            >
              Apply Settings
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
