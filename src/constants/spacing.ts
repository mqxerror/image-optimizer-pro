/**
 * Centralized spacing constants for Studio layout consistency
 *
 * Spacing Scale:
 * - section: 24px (space-y-6) - Between major sections
 * - control: 16px (space-y-4) - Between controls within sections
 * - group: 8px (space-y-2) - Within control groups
 *
 * Panel Widths:
 * - sidebar: 288px (w-72) - Presets sidebar
 * - canvas: 672px (max-w-2xl) - Main canvas area
 * - quickPanel: 320px (w-80) - Quick controls panel
 * - advancedPanel: 400px - Advanced floating panel
 * - historyPanel: 224px (w-56) - History/generations sidebar
 */

export const STUDIO_SPACING = {
  // Vertical spacing between elements
  section: 'space-y-6',      // 24px - between major sections
  control: 'space-y-4',      // 16px - between controls
  group: 'space-y-2',        // 8px - within groups

  // Padding values
  panel: 'p-6',              // 24px - panel padding
  card: 'p-4',               // 16px - card padding
  compact: 'p-3',            // 12px - compact padding

  // Panel widths
  sidebar: 'w-72',           // 288px - presets sidebar
  canvas: 'max-w-2xl',       // 672px - canvas max width
  quickPanel: 'w-80',        // 320px - quick controls
  advancedPanel: 'w-[400px]',// 400px - advanced panel
  historyPanel: 'w-56',      // 224px - history (increased from w-48/192px)

  // Gap values
  gapLg: 'gap-6',            // 24px gap
  gapMd: 'gap-4',            // 16px gap
  gapSm: 'gap-2',            // 8px gap

  // Transition durations
  transitionFast: 'duration-150',
  transitionNormal: 'duration-300',
  transitionSlow: 'duration-500',
} as const

// Numeric values for programmatic use
export const STUDIO_SPACING_VALUES = {
  section: 24,
  control: 16,
  group: 8,
  panel: 24,
  card: 16,
  compact: 12,
  sidebar: 288,
  canvas: 672,
  quickPanel: 320,
  advancedPanel: 400,
  historyPanel: 224,
} as const

// Panel transition config
export const PANEL_TRANSITION = {
  enter: 'transition-all duration-300 ease-out',
  leave: 'transition-all duration-200 ease-in',
  opacity: {
    enter: 'opacity-100',
    leave: 'opacity-0',
  },
  scale: {
    enter: 'scale-100',
    leave: 'scale-95',
  },
  translate: {
    enter: 'translate-x-0',
    leave: 'translate-x-4',
  },
} as const

export type StudioSpacing = typeof STUDIO_SPACING
export type StudioSpacingValues = typeof STUDIO_SPACING_VALUES
