import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Palette, FileText, Sparkles, Image, Users, ArrowRight, Coins, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type WelcomeStep = 'modes' | 'workflow'
type FeatureMode = 'single' | 'combination' | null

interface StudioWelcomeModalProps {
  open: boolean
  onClose: () => void
  onSelectPresets: () => void
  onSelectTemplates: () => void
  onSelectMode?: (mode: 'single' | 'combination') => void
}

interface ModeCardProps {
  icon: React.ReactNode
  title: string
  description: string
  tokenCost: number
  isSelected: boolean
  onClick: () => void
  gradient?: string
}

function ModeCard({
  icon,
  title,
  description,
  tokenCost,
  isSelected,
  onClick,
  gradient,
}: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 p-4 rounded-xl border-2 text-left transition-all',
        isSelected
          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
        gradient || 'bg-purple-100'
      )}>
        <div className="text-white">{icon}</div>
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Coins className="h-3 w-3" />
        <span>{tokenCost} {tokenCost === 1 ? 'token' : 'tokens'} per image</span>
      </div>
    </button>
  )
}

interface StyleOptionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  bestFor: string
  iconBgClass: string
  iconTextClass: string
}

function StyleOptionCard({
  icon,
  title,
  description,
  bestFor,
  iconBgClass,
  iconTextClass,
}: StyleOptionCardProps) {
  return (
    <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white">
      <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-3', iconBgClass)}>
        <div className={iconTextClass}>{icon}</div>
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <p className="text-xs text-slate-500">
        <span className="font-medium">Best for:</span> {bestFor}
      </p>
    </div>
  )
}

export function StudioWelcomeModal({
  open,
  onClose,
  onSelectPresets,
  onSelectTemplates,
  onSelectMode,
}: StudioWelcomeModalProps) {
  const [step, setStep] = useState<WelcomeStep>('modes')
  const [selectedMode, setSelectedMode] = useState<FeatureMode>(null)

  const handleModeSelect = (mode: 'single' | 'combination') => {
    setSelectedMode(mode)
  }

  const handleContinue = () => {
    if (selectedMode) {
      onSelectMode?.(selectedMode)
      setStep('workflow')
    }
  }

  const handleBack = () => {
    setStep('modes')
  }

  const handlePresets = () => {
    onSelectPresets()
    // Reset for next time
    setStep('modes')
    setSelectedMode(null)
  }

  const handleTemplates = () => {
    onSelectTemplates()
    // Reset for next time
    setStep('modes')
    setSelectedMode(null)
  }

  const handleSkip = () => {
    onClose()
    // Reset for next time
    setStep('modes')
    setSelectedMode(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-xl">
        {step === 'modes' ? (
          <>
            <DialogHeader className="text-center pb-2">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              <DialogTitle className="text-xl">Welcome to Studio</DialogTitle>
              <DialogDescription className="text-base">
                What would you like to create today?
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4 my-4">
              <ModeCard
                icon={<Image className="w-6 h-6" />}
                title="Edit Single Image"
                description="Enhance product photos with professional lighting, backgrounds, and styling."
                tokenCost={1}
                isSelected={selectedMode === 'single'}
                onClick={() => handleModeSelect('single')}
                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
              />
              <ModeCard
                icon={<Users className="w-6 h-6" />}
                title="Combine on Model"
                description="Place your jewelry on model photos for lifestyle marketing shots."
                tokenCost={2}
                isSelected={selectedMode === 'combination'}
                onClick={() => handleModeSelect('combination')}
                gradient="bg-gradient-to-br from-blue-500 to-amber-500"
              />
            </div>

            {/* Feature highlights for combination mode */}
            {selectedMode === 'combination' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Perfect for:</span> Necklaces on models, earrings,
                  bracelets — create lifestyle shots without expensive photoshoots!
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={!selectedMode}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-sm text-slate-500 hover:text-slate-700 mt-2"
              >
                Skip, I'll explore on my own
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center pb-2">
              <button
                onClick={handleBack}
                className="absolute left-4 top-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div className="flex justify-center mb-3">
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  selectedMode === 'combination'
                    ? 'bg-gradient-to-br from-blue-500 to-amber-500'
                    : 'bg-purple-100'
                )}>
                  {selectedMode === 'combination' ? (
                    <Users className="w-7 h-7 text-white" />
                  ) : (
                    <Image className="w-7 h-7 text-purple-600" />
                  )}
                </div>
              </div>
              <DialogTitle className="text-xl">
                {selectedMode === 'combination' ? 'Combination Mode' : 'Single Image Mode'}
              </DialogTitle>
              <DialogDescription className="text-base">
                Choose how you'd like to work
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4 my-4">
              <StyleOptionCard
                icon={<Palette className="w-6 h-6" />}
                title="Visual Presets"
                description={
                  selectedMode === 'combination'
                    ? "Adjust position, scale, and blending with simple sliders."
                    : "Adjust sliders for lighting, camera angle, background, and more."
                }
                bestFor="Fine control over every detail"
                iconBgClass="bg-purple-100"
                iconTextClass="text-purple-600"
              />
              <StyleOptionCard
                icon={<FileText className="w-6 h-6" />}
                title="Prompt Templates"
                description={
                  selectedMode === 'combination'
                    ? "Use AI templates for natural jewelry-on-model compositions."
                    : "Use pre-written AI instructions for common jewelry styles."
                }
                bestFor="Quick, consistent results"
                iconBgClass="bg-blue-100"
                iconTextClass="text-blue-600"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                onClick={handlePresets}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Start with Visual Presets
                <span className="ml-2 text-xs bg-purple-500 px-1.5 py-0.5 rounded">Recommended</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleTemplates}
                className="w-full"
              >
                Start with Prompt Templates
              </Button>
              <button
                onClick={handleSkip}
                className="text-sm text-slate-500 hover:text-slate-700 mt-2"
              >
                Skip, I'll explore on my own
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
