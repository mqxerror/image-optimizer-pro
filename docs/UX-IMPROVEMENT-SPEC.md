# UX Improvement Specification
## Image Optimizer Pro

**Document Version:** 1.0
**Date:** December 12, 2024
**Author:** Uma (UX Designer)
**Status:** Ready for Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Priority Matrix](#priority-matrix)
3. [High Priority Improvements](#high-priority-improvements)
4. [Medium Priority Improvements](#medium-priority-improvements)
5. [Low Priority Improvements](#low-priority-improvements)
6. [Accessibility Requirements](#accessibility-requirements)
7. [Success Metrics](#success-metrics)
8. [Implementation Notes](#implementation-notes)

---

## Executive Summary

This document outlines UX improvements identified through a comprehensive user flow audit of Image Optimizer Pro. The recommendations are prioritized by impact and effort, with clear acceptance criteria for each improvement.

**Key Findings:**
- New user onboarding lacks guidance (high drop-off risk)
- Token cost visibility is insufficient (trust issue)
- Critical actions are buried in menus (reduced engagement)
- Processing completion feedback is minimal (missed delight opportunity)

**Estimated Impact:**
- 30% reduction in time-to-first-value
- 25% improvement in project completion rate
- 15% increase in user retention (projected)

---

## Priority Matrix

| Priority | Impact | Effort | Count |
|----------|--------|--------|-------|
| P0 - Critical | High | Low-Medium | 4 |
| P1 - High | High | Medium | 6 |
| P2 - Medium | Medium | Medium | 8 |
| P3 - Low | Low | Low | 5 |

---

## High Priority Improvements

### UX-001: Empty Dashboard State with CTAs

**Priority:** P0 - Critical
**Effort:** Low (2-4 hours)
**Location:** `src/pages/Dashboard.tsx`

**Problem:**
New users see a dashboard with zeros and no clear next action. This creates confusion and increases drop-off.

**User Story:**
> As a new user, I want to see clear guidance on what to do first, so I can quickly start using the product.

**Acceptance Criteria:**
- [ ] When user has 0 projects, show empty state card
- [ ] Empty state includes illustration/icon
- [ ] Primary CTA: "Create Your First Project" button
- [ ] Secondary CTA: "Connect Google Drive" if not connected
- [ ] Show setup progress: "Complete setup: X/3 steps"

**Implementation:**

```tsx
// Add to Dashboard.tsx after stats cards section
{projects?.length === 0 && (
  <Card className="border-dashed border-2 border-slate-200 bg-gradient-to-br from-blue-50/50 to-white">
    <div className="py-12 text-center">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-50 scale-150" />
        <div className="relative p-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
          <Sparkles className="h-12 w-12 text-blue-500" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-800">
        Welcome to Image Optimizer Pro!
      </h3>
      <p className="text-slate-500 mt-2 max-w-md mx-auto">
        Transform your product images with AI-powered enhancement.
        Let's get you started in 3 easy steps.
      </p>

      {/* Setup Progress */}
      <div className="flex justify-center gap-4 mt-6 mb-8">
        <SetupStep
          number={1}
          label="Connect Drive"
          completed={hasGoogleDrive}
        />
        <SetupStep
          number={2}
          label="Create Project"
          completed={false}
        />
        <SetupStep
          number={3}
          label="Process Images"
          completed={false}
        />
      </div>

      <div className="flex justify-center gap-3">
        {!hasGoogleDrive ? (
          <Button onClick={connectGoogleDrive}>
            <HardDrive className="h-4 w-4 mr-2" />
            Connect Google Drive
          </Button>
        ) : (
          <Button onClick={() => navigate('/projects?new=true')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        )}
      </div>
    </div>
  </Card>
)}
```

**Design Specs:**
- Background: Gradient from blue-50 to white
- Icon: Use Sparkles or Wand2 from lucide-react
- Progress steps: Circular badges with checkmarks when complete

---

### UX-002: Prominent "Start Processing" Button

**Priority:** P0 - Critical
**Effort:** Low (1-2 hours)
**Location:** `src/pages/Projects.tsx`

**Problem:**
The "Start Processing" action is buried in a dropdown menu. Users don't discover how to begin processing.

**User Story:**
> As a user with a draft project, I want to easily start processing, so I don't have to search for the action.

**Acceptance Criteria:**
- [ ] Draft projects show a visible "Start" button on the card/row
- [ ] Button uses green color to indicate positive action
- [ ] Shows token cost estimate on hover tooltip
- [ ] Disabled state with tooltip if insufficient tokens

**Implementation:**

```tsx
// In Projects table row, add before the dropdown menu
{project.status === 'draft' && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => startProcessing(project.id)}
          disabled={insufficientTokens}
        >
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Process {project.total_images} images (~{estimatedTokens} tokens)</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

---

### UX-003: Token Cost Estimate in Project Wizard

**Priority:** P0 - Critical
**Effort:** Medium (4-6 hours)
**Location:** `src/components/project-wizard/ReviewStep.tsx`

**Problem:**
Users don't know how many tokens a project will cost before creating it. This creates anxiety and reduces trust.

**User Story:**
> As a user creating a project, I want to see the estimated token cost, so I can make informed decisions.

**Acceptance Criteria:**
- [ ] Step 1: Show image count after folder selection
- [ ] Step 4 (Review): Show estimated token cost
- [ ] Show warning if cost exceeds current balance
- [ ] Link to purchase tokens if balance insufficient

**Implementation:**

```tsx
// In Step 1 - After folder selection
{selectedFolder && (
  <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
    <FolderOpen className="h-5 w-5 text-blue-600" />
    <div>
      <p className="font-medium text-blue-900">
        {folderImageCount} images found
      </p>
      <p className="text-sm text-blue-700">
        Estimated cost: ~{folderImageCount} tokens
      </p>
    </div>
  </div>
)}

// In Step 4 - Review section
<Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Coins className="h-6 w-6 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-900">Estimated Cost</p>
          <p className="text-sm text-amber-700">
            {imageCount} images × 1 token = {imageCount} tokens
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-amber-800">{imageCount}</p>
        <p className="text-xs text-amber-600">tokens</p>
      </div>
    </div>

    {imageCount > tokenBalance && (
      <Alert className="mt-3 bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          Insufficient tokens. Current balance: {tokenBalance}.
          <Button variant="link" className="text-red-700 underline p-0 h-auto ml-1">
            Purchase more tokens
          </Button>
        </AlertDescription>
      </Alert>
    )}
  </CardContent>
</Card>
```

**API Requirement:**
- Need endpoint or client-side logic to count images in selected Google Drive folder
- Alternatively, fetch count after folder selection via existing Drive API

---

### UX-004: Processing Completion Notification

**Priority:** P0 - Critical
**Effort:** Low (2-3 hours)
**Location:** `src/hooks/useQueueRealtime.ts`, `src/components/Layout.tsx`

**Problem:**
Users don't know when their processing is complete unless they're watching the Queue page.

**User Story:**
> As a user with images processing, I want to be notified when complete, so I can review my results.

**Acceptance Criteria:**
- [ ] Toast notification when project processing completes
- [ ] Toast includes "View Results" action button
- [ ] Optional: Browser notification (with permission)
- [ ] Queue badge in sidebar shows count (already exists, verify)

**Implementation:**

```tsx
// In useQueueRealtime.ts - Add project completion detection
useEffect(() => {
  // Subscribe to processing_history inserts for completion events
  const channel = supabase
    .channel('processing-complete')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'processing_history',
        filter: `organization_id=eq.${organization?.id}`
      },
      (payload) => {
        // Check if this completes a project
        checkProjectCompletion(payload.new.project_id)
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [organization?.id])

const checkProjectCompletion = async (projectId: string) => {
  const { data: project } = await supabase
    .from('projects')
    .select('name, total_images, processed_images')
    .eq('id', projectId)
    .single()

  if (project && project.processed_images >= project.total_images) {
    toast({
      title: `${project.name} completed!`,
      description: `All ${project.total_images} images have been processed.`,
      action: (
        <ToastAction
          altText="View Results"
          onClick={() => navigate(`/history?project=${projectId}`)}
        >
          View Results
        </ToastAction>
      ),
      duration: 10000, // Keep visible longer for important notification
    })
  }
}
```

---

### UX-005: Folder Preview with Image Count

**Priority:** P1 - High
**Effort:** Medium (6-8 hours)
**Location:** `src/components/google-drive/GoogleDriveBrowser.tsx`

**Problem:**
Users can't preview folder contents before selecting, leading to wrong folder selections.

**User Story:**
> As a user selecting a folder, I want to preview its contents, so I can confirm I'm selecting the right folder.

**Acceptance Criteria:**
- [ ] Hovering/clicking folder shows preview panel
- [ ] Preview shows first 6 image thumbnails
- [ ] Shows total image count in folder
- [ ] Shows folder size (if available)
- [ ] "Select This Folder" button in preview

**Implementation:**

```tsx
// New component: FolderPreview.tsx
interface FolderPreviewProps {
  folderId: string
  folderName: string
  onSelect: () => void
}

export function FolderPreview({ folderId, folderName, onSelect }: FolderPreviewProps) {
  const { data: preview, isLoading } = useQuery({
    queryKey: ['folder-preview', folderId],
    queryFn: () => fetchFolderPreview(folderId),
    enabled: !!folderId
  })

  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">{folderName}</h4>
        <Badge variant="secondary">
          {preview?.imageCount || 0} images
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="aspect-square rounded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {preview?.thumbnails?.slice(0, 6).map((thumb, i) => (
            <img
              key={i}
              src={thumb.url}
              alt={thumb.name}
              className="aspect-square object-cover rounded"
            />
          ))}
        </div>
      )}

      <Button
        className="w-full mt-4"
        onClick={onSelect}
      >
        Select This Folder ({preview?.imageCount} images)
      </Button>
    </div>
  )
}
```

**API Requirement:**
- Edge function to fetch folder image list with thumbnails
- Cache results to avoid repeated Drive API calls

---

### UX-006: First-Time User Onboarding Tour

**Priority:** P1 - High
**Effort:** High (8-12 hours)
**Location:** New component + `src/pages/Dashboard.tsx`

**Problem:**
New users have no guidance on how to use the application effectively.

**User Story:**
> As a new user, I want a guided tour of key features, so I can understand how to use the product.

**Acceptance Criteria:**
- [ ] Tour triggers on first login (track in user metadata)
- [ ] 5-step tour highlighting key areas
- [ ] Skip option available
- [ ] "Don't show again" checkbox
- [ ] Can replay from Settings

**Tour Steps:**
1. **Dashboard Overview** - "This is your command center. See your token balance and quick stats."
2. **Create Project** - "Start here to process a batch of images from Google Drive."
3. **Studio** - "Need to enhance just one image? Use Studio for quick edits."
4. **Queue** - "Monitor your processing jobs in real-time here."
5. **History** - "View all your processed images and re-optimize if needed."

**Implementation:**

```tsx
// Use react-joyride or similar library
import Joyride, { Step } from 'react-joyride'

const tourSteps: Step[] = [
  {
    target: '[data-tour="dashboard-stats"]',
    content: 'Welcome! This is your dashboard. Track your token balance and processing stats at a glance.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="new-project"]',
    content: 'Create a new project to process multiple images from your Google Drive folder.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-studio"]',
    content: 'Use Studio to enhance individual images with AI. Perfect for quick edits!',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-queue"]',
    content: 'Monitor your processing queue in real-time. See progress and manage jobs.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-history"]',
    content: 'View all processed images here. Compare results and re-optimize if needed.',
    placement: 'right',
  },
]

// In Dashboard.tsx
const [runTour, setRunTour] = useState(false)

useEffect(() => {
  const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour')
  if (!hasSeenTour && user) {
    setRunTour(true)
  }
}, [user])

const handleTourComplete = () => {
  localStorage.setItem('hasSeenOnboardingTour', 'true')
  setRunTour(false)
}

return (
  <>
    <Joyride
      steps={tourSteps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={({ status }) => {
        if (status === 'finished' || status === 'skipped') {
          handleTourComplete()
        }
      }}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          zIndex: 10000,
        }
      }}
    />
    {/* Rest of dashboard */}
  </>
)
```

**Dependencies:**
- Install: `npm install react-joyride`
- Add data-tour attributes to navigation items in Layout.tsx

---

### UX-007: Template vs Preset Explanation

**Priority:** P1 - High
**Effort:** Low (2-3 hours)
**Location:** `src/components/project-wizard/PromptStep.tsx`

**Problem:**
Users don't understand the difference between Templates, Presets, and Custom prompts.

**User Story:**
> As a user configuring prompts, I want to understand my options, so I can choose the best approach.

**Acceptance Criteria:**
- [ ] Each option has a clear description
- [ ] Tooltip or info icon with detailed explanation
- [ ] Visual differentiation between options
- [ ] Recommendation badge on suggested option

**Implementation:**

```tsx
const promptOptions = [
  {
    id: 'template',
    title: 'Use Template',
    description: 'Pre-built prompts optimized for specific product categories',
    icon: FileText,
    recommended: true,
    tooltip: 'Templates are professionally crafted prompts for jewelry, fashion, food, and more. Best for consistent results across many images.'
  },
  {
    id: 'preset',
    title: 'Use Studio Preset',
    description: 'Your saved settings from Studio experiments',
    icon: Sliders,
    recommended: false,
    tooltip: 'Presets capture your exact Studio settings including lighting, camera angles, and backgrounds. Great for recreating a specific look.'
  },
  {
    id: 'custom',
    title: 'Custom Prompt',
    description: 'Write your own AI instructions',
    icon: Wand2,
    recommended: false,
    tooltip: 'Full control over the AI prompt. Best for advanced users who want precise control over the output.'
  }
]

