// Main exports
export { BriefBuilder, BriefBuilderInline } from './BriefBuilder'
export { BriefBuilderProvider, useBriefBuilder } from './BriefBuilderContext'
export { BriefStarterDropdown } from './BriefStarterDropdown'
export { RawPromptPanel } from './RawPromptPanel'
export { useBriefCompiler, compileBriefToPrompt, parsePromptToBrief } from './useBriefCompiler'

// Section exports
export {
  BackgroundSection,
  ShadowSection,
  RetouchSection,
  FramingSection,
  ComplianceSection,
} from './sections'

// Type exports
export type {
  JewelryBrief,
  BriefBuilderState,
  BriefStarter,
  RunSnapshot,
  BackgroundType,
  ShadowType,
  FramingPosition,
  RetouchSettings,
  FramingSettings,
  ComplianceSettings,
  SyncStatus,
} from './types'

export {
  DEFAULT_BRIEF,
  BACKGROUND_OPTIONS,
  SHADOW_OPTIONS,
  FRAMING_OPTIONS,
  BRIEF_SECTION_LABELS,
} from './types'
