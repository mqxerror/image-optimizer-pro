# Studio Redesign: Quick/Advanced Mode with Sliding Controls

**Created:** December 12, 2025
**Designer:** Uma (UX Designer)
**Status:** Ready for Implementation
**Related Files:** `/src/pages/Studio.tsx`, `/src/components/studio/*`

---

## 1. Design Problem Statement

**Current Issues:**
- ✗ 4 collapsible sections open by default (camera, lighting, background, jewelry)
- ✗ 20+ sliders visible immediately = cognitive overload
- ✗ Quick/Advanced mode state exists (`studioMode`) but no UI toggle
- ✗ New users don't know where to start
- ✗ Power users can't find advanced controls efficiently

**Design Goal:**
Create a progressive disclosure interface where beginners see only essential controls, while advanced users can access granular settings via a sliding panel.

---

## 2. Visual Design Concept

### 2.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STUDIO HEADER                                                               │
│ ┌─────────────────┐  ┌────────────────────────┐                           │
│ │ Quick | Advanced │  │ AI Model: flux-pro ▼  │   [💾 Save Preset]       │
│ └─────────────────┘  └────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────────────────────┬──────────────────┐
│              │                                          │                  │
│   PRESETS    │         CANVAS AREA                     │  QUICK CONTROLS  │
│   SIDEBAR    │      [Image Upload/Display]             │                  │
│              │                                          │  ┌─────────────┐ │
│  My Studios  │                                          │  │  Lighting   │ │
│  • Bright    │                                          │  │  ▓▓▓▓▓░░░   │ │
│  • Dramatic  │   [Custom Prompt Textarea]               │  └─────────────┘ │
│  • Natural   │                                          │                  │
│              │                                          │  ┌─────────────┐ │
│  Templates   │   [👁 View Generated Prompt ▼]          │  │  Contrast   │ │
│  • Jewelry   │                                          │  │  ▓▓▓▓▓▓▓░   │ │
│  • Product   │                                          │  └─────────────┘ │
│              │                                          │                  │
│              │   [✨ Generate] [💰 1 token]             │  ┌─────────────┐ │
│              │                                          │  │  Sharpness  │ │
│              │                                          │  │  ▓▓▓▓▓░░░   │ │
│              │                                          │  └─────────────┘ │
│              │                                          │                  │
│              │                                          │  [⚙ Advanced]   │
└──────────────┴──────────────────────────────────────────┴──────────────────┘

ADVANCED MODE: Sliding Panel Appears from Right →

┌──────────────┬─────────────────────────────┬──────────────────┬──────────┐
│              │                             │  QUICK CONTROLS  │ ADVANCED │
│   PRESETS    │         CANVAS AREA        │  (Dimmed/Hidden) │  PANEL   │
│   SIDEBAR    │                             │                  │          │
│              │   [Image Upload/Display]    │                  │ 📷 Camera│
│  (Same)      │                             │                  │ ├─Lens  │
│              │                             │                  │ │ 50mm  │
│              │   [Custom Prompt Textarea]  │                  │ ├─Aperture│
│              │                             │                  │ │ f/2.8 │
│              │                             │                  │          │
│              │   [👁 View Generated Prompt]│                  │ 💡 Lighting│
│              │                             │                  │ ├─Style │
│              │   [✨ Generate] [💰 1 token]│                  │ │ Soft  │
│              │                             │                  │ ├─Key   │
│              │                             │                  │ │ ▓▓▓░ │
└──────────────┴─────────────────────────────┴──────────────────┴──────────┘
                                               ←─── Slides in/out ───→
