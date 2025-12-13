import { useEffect, useState, useRef } from 'react'
import { X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
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
  // Panel dragging state
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

  // Section reordering state
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [dragOverSection, setDragOverSection] = useState<string | null>(null)

  // Section order state
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('advancedPanelSectionOrder')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return ['camera', 'lighting', 'background', 'jewelry', 'composition']
      }
    }
    return ['camera', 'lighting', 'background', 'jewelry', 'composition']
  })

  // All sections expanded/collapsed state
  const allExpanded = Object.values(expandedSections).every(val => val)

  // Define sections configuration
  const sectionsConfig: Record<string, SectionConfig> = {
    camera: {
      id: 'camera',
      title: 'Camera Settings',
      icon: '📷',
      defaultExpanded: true,
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
      defaultExpanded: true,
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

  // Save section order to localStorage
  useEffect(() => {
    localStorage.setItem('advancedPanelSectionOrder', JSON.stringify(sectionOrder))
  }, [sectionOrder])

  // Handle panel drag start
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

  // Handle section drag start
  const handleSectionDragStart = (sectionId: string) => {
    setDraggedSection(sectionId)
  }

  // Handle section drag over
  const handleSectionDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    if (draggedSection && draggedSection !== sectionId) {
      setDragOverSection(sectionId)
    }
  }

  // Handle section drop
  const handleSectionDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (draggedSection && draggedSection !== targetId) {
      const newOrder = [...sectionOrder]
      const draggedIndex = newOrder.indexOf(draggedSection)
      const targetIndex = newOrder.indexOf(targetId)

      // Remove dragged item and insert at new position
      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedSection)

      setSectionOrder(newOrder)
    }

    setDraggedSection(null)
    setDragOverSection(null)
  }

  // Handle section drag end
  const handleSectionDragEnd = () => {
    setDraggedSection(null)
    setDragOverSection(null)
  }

  // Toggle all sections
  const toggleAllSections = () => {
    const newState = allExpanded ? false : true
    Object.keys(expandedSections).forEach(section => {
      if (expandedSections[section] !== newState) {
        onToggleSection(section)
      }
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
              <p className="text-xs text-gray-500 mt-0.5">Drag to reposition • Reorder sections below</p>
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
        <ScrollArea className="h-[calc(100%-73px)]">
          <div className="p-4 space-y-2">
            {/* Render sections in custom order */}
            {sectionOrder.map((sectionId) => {
              const section = sectionsConfig[sectionId]
              if (!section) return null

              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={() => handleSectionDragStart(sectionId)}
                  onDragOver={(e) => handleSectionDragOver(e, sectionId)}
                  onDrop={(e) => handleSectionDrop(e, sectionId)}
                  onDragEnd={handleSectionDragEnd}
                  className={`
                    transition-all
                    ${draggedSection === sectionId ? 'opacity-50' : 'opacity-100'}
                    ${dragOverSection === sectionId ? 'scale-105' : 'scale-100'}
                  `}
                >
                  <AdvancedPanelSection
                    title={section.title}
                    icon={section.icon}
                    isExpanded={expandedSections[sectionId] ?? section.defaultExpanded}
                    onToggle={() => onToggleSection(sectionId)}
                    isDragging={draggedSection === sectionId}
                    isDragOver={dragOverSection === sectionId}
                  >
                    {section.component}
                  </AdvancedPanelSection>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
