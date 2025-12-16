import { useCallback } from 'react'
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride'
import { useTour } from '@/hooks/useTour'
import { usePermissions } from '@/hooks/usePermissions'

// Tour step definitions
const getSteps = (isOwner: boolean, canProcessImages: boolean): Step[] => {
  const steps: Step[] = [
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold text-lg mb-2">Welcome to Image Optimizer Pro!</h3>
          <p className="text-sm text-gray-600">
            Let's take a quick tour to help you get started with optimizing your product images.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-studio"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold text-lg mb-2">The Studio</h3>
          <p className="text-sm text-gray-600">
            This is where the magic happens! Upload images, remove backgrounds, and optimize them for your store.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-projects"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold text-lg mb-2">Projects</h3>
          <p className="text-sm text-gray-600">
            Organize your work into projects. Perfect for managing different product lines or campaigns.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-templates"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold text-lg mb-2">Templates</h3>
          <p className="text-sm text-gray-600">
            Save your favorite settings as templates for consistent results across all your images.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="token-display"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold text-lg mb-2">Token Balance</h3>
          <p className="text-sm text-gray-600">
            Tokens are used to process images. You've received 10 free tokens to get started. Click here to see details or purchase more.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
  ]

  // Add Shopify step if available
  steps.push({
    target: '[data-tour="nav-shopify"]',
    content: (
      <div className="text-left">
        <h3 className="font-semibold text-lg mb-2">Shopify Integration</h3>
        <p className="text-sm text-gray-600">
          Connect your Shopify store to automatically sync and optimize product images.
        </p>
      </div>
    ),
    placement: 'right',
  })

  // Add admin step for owners
  if (isOwner) {
    steps.push({
      target: '[data-tour="nav-admin"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold text-lg mb-2">Admin Dashboard</h3>
          <p className="text-sm text-gray-600">
            As the owner, you can manage team members, view usage stats, and configure organization settings.
          </p>
        </div>
      ),
      placement: 'right',
    })
  }

  // Final step
  steps.push({
    target: '[data-tour="user-menu"]',
    content: (
      <div className="text-left">
        <h3 className="font-semibold text-lg mb-2">You're All Set!</h3>
        <p className="text-sm text-gray-600">
          Access your profile, settings, and help from here. Ready to optimize your first image? Head to the Studio!
        </p>
      </div>
    ),
    placement: 'bottom',
  })

  return steps
}

export function GuidedTour() {
  const { shouldShowTour, completeTour, skipTour, setStep } = useTour()
  const { isOwner, can } = usePermissions()
  const canProcessImages = can('canProcessImages')

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data

    // Update current step
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStep(index + 1)
    }

    // Handle completion
    if (status === STATUS.FINISHED) {
      completeTour()
    }

    // Handle skip
    if (status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      skipTour()
    }
  }, [completeTour, skipTour, setStep])

  if (!shouldShowTour) {
    return null
  }

  const steps = getSteps(isOwner, canProcessImages)

  return (
    <Joyride
      steps={steps}
      run={shouldShowTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#7c3aed', // Purple to match brand
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          textColor: '#374151',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#7c3aed',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '13px',
        },
        spotlight: {
          borderRadius: '8px',
        },
        beacon: {
          display: 'none', // We use disableBeacon per step instead
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  )
}
