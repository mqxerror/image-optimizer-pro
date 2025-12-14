# UX Implementation Plan — Image Optimizer Pro

**Prepared by:** Uma (UX Designer)
**Date:** December 2024
**Version:** 1.0

---

## Executive Summary

This document outlines 5 UX improvements prioritized by user impact. Each phase is designed to be implemented incrementally without breaking existing functionality.

**Implementation Order:**
1. Phase 1: First-Time Experience (Low effort, High impact)
2. Phase 2: Mode Indicator Improvements (Low effort, Medium impact)
3. Phase 3: Unified Activity Page (Medium effort, High impact)
4. Phase 4: Navigation Consolidation (Medium effort, Medium impact)
5. Phase 5: Studio Sidebar Redesign (Medium effort, Medium impact)

---

## Phase 1: First-Time Experience

### Objective
Help new users understand the difference between Presets (visual settings) and Templates (pre-written prompts).

### Files to Create
```
src/components/onboarding/
├── StudioWelcomeModal.tsx      # NEW - First-time welcome modal
├── ContextualHint.tsx          # NEW - Reusable hint tooltip component
└── useFirstTimeUser.ts         # NEW - Hook to track first-time states
```

### Files to Modify
```
src/pages/Studio.tsx                           # Add welcome modal trigger
src/components/studio/StudioPresetsSidebar.tsx # Add contextual hints
src/stores/                                    # Add onboarding state (or use localStorage)
```

### Implementation Details

#### 1.1 Create `useFirstTimeUser` Hook

```typescript
// src/hooks/useFirstTimeUser.ts

interface FirstTimeFlags {
  hasSeenStudioWelcome: boolean
  hasSeenPresetHint: boolean
  hasSeenTemplateHint: boolean
  presetUsageCount: number
  templateUsageCount: number
}

export function useFirstTimeUser() {
  // Read from localStorage
  // Provide methods: markAsSeen(flag), shouldShow(flag), incrementUsage(type)
  // Auto-dismiss hints after 3 uses
}
```

#### 1.2 Create `StudioWelcomeModal` Component

**Trigger:** Show on first visit to Studio page (check `hasSeenStudioWelcome`)

**Content Structure:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     ✨ Welcome to Studio                                │
│                                                         │
│     Two ways to style your jewelry photos:              │
│                                                         │
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │  🎨 Visual         │  │  📝 Prompt         │        │
│  │  Presets           │  │  Templates         │        │
│  │                    │  │                    │        │
│  │  Adjust sliders    │  │  Use pre-written   │        │
│  │  for lighting,     │  │  AI instructions   │        │
│  │  camera, etc.      │  │  as-is             │        │
│  │                    │  │                    │        │
│  │  Best for:         │  │  Best for:         │        │
│  │  Fine control      │  │  Quick results     │        │
│  └────────────────────┘  └────────────────────┘        │
│                                                         │
│        [ Start with Presets (Recommended) ]             │
│                                                         │
│              Skip, I'll explore                         │
└─────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface StudioWelcomeModalProps {
  open: boolean
  onClose: () => void
  onSelectPresets: () => void
  onSelectTemplates: () => void
}
```

#### 1.3 Create `ContextualHint` Component

**Reusable tooltip that appears near UI elements:**

```typescript
// src/components/onboarding/ContextualHint.tsx

interface ContextualHintProps {
  id: string                    // Unique ID for localStorage tracking
  children: React.ReactNode     // The element to attach hint to
  hint: string                  // Hint text
  position?: 'top' | 'bottom' | 'left' | 'right'
  showAfterMs?: number          // Delay before showing (default: 500)
  maxShowCount?: number         // Auto-hide after N shows (default: 3)
}
```

**Usage in StudioPresetsSidebar:**
```tsx
<ContextualHint
  id="templates-vs-presets"
  hint="Templates use exact prompts. Presets generate prompts from settings."
  position="bottom"
  maxShowCount={3}
>
  <TabsList>...</TabsList>
</ContextualHint>
```

#### 1.4 Update Studio.tsx

```typescript
// Add to Studio.tsx

import { StudioWelcomeModal } from '@/components/onboarding/StudioWelcomeModal'
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser'

