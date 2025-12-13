import { UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Folder,
  Cpu,
  ImageIcon,
  FileText,
  Coins,
  Pencil,
  Palette,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { WizardFormData, SelectedFolder } from '../types'
import { AI_MODELS } from '../constants'

interface Step4Props {
  form: UseFormReturn<WizardFormData>
  selectedFolder: SelectedFolder | null
  onEditStep: (step: number) => void
}

export function Step4Review({ form, selectedFolder, onEditStep }: Step4Props) {
  const { watch } = form
  const { organization } = useAuthStore()

  const name = watch('name')
  const aiModel = watch('ai_model')
  const resolution = watch('resolution')
  const trialCount = watch('trial_count')
  const promptMode = watch('prompt_mode')
  const templateId = watch('template_id')
  const presetId = watch('studio_preset_id')
  const customPrompt = watch('custom_prompt')

  // Get model info
  const modelInfo = AI_MODELS.find(m => m.id === aiModel)

  // Fetch user's token balance
  const { data: tokenAccount } = useQuery({
    queryKey: ['token-account', organization?.id],
    queryFn: async () => {
      if (!organization) return null
      const { data } = await supabase
        .from('token_accounts')
        .select('balance')
        .eq('organization_id', organization.id)
        .single()
      return data
    },
    enabled: !!organization
  })

  // Fetch template name if using template
  const { data: template } = useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null
      const { data } = await supabase
        .from('prompt_templates')
        .select('name')
        .eq('id', templateId)
        .single()
      return data
    },
    enabled: !!templateId && promptMode === 'template'
  })

  // Fetch preset name if using preset
  const { data: preset } = useQuery({
    queryKey: ['preset', presetId],
    queryFn: async () => {
      if (!presetId) return null
      const { data } = await supabase
        .from('studio_presets')
        .select('name, category')
        .eq('id', presetId)
        .single()
      return data
    },
    enabled: !!presetId && promptMode === 'preset'
  })

  // Calculate estimated token cost
  const tokenMultiplier = resolution === '4K' ? 2 : 1
  const estimatedImageCount = selectedFolder?.imageCount || 50 // Use folder count if available
  const trialTokens = trialCount * tokenMultiplier
  const fullBatchTokens = estimatedImageCount * tokenMultiplier
  const currentBalance = tokenAccount?.balance || 0
  const hasEnoughForTrial = currentBalance >= trialTokens
  const hasEnoughForFull = currentBalance >= fullBatchTokens

  return (
    <div className="space-y-6">
      {/* Project Summary */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Project Summary
        </h3>

        {/* Basics */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase">Step 1: Basics</span>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Project Name</p>
                <p className="font-medium text-sm">{name || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Folder className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Source Folder</p>
                <p className="font-medium text-sm truncate">
                  {selectedFolder?.name || 'Not selected'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase">Step 2: AI Settings</span>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">AI Model</p>
                <p className="font-medium text-sm">{modelInfo?.name || aiModel}</p>
                <p className="text-xs text-muted-foreground">{modelInfo?.price}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Resolution</p>
                <p className="font-medium text-sm">{resolution}</p>
                <p className="text-xs text-muted-foreground">
                  {resolution === '2K' ? '1 token/image' : '2 tokens/image'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Trial Images</p>
                <p className="font-medium text-sm">{trialCount} images</p>
                <p className="text-xs text-muted-foreground">Processed first</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Settings */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase">Step 3: Prompt</span>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>

          <div className="flex items-start gap-3">
            {promptMode === 'preset' ? (
              <Palette className="h-4 w-4 text-muted-foreground mt-0.5" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Prompt Type</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {promptMode === 'template' ? 'Template' : promptMode === 'preset' ? 'Studio Preset' : 'Custom'}
                </Badge>
                {promptMode === 'template' && template && (
                  <span className="font-medium text-sm">{template.name}</span>
                )}
                {promptMode === 'preset' && preset && (
                  <span className="font-medium text-sm">{preset.name}</span>
                )}
              </div>
              {promptMode === 'preset' && preset?.category && (
                <p className="text-xs text-muted-foreground mt-1">
                  {preset.category}
                </p>
              )}
              {promptMode === 'custom' && customPrompt && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 p-2 rounded">
                  {customPrompt}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Token Cost Estimate */}
      <div className="space-y-4">
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Token Cost Estimate</h3>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Balance: </span>
              <span className="font-semibold">{currentBalance} tokens</span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Trial Run ({trialCount} images × {tokenMultiplier} token{tokenMultiplier > 1 ? 's' : ''})
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{trialTokens} tokens</span>
                {hasEnoughForTrial ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Full Batch (est. {estimatedImageCount} images)
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{fullBatchTokens} tokens</span>
                {hasEnoughForFull ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            * {resolution === '4K' ? '4K resolution uses 2 tokens per image' : '2K resolution uses 1 token per image'}
          </p>
        </div>

        {/* Insufficient tokens warning */}
        {!hasEnoughForTrial && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <span className="font-medium">Insufficient tokens for trial run.</span>
              {' '}You need {trialTokens} tokens but only have {currentBalance}.{' '}
              <Link to="/settings" className="underline font-medium hover:text-amber-900">
                Purchase more tokens
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {hasEnoughForTrial && !hasEnoughForFull && (
          <Alert className="bg-blue-50 border-blue-200">
            <Coins className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              You have enough tokens for the trial run, but may need more for the full batch.{' '}
              <Link to="/settings" className="underline font-medium hover:text-blue-900">
                Purchase more tokens
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
