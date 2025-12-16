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
  iconBg: string
  iconColor: string
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
  const sectionOrder = ['camera', 'lighting', 'background', 'jewelry', 'composition']

  const allExpanded = Object.values(expandedSections).every(val => val)

  const sectionsConfig: Record<string, SectionConfig> = {
    camera: {
      id: 'camera',
      title: 'Camera Settings',
      icon: '📷',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
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
      iconColor: 'text-yellow-600',
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
      iconColor: 'text-green-600',
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
      iconColor: 'text-pink-600',
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
      iconColor: 'text-purple-600',
      defaultExpanded: false,
      component: (
        <CompositionControls
          settings={settings.composition}
          onChange={(composition) => onSettingsChange({ ...settings, composition })}
        />
      )
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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

  const toggleAllSections = () => {
    const newState = !allExpanded
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Clean White Panel */}
      <div
        className={`
          fixed right-0 top-0 w-full sm:w-[420px] z-[70] overflow-hidden
          transition-transform duration-500 ease-out bg-white shadow-2xl
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ height: '100vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-white to-blue-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 id="advanced-panel-title" className="text-lg font-semibold text-gray-900">
                Advanced Settings
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-500" />
                Full control over all parameters
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllSections}
              className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              aria-label="Close advanced settings"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-3">
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
                >
                  {section.component}
                </AdvancedPanelSection>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-11 rounded-xl font-medium shadow-lg shadow-purple-200 transition-all"
          >
            Apply Settings
          </Button>
        </div>
      </div>
    </>
  )
}
