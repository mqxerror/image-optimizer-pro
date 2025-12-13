import { useEffect } from 'react'
import { X } from 'lucide-react'
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

export function AdvancedPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  expandedSections,
  onToggleSection
}: AdvancedPanelProps) {
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

      {/* Sliding Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-panel-title"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 id="advanced-panel-title" className="text-lg font-semibold text-gray-900">
              Advanced Settings
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Fine-tune every detail</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100"
            aria-label="Close advanced settings"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className="p-4 space-y-2">
            {/* Camera Section */}
            <AdvancedPanelSection
              title="Camera Settings"
              icon="📷"
              isExpanded={expandedSections.camera ?? true}
              onToggle={() => onToggleSection('camera')}
            >
              <CameraControls
                settings={settings.camera}
                onChange={(camera) => onSettingsChange({ ...settings, camera })}
              />
            </AdvancedPanelSection>

            {/* Lighting Section */}
            <AdvancedPanelSection
              title="Lighting"
              icon="💡"
              isExpanded={expandedSections.lighting ?? true}
              onToggle={() => onToggleSection('lighting')}
            >
              <LightingMixer
                settings={settings.lighting}
                onChange={(lighting) => onSettingsChange({ ...settings, lighting })}
              />
            </AdvancedPanelSection>

            {/* Background Section */}
            <AdvancedPanelSection
              title="Background"
              icon="🖼️"
              isExpanded={expandedSections.background ?? false}
              onToggle={() => onToggleSection('background')}
            >
              <BackgroundSelector
                settings={settings.background}
                onChange={(background) => onSettingsChange({ ...settings, background })}
              />
            </AdvancedPanelSection>

            {/* Jewelry Section */}
            <AdvancedPanelSection
              title="Jewelry Enhancements"
              icon="💎"
              isExpanded={expandedSections.jewelry ?? false}
              onToggle={() => onToggleSection('jewelry')}
            >
              <JewelryEnhancements
                settings={settings.jewelry}
                onChange={(jewelry) => onSettingsChange({ ...settings, jewelry })}
              />
            </AdvancedPanelSection>

            {/* Composition Section */}
            <AdvancedPanelSection
              title="Composition"
              icon="📐"
              isExpanded={expandedSections.composition ?? false}
              onToggle={() => onToggleSection('composition')}
            >
              <CompositionControls
                settings={settings.composition}
                onChange={(composition) => onSettingsChange({ ...settings, composition })}
              />
            </AdvancedPanelSection>
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
