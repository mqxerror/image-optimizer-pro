import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { WizardStepIndicator } from './WizardStepIndicator'
import { useWizardForm } from './hooks/useWizardForm'
import {
  Step1ProjectBasics,
  Step2AISettings,
  Step3PromptConfig,
  Step4Review,
} from './steps'

interface CreateProjectWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectWizard({ open, onOpenChange }: CreateProjectWizardProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()

  const {
    form,
    currentStep,
    selectedFolder,
    goNext,
    goBack,
    goToStep,
    reset,
    handleFolderSelect,
  } = useWizardForm()

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('No organization')

      const values = form.getValues()

      const projectData = {
        organization_id: organization.id,
        name: values.name,
        input_folder_id: values.input_folder_id || null,
        input_folder_url: values.input_folder_url || null,
        ai_model: values.ai_model,
        resolution: values.resolution,
        trial_count: values.trial_count,
        prompt_mode: values.prompt_mode,
        template_id: values.prompt_mode === 'template' ? values.template_id || null : null,
        studio_preset_id: values.prompt_mode === 'preset' ? values.studio_preset_id || null : null,
        custom_prompt: values.prompt_mode === 'custom' ? values.custom_prompt || null : null,
        status: 'draft',
        total_images: 0,
        processed_images: 0,
        failed_images: 0,
        trial_completed: 0,
        total_tokens: 0,
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({
        title: 'Project created',
        description: 'Your project has been created successfully.',
      })
      handleClose()
    },
    onError: (error) => {
      toast({
        title: 'Failed to create project',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleNext = async () => {
    if (currentStep === 4) {
      createMutation.mutate()
    } else {
      await goNext()
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1ProjectBasics
            form={form}
            selectedFolder={selectedFolder}
            onFolderSelect={handleFolderSelect}
          />
        )
      case 2:
        return <Step2AISettings form={form} />
      case 3:
        return <Step3PromptConfig form={form} />
      case 4:
        return (
          <Step4Review
            form={form}
            selectedFolder={selectedFolder}
            onEditStep={goToStep}
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up your image optimization project in a few simple steps
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <WizardStepIndicator currentStep={currentStep} onStepClick={goToStep} />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1 min-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? handleClose : goBack}
          >
            {currentStep === 1 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : currentStep === 4 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Project
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
