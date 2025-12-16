import { useState, useMemo } from 'react'
import { Camera, Lightbulb, Image, Gem, Layout, Copy, ClipboardPaste, Save, RotateCcw, X } from 'lucide-react'
import { CameraControls } from './CameraControls'
import { LightingMixer } from './LightingMixer'
import { BackgroundSelector } from './BackgroundSelector'
import { JewelryEnhancements } from './JewelryEnhancements'
import { CompositionControls } from './CompositionControls'
import { cn } from '@/lib/utils'
import { defaultStudioSettings, type StudioSettings } from '@/types/studio'
import { useToast } from '@/hooks/use-toast'

type TabId = 'camera' | 'lighting' | 'background' | 'jewelry' | 'composition'

interface Tab {
  id: TabId
  icon: React.ReactNode
  label: string
}

const tabs: Tab[] = [
  { id: 'camera', icon: <Camera className="h-3.5 w-3.5" />, label: 'Camera' },
  { id: 'lighting', icon: <Lightbulb className="h-3.5 w-3.5" />, label: 'Light' },
  { id: 'background', icon: <Image className="h-3.5 w-3.5" />, label: 'Background' },
  { id: 'jewelry', icon: <Gem className="h-3.5 w-3.5" />, label: 'Product' },
  { id: 'composition', icon: <Layout className="h-3.5 w-3.5" />, label: 'Output' },
]

interface AdvancedTabsProps {
  settings: StudioSettings
  onSettingsChange: (settings: StudioSettings) => void
  darkTheme?: boolean
}

// Generate summary chips from settings changes
function getSettingsChips(settings: StudioSettings): { label: string; tab: TabId; key: string }[] {
  const chips: { label: string; tab: TabId; key: string }[] = []
  const defaults = defaultStudioSettings

  // Camera
  if (settings.camera.lens !== defaults.camera.lens) {
    chips.push({ label: settings.camera.lens, tab: 'camera', key: 'camera.lens' })
  }
  if (settings.camera.aperture !== defaults.camera.aperture) {
    chips.push({ label: settings.camera.aperture, tab: 'camera', key: 'camera.aperture' })
  }
  if (settings.camera.angle !== defaults.camera.angle) {
    const angleLabels: Record<string, string> = {
      'top-down': 'Top-down', '45deg': '45°', 'eye-level': 'Eye level', 'low-angle': 'Low angle'
    }
    chips.push({ label: angleLabels[settings.camera.angle] || settings.camera.angle, tab: 'camera', key: 'camera.angle' })
  }

  // Lighting
  if (settings.lighting.style !== defaults.lighting.style) {
    const styleLabels: Record<string, string> = {
      'studio-3point': 'Studio', 'natural': 'Natural', 'dramatic': 'Dramatic',
      'soft': 'Soft', 'rim': 'Rim', 'split': 'Split'
    }
    chips.push({ label: styleLabels[settings.lighting.style] || settings.lighting.style, tab: 'lighting', key: 'lighting.style' })
  }

  // Background
  if (settings.background.type !== defaults.background.type) {
    const typeLabels: Record<string, string> = {
      'white': 'White BG', 'gradient': 'Gradient', 'black': 'Black BG',
      'transparent': 'Transparent', 'scene': 'Scene'
    }
    chips.push({ label: typeLabels[settings.background.type] || settings.background.type, tab: 'background', key: 'background.type' })
  }
  if (settings.background.shadow !== defaults.background.shadow) {
    chips.push({ label: `${settings.background.shadow} shadow`, tab: 'background', key: 'background.shadow' })
  }

  // Jewelry
  if (settings.jewelry.metal !== defaults.jewelry.metal && settings.jewelry.metal !== 'auto') {
    chips.push({ label: settings.jewelry.metal, tab: 'jewelry', key: 'jewelry.metal' })
  }
  if (settings.jewelry.finish !== defaults.jewelry.finish) {
    chips.push({ label: settings.jewelry.finish.replace('-', ' '), tab: 'jewelry', key: 'jewelry.finish' })
  }
  if (Math.abs(settings.jewelry.sparkle - defaults.jewelry.sparkle) > 15) {
    chips.push({ label: `Sparkle ${settings.jewelry.sparkle}%`, tab: 'jewelry', key: 'jewelry.sparkle' })
  }

  // Composition
  if (settings.composition.aspectRatio !== defaults.composition.aspectRatio) {
    chips.push({ label: settings.composition.aspectRatio, tab: 'composition', key: 'composition.aspectRatio' })
  }

  return chips
}