```

---

## 3. Interaction Design

### 3.1 Quick Mode (Default for New Users)

**Controls Shown:**
1. **Lighting Intensity** (0-100%) - Most impactful setting
2. **Contrast** (0-100%) - Common adjustment
3. **Sharpness** (0-100%) - Frequently used
4. **AI Model Selector** - Always visible in header

**Visual Design:**
- Large, labeled sliders with visual preview
- Icon for each control (💡 Lighting, 🎨 Contrast, ⚡ Sharpness)
- Real-time preview of generated prompt
- Prominent "Advanced" button at bottom

**Behavior:**
- Sliders update `settings` state immediately
- Prompt preview updates in real-time
- Other settings (camera, background, etc.) use smart defaults
- "Advanced" button slides in full panel from right

---

### 3.2 Advanced Mode Toggle

**Location:** Top-right header, next to AI Model selector

**Design:**
```
┌─────────────────────────────────┐
│  ○ Quick Mode  ● Advanced Mode  │  ← Segmented control (iOS style)
└─────────────────────────────────┘
```

**States:**
- **Quick** (default): Show simplified controls only
- **Advanced**: Slide in panel with all 6 sections

**Transition:**
- 300ms ease-in-out slide animation
- Quick controls dim/hide when advanced panel opens
- Click outside panel or "Quick Mode" to close

---

### 3.3 Advanced Sliding Panel

**Trigger:** Click "⚙ Advanced" button or toggle "Advanced Mode"

**Panel Specs:**
- **Width:** 320px (fixed)
- **Position:** Slides from right edge, overlays canvas
- **Background:** White with subtle shadow
- **Close:** Click outside, ESC key, or toggle back to Quick

**Content Organization (Collapsible Accordion):**

```
┌────────────────────────────────┐
│  📷 Camera Settings        ▼  │  ← Click to expand
├────────────────────────────────┤
│  📐 Lens                       │
│  ┌──────────────────────────┐ │
│  │ 50mm  [●─────────] 100mm │ │  ← Slider with labels
│  └──────────────────────────┘ │
│                                │
│  🔍 Aperture                   │
│  ┌──────────────────────────┐ │
│  │ f/1.4 [──●──────] f/16   │ │
│  └──────────────────────────┘ │
│                                │
│  📐 Angle                      │
│  ○ Eye Level  ○ Top Down      │
│  ○ 45° Angle  ○ Close-up      │
└────────────────────────────────┘

┌────────────────────────────────┐
│  💡 Lighting Settings      ▼  │
├────────────────────────────────┤
│  Style                         │
│  ○ Soft     ○ Dramatic         │
│  ○ Natural  ○ Studio           │
│                                │
│  Key Light Intensity           │
│  ┌──────────────────────────┐ │
│  │ 0%    [────●────]   100% │ │
│  └──────────────────────────┘ │
│                                │
│  Fill Light Intensity          │
│  ┌──────────────────────────┐ │
│  │ 0%    [──●──────]   100% │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘

┌────────────────────────────────┐
│  🖼️ Background Settings    ▼  │
├────────────────────────────────┤
│  (Collapsed by default)        │
└────────────────────────────────┘

┌────────────────────────────────┐
│  💎 Jewelry Enhancements   ▼  │
├────────────────────────────────┤
│  (Collapsed by default)        │
└────────────────────────────────┘

