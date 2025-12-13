import { useState, useEffect, useCallback } from 'react'
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'

interface OnboardingTourProps {
  run: boolean
  onComplete: () => void
}

const tourSteps: Step[] = [
  {
    target: '[data-tour="dashboard-stats"]',
    content: 'Welcome to Image Optimizer Pro! This is your dashboard where you can track your token balance and processing stats at a glance.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Your Command Center',
  },
  {
    target: '[data-tour="new-project"]',
    content: 'Create a new project to process multiple images from your Google Drive folder. Perfect for batch optimization!',
    placement: 'bottom',
    title: 'Create Projects',
  },
  {
    target: '[data-tour="nav-studio"]',
    content: 'Use Studio to enhance individual images with AI. Experiment with different settings before processing in bulk.',
    placement: 'right',
    title: 'AI Studio',
  },
  {
    target: '[data-tour="nav-queue"]',
    content: 'Monitor your processing queue in real-time. See progress, pause jobs, and manage your workflow.',
    placement: 'right',
    title: 'Processing Queue',
  },
  {
    target: '[data-tour="nav-history"]',
    content: 'View all your processed images here. Compare before/after results and download your optimized images.',
    placement: 'right',
    title: 'History & Results',
  },
]

export function OnboardingTour({ run, onComplete }: OnboardingTourProps) {
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, type } = data

    // Check if tour is finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete()
    }

    // Handle close button click
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) {
      onComplete()
    }
  }, [onComplete])

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={handleJoyrideCallback}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#1e293b',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipTitle: {
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.5,
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 500,
        },
        buttonBack: {
          color: '#64748b',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#94a3b8',
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  )
}

// Hook to manage onboarding tour state
export function useOnboardingTour() {
  const [runTour, setRunTour] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour')
    if (!hasSeenTour) {
      // Delay to allow page to render first
      const timer = setTimeout(() => {
        setRunTour(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
    setHasChecked(true)
  }, [])

  const completeTour = useCallback(() => {
    localStorage.setItem('hasSeenOnboardingTour', 'true')
    setRunTour(false)
    setHasChecked(true)
  }, [])

  const restartTour = useCallback(() => {
    setRunTour(true)
  }, [])

  return {
    runTour,
    hasChecked,
    completeTour,
    restartTour,
  }
}
