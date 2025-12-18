import { createContext, useContext, useReducer, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Project, Json } from '@/types/database'
import {
  type JewelryBrief,
  type SyncStatus,
  type BriefBuilderState,
  DEFAULT_BRIEF,
} from './types'
import { compileBriefToPrompt, parsePromptToBrief } from './useBriefCompiler'

// Action types
type BriefAction =
  | { type: 'SET_BRIEF'; payload: JewelryBrief }
  | { type: 'UPDATE_BRIEF'; payload: Partial<JewelryBrief> }
  | { type: 'SET_RAW_PROMPT'; payload: string }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'TOGGLE_ADVANCED' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET'; payload?: JewelryBrief }
  | { type: 'APPLY_STARTER'; payload: Partial<JewelryBrief> }

// Reducer
function briefReducer(state: BriefBuilderState, action: BriefAction): BriefBuilderState {
  switch (action.type) {
    case 'SET_BRIEF':
      return {
        ...state,
        brief: action.payload,
        rawPrompt: compileBriefToPrompt(action.payload),
        syncStatus: 'synced',
      }

    case 'UPDATE_BRIEF': {
      const newBrief = deepMerge(state.brief, action.payload)
      return {
        ...state,
        brief: newBrief,
        rawPrompt: compileBriefToPrompt(newBrief),
        syncStatus: 'synced',
      }
    }

    case 'SET_RAW_PROMPT':
      return {
        ...state,
        rawPrompt: action.payload,
        syncStatus: state.syncStatus === 'synced' ? 'prompt-ahead' : state.syncStatus,
      }

    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload }

    case 'TOGGLE_ADVANCED':
      return { ...state, isAdvancedOpen: !state.isAdvancedOpen }

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload }

    case 'MARK_SAVED':
      return { ...state, lastSavedBrief: state.brief, isSaving: false }

    case 'RESET':
      return {
        ...state,
        brief: action.payload || DEFAULT_BRIEF,
        rawPrompt: compileBriefToPrompt(action.payload || DEFAULT_BRIEF),
        syncStatus: 'synced',
        isAdvancedOpen: false,
      }

    case 'APPLY_STARTER': {
      const newBrief = deepMerge(DEFAULT_BRIEF, action.payload)
      return {
        ...state,
        brief: newBrief,
        rawPrompt: compileBriefToPrompt(newBrief),
        syncStatus: 'synced',
      }
    }

    default:
      return state
  }
}

// Deep merge utility for JewelryBrief
function deepMerge(target: JewelryBrief, source: Partial<JewelryBrief>): JewelryBrief {
  const result = { ...target }

  if (source.background !== undefined) result.background = source.background
  if (source.shadow !== undefined) result.shadow = source.shadow

  if (source.retouch) {
    result.retouch = { ...target.retouch, ...source.retouch }
  }
  if (source.framing) {
    result.framing = { ...target.framing, ...source.framing }
  }
  if (source.compliance) {
    result.compliance = { ...target.compliance, ...source.compliance }
  }

  return result
}

// Context interface
interface BriefBuilderContextValue {
  state: BriefBuilderState
  // Brief operations
  setBrief: (brief: JewelryBrief) => void
  updateBrief: (updates: Partial<JewelryBrief>) => void
  updateBackground: (bg: JewelryBrief['background']) => void
  updateShadow: (shadow: JewelryBrief['shadow']) => void
  updateRetouch: (retouch: Partial<JewelryBrief['retouch']>) => void
  updateFraming: (framing: Partial<JewelryBrief['framing']>) => void
  updateCompliance: (compliance: Partial<JewelryBrief['compliance']>) => void
  // Raw prompt operations
  setRawPrompt: (prompt: string) => void
  rebuildBriefFromPrompt: () => void
  // UI operations
  toggleAdvanced: () => void
  setManualOverride: () => void
  // Starter operations
  applyStarter: (overrides: Partial<JewelryBrief>) => void
  // Save operations
  save: () => Promise<void>
  isDirty: boolean
}

const BriefBuilderContext = createContext<BriefBuilderContextValue | null>(null)

// Initial state factory
function createInitialState(project?: Project | null): BriefBuilderState {
  // Try to load from project.brief_data if available
  const briefData = project?.brief_data ? (project.brief_data as unknown as JewelryBrief) : undefined
  const brief = briefData || DEFAULT_BRIEF

  // If project has custom_prompt but no brief_data, we're in manual-override mode
  const hasCustomPrompt = project?.custom_prompt && !briefData
  const syncStatus: SyncStatus = hasCustomPrompt ? 'manual-override' : 'synced'

  return {
    brief,
    rawPrompt: hasCustomPrompt ? (project.custom_prompt || '') : compileBriefToPrompt(brief),
    syncStatus,
    isAdvancedOpen: hasCustomPrompt,
    isSaving: false,
    lastSavedBrief: brief,
  }
}