export function AdvancedTabs({
  settings,
  onSettingsChange,
  darkTheme = false
}: AdvancedTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('camera')
  const { toast } = useToast()

  // Generate chips for modified settings
  const chips = useMemo(() => getSettingsChips(settings), [settings])
  const hasModifications = chips.length > 0

  // Reset a specific setting to default
  const resetSetting = (key: string) => {
    const [section, field] = key.split('.') as [keyof StudioSettings, string]
    const defaultSection = defaultStudioSettings[section]
    const currentSection = settings[section]
    if (typeof defaultSection === 'object' && defaultSection !== null &&
        typeof currentSection === 'object' && currentSection !== null &&
        field in defaultSection) {
      onSettingsChange({
        ...settings,
        [section]: {
          ...(currentSection as object),
          [field]: (defaultSection as unknown as Record<string, unknown>)[field]
        }
      })
    }
  }

  // Reset all settings to defaults
  const resetAllSettings = () => {
    onSettingsChange(defaultStudioSettings)
    toast({ title: 'Settings reset', description: 'All settings restored to defaults' })
  }

  // Copy settings to clipboard
  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
      toast({ title: 'Settings copied', description: 'Paste into another session or save for later' })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  // Paste settings from clipboard
  const pasteSettings = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text) as StudioSettings
      // Validate it has expected structure
      if (parsed.camera && parsed.lighting && parsed.background) {
        onSettingsChange(parsed)
        toast({ title: 'Settings applied', description: 'Pasted settings from clipboard' })
      } else {
        throw new Error('Invalid format')
      }
    } catch {
      toast({ title: 'Paste failed', description: 'Invalid settings format in clipboard', variant: 'destructive' })
    }
  }

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
      darkTheme ? "bg-slate-900" : "bg-white"
    )}>
      {/* Tab Bar with Labels */}
      <div className={cn(
        "flex-shrink-0 px-2 py-1.5 border-b",
        darkTheme ? "border-slate-700 bg-slate-800/50" : "border-slate-100 bg-slate-50/50"
      )}>
        <div className={cn(
          "flex rounded-lg p-0.5 gap-0.5",
          darkTheme ? "bg-slate-800" : "bg-slate-100"
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition-all gap-0.5",
                activeTab === tab.id
                  ? darkTheme
                    ? "bg-purple-600 text-white"
                    : "bg-white text-purple-700 shadow-sm"
                  : darkTheme
                    ? "text-slate-400 hover:text-white hover:bg-slate-700"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              {tab.icon}
              <span className="text-[9px] font-medium leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Chips + Actions */}
      {(hasModifications || true) && (
        <div className={cn(
          "flex-shrink-0 px-2 py-1.5 border-b",
          darkTheme ? "border-slate-700" : "border-slate-100"
        )}>
          {/* Action buttons */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={copySettings}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  darkTheme
                    ? "text-slate-400 hover:text-white hover:bg-slate-700"
                    : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                )}
                title="Copy settings"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={pasteSettings}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  darkTheme
                    ? "text-slate-400 hover:text-white hover:bg-slate-700"
                    : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                )}
                title="Paste settings"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </button>
            </div>
            {hasModifications && (
              <button
                onClick={resetAllSettings}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                  darkTheme
                    ? "text-slate-400 hover:text-white hover:bg-slate-700"
                    : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                )}
              >
                <RotateCcw className="w-3 h-3" />
                Reset all
              </button>
            )}
          </div>

          {/* Chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chips.slice(0, 6).map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setActiveTab(chip.tab)}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors group",
                    darkTheme
                      ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  )}
                >
                  {chip.label}
                  <X
                    className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      resetSetting(chip.key)
                    }}
                  />
                </button>
              ))}
              {chips.length > 6 && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5",
                  darkTheme ? "text-slate-500" : "text-slate-400"
                )}>
                  +{chips.length - 6} more
                </span>
              )}
            </div>
          )}
          {chips.length === 0 && (
            <p className={cn(
              "text-[10px]",
              darkTheme ? "text-slate-500" : "text-slate-400"
            )}>
              Using default settings
            </p>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {renderContent()}
      </div>
    </div>
  )
}

export default AdvancedTabs
