/**
 * Brief Builder Types
 * Structured creative brief for jewelry image optimization
 */

// Background options for jewelry photography
export type BackgroundType = 'pure-white' | 'light-gray' | 'lifestyle' | 'transparent';

// Shadow options
export type ShadowType = 'none' | 'soft' | 'product-grounded';

// Framing position options
export type FramingPosition = 'centered' | 'rule-of-thirds' | 'left-aligned' | 'right-aligned';

/**
 * Retouch settings for jewelry-specific enhancements
 */
export interface RetouchSettings {
  /** Remove dust and small imperfections */
  dustRemoval: boolean;
  /** Control reflection intensity (0-100) */
  reflectionControl: number;
  /** Enhance metal warmth/tone (0-100) */
  metalWarmth: number;
  /** Enhance gemstone sparkle (0-100) */
  stoneSparkle: number;
}

/**
 * Framing and composition settings
 */
export interface FramingSettings {
  /** Product position in frame */
  position: FramingPosition;
  /** Margin percentage around product (5-25%) */
  marginPercent: number;
  /** Ensure safe margins for cropping */
  cropSafe: boolean;
}

/**
 * Compliance settings for marketplace requirements
 */
export interface ComplianceSettings {
  /** Google Merchant Center safe (no text overlays, etc.) */
  gmcSafe: boolean;
  /** No watermarks or logos */
  noWatermarks: boolean;
}

/**
 * Main Jewelry Brief interface
 * Represents all structured settings for image optimization
 */
export interface JewelryBrief {
  /** Background style */
  background: BackgroundType;
  /** Shadow style */
  shadow: ShadowType;
  /** Retouch/enhancement settings */
  retouch: RetouchSettings;
  /** Framing/composition settings */
  framing: FramingSettings;
  /** Marketplace compliance settings */
  compliance: ComplianceSettings;
}

/**
 * Default brief values for new projects
 */
export const DEFAULT_BRIEF: JewelryBrief = {
  background: 'pure-white',
  shadow: 'soft',
  retouch: {
    dustRemoval: true,
    reflectionControl: 50,
    metalWarmth: 50,
    stoneSparkle: 50,
  },
  framing: {
    position: 'centered',
    marginPercent: 10,
    cropSafe: true,
  },
  compliance: {
    gmcSafe: true,
    noWatermarks: true,
  },
};

/**
 * Sync status between Brief Builder and Raw Prompt
 */
export type SyncStatus =
  | 'synced'          // Brief and prompt match
  | 'brief-ahead'     // User changed brief, prompt updating
  | 'prompt-ahead'    // User editing raw prompt manually
  | 'manual-override'; // User chose to override brief with custom prompt

/**
 * Brief Builder state shape
 */
export interface BriefBuilderState {
  /** Current brief settings */
  brief: JewelryBrief;
  /** Compiled raw prompt from brief */
  rawPrompt: string;
  /** Sync status between brief and prompt */
  syncStatus: SyncStatus;
  /** Whether the advanced raw prompt panel is open */
  isAdvancedOpen: boolean;
  /** Whether settings are being saved */
  isSaving: boolean;
  /** Last saved brief (for dirty checking) */
  lastSavedBrief: JewelryBrief | null;
}

/**
 * Brief Starter - Templates/Presets that prefill the brief
 */
export interface BriefStarter {
  id: string;
  name: string;
  category: 'template' | 'preset' | 'recent';
  description?: string;
  /** Partial brief to apply (merged with defaults) */
  briefOverrides: Partial<JewelryBrief>;
  /** Source template or preset ID */
  sourceId?: string;
  sourceType?: 'template' | 'preset';
}

/**
 * Run snapshot for versioning
 */
export interface RunSnapshot {
  id: string;
  projectId: string;
  runNumber: number;
  briefSnapshot: JewelryBrief;
  compiledPrompt: string;
  aiModel: string;
  resolution: string;
  createdAt: string;
  imagesProcessed: number;
}

/**
 * Brief section labels for UI
 */
export const BRIEF_SECTION_LABELS = {
  background: 'Background',
  shadow: 'Shadow',
  retouch: 'Retouch & Enhance',
  framing: 'Framing',
  compliance: 'Compliance',
} as const;

/**
 * Background option configs for UI
 */
export const BACKGROUND_OPTIONS: Array<{
  id: BackgroundType;
  label: string;
  description: string;
}> = [
  { id: 'pure-white', label: 'Pure White', description: 'Clean e-commerce standard' },
  { id: 'light-gray', label: 'Light Gray', description: 'Subtle gradient background' },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Natural setting backdrop' },
  { id: 'transparent', label: 'Transparent', description: 'PNG with no background' },
];

/**
 * Shadow option configs for UI
 */
export const SHADOW_OPTIONS: Array<{
  id: ShadowType;
  label: string;
  description: string;
}> = [
  { id: 'none', label: 'None', description: 'No shadow, floating look' },
  { id: 'soft', label: 'Soft', description: 'Subtle natural shadow' },
  { id: 'product-grounded', label: 'Grounded', description: 'Deep shadow for depth' },
];

/**
 * Framing position configs for UI
 */
export const FRAMING_OPTIONS: Array<{
  id: FramingPosition;
  label: string;
  description: string;
}> = [
  { id: 'centered', label: 'Centered', description: 'Product in center' },
  { id: 'rule-of-thirds', label: 'Rule of Thirds', description: 'Dynamic composition' },
  { id: 'left-aligned', label: 'Left', description: 'Product on left side' },
  { id: 'right-aligned', label: 'Right', description: 'Product on right side' },
];
