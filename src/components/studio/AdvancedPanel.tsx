import { useEffect, useState, useRef } from 'react'
import { X, GripVertical } from 'lucide-react'
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

interface Position {
  x: number
  y: number
}

export function AdvancedPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  expandedSections,
  onToggleSection
}: AdvancedPanelProps) {
  // Dragging state
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState<Position>(() => {
    // Load saved position or use default (right side)
    const saved = localStorage.getItem('advancedPanelPosition')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { x: window.innerWidth - 400, y: 0 }
      }
    }
    return { x: window.innerWidth - 400, y: 0 }
  })
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Reset position to right side when panel opens
  useEffect(() => {
    if (isOpen) {
      const savedPos = localStorage.getItem('advancedPanelPosition')
      if (savedPos) {
        try {
          setPosition(JSON.parse(savedPos))
        } catch {
          setPosition({ x: window.innerWidth - 400, y: 0 })
        }
      }
    }
  }, [isOpen])

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the header (not buttons)
    if ((e.target as HTMLElement).closest('button')) {
      return
    }

    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Keep panel within viewport bounds
      const maxX = window.innerWidth - 400
      const maxY = window.innerHeight - 100 // Keep at least 100px visible

      const boundedX = Math.max(0, Math.min(newX, maxX))
      const boundedY = Math.max(0, Math.min(newY, maxY))

      setPosition({ x: boundedX, y: boundedY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      // Save position to localStorage
      localStorage.setItem('advancedPanelPosition', JSON.stringify(position))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, position])

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

      {/* Draggable Panel */}
      <div
        ref={panelRef}
        className={`
          fixed w-[400px] bg-white shadow-2xl z-50 rounded-lg overflow-hidden
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          height: 'calc(100vh - 40px)',
          maxHeight: '900px',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-panel-title"
      >
        {/* Draggable Panel Header */}
        <div
          className={`flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="h-5 w-5 text-gray-400" />
            <div>
              <h2 id="advanced-panel-title" className="text-lg font-semibold text-gray-900">
                Advanced Settings
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Drag to reposition • Fine-tune every detail</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/80 shrink-0"
            aria-label="Close advanced settings"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-[calc(100%-73px)]">
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
