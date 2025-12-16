import { useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Settings2, Camera, Lightbulb, Image, Gem, Grid3X3 } from 'lucide-react'
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
  icon: React.ReactNode
  iconBg: string
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
      icon: <Camera className="w-3.5 h-3.5 text-blue-500" />,
      iconBg: 'bg-blue-50',
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
      icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500" />,
      iconBg: 'bg-amber-50',
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
      icon: <Image className="w-3.5 h-3.5 text-green-500" />,
      iconBg: 'bg-green-50',
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
      icon: <Gem className="w-3.5 h-3.5 text-pink-500" />,
      iconBg: 'bg-pink-50',
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
      icon: <Grid3X3 className="w-3.5 h-3.5 text-purple-500" />,
      iconBg: 'bg-purple-50',
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
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Clean White Panel - iPhone Style */}
      <div
        className={`
          fixed right-0 top-0 w-full sm:w-[400px] z-[70] overflow-hidden
          transition-transform duration-300 ease-out bg-slate-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ height: '100vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
              <Settings2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 id="advanced-panel-title" className="text-base font-semibold text-slate-800">
                Advanced Settings
              </h2>
              <p className="text-[11px] text-slate-400">
                Fine-tune your output
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllSections}
              className="h-7 px-2.5 text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Close advanced settings"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-[calc(100vh-130px)]">
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
                >
                  {section.component}
                </AdvancedPanelSection>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 bg-white">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white h-10 rounded-xl font-medium shadow-lg shadow-purple-200/50 transition-all text-sm"
          >
            Apply Settings
          </Button>
        </div>
      </div>
    </>
  )
}