export default function Studio() {
  const { shouldShow, markAsSeen } = useFirstTimeUser()
  const [showWelcome, setShowWelcome] = useState(() => shouldShow('studioWelcome'))

  const handleWelcomeClose = () => {
    markAsSeen('studioWelcome')
    setShowWelcome(false)
  }

  // ... rest of component

  return (
    <>
      <StudioWelcomeModal
        open={showWelcome}
        onClose={handleWelcomeClose}
        onSelectPresets={() => {
          handleWelcomeClose()
          // Optionally switch to presets tab
        }}
        onSelectTemplates={() => {
          handleWelcomeClose()
          // Switch to templates tab
        }}
      />
      {/* ... rest of UI */}
    </>
  )
}
```

### Acceptance Criteria
- [ ] First-time users see welcome modal explaining Presets vs Templates
- [ ] Modal has clear visual distinction between the two options
- [ ] "Start with Presets" is highlighted as recommended
- [ ] User can skip/dismiss and never see it again
- [ ] Contextual hints appear near tabs for first 3 uses
- [ ] All states persist in localStorage

### Testing Checklist
- [ ] Clear localStorage, visit Studio → Modal appears
- [ ] Click "Skip" → Modal never appears again
- [ ] Click "Start with Presets" → Presets tab active, modal closes
- [ ] Hints appear on first 3 visits, then stop

---

## Phase 2: Mode Indicator Improvements

### Objective
Make the current prompt mode (Template/Preset/Custom) more intuitive with clear state transitions.

### Files to Modify
```
src/pages/Studio.tsx    # Update mode indicator UI and transitions
```

### Files to Create
```
src/components/studio/PromptModeIndicator.tsx   # NEW - Extracted component
```

### Implementation Details

#### 2.1 Create `PromptModeIndicator` Component

Extract the current inline mode indicator into a reusable component:

```typescript
// src/components/studio/PromptModeIndicator.tsx

interface PromptModeIndicatorProps {
  mode: 'preset' | 'template' | 'custom'
  selectedName?: string        // Name of selected preset/template
  onClear?: () => void         // Callback to clear selection
  onModeChange?: (mode: string) => void
}

