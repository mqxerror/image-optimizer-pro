import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { wizardSchema, WizardFormData, SelectedFolder } from '../types'
import { RESOLUTIONS } from '../constants'

// Per-step validation schemas
const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

const step2Schema = z.object({
  ai_model: z.string().min(1, 'Please select an AI model'),
  resolution: z.enum(RESOLUTIONS),
  trial_count: z.number().min(0).max(10),
})

const step3Schema = z.object({
  prompt_mode: z.enum(['template', 'custom']),
  template_id: z.string().optional(),
  custom_prompt: z.string().optional(),
}).refine((data) => {
  if (data.prompt_mode === 'template') {
    return true // Template is optional
  }
  return true // Custom prompt is also optional
}, {
  message: 'Please select a template or enter a custom prompt',
})

export function useWizardForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder | null>(null)

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: '',
      ai_model: 'flux-kontext-pro',
      resolution: '2K',
      trial_count: 3,
      prompt_mode: 'template',
      template_id: '',
      custom_prompt: '',
    },
    mode: 'onChange'
  })

  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    const values = form.getValues()

    try {
      switch (step) {
        case 1:
          step1Schema.parse({ name: values.name })
          return true
        case 2:
          step2Schema.parse({
            ai_model: values.ai_model,
            resolution: values.resolution,
            trial_count: values.trial_count,
          })
          return true
        case 3:
          step3Schema.parse({
            prompt_mode: values.prompt_mode,
            template_id: values.template_id,
            custom_prompt: values.custom_prompt,
          })
          return true
        case 4:
          return true // Final step just shows review
        default:
          return false
      }
    } catch {
      return false
    }
  }, [form])

  const goNext = useCallback(async () => {
    // Trigger validation for current step fields
    let fieldsToValidate: (keyof WizardFormData)[] = []

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['name']
        break
      case 2:
        fieldsToValidate = ['ai_model', 'resolution', 'trial_count']
        break
      case 3:
        fieldsToValidate = ['prompt_mode', 'template_id', 'custom_prompt']
        break
    }

    const isValid = await form.trigger(fieldsToValidate)

    if (isValid && currentStep < 4) {
      setCurrentStep(prev => prev + 1)
      return true
    }
    return false
  }, [currentStep, form])

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4 && step <= currentStep) {
      setCurrentStep(step)
    }
  }, [currentStep])

  const reset = useCallback(() => {
    form.reset()
    setCurrentStep(1)
    setSelectedFolder(null)
  }, [form])

  const handleFolderSelect = useCallback((folderId: string, folderName: string) => {
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`
    setSelectedFolder({
      id: folderId,
      name: folderName,
      url: folderUrl,
    })
    form.setValue('input_folder_id', folderId)
    form.setValue('input_folder_name', folderName)
    form.setValue('input_folder_url', folderUrl)
  }, [form])

  return {
    form,
    currentStep,
    selectedFolder,
    goNext,
    goBack,
    goToStep,
    reset,
    validateStep,
    handleFolderSelect,
    setSelectedFolder,
  }
}