┌────────────────────────────────┐
│  📐 Composition            ▼  │
├────────────────────────────────┤
│  (Collapsed by default)        │
└────────────────────────────────┘
```

**Default Expanded Sections:**
- Camera (most frequently adjusted)
- Lighting (high impact)
- All others collapsed to reduce scroll

---

## 4. Component Architecture

### 4.1 File Structure

```
src/components/studio/
├── StudioModeToggle.tsx          ← NEW: Quick/Advanced toggle
├── QuickControls.tsx              ← NEW: Simplified 3-slider panel
├── AdvancedPanel.tsx              ← NEW: Sliding panel container
├── AdvancedPanelSection.tsx       ← NEW: Collapsible section wrapper
├── CameraControls.tsx             ← EXISTING (refactor for panel)
├── LightingMixer.tsx              ← EXISTING (refactor for panel)
├── BackgroundSelector.tsx         ← EXISTING
├── JewelryEnhancements.tsx        ← EXISTING
├── CompositionControls.tsx        ← EXISTING
└── ModelSelector.tsx              ← EXISTING (move to header)
```

### 4.2 State Management

**Existing State (Keep):**
```typescript
const [studioMode, setStudioMode] = useState<'quick' | 'advanced'>('quick')
const [settings, setSettings] = useState<StudioSettings>(defaultStudioSettings)
const [expandedSections, setExpandedSections] = useState({...})
```

**New State (Add):**
```typescript
const [advancedPanelOpen, setAdvancedPanelOpen] = useState(false)
const [quickSettings, setQuickSettings] = useState({
  lightingIntensity: 70,  // Maps to settings.lighting.keyIntensity
  contrast: 50,            // New quick setting
  sharpness: 60            // New quick setting
})
```

---

## 5. Implementation Guide

### 5.1 Step 1: Create StudioModeToggle Component

**File:** `/src/components/studio/StudioModeToggle.tsx`

```typescript
import { cn } from '@/lib/utils'

interface StudioModeToggleProps {
  mode: 'quick' | 'advanced'
  onChange: (mode: 'quick' | 'advanced') => void
}

export function StudioModeToggle({ mode, onChange }: StudioModeToggleProps) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('quick')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          mode === 'quick'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Quick Mode
      </button>
      <button
        onClick={() => onChange('advanced')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          mode === 'advanced'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Advanced Mode
      </button>
    </div>
  )
}
```

---

### 5.2 Step 2: Create QuickControls Component

**File:** `/src/components/studio/QuickControls.tsx`

```typescript
import { Lightbulb, Contrast, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface QuickControlsProps {
  lighting: number
  contrast: number
  sharpness: number
  onChange: (key: string, value: number) => void
}

export function QuickControls({
  lighting,
  contrast,
  sharpness,
  onChange
}: QuickControlsProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Adjustments</h3>
        <p className="text-xs text-gray-500 mb-6">
          Fine-tune your image with these essential controls.
          Switch to Advanced Mode for full control.
        </p>
      </div>

      {/* Lighting Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <Label className="text-sm font-medium">Lighting Intensity</Label>
        </div>
        <Slider
          value={[lighting]}
          onValueChange={([value]) => onChange('lighting', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Dim</span>
          <span className="font-medium text-gray-700">{lighting}%</span>
          <span>Bright</span>
        </div>
      </div>

      {/* Contrast Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Contrast className="h-4 w-4 text-purple-600" />
          <Label className="text-sm font-medium">Contrast</Label>
        </div>
        <Slider
          value={[contrast]}
          onValueChange={([value]) => onChange('contrast', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Soft</span>
          <span className="font-medium text-gray-700">{contrast}%</span>
          <span>High</span>
        </div>
      </div>

      {/* Sharpness Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <Label className="text-sm font-medium">Sharpness</Label>
        </div>
        <Slider
          value={[sharpness]}
          onValueChange={([value]) => onChange('sharpness', value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Smooth</span>
          <span className="font-medium text-gray-700">{sharpness}%</span>
          <span>Sharp</span>
        </div>
      </div>

      {/* Advanced Mode CTA */}
      <div className="pt-4 border-t">
        <p className="text-xs text-gray-600 mb-3">
          Need more control? Switch to Advanced Mode for camera, background, and composition settings.
        </p>
      </div>
    </div>
  )
}
```

---

### 5.3 Step 3: Create AdvancedPanel Component

**File:** `/src/components/studio/AdvancedPanel.tsx`

```typescript
import { useEffect, useCallback } from 'react'
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
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Advanced Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fine-tune every detail</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100"
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
              isExpanded={expandedSections.camera}
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
              isExpanded={expandedSections.lighting}
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
              isExpanded={expandedSections.background}
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
              isExpanded={expandedSections.jewelry}
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
              isExpanded={expandedSections.composition}
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
```

---

### 5.4 Step 4: Create AdvancedPanelSection Component

**File:** `/src/components/studio/AdvancedPanelSection.tsx`

```typescript
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedPanelSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function AdvancedPanelSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children
}: AdvancedPanelSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform duration-200',
            isExpanded && 'transform rotate-180'
          )}
        />
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}
```

---

### 5.5 Step 5: Update Studio.tsx (Main Integration)

**File:** `/src/pages/Studio.tsx`

**Changes to make:**

```typescript
// Add imports
import { StudioModeToggle } from '@/components/studio/StudioModeToggle'
import { QuickControls } from '@/components/studio/QuickControls'
import { AdvancedPanel } from '@/components/studio/AdvancedPanel'