export function PromptModeIndicator({
  mode,
  selectedName,
  onClear,
}: PromptModeIndicatorProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30 border border-gray-700">
      <div className="flex items-center gap-2">
        {mode === 'template' && (
          <>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm text-blue-400">Using Template:</span>
            <span className="text-sm text-white font-medium">{selectedName}</span>
          </>
        )}
        {mode === 'preset' && selectedName && (
          <>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-sm text-purple-400">Using Preset:</span>
            <span className="text-sm text-white font-medium">{selectedName}</span>
          </>
        )}
        {mode === 'custom' && (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-400">Custom Settings</span>
          </>
        )}
      </div>

      {(mode === 'template' || (mode === 'preset' && selectedName)) && (
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700"
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}
```

#### 2.2 Add Toast Notifications for Mode Transitions

In Studio.tsx, add toasts when mode changes:

```typescript
// When user starts editing template text
const handlePromptChange = (value: string) => {
  setCustomPrompt(value)

  if (promptMode === 'template' && value !== originalTemplateText) {
    setPromptMode('custom')
    setSelectedTemplateId(null)
    toast({
      title: "Switched to Custom mode",
      description: "Your edits are preserved. Original template unchanged.",
      duration: 3000,
    })
  }
}
```

#### 2.3 Add Inline Hint Below Textarea

When in template mode, show a subtle hint:

```tsx
{promptMode === 'template' && (
  <p className="text-xs text-gray-500 mt-1">
    💡 Edit the text above to customize. This will switch to Custom mode.
  </p>
)}
```

### Acceptance Criteria
- [ ] Mode indicator shows the NAME of selected preset/template
- [ ] Clear button (✕) dismisses selection
- [ ] Toast appears when editing switches from template → custom
- [ ] Inline hint explains what happens when editing
- [ ] Visual distinction: blue for template, purple for preset, gray for custom

---

## Phase 3: Unified Activity Page

### Objective
Merge Queue, AI Jobs, and History into a single "Activity" page showing all images in a unified pipeline view.

### Files to Create
```
src/pages/Activity.tsx                          # NEW - Unified activity page
src/components/activity/
├── ActivityFilters.tsx                         # NEW - Filter controls
├── ActivityItem.tsx                            # NEW - Single item row
├── ActivityPipeline.tsx                        # NEW - Pipeline visualization
└── useActivityData.ts                          # NEW - Unified data hook
```

### Files to Modify
```
src/components/Layout.tsx    # Update navigation
src/App.tsx                  # Update routes
```

### Files to Keep (Not Delete Yet)
```
src/pages/Queue.tsx          # Keep for now, can deprecate later
src/pages/AiJobsDashboard.tsx
src/pages/History.tsx
```

### Database Considerations

**Option A: Use existing tables with a unified query**
- Query `processing_queue` + `ai_jobs` + `processing_history`
- Join/union in the frontend or via RPC function

**Option B: Create a unified view (Recommended)**
```sql
-- Create unified activity view
CREATE OR REPLACE VIEW activity_items AS
SELECT
  'queue' as source,
  id,
  organization_id,
  file_name,
  file_url as image_url,
  status,
  started_at as created_at,
  NULL as completed_at,
  NULL as result_url,
  error_message,
  ai_model,
  -- Map queue status to pipeline step
  CASE
    WHEN status = 'queued' THEN 'uploading'
    WHEN status = 'processing' THEN 'uploading'
    WHEN status = 'optimizing' THEN 'ai_processing'
    ELSE status
  END as pipeline_step
FROM processing_queue
WHERE status != 'completed'

UNION ALL

SELECT
  'ai_job' as source,
  id,
  organization_id,
  NULL as file_name,
  input_url as image_url,
  status,
  created_at,
  completed_at,
  result_url,
  error_message,
  ai_model,
  CASE
    WHEN status IN ('pending', 'submitted', 'processing') THEN 'ai_processing'
    WHEN status = 'success' THEN 'complete'
    ELSE status
  END as pipeline_step
FROM ai_jobs

UNION ALL

SELECT
  'history' as source,
  id,
  organization_id,
  file_name,
  original_url as image_url,
  status,
  started_at as created_at,
  completed_at,
  optimized_url as result_url,
  error_message,
  ai_model,
  'complete' as pipeline_step
FROM processing_history;
```

### Implementation Details

#### 3.1 Create `useActivityData` Hook

```typescript
// src/hooks/useActivityData.ts

interface ActivityItem {
  id: string
  source: 'queue' | 'ai_job' | 'history'
  fileName: string | null
  imageUrl: string | null
  resultUrl: string | null
  status: string
  pipelineStep: 'uploading' | 'ai_processing' | 'complete' | 'failed'
  createdAt: string
  completedAt: string | null
  aiModel: string | null
  errorMessage: string | null
  // Computed
  elapsedTime?: number
  stepNumber: 1 | 2 | 3
}

interface UseActivityDataOptions {
  organizationId: string
  filter?: 'all' | 'in_progress' | 'complete' | 'failed'
  limit?: number
}

export function useActivityData(options: UseActivityDataOptions) {
  // Fetch from activity_items view
  // Subscribe to realtime updates
  // Return { items, isLoading, refetch }
}
```

#### 3.2 Create `ActivityItem` Component

```typescript
// src/components/activity/ActivityItem.tsx

interface ActivityItemProps {
  item: ActivityItem
  onViewResult?: (item: ActivityItem) => void
}

export function ActivityItem({ item, onViewResult }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden">
        {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover" />}
      </div>

      {/* Pipeline Progress */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">{item.fileName || 'Image'}</span>
          <PipelineStepBadge step={item.pipelineStep} status={item.status} />
        </div>

        {/* Step Indicator: 1 → 2 → 3 */}
        <div className="flex items-center gap-2">
          <StepDot active={item.stepNumber >= 1} current={item.stepNumber === 1} />
          <span className="text-xs text-gray-400">Upload</span>
          <StepConnector completed={item.stepNumber > 1} />

          <StepDot active={item.stepNumber >= 2} current={item.stepNumber === 2} />
          <span className="text-xs text-gray-400">AI</span>
          <StepConnector completed={item.stepNumber > 2} />

          <StepDot active={item.stepNumber >= 3} current={item.stepNumber === 3} />
          <span className="text-xs text-gray-400">Done</span>
        </div>
      </div>

      {/* Actions */}
      <div>
        {item.resultUrl && (
          <Button size="sm" onClick={() => onViewResult?.(item)}>
            View Result
          </Button>
        )}
      </div>
    </div>
  )
}
```

#### 3.3 Create Activity Page

```typescript
// src/pages/Activity.tsx

export default function Activity() {
  const { organization } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'complete' | 'failed'>('all')

  const { items, isLoading } = useActivityData({
    organizationId: organization?.id,
    filter,
  })

  // Group items by status for tabs
  const inProgress = items.filter(i => ['uploading', 'ai_processing'].includes(i.pipelineStep))
  const completed = items.filter(i => i.pipelineStep === 'complete')
  const failed = items.filter(i => i.pipelineStep === 'failed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        <ActivityFilters filter={filter} onChange={setFilter} />
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4">
        <StatCard label="In Progress" value={inProgress.length} />
        <StatCard label="Completed Today" value={completed.length} />
        <StatCard label="Failed" value={failed.length} variant="error" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgress.length})
            {inProgress.length > 0 && <span className="ml-1 animate-pulse">●</span>}
          </TabsTrigger>
          <TabsTrigger value="complete">Complete ({completed.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-2">
            {items.map(item => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </div>
  )
}
```

#### 3.4 Update Navigation (Layout.tsx)

```typescript
// Temporary: Add Activity alongside existing pages
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Studio', href: '/studio', icon: Wand2, highlight: true },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Activity', href: '/activity', icon: Activity, isNew: true }, // NEW
  // Keep old ones during transition:
  { name: 'Queue', href: '/queue', icon: ListTodo, hidden: false },
  { name: 'History', href: '/history', icon: History, hidden: false },
  { name: 'Settings', href: '/settings', icon: Settings },
]
```

### Migration Strategy
1. **Week 1:** Deploy Activity page alongside existing pages
2. **Week 2:** Add "Try new Activity view" banner to Queue/History pages
3. **Week 3:** Collect user feedback
4. **Week 4:** If positive, hide old pages (don't delete)
5. **Week 5:** Remove old pages if no issues

### Acceptance Criteria
- [ ] Activity page shows unified view of all image processing
- [ ] Each item shows 3-step pipeline: Upload → AI → Done
- [ ] Real-time updates when status changes
- [ ] Tabs filter by status
- [ ] Old Queue/History pages still work during transition
- [ ] Users can access detailed views (click to expand)

---

## Phase 4: Navigation Consolidation

### Objective
Reduce navigation from 8 items to 5 for better cognitive load.

### Current Navigation (8 items)
```
Dashboard | Studio | Projects | Templates | Queue | AI Jobs | History | Settings
```

### Target Navigation (5 items)
```
Home | Studio | Projects | Activity | Settings
```

### Files to Modify
```
src/components/Layout.tsx    # Update navigation array
src/App.tsx                  # Update routes
src/pages/Settings.tsx       # Add Templates tab
```

### Implementation Details

#### 4.1 Move Templates into Settings

Templates are a configuration feature, not a daily workflow. Move them to Settings.

**Update Settings.tsx:**
```typescript
// src/pages/Settings.tsx

export default function Settings() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="templates">Prompt Templates</TabsTrigger>  {/* NEW */}
        <TabsTrigger value="tokens">Tokens</TabsTrigger>
        <TabsTrigger value="connections">Connections</TabsTrigger>
      </TabsList>

      <TabsContent value="templates">
        {/* Import and render Templates content here */}
        <TemplatesContent />
      </TabsContent>
      {/* ... other tabs */}
    </Tabs>
  )
}
```

**Extract Templates content:**
```typescript
// src/components/settings/TemplatesContent.tsx
// Move the content from src/pages/Templates.tsx here
```

#### 4.2 Update Layout.tsx Navigation

```typescript
const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Studio', href: '/studio', icon: Wand2, highlight: true },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]
```

#### 4.3 Add Redirects for Old URLs

In App.tsx, add redirects so old bookmarks still work:

```typescript
<Route path="/templates" element={<Navigate to="/settings?tab=templates" replace />} />
<Route path="/queue" element={<Navigate to="/activity?filter=in_progress" replace />} />
<Route path="/history" element={<Navigate to="/activity?filter=complete" replace />} />
<Route path="/ai-jobs" element={<Navigate to="/activity" replace />} />
```

### Acceptance Criteria
- [ ] Navigation shows exactly 5 items
- [ ] Templates accessible via Settings → Templates tab
- [ ] Old URLs redirect to new locations
- [ ] No broken links

---

## Phase 5: Studio Sidebar Redesign

### Objective
Replace tab-based navigation with a clearer card-based selection and collapsible "My Saved" section.

### Files to Modify
```
src/components/studio/StudioPresetsSidebar.tsx   # Complete redesign
```

### Implementation Details

#### 5.1 New Sidebar Structure

```typescript
// src/components/studio/StudioPresetsSidebar.tsx

export function StudioPresetsSidebar({
  selectedPresetId,
  selectedTemplateId,
  onSelectPreset,
  onSelectTemplate,
  onCreatePreset,
}: StudioPresetsSidebarProps) {
  const [activeSection, setActiveSection] = useState<'presets' | 'templates' | null>('presets')
  const [mySavedExpanded, setMySavedExpanded] = useState(false)

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-gray-900">Choose Your Style</h2>
        <p className="text-xs text-gray-500 mt-1">Select how to style your image</p>
      </div>

      {/* Style Selection Cards */}
      <div className="p-4 space-y-3">
        <StyleCard
          icon={<Palette />}
          title="Visual Presets"
          description="Adjust camera, lighting, and more"
          selected={activeSection === 'presets'}
          onClick={() => setActiveSection('presets')}
        />
        <StyleCard
          icon={<FileText />}
          title="Prompt Templates"
          description="Use pre-written AI prompts"
          selected={activeSection === 'templates'}
          onClick={() => setActiveSection('templates')}
        />
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <SearchInput
          placeholder={activeSection === 'templates' ? 'Search templates...' : 'Search presets...'}
        />
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        {activeSection === 'presets' && (
          <PresetsList
            presets={systemPresets}
            selectedId={selectedPresetId}
            onSelect={onSelectPreset}
          />
        )}
        {activeSection === 'templates' && (
          <TemplatesList
            templates={templates}
            selectedId={selectedTemplateId}
            onSelect={onSelectTemplate}
          />
        )}
      </ScrollArea>

      {/* My Saved Section (Collapsible) */}
      <Collapsible open={mySavedExpanded} onOpenChange={setMySavedExpanded}>
        <CollapsibleTrigger className="w-full p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span className="text-sm font-medium">My Saved</span>
            <Badge variant="secondary">{userPresets.length + userTemplates.length}</Badge>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition", mySavedExpanded && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-2 bg-gray-100">
            <Button variant="outline" size="sm" className="w-full" onClick={onCreatePreset}>
              <Plus className="h-4 w-4 mr-2" />
              Save Current Settings
            </Button>
            {/* User's saved presets and templates */}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

#### 5.2 StyleCard Component

```typescript
interface StyleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

function StyleCard({ icon, title, description, selected, onClick }: StyleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border-2 text-left transition-all",
        selected
          ? "border-purple-500 bg-purple-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          selected ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
        )}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  )
}
```

### Acceptance Criteria
- [ ] Two clear cards for Presets vs Templates
- [ ] Each card has icon, title, and description
- [ ] Selected state is visually distinct
- [ ] "My Saved" is a collapsible section at bottom
- [ ] Search context changes based on selection
- [ ] First-time users immediately understand the options

---

## Dependency Graph

```
Phase 1 (First-Time Experience)
    │
    └── Phase 2 (Mode Indicators) ─── can run in parallel
    │
    ▼
Phase 3 (Activity Page) ─── requires DB changes
    │
    ▼
Phase 4 (Navigation) ─── depends on Phase 3
    │
    ▼
Phase 5 (Sidebar Redesign) ─── can start after Phase 1
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing workflows | Keep old pages accessible during transition |
| User confusion during migration | Add "What's new" banners explaining changes |
| Database changes affecting performance | Use views, not new tables; add indexes |
| Mobile responsiveness issues | Test each phase on mobile before merge |

---

## Testing Requirements

### Unit Tests
- [ ] useFirstTimeUser hook: state persistence
- [ ] useActivityData hook: data transformation
- [ ] PromptModeIndicator: all states render correctly

### Integration Tests
- [ ] Welcome modal flow: show → select → dismiss
- [ ] Mode transitions: template → custom (via edit)
- [ ] Activity page: realtime updates

### E2E Tests
- [ ] New user journey: signup → studio → first generation
- [ ] Navigation: all redirects work
- [ ] Activity: item status updates in real-time

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to first generation (new users) | Unknown | < 2 min |
| Support tickets about "preset vs template" | TBD | -50% |
| Navigation clicks to find item status | 3+ pages | 1 page |
| User satisfaction (NPS) | TBD | +10 points |

---

## Appendix: Component Checklist

### New Components to Create
- [ ] `src/components/onboarding/StudioWelcomeModal.tsx`
- [ ] `src/components/onboarding/ContextualHint.tsx`
- [ ] `src/hooks/useFirstTimeUser.ts`
- [ ] `src/components/studio/PromptModeIndicator.tsx`
- [ ] `src/pages/Activity.tsx`
- [ ] `src/components/activity/ActivityItem.tsx`
- [ ] `src/components/activity/ActivityFilters.tsx`
- [ ] `src/hooks/useActivityData.ts`
- [ ] `src/components/settings/TemplatesContent.tsx`

### Components to Modify
- [ ] `src/pages/Studio.tsx`
- [ ] `src/components/studio/StudioPresetsSidebar.tsx`
- [ ] `src/components/Layout.tsx`
- [ ] `src/pages/Settings.tsx`
- [ ] `src/App.tsx`

### Database Changes
- [ ] Create `activity_items` view (Phase 3)
- [ ] Add RLS policies for view
- [ ] Enable realtime for view

---

**Document End**

*For questions, contact Uma (UX Designer)*