// Render with cards
<RadioGroup value={mode} onValueChange={setMode}>
  <div className="grid gap-3">
    {promptOptions.map((option) => (
      <label
        key={option.id}
        className={`
          relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer
          transition-all duration-200
          ${mode === option.id
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }
        `}
      >
        <RadioGroupItem value={option.id} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <option.icon className="h-5 w-5 text-slate-600" />
            <span className="font-medium">{option.title}</span>
            {option.recommended && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                Recommended
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{option.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {option.description}
          </p>
        </div>
      </label>
    ))}
  </div>
</RadioGroup>
```

---

### UX-008: Before/After Comparison Slider

**Priority:** P1 - High
**Effort:** Medium (4-6 hours)
**Location:** `src/pages/History.tsx`, `src/pages/Studio.tsx`

**Problem:**
Users can't easily compare original and processed images side-by-side with a slider.

**User Story:**
> As a user reviewing results, I want to slide between before/after views, so I can evaluate the improvement.

**Acceptance Criteria:**
- [ ] Draggable slider divider
- [ ] Works on touch devices
- [ ] Keyboard accessible (arrow keys)
- [ ] Shows in History detail view and Studio

**Implementation:**

```tsx
// New component: BeforeAfterSlider.tsx
import { useState, useRef, useCallback } from 'react'

interface BeforeAfterSliderProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'Enhanced'
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  const handleMouseDown = () => { isDragging.current = true }
  const handleMouseUp = () => { isDragging.current = false }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setSliderPosition(p => Math.max(0, p - 5))
    if (e.key === 'ArrowRight') setSliderPosition(p => Math.min(100, p + 5))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-lg cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-valuenow={sliderPosition}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Image comparison slider"
    >
      {/* After Image (Full width, behind) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Before Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            width: containerRef.current?.offsetWidth || '100%',
            maxWidth: 'none'
          }}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <GripVertical className="h-5 w-5 text-slate-400" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded backdrop-blur-sm">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded backdrop-blur-sm">
        {afterLabel}
      </div>
    </div>
  )
}
```

**Usage:**
```tsx
<BeforeAfterSlider
  beforeImage={item.original_url}
  afterImage={item.optimized_url}
/>
```

---

### UX-009: Project Progress on Projects Page

**Priority:** P1 - High
**Effort:** Low (2-3 hours)
**Location:** `src/pages/Projects.tsx`

**Problem:**
Users can't see overall project completion progress without opening each project.

**User Story:**
> As a user with multiple projects, I want to see processing progress at a glance, so I can monitor all jobs.

**Acceptance Criteria:**
- [ ] Progress bar on each project card/row
- [ ] Shows X/Y images processed
- [ ] Visual indicator for completed projects
- [ ] Real-time updates via existing subscription

**Implementation:**

```tsx
// In Projects table row
<TableCell className="w-40">
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-slate-500">
      <span>{project.processed_images} / {project.total_images}</span>
      <span>{Math.round((project.processed_images / project.total_images) * 100)}%</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          project.processed_images >= project.total_images
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : 'bg-gradient-to-r from-blue-400 to-indigo-500'
        }`}
        style={{
          width: `${(project.processed_images / project.total_images) * 100}%`
        }}
      />
    </div>
  </div>
</TableCell>
```

---

### UX-010: Bulk Download Functionality

**Priority:** P1 - High
**Effort:** High (8-12 hours)
**Location:** `src/components/project-detail/ExportTab.tsx`

**Problem:**
Users can't download all processed images from a project at once.

**User Story:**
> As a user with a completed project, I want to download all images, so I can use them elsewhere.

**Acceptance Criteria:**
- [ ] "Download All" button in Project Export tab
- [ ] Creates ZIP file with all optimized images
- [ ] Shows progress during ZIP creation
- [ ] Works for large projects (100+ images)
- [ ] Includes original filenames

**Implementation:**

```tsx
// Use JSZip library (already in project)
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

async function downloadAllImages(projectId: string, projectName: string) {
  setIsDownloading(true)
  setDownloadProgress(0)

  try {
    // Fetch all processed images for project
    const { data: images } = await supabase
      .from('processing_history')
      .select('file_name, optimized_url')
      .eq('project_id', projectId)
      .eq('status', 'success')

    if (!images?.length) {
      toast({ title: 'No images to download', variant: 'destructive' })
      return
    }

    const zip = new JSZip()
    const folder = zip.folder(projectName)

    // Download and add each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      setDownloadProgress(Math.round((i / images.length) * 80))

      try {
        const response = await fetch(image.optimized_url)
        const blob = await response.blob()
        folder?.file(image.file_name, blob)
      } catch (err) {
        console.error(`Failed to download ${image.file_name}`)
      }
    }

    setDownloadProgress(90)

    // Generate and save ZIP
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${projectName}-optimized.zip`)

    setDownloadProgress(100)
    toast({ title: 'Download complete!' })
  } catch (error) {
    toast({
      title: 'Download failed',
      description: error.message,
      variant: 'destructive'
    })
  } finally {
    setIsDownloading(false)
    setDownloadProgress(0)
  }
}

// UI Component
<Card className="p-6">
  <h3 className="font-semibold mb-4">Bulk Download</h3>
  <p className="text-sm text-slate-500 mb-4">
    Download all {successCount} optimized images as a ZIP file.
  </p>

  {isDownloading ? (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Creating ZIP file...</span>
        <span>{downloadProgress}%</span>
      </div>
      <Progress value={downloadProgress} />
    </div>
  ) : (
    <Button
      onClick={() => downloadAllImages(project.id, project.name)}
      className="w-full"
    >
      <Download className="h-4 w-4 mr-2" />
      Download All ({successCount} images)
    </Button>
  )}
</Card>
```

**Dependencies:**
- JSZip already installed
- May need `file-saver`: `npm install file-saver @types/file-saver`

---

## Medium Priority Improvements

### UX-011: Version Badges on Thumbnails

**Priority:** P2
**Effort:** Low (1-2 hours)
**Location:** `src/pages/History.tsx`

**Acceptance Criteria:**
- [ ] Show "v2", "v3" badge on re-optimized images
- [ ] Badge links to version history
- [ ] Original shows no badge (v1 implicit)

```tsx
{item.version > 1 && (
  <Badge
    className="absolute bottom-1 right-1 bg-purple-100 text-purple-700 text-[10px]"
    onClick={(e) => {
      e.stopPropagation()
      showVersionHistory(item.id)
    }}
  >
    v{item.version}
  </Badge>
)}
```

---

### UX-012: Simplified Re-optimize Flow

**Priority:** P2
**Effort:** Medium (3-4 hours)
**Location:** `src/pages/History.tsx`

**Acceptance Criteria:**
- [ ] Default option: "Try again with same settings"
- [ ] Expandable "Change settings" section
- [ ] Remember last used settings per user

---

### UX-013: Drag-and-Drop Upload in Studio

**Priority:** P2
**Effort:** Low (2-3 hours)
**Location:** `src/pages/Studio.tsx`

**Acceptance Criteria:**
- [ ] Drag zone visual feedback
- [ ] Accept drag from file explorer
- [ ] Accept paste from clipboard (Ctrl+V)
- [ ] Show file type validation errors

---

### UX-014: Quick/Advanced Mode Toggle in Studio

**Priority:** P2
**Effort:** Medium (4-6 hours)
**Location:** `src/pages/Studio.tsx`

**Acceptance Criteria:**
- [ ] Default to "Quick" mode with presets only
- [ ] "Advanced" mode reveals all sliders
- [ ] Remember preference

---

### UX-015: Processing Success Celebration

**Priority:** P2
**Effort:** Low (2-3 hours)
**Location:** `src/pages/Queue.tsx`, `src/pages/History.tsx`

**Acceptance Criteria:**
- [ ] Confetti animation on first project completion
- [ ] Success message with stats
- [ ] Shareable achievement (optional)

```tsx
// Use canvas-confetti
import confetti from 'canvas-confetti'

const celebrateCompletion = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
}
```

---

### UX-016: Results Quality Feedback

**Priority:** P2
**Effort:** Medium (4-6 hours)
**Location:** `src/pages/History.tsx`

**Acceptance Criteria:**
- [ ] Thumbs up/down on each result
- [ ] Optional feedback text
- [ ] Data stored for future prompt improvements
- [ ] Analytics dashboard (future)

---

### UX-017: "Use on Project" from Studio

**Priority:** P2
**Effort:** Medium (4-6 hours)
**Location:** `src/pages/Studio.tsx`

**Acceptance Criteria:**
- [ ] After successful generation, show "Apply to Project" button
- [ ] Opens project selection dialog
- [ ] Saves current settings as preset automatically

---

### UX-018: Enhanced Loading Skeletons

**Priority:** P2
**Effort:** Low (2-3 hours)
**Location:** Multiple pages

**Acceptance Criteria:**
- [ ] Skeleton matches actual content layout
- [ ] Subtle shimmer animation
- [ ] Consistent across all pages

---

## Low Priority Improvements

### UX-019: Keyboard Shortcuts

**Priority:** P3
**Effort:** Medium (4-6 hours)

**Shortcuts to implement:**
- `N` - New project
- `S` - Open Studio
- `Q` - Go to Queue
- `H` - Go to History
- `/` - Focus search
- `?` - Show shortcut help

---

### UX-020: Image Zoom on Hover

**Priority:** P3
**Effort:** Low (1-2 hours)

**Acceptance Criteria:**
- [ ] Hover on thumbnail shows larger preview
- [ ] Preview follows cursor
- [ ] Works in both table and grid views

---

### UX-021: Recent Searches

**Priority:** P3
**Effort:** Low (2-3 hours)

**Acceptance Criteria:**
- [ ] Store last 5 searches per page
- [ ] Show as dropdown suggestions
- [ ] Clear history option

---

### UX-022: Dark Mode Support

**Priority:** P3
**Effort:** High (12-16 hours)

**Acceptance Criteria:**
- [ ] System preference detection
- [ ] Manual toggle in settings
- [ ] All gradients adapted for dark mode
- [ ] Proper contrast ratios maintained

---

### UX-023: Mobile Responsive Improvements

**Priority:** P3
**Effort:** High (8-12 hours)

**Acceptance Criteria:**
- [ ] Collapsible sidebar on mobile
- [ ] Touch-friendly buttons (48px min)
- [ ] Swipe gestures for navigation
- [ ] Optimized grid layouts

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance Checklist

| Requirement | WCAG | Priority | Status |
|-------------|------|----------|--------|
| Color contrast 4.5:1 for text | 1.4.3 | P0 | Audit needed |
| Non-color status indicators | 1.4.1 | P1 | Add icons to badges |
| Focus visible indicators | 2.4.7 | P0 | Fix custom buttons |
| Skip navigation link | 2.4.1 | P2 | Add to Layout |
| Image alt text | 1.1.1 | P1 | Add to thumbnails |
| Form labels | 1.3.1 | P1 | Audit needed |
| Error identification | 3.3.1 | P1 | Audit needed |
| Keyboard navigation | 2.1.1 | P0 | Test all flows |

### Specific Fixes Needed

**1. Status Badges (Queue, History)**
```tsx
// Current (color only)
<Badge className="bg-green-100 text-green-700">Success</Badge>

// Improved (icon + color)
<Badge className="bg-green-100 text-green-700">
  <CheckCircle className="h-3 w-3 mr-1" />
  Success
</Badge>
```

**2. Custom Pill Buttons (Filter Bar)**
```tsx
// Add focus-visible styling
<button
  className={`
    ... existing classes ...
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
  `}
>
```

**3. Skip Navigation Link**
```tsx
// Add to Layout.tsx, first element
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:shadow-lg focus:rounded"
>
  Skip to main content
</a>

// Add id to main content area
<main id="main-content" className="flex-1 ...">
```

**4. Thumbnail Alt Text**
```tsx
<img
  src={thumbnail}
  alt={`${fileName} - ${status} - processed on ${date}`}
/>
```

---

## Success Metrics

### Key Performance Indicators

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Time to first processed image | ~10 clicks | ~5 clicks | Analytics |
| Project completion rate | Unknown | 80%+ | DB query |
| Re-optimization rate | Unknown | < 20% | DB query |
| User retention (7-day) | Unknown | 60%+ | Analytics |
| Support tickets (UX-related) | Unknown | -50% | Support system |

### How to Measure

1. **Analytics Events to Add:**
   - `project_created` - When project wizard completes
   - `processing_started` - When user starts processing
   - `processing_viewed` - When user checks results
   - `image_reoptimized` - When re-optimize is used
   - `image_downloaded` - When download action taken
   - `tour_completed` - When onboarding tour finishes
   - `tour_skipped` - When tour is skipped

2. **Database Queries:**
```sql
-- Project completion rate
SELECT
  COUNT(*) FILTER (WHERE processed_images >= total_images) * 100.0 / COUNT(*) as completion_rate
FROM projects
WHERE created_at > NOW() - INTERVAL '30 days';

-- Re-optimization rate
SELECT
  COUNT(*) FILTER (WHERE version > 1) * 100.0 / COUNT(*) as reopt_rate
FROM processing_history
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## Implementation Notes

### Recommended Implementation Order

**Sprint 1 (Week 1-2): Critical Path**
1. UX-001: Empty Dashboard State
2. UX-002: Start Processing Button
3. UX-003: Token Cost Estimate
4. UX-004: Completion Notification

**Sprint 2 (Week 3-4): User Guidance**
5. UX-006: Onboarding Tour
6. UX-007: Template/Preset Explanation
7. UX-005: Folder Preview

**Sprint 3 (Week 5-6): Enhanced Experience**
8. UX-008: Before/After Slider
9. UX-009: Project Progress
10. UX-010: Bulk Download

**Sprint 4 (Week 7-8): Polish**
11. Accessibility fixes
12. Remaining P2 items
13. Testing and refinement

### Dependencies to Install

```bash
npm install react-joyride canvas-confetti file-saver @types/file-saver
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Empty state, tour, data-tour attributes |
| `src/pages/Projects.tsx` | Start button, progress bar |
| `src/pages/Studio.tsx` | Drag-drop, comparison slider |
| `src/pages/History.tsx` | Version badges, comparison slider |
| `src/pages/Queue.tsx` | Completion celebration |
| `src/components/Layout.tsx` | Skip nav, tour attributes |
| `src/components/project-wizard/*` | Cost estimate, folder preview |
| `src/components/project-detail/ExportTab.tsx` | Bulk download |
| `src/hooks/useQueueRealtime.ts` | Completion notification |

### New Components to Create

| Component | Purpose |
|-----------|---------|
| `BeforeAfterSlider.tsx` | Image comparison |
| `FolderPreview.tsx` | Drive folder preview |
| `SetupProgress.tsx` | Onboarding progress steps |
| `OnboardingTour.tsx` | Joyride wrapper |

---

## Questions for Stakeholders

1. **Token Visibility:** Should we show token balance in header at all times?
2. **Onboarding:** Is email-based onboarding (drip campaign) also planned?
3. **Analytics:** Which analytics platform should we integrate?
4. **Dark Mode:** Is this a priority for target users?
5. **Mobile:** What percentage of users are on mobile devices?

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-12 | Uma | Initial specification |

---

*Document prepared by Uma, UX Designer*
*For questions, contact the product team*