// Update state initialization
const [studioMode, setStudioMode] = useState<'quick' | 'advanced'>('quick')
const [advancedPanelOpen, setAdvancedPanelOpen] = useState(false)
const [quickSettings, setQuickSettings] = useState({
  lighting: 70,
  contrast: 50,
  sharpness: 60
})

// Add effect to sync quick settings to full settings
useEffect(() => {
  if (studioMode === 'quick') {
    setSettings(prev => ({
      ...prev,
      lighting: {
        ...prev.lighting,
        keyIntensity: quickSettings.lighting
      }
    }))
  }
}, [quickSettings, studioMode])

// Add effect to open/close panel based on mode
useEffect(() => {
  if (studioMode === 'advanced') {
    setAdvancedPanelOpen(true)
  } else {
    setAdvancedPanelOpen(false)
  }
}, [studioMode])

// Update JSX in header section (around line 330-350)
<div className="flex items-center gap-4 mb-6">
  <StudioModeToggle
    mode={studioMode}
    onChange={setStudioMode}
  />
  <ModelSelector
    model={settings.aiModel}
    onChange={(aiModel) => setSettings(s => ({ ...s, aiModel }))}
  />
  <Button
    variant="outline"
    onClick={() => setShowSavePresetDialog(true)}
    className="ml-auto"
  >
    <Save className="h-4 w-4 mr-2" />
    Save Preset
  </Button>
</div>

// Replace right sidebar (around line 407-558) with conditional rendering:
{studioMode === 'quick' ? (
  <QuickControls
    lighting={quickSettings.lighting}
    contrast={quickSettings.contrast}
    sharpness={quickSettings.sharpness}
    onChange={(key, value) => {
      setQuickSettings(prev => ({ ...prev, [key]: value }))
    }}
  />
) : null}

{/* Advanced Panel (overlays) */}
<AdvancedPanel
  isOpen={advancedPanelOpen}
  onClose={() => {
    setAdvancedPanelOpen(false)
    setStudioMode('quick')
  }}
  settings={settings}
  onSettingsChange={setSettings}
  expandedSections={expandedSections}
  onToggleSection={toggleSection}
/>
```

---

## 6. User Experience Flow

### 6.1 First-Time User Journey

1. **Lands on Studio** → Sees Quick Mode by default
2. **Uploads image** → Three simple sliders appear
3. **Adjusts lighting** → Sees real-time prompt update
4. **Clicks "Generate"** → Image processes
5. **Sees "Advanced Mode" toggle** → Can explore later

### 6.2 Power User Journey

1. **Opens Studio** → Immediately toggles to Advanced
2. **Panel slides in** → All 6 sections visible
3. **Expands Camera section** → Tweaks lens, aperture
4. **Expands Lighting** → Fine-tunes key/fill/rim lights
5. **Collapses unused sections** → Focuses on needed controls
6. **Saves as preset** → Reusable for future sessions

---

## 7. Accessibility Enhancements

### 7.1 Keyboard Navigation
- `Tab` navigates through sliders in order
- `Arrow keys` adjust slider values
- `ESC` closes advanced panel
- `Ctrl/Cmd + Shift + Q` toggle Quick mode
- `Ctrl/Cmd + Shift + A` toggle Advanced mode

### 7.2 Screen Reader Support
```typescript
// On QuickControls sliders
<Slider
  aria-label="Lighting intensity"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={lighting}
  aria-valuetext={`${lighting} percent`}
