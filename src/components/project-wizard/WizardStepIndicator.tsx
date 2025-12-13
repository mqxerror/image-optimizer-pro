import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WIZARD_STEPS } from './constants'

interface WizardStepIndicatorProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function WizardStepIndicator({ currentStep, onStepClick }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-6 px-4">
      {WIZARD_STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep
        const canClick = step.id <= currentStep

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle and label */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(step.id)}
                disabled={!canClick}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary/20 text-primary border-2 border-primary',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                  canClick && 'cursor-pointer hover:ring-2 hover:ring-primary/30',
                  !canClick && 'cursor-not-allowed'
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.id}
              </button>
              <span className={cn(
                'text-xs mt-2 text-center whitespace-nowrap',
                isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < WIZARD_STEPS.length - 1 && (
              <div className="flex-1 mx-3 mt-[-1rem]">
                <div
                  className={cn(
                    'h-0.5 w-full transition-colors',
                    step.id < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