// Provider props
interface BriefBuilderProviderProps {
  children: ReactNode
  project: Project
}

export function BriefBuilderProvider({ children, project }: BriefBuilderProviderProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [state, dispatch] = useReducer(
    briefReducer,
    project,
    createInitialState
  )

  // Sync with project changes
  useEffect(() => {
    const briefData = project?.brief_data ? (project.brief_data as unknown as JewelryBrief) : undefined
    if (briefData) {
      dispatch({ type: 'SET_BRIEF', payload: briefData })
    } else if (project?.custom_prompt) {
      dispatch({ type: 'SET_RAW_PROMPT', payload: project.custom_prompt })
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'manual-override' })
    }
  }, [project?.brief_data, project?.custom_prompt])

  // Brief update functions
  const setBrief = useCallback((brief: JewelryBrief) => {
    dispatch({ type: 'SET_BRIEF', payload: brief })
  }, [])

  const updateBrief = useCallback((updates: Partial<JewelryBrief>) => {
    dispatch({ type: 'UPDATE_BRIEF', payload: updates })
  }, [])

  const updateBackground = useCallback((background: JewelryBrief['background']) => {
    dispatch({ type: 'UPDATE_BRIEF', payload: { background } })
  }, [])

  const updateShadow = useCallback((shadow: JewelryBrief['shadow']) => {
    dispatch({ type: 'UPDATE_BRIEF', payload: { shadow } })
  }, [])

  const updateRetouch = useCallback((retouch: Partial<JewelryBrief['retouch']>) => {
    dispatch({ type: 'UPDATE_BRIEF', payload: { retouch: { ...state.brief.retouch, ...retouch } } })
  }, [state.brief.retouch])

  const updateFraming = useCallback((framing: Partial<JewelryBrief['framing']>) => {
    dispatch({ type: 'UPDATE_BRIEF', payload: { framing: { ...state.brief.framing, ...framing } } })
  }, [state.brief.framing])

  const updateCompliance = useCallback((compliance: Partial<JewelryBrief['compliance']>) => {
    dispatch({ type: 'UPDATE_BRIEF', payload: { compliance: { ...state.brief.compliance, ...compliance } } })
  }, [state.brief.compliance])

  // Raw prompt operations
  const setRawPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_RAW_PROMPT', payload: prompt })
  }, [])

  const rebuildBriefFromPrompt = useCallback(() => {
    const parsed = parsePromptToBrief(state.rawPrompt)
    const newBrief = deepMerge(DEFAULT_BRIEF, parsed)
    dispatch({ type: 'SET_BRIEF', payload: newBrief })
    toast({
      title: 'Brief rebuilt',
      description: 'Settings extracted from prompt (best effort)',
    })
  }, [state.rawPrompt, toast])

  // UI operations
  const toggleAdvanced = useCallback(() => {
    dispatch({ type: 'TOGGLE_ADVANCED' })
  }, [])

  const setManualOverride = useCallback(() => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'manual-override' })
  }, [])

  // Starter operations
  const applyStarter = useCallback((overrides: Partial<JewelryBrief>) => {
    dispatch({ type: 'APPLY_STARTER', payload: overrides })
  }, [])

  // Save to database
  const save = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true })

    try {
      const updates = {
        brief_data: state.brief as unknown as Json,
        custom_prompt: state.rawPrompt,
        // Clear old prompt mode fields when using Brief Builder
        prompt_mode: 'brief',
        template_id: null,
        studio_preset_id: null,
      }

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', project.id)

      if (error) throw error

      dispatch({ type: 'MARK_SAVED' })

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['unified-project', project.id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })

    } catch (error) {
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [state.brief, state.rawPrompt, project.id, queryClient, toast])

  // Check if dirty
  const isDirty = useMemo(() => {
    if (!state.lastSavedBrief) return true
    return JSON.stringify(state.brief) !== JSON.stringify(state.lastSavedBrief)
  }, [state.brief, state.lastSavedBrief])

  // Auto-save on brief changes (debounced)
  useEffect(() => {
    if (!isDirty || state.isSaving) return

    const timeoutId = setTimeout(() => {
      save()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [isDirty, state.isSaving, save])

  const value: BriefBuilderContextValue = {
    state,
    setBrief,
    updateBrief,
    updateBackground,
    updateShadow,
    updateRetouch,
    updateFraming,
    updateCompliance,
    setRawPrompt,
    rebuildBriefFromPrompt,
    toggleAdvanced,
    setManualOverride,
    applyStarter,
    save,
    isDirty,
  }

  return (
    <BriefBuilderContext.Provider value={value}>
      {children}
    </BriefBuilderContext.Provider>
  )
}

// Hook to use the context
export function useBriefBuilder() {
  const context = useContext(BriefBuilderContext)
  if (!context) {
    throw new Error('useBriefBuilder must be used within a BriefBuilderProvider')
  }
  return context
}

export default BriefBuilderContext
