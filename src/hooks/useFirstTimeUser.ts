import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'imageOptimizer_firstTimeUser'

interface FirstTimeFlags {
  hasSeenStudioWelcome: boolean
  hasSeenPresetHint: boolean
  hasSeenTemplateHint: boolean
  presetUsageCount: number
  templateUsageCount: number
}

const DEFAULT_FLAGS: FirstTimeFlags = {
  hasSeenStudioWelcome: false,
  hasSeenPresetHint: false,
  hasSeenTemplateHint: false,
  presetUsageCount: 0,
  templateUsageCount: 0,
}

type FlagKey = keyof Omit<FirstTimeFlags, 'presetUsageCount' | 'templateUsageCount'>
type UsageKey = 'preset' | 'template'

function loadFlags(): FirstTimeFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load first-time user flags:', e)
  }
  return DEFAULT_FLAGS
}

function saveFlags(flags: FirstTimeFlags): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch (e) {
    console.warn('Failed to save first-time user flags:', e)
  }
}

export function useFirstTimeUser() {
  const [flags, setFlags] = useState<FirstTimeFlags>(loadFlags)

  // Sync to localStorage whenever flags change
  useEffect(() => {
    saveFlags(flags)
  }, [flags])

  /**
   * Check if a specific flag should trigger showing UI
   * Returns true if the user has NOT seen the item yet
   */
  const shouldShow = useCallback((flag: FlagKey): boolean => {
    return !flags[flag]
  }, [flags])

  /**
   * Mark a flag as seen (e.g., user dismissed a modal)
   */
  const markAsSeen = useCallback((flag: FlagKey): void => {
    setFlags(prev => ({
      ...prev,
      [flag]: true,
    }))
  }, [])

  /**
   * Increment usage count for presets or templates
   * After 3 uses, auto-dismiss contextual hints
   */
  const incrementUsage = useCallback((type: UsageKey): void => {
    setFlags(prev => {
      const countKey = type === 'preset' ? 'presetUsageCount' : 'templateUsageCount'
      const hintKey = type === 'preset' ? 'hasSeenPresetHint' : 'hasSeenTemplateHint'
      const newCount = prev[countKey] + 1

      return {
        ...prev,
        [countKey]: newCount,
        // Auto-dismiss hint after 3 uses
        [hintKey]: newCount >= 3 ? true : prev[hintKey],
      }
    })
  }, [])

  /**
   * Check if hint should be shown based on usage count
   * Shows hints for first 3 uses
   */
  const shouldShowHint = useCallback((type: UsageKey): boolean => {
    const countKey = type === 'preset' ? 'presetUsageCount' : 'templateUsageCount'
    const hintKey = type === 'preset' ? 'hasSeenPresetHint' : 'hasSeenTemplateHint'

    // Don't show if already seen or used 3+ times
    if (flags[hintKey]) return false
    if (flags[countKey] >= 3) return false

    return true
  }, [flags])

  /**
   * Reset all flags (useful for testing)
   */
  const resetAll = useCallback((): void => {
    setFlags(DEFAULT_FLAGS)
  }, [])

  return {
    flags,
    shouldShow,
    markAsSeen,
    incrementUsage,
    shouldShowHint,
    resetAll,
  }
}