/>

// On AdvancedPanel
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="advanced-panel-title"
>
  <h2 id="advanced-panel-title">Advanced Settings</h2>
  {/* ... */}
</div>
```

### 7.3 Focus Management
- When panel opens → focus moves to first control
- When panel closes → focus returns to toggle button
- Trap focus within panel while open

---

## 8. Mobile Considerations

### 8.1 Responsive Behavior

**Mobile (<768px):**
- Mode toggle becomes full-width tabs
- Quick controls stack vertically
- Advanced panel becomes full-screen modal (not sliding)
- Canvas area stacks above controls

**Tablet (768px-1024px):**
- Side-by-side layout maintained
- Panel width adjusts to 280px
- Quick controls width reduces to 240px

---

## 9. Performance Optimizations

### 9.1 Lazy Loading
- Advanced panel components only render when `studioMode === 'advanced'`
- Use `React.lazy()` for AdvancedPanel to reduce initial bundle size

### 9.2 Debouncing
- Quick settings onChange debounced by 150ms
- Prevents excessive prompt regeneration during slider drag

```typescript
const debouncedQuickSettingsChange = useMemo(
  () => debounce((key: string, value: number) => {
    setQuickSettings(prev => ({ ...prev, [key]: value }))
  }, 150),
  []
)
```

---

## 10. Testing Checklist

### 10.1 Functional Tests
- [ ] Quick mode shows 3 sliders only
- [ ] Advanced toggle opens panel with slide animation
- [ ] ESC key closes panel
- [ ] Click outside panel closes it
- [ ] Mode toggle switches between quick/advanced
- [ ] Settings persist when switching modes
- [ ] Prompt updates reflect quick settings changes

### 10.2 Visual Tests
- [ ] Panel shadow visible over canvas
- [ ] Slide animation smooth (no jank)
- [ ] Collapsed sections show chevron rotation
- [ ] Hover states on all interactive elements
- [ ] Focus indicators visible on keyboard navigation

### 10.3 Accessibility Tests
- [ ] Screen reader announces panel open/close
- [ ] All sliders have aria-labels
- [ ] Focus trap works in advanced panel
- [ ] Keyboard shortcuts function correctly
- [ ] Color contrast meets WCAG AA standards

---

## 11. Future Enhancements

### Phase 2 Ideas
1. **Smart Presets** - AI suggests preset based on uploaded image
2. **Comparison View** - Side-by-side before/after in quick mode
3. **Favorites** - Star frequently-used settings
4. **Undo/Redo** - Setting history stack
5. **Preset Categories** - Organize by use case (jewelry, apparel, etc.)

---

## 12. Implementation Estimate

| Phase | Tasks | Effort |
|-------|-------|--------|
| **Phase 1** | Create new components (4 files) | 3-4 hours |
| **Phase 2** | Integrate into Studio.tsx | 2-3 hours |
| **Phase 3** | Style refinements + animations | 2 hours |
| **Phase 4** | Accessibility enhancements | 2 hours |
| **Phase 5** | Testing + bug fixes | 2 hours |
| **Total** | | **11-13 hours** |

---

## 13. Success Metrics

After launch, measure:
- **Quick mode usage**: % of users who stay in quick mode
- **Advanced adoption**: % who switch to advanced within first session
- **Time to first generation**: Compare before/after redesign
- **Preset creation rate**: Indicator of power user engagement
- **Task completion**: % who successfully generate image without errors

---

**Ready to implement?** This spec provides everything needed to build the enhanced Studio UI. Start with Phase 1 (new components), then integrate into Studio.tsx.

**Questions or adjustments needed?** Let me know if you want to:
- Adjust the number of quick controls (more/fewer sliders)
- Change panel behavior (drawer vs modal)
- Modify default expanded sections
- Add additional features

---

*Designed by Uma | UX Designer*
