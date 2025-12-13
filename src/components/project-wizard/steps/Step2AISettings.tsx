import { UseFormReturn } from 'react-hook-form'
import { HelpCircle, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { WizardFormData } from '../types'
import { AI_MODELS, FIELD_TOOLTIPS } from '../constants'

interface Step2Props {
  form: UseFormReturn<WizardFormData>
}

export function Step2AISettings({ form }: Step2Props) {
  const { watch, setValue } = form
  const selectedModel = watch('ai_model')
  const resolution = watch('resolution')
  const trialCount = watch('trial_count')

  return (
    <div className="space-y-6">
      {/* AI Model Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">AI Model</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">{FIELD_TOOLTIPS.ai_model.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {FIELD_TOOLTIPS.ai_model.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
          {AI_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => setValue('ai_model', model.id)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                selectedModel === model.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-muted hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0',
                selectedModel === model.id
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground'
              )}>
                {selectedModel === model.id && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{model.name}</span>
                  {model.badge && (
                    <Badge
                      variant={model.recommended ? 'default' : 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {model.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {model.description}
                </p>
                <p className="text-xs font-medium text-primary mt-1">
                  {model.price}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Resolution</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{FIELD_TOOLTIPS.resolution.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {FIELD_TOOLTIPS.resolution.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex gap-2">
            {(['2K', '4K'] as const).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setValue('resolution', res)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                  resolution === res
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:border-primary/50'
                )}
              >
                {res}
                <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                  {res === '2K' ? '1 token' : '2 tokens'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Trial Count */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Trial Images</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{FIELD_TOOLTIPS.trial_count.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {FIELD_TOOLTIPS.trial_count.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-2">
            <Slider
              value={[trialCount]}
              onValueChange={([value]) => setValue('trial_count', value)}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span className="font-medium text-foreground">{trialCount} images</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">How it works</p>
          <p className="mt-1">
            Trial images are processed first so you can verify the results before running the full batch.
            This helps save tokens if adjustments are needed.
          </p>
        </div>
      </div>
    </div>
  )
}
