import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'

const TOUR_STORAGE_KEY = 'image-optimizer-tour-completed'

interface TourState {
  hasCompletedTour: boolean
  shouldShowTour: boolean
  currentStep: number
}

export function useTour() {
  const { user, organization } = useAuthStore()
  const [state, setState] = useState<TourState>({
    hasCompletedTour: false,
    shouldShowTour: false,
    currentStep: 0,
  })

  // Check localStorage on mount
  useEffect(() => {
    if (!user) return

    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`
    const completed = localStorage.getItem(storageKey)

    setState(prev => ({
      ...prev,
      hasCompletedTour: completed === 'true',
      // Show tour for new users who haven't completed it
      shouldShowTour: completed !== 'true' && !!organization,
    }))
  }, [user, organization])

  const startTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowTour: true,
      currentStep: 0,
    }))
  }, [])

  const completeTour = useCallback(() => {
    if (!user) return

    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`
    localStorage.setItem(storageKey, 'true')

    setState(prev => ({
      ...prev,
      hasCompletedTour: true,
      shouldShowTour: false,
    }))
  }, [user])

  const skipTour = useCallback(() => {
    if (!user) return

    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`
    localStorage.setItem(storageKey, 'true')

    setState(prev => ({
      ...prev,
      hasCompletedTour: true,
      shouldShowTour: false,
    }))
  }, [user])

  const resetTour = useCallback(() => {
    if (!user) return

    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`
    localStorage.removeItem(storageKey)

    setState({
      hasCompletedTour: false,
      shouldShowTour: false,
      currentStep: 0,
    })
  }, [user])

  const setStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
    }))
  }, [])

  return {
    ...state,
    startTour,
    completeTour,
    skipTour,
    resetTour,
    setStep,
  }
}
