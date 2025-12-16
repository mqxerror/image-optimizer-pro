import { useState } from 'react'
import { Camera, Lightbulb, Image, Gem, Layout } from 'lucide-react'
import { CameraControls } from './CameraControls'
import { LightingMixer } from './LightingMixer'
import { BackgroundSelector } from './BackgroundSelector'
import { JewelryEnhancements } from './JewelryEnhancements'
import { CompositionControls } from './CompositionControls'
import { cn } from '@/lib/utils'
import type { StudioSettings } from '@/types/studio'

type TabId = 'camera' | 'lighting' | 'background' | 'jewelry' | 'composition'

interface Tab {
  id: TabId
  icon: React.ReactNode
  label: string
  shortLabel: string
}

const tabs: Tab[] = [
  { id: 'camera', icon: <Camera className="h-3.5 w-3.5" />, label: 'Camera', shortLabel: 'Cam' },
  { id: 'lighting', icon: <Lightbulb className="h-3.5 w-3.5" />, label: 'Lighting', shortLabel: 'Light' },
  { id: 'background', icon: <Image className="h-3.5 w-3.5" />, label: 'Background', shortLabel: 'Bg' },
  { id: 'jewelry', icon: <Gem className="h-3.5 w-3.5" />, label: 'Jewelry', shortLabel: 'Jewel' },
  { id: 'composition', icon: <Layout className="h-3.5 w-3.5" />, label: 'Composition', shortLabel: 'Comp' },
]

interface AdvancedTabsProps {
  settings: StudioSettings
  onSettingsChange: (settings: StudioSettings) => void
  /** Dark theme for mobile sheet */
  darkTheme?: boolean
}

export function AdvancedTabs({
  settings,
  onSettingsChange,
  darkTheme = false
}: AdvancedTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('camera')

  const renderContent = () => {
    switch (activeTab) {
      case 'camera':
        return (
          <CameraControls
            settings={settings.camera}
            onChange={(camera) => onSettingsChange({ ...settings, camera })}
          />
        )
      case 'lighting':
        return (
          <LightingMixer
            settings={settings.lighting}
            onChange={(lighting) => onSettingsChange({ ...settings, lighting })}
          />
        )
      case 'background':
        return (
          <BackgroundSelector
            settings={settings.background}
            onChange={(background) => onSettingsChange({ ...settings, background })}
          />
        )
      case 'jewelry':
        return (
          <JewelryEnhancements
            settings={settings.jewelry}
            onChange={(jewelry) => onSettingsChange({ ...settings, jewelry })}
          />
        )
      case 'composition':
        return (
          <CompositionControls
            settings={settings.composition}
            onChange={(composition) => onSettingsChange({ ...settings, composition })}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={cn(
      "flex flex-col h-full",
      darkTheme ? "bg-gray-900" : "bg-white"
    )}>
      {/* Compact Tab Bar */}
      <div className={cn(
        "flex-shrink-0 px-1.5 py-1 border-b",
        darkTheme ? "border-gray-700 bg-gray-800/50" : "border-gray-100 bg-gray-50/50"
      )}>
        <div className={cn(
          "flex rounded-md p-0.5 gap-0.5",
          darkTheme ? "bg-gray-800" : "bg-gray-100"
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center py-1 px-0.5 rounded transition-all",
                activeTab === tab.id
                  ? darkTheme
                    ? "bg-purple-600 text-white"
                    : "bg-white text-purple-700 shadow-sm"
                  : darkTheme
                    ? "text-gray-400 hover:text-white hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              )}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content - takes all remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {renderContent()}
      </div>
    </div>
  )
}

export default AdvancedTabs
