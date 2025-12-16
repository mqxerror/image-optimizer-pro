import { useState, useCallback, useMemo, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wand2, Coins, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Copy, Check, PanelLeftClose, PanelLeft, Clock, ExternalLink, Menu, Settings2 } from 'lucide-react'
import { STUDIO_SPACING, PANEL_TRANSITION } from '@/constants/spacing'
import { getModelById } from '@/constants/aiModels'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser'
import { StudioWelcomeModal } from '@/components/onboarding'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  StudioPresetsSidebar,
  CombinationPresetsSidebar,
  ImageUploader,
  GenerationsHistory,
  IdeasToExplore,
  buildPromptFromSettings,
  useGenerationsProcessingCount,
  PromptModeIndicator,
  TemplatePromptDisplay,
  PromptOptimizer,
  GenerateConfirmSheet,
  PromptDiff,
  EditMode,
} from '@/components/studio'
import { StudioModeToggle } from '@/components/studio/StudioModeToggle'
import { StudioFeatureSelector, type StudioFeature } from '@/components/studio/StudioFeatureSelector'
import { QuickControls } from '@/components/studio/QuickControls'
import { AdvancedTabs } from '@/components/studio/AdvancedTabs'
import { DualImageUploader, CombinationControls, CombinationTemplates, PlacementPreview } from '@/components/studio/combination'
import { VoiceMicButton } from '@/components/shared'
import type {
  StudioSettings,
  StudioPreset,
  StudioGeneration,
} from '@/types/studio'
import type { PromptTemplate } from '@/types/database'
import { defaultStudioSettings, presetToSettings } from '@/types/studio'
import type {
  DualImageState,
  CombinationQuickSettings,
  CombinationTemplate,
} from '@/types/combination'
import {
  defaultDualImageState,
  defaultCombinationQuickSettings,
  templateToSettings,
} from '@/types/combination'

export default function Studio() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { organization, user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // First-time user experience
  const { shouldShow, markAsSeen, incrementUsage } = useFirstTimeUser()
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => shouldShow('hasSeenStudioWelcome'))

  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null)
  const [promptMode, setPromptMode] = useState<'preset' | 'template' | 'custom'>(() => {
    // Check if there's a default prompt saved - if so, start in custom mode
    const defaultPrompt = localStorage.getItem('studioDefaultPrompt')
    return defaultPrompt ? 'custom' : 'preset'
  })
  const [settings, setSettings] = useState<StudioSettings>(defaultStudioSettings)
  const [customPrompt, setCustomPrompt] = useState(() => {
    // Load default prompt from localStorage if exists
    return localStorage.getItem('studioDefaultPrompt') || ''
  })
  const [hasDefaultPrompt, setHasDefaultPrompt] = useState(() => {
    return !!localStorage.getItem('studioDefaultPrompt')
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    camera: false,
    lighting: false,
    background: false,
    jewelry: false,
    composition: false,
    model: false,
  })
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [studioMode, setStudioMode] = useState<'quick' | 'advanced'>(() => {
    // Load saved mode from localStorage
    const saved = localStorage.getItem('studioMode')
    return (saved === 'advanced' ? 'advanced' : 'quick')
  })
  const [quickSettings, setQuickSettings] = useState({
    lighting: 70
  })
  const [promptCopied, setPromptCopied] = useState(false)

  // Feature mode state (single image vs combination)
  const [featureMode, setFeatureMode] = useState<StudioFeature>(() => {
    const saved = localStorage.getItem('studioFeatureMode')
    return (saved === 'combination' ? 'combination' : 'single') as StudioFeature
  })

  // Combination-specific state
  const [dualImages, setDualImages] = useState<DualImageState>(defaultDualImageState)
  const [combinationSettings, setCombinationSettings] = useState<CombinationQuickSettings>(defaultCombinationQuickSettings)
  const [selectedCombinationTemplateId, setSelectedCombinationTemplateId] = useState<string | null>(null)
  const [selectedCombinationPresetId, setSelectedCombinationPresetId] = useState<string | null>(null)

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('studioSidebarCollapsed')
    return saved === 'true'
  })

  // Generations sheet/modal state
  const [showGenerations, setShowGenerations] = useState(false)

  // Mobile sidebars state
  const [showMobilePresets, setShowMobilePresets] = useState(false)
  const [showMobileSettings, setShowMobileSettings] = useState(false)

  // Mobile generate confirmation sheet
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)

  // Get processing count for History button badge
  const processingCount = useGenerationsProcessingCount()

  // Persist studio mode to localStorage
  useEffect(() => {
    localStorage.setItem('studioMode', studioMode)
  }, [studioMode])

  // Persist feature mode to localStorage
  useEffect(() => {
    localStorage.setItem('studioFeatureMode', featureMode)
  }, [featureMode])

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('studioSidebarCollapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Handle URL parameters for importing images from projects
  useEffect(() => {
    const imageParam = searchParams.get('image')
    const nameParam = searchParams.get('name')

    if (imageParam) {
      // Set the image URL from the parameter
      setImageUrl(imageParam)

      // Show a toast notification
      toast({
        title: 'Image loaded',
        description: nameParam ? `Editing: ${nameParam}` : 'Ready to enhance in Studio'
      })

      // Clear the URL parameters to avoid re-loading on refresh
      navigate('/studio', { replace: true })
    }
  }, [searchParams, navigate, toast])

  // Generate prompt from current settings (updates live)
  const generatedPrompt = useMemo(() => {
    return buildPromptFromSettings(settings)
  }, [settings])

  // Full prompt including custom instructions
  // Full prompt logic:
  // - Empty when no preset selected and no custom prompt (fresh start)
  // - Template mode: use ONLY the template prompt (no settings-generated prompt)
  // - Preset mode with selection: combine custom text with generated prompt
  // - Custom mode: use custom text only (if provided)
  const fullPrompt = useMemo(() => {
    if (promptMode === 'template' && customPrompt) {
      // Template mode - use template prompt as-is
      return customPrompt
    }

    // If no preset is selected and no custom prompt, return empty
    // This prevents auto-generating a prompt from default settings
    if (!selectedPresetId && !customPrompt) {
      return ''
    }

    // Preset or Custom mode - combine custom text with settings-generated prompt
    if (selectedPresetId) {
      // Preset selected - use generated prompt (optionally with custom additions)
      return customPrompt
        ? `${customPrompt}. ${generatedPrompt}`
        : generatedPrompt
    }

    // Custom mode with text - just use the custom prompt
    return customPrompt || ''
  }, [customPrompt, generatedPrompt, promptMode, selectedPresetId])

  // Build combination prompt preview (mirrors edge function logic)
  const combinationPromptPreview = useMemo(() => {
    const settings = combinationSettings
    let prompt = `Seamlessly composite the jewelry onto the model photo as if they are naturally wearing it.`

    // Position/placement
    const posY = settings.position_y
    if (posY < 30) {
      prompt += ` Position the jewelry higher on the model (neck/face area).`
    } else if (posY > 70) {
      prompt += ` Position the jewelry lower on the model (chest/hands area).`
    } else {
      prompt += ` Position the jewelry at a natural center position.`
    }

    // Scale
    const scale = settings.scale
    if (scale < 80) {
      prompt += ` Make the jewelry smaller than its original size.`
    } else if (scale > 120) {
      prompt += ` Make the jewelry larger than its original size.`
    }

    // Rotation
    if (settings.rotation !== 0) {
      const rotationDesc = settings.rotation > 0 ? 'clockwise' : 'counter-clockwise'
      prompt += ` Rotate the jewelry ${Math.abs(settings.rotation)} degrees ${rotationDesc} to match the model's pose.`
    }

    // Lighting match
    if (settings.lighting_match > 50) {
      prompt += ` Match the lighting and shadows on the jewelry to the model's photo lighting conditions.`
    }

    // Blend intensity
    if (settings.blend_intensity > 50) {
      prompt += ` Blend the edges seamlessly so the jewelry appears to be part of the original photo.`
    }

    prompt += ` The final image should be photorealistic, high quality, and indistinguishable from a real photograph.`

    return prompt
  }, [combinationSettings])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !(prev as any)[section] }))
  }

  // Sync quick settings to full settings
  useEffect(() => {
    if (studioMode === 'quick') {
      setSettings(prev => ({
        ...prev,
        lighting: {
          ...prev.lighting,
          keyIntensity: quickSettings.lighting
        }
      }))
    }
  }, [quickSettings, studioMode])

  // Check if we're on mobile (used for panel behavior)
  // Initialize with actual value to prevent flash/race conditions
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  // Welcome modal handlers
  const handleWelcomeClose = useCallback(() => {
    markAsSeen('hasSeenStudioWelcome')
    setShowWelcomeModal(false)
  }, [markAsSeen])

  const handleWelcomeSelectMode = useCallback((mode: 'single' | 'combination') => {
    setFeatureMode(mode)
  }, [])

  const handleWelcomeSelectPresets = useCallback(() => {
    markAsSeen('hasSeenStudioWelcome')
    setShowWelcomeModal(false)
    // Keep on presets tab (default)
    incrementUsage('preset')
  }, [markAsSeen, incrementUsage])

  const handleWelcomeSelectTemplates = useCallback(() => {
    markAsSeen('hasSeenStudioWelcome')
    setShowWelcomeModal(false)
    incrementUsage('template')
    // We can't directly switch to templates tab from here since it's controlled by the sidebar
    // The user will see the sidebar and can click Templates tab
  }, [markAsSeen, incrementUsage])

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: StudioPreset) => {
    setSelectedPresetId(preset.id)
    setSelectedPresetName(preset.name)
    setSelectedTemplateId(null) // Clear template selection
    setSelectedTemplateName(null)
    setPromptMode('preset')
    setSettings(presetToSettings(preset))
    incrementUsage('preset')
    // Also set the custom prompt if the preset has one
    if (preset.custom_prompt) {
      setCustomPrompt(preset.custom_prompt)
    } else {
      setCustomPrompt('') // Clear custom prompt when selecting preset without one
    }
  }, [incrementUsage])

  // Handle template selection - uses pre-written prompts instead of settings
  const handleSelectTemplate = useCallback((template: PromptTemplate) => {
    setSelectedTemplateId(template.id)
    setSelectedTemplateName(template.name)
    setSelectedPresetId(null) // Clear preset selection
    setSelectedPresetName(null)
    setPromptMode('template')
    incrementUsage('template')
    // Set the template's base_prompt as the custom prompt
    setCustomPrompt(template.base_prompt || '')
    toast({
      title: 'Template applied',
      description: `Using "${template.name}" prompt template`,
    })
  }, [toast, incrementUsage])

  // Handle image upload
  const handleImageChange = useCallback((url: string | null, file?: File) => {
    setImageUrl(url)
    setImageFile(file || null)
  }, [])

  // Handle idea selection
  const handleSelectIdea = useCallback((idea: string) => {
    setCustomPrompt(idea)
  }, [])

  // Save current prompt as default for fast processing
  const handleSaveAsDefault = useCallback(() => {
    if (customPrompt.trim()) {
      localStorage.setItem('studioDefaultPrompt', customPrompt.trim())
      setHasDefaultPrompt(true)
      toast({
        title: 'Default prompt saved',
        description: 'This prompt will load automatically when you open Studio.',
      })
    }
  }, [customPrompt, toast])

  // Clear the default prompt
  const handleClearDefault = useCallback(() => {
    localStorage.removeItem('studioDefaultPrompt')
    setHasDefaultPrompt(false)
    toast({
      title: 'Default prompt cleared',
      description: 'Studio will now open with an empty prompt.',
    })
  }, [toast])

  // Handle generation reuse
  const handleReuseGeneration = useCallback((generation: StudioGeneration) => {
    if (generation.settings_snapshot) {
      setSettings(generation.settings_snapshot)
    }
    if (generation.custom_prompt) {
      setCustomPrompt(generation.custom_prompt)
    }
  }, [])

  // Combination handlers
  const handleModelImageChange = useCallback((url: string | null, file?: File) => {
    setDualImages(prev => ({
      ...prev,
      model: { ...prev.model, url, file: file || null }
    }))
  }, [])

  const handleJewelryImageChange = useCallback((url: string | null, file?: File) => {
    setDualImages(prev => ({
      ...prev,
      jewelry: { ...prev.jewelry, url, file: file || null }
    }))
  }, [])

  const handleCombinationSettingsChange = useCallback(<K extends keyof CombinationQuickSettings>(
    key: K,
    value: CombinationQuickSettings[K]
  ) => {
    setCombinationSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSelectCombinationTemplate = useCallback((template: CombinationTemplate) => {
    setSelectedCombinationTemplateId(template.id)
    const settings = templateToSettings(template)
    // Keep the current ai_model when applying template (templates don't override model choice)
    setCombinationSettings(prev => ({
      position_y: settings.position_y,
      scale: settings.scale,
      blend_intensity: settings.blend_intensity,
      lighting_match: settings.lighting_match,
      rotation: settings.rotation,
      ai_model: prev.ai_model,
    }))
  }, [])

  // Handle combination preset selection from sidebar
  const handleSelectCombinationPreset = useCallback((preset: any) => {
    setSelectedCombinationPresetId(preset.id)
    setSelectedCombinationTemplateId(null) // Clear template selection
    setCombinationSettings({
      position_y: preset.position_y ?? 50,
      scale: preset.scale ?? 100,
      blend_intensity: preset.blend_intensity ?? 75,
      lighting_match: preset.lighting_match ?? 70,
      rotation: preset.rotation ?? 0,
      ai_model: (preset.ai_model as any) ?? combinationSettings.ai_model,
    })
    toast({
      title: 'Preset applied',
      description: `"${preset.name}" settings loaded`,
    })
  }, [combinationSettings.ai_model, toast])

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!imageUrl || !organization) {
        throw new Error('Please upload an image first')
      }

      // Build the prompt based on mode
      const generatedPrompt = buildPromptFromSettings(settings)
      let finalPrompt: string
      if (promptMode === 'template' && customPrompt) {
        // Template mode - use template prompt only
        finalPrompt = customPrompt
      } else {
        // Preset/Custom mode - combine custom text with settings-generated prompt
        finalPrompt = customPrompt
          ? `${customPrompt}. ${generatedPrompt}`
          : generatedPrompt
      }

      // Upload image to storage first if it's a local file
      let uploadedImageUrl = imageUrl
      let storagePath: string | null = null

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg'
        storagePath = `${organization.id}/studio/${Date.now()}.${fileExt}`

        // Convert data URL to blob
        const response = await fetch(imageUrl)
        const blob = await response.blob()

        const { error: uploadError } = await supabase.storage
          .from('processed-images')
          .upload(storagePath, blob, {
            contentType: imageFile.type,
            upsert: true,
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('processed-images')
          .getPublicUrl(storagePath)

        uploadedImageUrl = publicUrl
      }

      // Create generation record
      // Type assertion needed until migration is applied and types regenerated
      const { data: generation, error: genError } = await (supabase as any)
        .from('studio_generations')
        .insert({
          organization_id: organization.id,
          preset_id: selectedPresetId,
          original_url: uploadedImageUrl,
          original_file_name: imageFile?.name,
          original_storage_path: storagePath,
          settings_snapshot: settings,
          custom_prompt: customPrompt || null,
          final_prompt: finalPrompt,
          ai_model: settings.aiModel,
          status: 'processing',
          created_by: user?.id,
        })
        .select()
        .single()

      if (genError) throw genError

      // Call optimize-image edge function (fire and forget - edge function updates DB directly)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      // Fire and forget - don't await the response
      // Edge function will update the database when done
      // Note: Don't send settings flags - the finalPrompt already includes all instructions
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: uploadedImageUrl,
            prompt: finalPrompt,
            ai_model: settings.aiModel,
            aspect_ratio: settings.composition.aspectRatio,
            generation_id: generation.id,  // Pass generation ID for async DB update
          }),
        }
      ).catch(err => {
        // Log error but don't block - generation record exists and history will show status
        console.error('Optimize image request failed:', err)
      })

      return { generation }
    },
    onSuccess: () => {
      toast({
        title: 'Processing started',
        description: 'Your image is being optimized. Watch the Generations panel for results.',
      })
      queryClient.invalidateQueries({ queryKey: ['studio-generations'] })
    },
    onError: (error) => {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // Combination generate mutation
  const combineMutation = useMutation({
    mutationFn: async () => {
      if (!dualImages.model.url || !dualImages.jewelry.url || !organization) {
        throw new Error('Please upload both model and jewelry images')
      }

      // Upload model image if needed
      let modelImageUrl = dualImages.model.url
      if (dualImages.model.file) {
        const fileExt = dualImages.model.file.name.split('.').pop() || 'jpg'
        const storagePath = `${organization.id}/combination/model_${Date.now()}.${fileExt}`

        const response = await fetch(dualImages.model.url)
        const blob = await response.blob()

        const { error: uploadError } = await supabase.storage
          .from('processed-images')
          .upload(storagePath, blob, {
            contentType: dualImages.model.file.type,
            upsert: true,
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('processed-images')
          .getPublicUrl(storagePath)

        modelImageUrl = publicUrl
      }

      // Upload jewelry image if needed
      let jewelryImageUrl = dualImages.jewelry.url
      if (dualImages.jewelry.file) {
        const fileExt = dualImages.jewelry.file.name.split('.').pop() || 'jpg'
        const storagePath = `${organization.id}/combination/jewelry_${Date.now()}.${fileExt}`

        const response = await fetch(dualImages.jewelry.url)
        const blob = await response.blob()

        const { error: uploadError } = await supabase.storage
          .from('processed-images')
          .upload(storagePath, blob, {
            contentType: dualImages.jewelry.file.type,
            upsert: true,
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('processed-images')
          .getPublicUrl(storagePath)

        jewelryImageUrl = publicUrl
      }

      // Create combination job record
      const { data: job, error: jobError } = await (supabase as any)
        .from('combination_jobs')
        .insert({
          organization_id: organization.id,
          template_id: selectedCombinationTemplateId,
          model_image_url: modelImageUrl,
          jewelry_image_url: jewelryImageUrl,
          ...combinationSettings,
          status: 'pending',
          created_by: user?.id,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Call combine-images edge function
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/combine-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_id: job.id }),
        }
      ).catch(err => {
        console.error('Combine images request failed:', err)
      })

      return { job }
    },
    onSuccess: () => {
      toast({
        title: 'Combination started',
        description: 'Your images are being combined. This will take about 30 seconds.',
      })
      queryClient.invalidateQueries({ queryKey: ['combination-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['studio-generations'] }) // Update unified history
    },
    onError: (error) => {
      toast({
        title: 'Combination failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async () => {
      if (!organization || !presetName.trim()) {
        throw new Error('Please enter a preset name')
      }

      const { error } = await (supabase as any)
        .from('studio_presets')
        .insert({
          organization_id: organization.id,
          name: presetName.trim(),
          description: presetDescription.trim() || null,
          category: 'custom',
          is_system: false,
          is_active: true,
          usage_count: 0,
          // Camera settings
          camera_lens: settings.camera.lens,
          camera_aperture: settings.camera.aperture,
          camera_angle: settings.camera.angle,
          camera_focus: settings.camera.focus,
          camera_distance: settings.camera.distance,
          // Lighting settings
          lighting_style: settings.lighting.style,
          lighting_key_intensity: settings.lighting.keyIntensity,
          lighting_fill_intensity: settings.lighting.fillIntensity,
          lighting_rim_intensity: settings.lighting.rimIntensity,
          lighting_direction: settings.lighting.direction,
          // Background settings
          background_type: settings.background.type,
          background_surface: settings.background.surface,
          background_shadow: settings.background.shadow,
          background_reflection: settings.background.reflection,
          background_color: settings.background.color || null,
          // Jewelry settings
          jewelry_metal: settings.jewelry.metal,
          jewelry_finish: settings.jewelry.finish,
          jewelry_sparkle: settings.jewelry.sparkle,
          jewelry_color_pop: settings.jewelry.colorPop,
          jewelry_detail: settings.jewelry.detail,
          // Composition settings
          composition_framing: settings.composition.framing,
          composition_aspect_ratio: settings.composition.aspectRatio,
          composition_padding: settings.composition.padding,
          // AI model
          ai_model: settings.aiModel,
          // Custom prompt (user's text additions)
          custom_prompt: customPrompt || null,
          created_by: user?.id,
        })

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Preset saved',
        description: `"${presetName}" has been saved to My Studios`,
      })
      setShowSavePresetDialog(false)
      setPresetName('')
      setPresetDescription('')
      queryClient.invalidateQueries({ queryKey: ['studio-presets'] })
    },
    onError: (error) => {
      toast({
        title: 'Failed to save preset',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })


  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Mobile Header - only visible on mobile */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
        <Button
          variant="ghost"
          size="default"
          className="text-gray-300 hover:text-white min-h-[44px] px-3"
          onClick={() => setShowMobilePresets(true)}
        >
          <Menu className="h-5 w-5 mr-2" />
          Presets
        </Button>
        <span className="text-white font-medium">Studio</span>
        <Button
          variant="ghost"
          size="default"
          className="text-gray-300 hover:text-white min-h-[44px] min-w-[44px]"
          onClick={() => setShowMobileSettings(true)}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Left Sidebar - Mode-specific presets (collapsible) - hidden on mobile */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-72'}`}>
        {sidebarCollapsed ? (
          <div className="h-full bg-gray-50 border-r flex flex-col items-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="mb-4"
              title="Expand sidebar"
            >
              <PanelLeft className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        ) : (
          <div className="h-full relative">
            {featureMode === 'single' ? (
              <StudioPresetsSidebar
                selectedPresetId={selectedPresetId}
                selectedTemplateId={selectedTemplateId}
                onSelectPreset={handleSelectPreset}
                onSelectTemplate={handleSelectTemplate}
                onCreatePreset={() => {
                  setShowSavePresetDialog(true)
                }}
              />
            ) : (
              <CombinationPresetsSidebar
                selectedPresetId={selectedCombinationPresetId}
                onSelectPreset={handleSelectCombinationPreset}
                onSaveCurrentSettings={() => {
                  toast({ title: 'Coming soon', description: 'Save preset feature will be available soon' })
                }}
              />
            )}
            {/* Collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              className="absolute top-3 right-2 h-7 w-7 p-0"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 min-h-0">
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 p-3 md:p-6 flex flex-col overflow-y-auto min-h-0">
            <div className={`${STUDIO_SPACING.canvas} mx-auto w-full space-y-3`}>
              {/* Feature Mode Selector */}
              <StudioFeatureSelector
                feature={featureMode}
                onChange={setFeatureMode}
              />

              {/* Image Upload Area - Conditional based on feature mode */}
              {featureMode === 'edit' ? (
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
                  <EditMode imageUrl={imageUrl} onImageChange={handleImageChange} />
                </div>
              ) : featureMode === 'single' ? (
                <>
                  <div className="w-full">
                    <ImageUploader imageUrl={imageUrl} onImageChange={handleImageChange} />
                  </div>

                  {/* Live Prompt Preview - compact with expand */}
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowPromptPreview(!showPromptPreview)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-medium text-slate-300">Live Prompt</span>
                        {!showPromptPreview && (
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">
                            {generatedPrompt.slice(0, 60)}...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-slate-500">{generatedPrompt.length} chars</span>
                        {showPromptPreview ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>
                    {showPromptPreview && (
                      <div className="px-3 pb-3 border-t border-slate-700/50">
                        <div className="text-xs text-slate-300 leading-relaxed pt-2 max-h-24 overflow-y-auto">
                          <PromptDiff prompt={generatedPrompt} />
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(generatedPrompt)
                              setPromptCopied(true)
                              setTimeout(() => setPromptCopied(false), 2000)
                            }}
                          >
                            {promptCopied ? <Check className="h-3 w-3 mr-1 text-emerald-400" /> : <Copy className="h-3 w-3 mr-1" />}
                            {promptCopied ? 'Copied' : 'Copy'}
                          </Button>
                          {/* Setting chips */}
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                              {settings.composition.aspectRatio}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                              {settings.lighting.style}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ideas to Explore - only show when no image */}
                  {!imageUrl && <IdeasToExplore onSelectIdea={handleSelectIdea} />}
                </>
              ) : (
                <>
                  <DualImageUploader
                    images={dualImages}
                    onModelChange={handleModelImageChange}
                    onJewelryChange={handleJewelryImageChange}
                  />

                  {/* Live Prompt Preview - right under images */}
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-4 shadow-lg shadow-blue-500/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400/50" />
                        <span className="text-sm font-semibold text-white">Live Prompt</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full">{combinationPromptPreview.length} chars</span>
                    </div>
                    <div className="text-sm text-gray-200 leading-relaxed">
                      <PromptDiff prompt={combinationPromptPreview} />
                    </div>
                  </div>

                  {/* Style Templates */}
                  <CombinationTemplates
                    selectedTemplateId={selectedCombinationTemplateId}
                    onSelectTemplate={handleSelectCombinationTemplate}
                  />

                  {/* Placement Preview - shows when both images uploaded */}
                  {dualImages.model.url && dualImages.jewelry.url && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Preview</h4>
                      <PlacementPreview
                        modelImageUrl={dualImages.model.url}
                        jewelryImageUrl={dualImages.jewelry.url}
                        settings={combinationSettings}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Prompt Mode Indicator & Custom Prompt - only for single image mode */}
              {featureMode === 'single' && (
                <div className="space-y-2">
                  {promptMode === 'template' ? (
                    // Template mode - read-only display with edit option
                    <TemplatePromptDisplay
                      templateName={selectedTemplateName || 'Template'}
                      prompt={customPrompt}
                      onEditAsCustom={() => {
                        // Keep the prompt but switch to custom mode
                        setPromptMode('custom')
                        setSelectedTemplateId(null)
                        setSelectedTemplateName(null)
                        toast({
                          title: 'Editing as Custom',
                          description: 'Template copied to custom prompt. Original template unchanged.',
                        })
                      }}
                    />
                  ) : (
                    // Preset/Custom mode - editable textarea with optimizer
                    <>
                      <PromptModeIndicator
                        mode={promptMode}
                        selectedName={promptMode === 'preset' ? selectedPresetName : null}
                        onClear={() => {
                          setPromptMode('custom')
                          setSelectedPresetId(null)
                          setSelectedPresetName(null)
                        }}
                      />
                      <div className="relative">
                        <Textarea
                          placeholder="Add custom instructions or tap mic to speak..."
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 resize-none rounded-xl focus:ring-purple-500 focus:border-purple-500 pr-10"
                          rows={2}
                        />
                        <VoiceMicButton
                          onTranscript={(text) => {
                            setCustomPrompt(prev => prev ? `${prev} ${text}` : text)
                            setPromptMode('custom')
                          }}
                          className="absolute right-2 top-2"
                        />
                      </div>
                      {/* Prompt Optimizer + Save as Default */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <PromptOptimizer
                          currentPrompt={customPrompt}
                          onOptimizedPrompt={(prompt) => {
                            setCustomPrompt(prompt)
                            setPromptMode('custom')
                            setSelectedPresetId(null)
                          }}
                        />
                        {/* Save as Default / Clear Default */}
                        {customPrompt.trim() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveAsDefault}
                            className="h-8 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                            Set as Default
                          </Button>
                        )}
                        {hasDefaultPrompt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearDefault}
                            className="h-8 text-xs text-gray-500 hover:text-red-400 hover:bg-gray-800"
                          >
                            Clear Default
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Generated Prompt Preview - only when there's a prompt to show */}
              {featureMode === 'single' && promptMode !== 'template' && fullPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowPromptPreview(!showPromptPreview)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {showPromptPreview ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {showPromptPreview ? 'Hide' : 'View'} generated prompt
                      <span className="text-xs text-gray-500">({fullPrompt.length} chars)</span>
                      {showPromptPreview ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {showPromptPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                        onClick={() => {
                          navigator.clipboard.writeText(fullPrompt)
                          setPromptCopied(true)
                          setTimeout(() => setPromptCopied(false), 2000)
                        }}
                      >
                        {promptCopied ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-green-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div
                    className={`
                      ${PANEL_TRANSITION.enter}
                      overflow-hidden
                      ${showPromptPreview ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}
                    `}
                  >
                    <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 leading-relaxed overflow-y-auto max-h-48">
                      <p className="text-xs text-purple-400 font-medium mb-2">
                        Full prompt:
                      </p>
                      {fullPrompt}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel - Light chrome with subtle border */}
          <div className={`hidden md:flex flex-col w-80 flex-shrink-0 h-full max-h-[calc(100vh-80px)] ${PANEL_TRANSITION.enter} animate-in slide-in-from-right-4 bg-white border-l border-slate-200`}>
            {/* Compact mode toggle only */}
            <div className="flex-shrink-0 p-3 border-b border-slate-100">
              <StudioModeToggle
                mode={studioMode}
                onChange={setStudioMode}
              />
            </div>
            {/* Conditional Controls based on mode and feature */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {studioMode === 'quick' ? (
                featureMode === 'single' ? (
                  <QuickControls
                    lighting={quickSettings.lighting}
                    aiModel={settings.aiModel}
                    aspectRatio={settings.composition.aspectRatio}
                    onChange={(key, value) => {
                      setQuickSettings(prev => ({ ...prev, [key]: value }))
                    }}
                    onModelChange={(model) => {
                      setSettings(prev => ({ ...prev, aiModel: model }))
                    }}
                    onAspectRatioChange={(ratio) => {
                      setSettings(prev => ({
                        ...prev,
                        composition: { ...prev.composition, aspectRatio: ratio }
                      }))
                    }}
                  />
                ) : (
                  <CombinationControls
                    settings={combinationSettings}
                    onChange={handleCombinationSettingsChange}
                  />
                )
              ) : (
                /* Advanced Mode - tab-based */
                <AdvancedTabs
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer - Generate Button (always visible) */}
        <div className="flex-shrink-0 px-3 md:px-6 py-3 md:py-4 border-t border-gray-700/50 bg-gray-900/95 backdrop-blur-sm pb-safe">
          <div className="max-w-3xl mx-auto flex gap-2 md:gap-3 items-center">
            {featureMode === 'single' ? (
              <>
                {/* Generate Button with tooltip when disabled */}
                <div className="flex-1 relative group" title={!imageUrl ? 'Upload an image to get started' : undefined}>
                  <Button
                    className={`w-full gap-2 h-12 text-base rounded-xl relative overflow-hidden ${
                      !imageUrl && !generateMutation.isPending
                        ? 'bg-purple-600/50 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                    size="lg"
                    onClick={() => {
                      // On mobile, show confirmation sheet first
                      if (isMobile && imageUrl && !generateMutation.isPending) {
                        setShowGenerateConfirm(true)
                      } else {
                        generateMutation.mutate()
                      }
                    }}
                    disabled={!imageUrl || generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Generating...</span>
                        <span className="absolute inset-0 bg-purple-500/50 animate-pulse" />
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5" />
                        <span>Generate</span>
                      </>
                    )}
                  </Button>
                  {/* Mobile tooltip shown below button when disabled */}
                  {!imageUrl && (
                    <span className="md:hidden absolute -bottom-5 left-0 right-0 text-center text-[10px] text-gray-500">
                      Upload an image first
                    </span>
                  )}
                </div>
                {/* Token cost - visible on all screen sizes */}
                <div className="flex items-center gap-1.5 px-2 md:px-3 h-12 bg-gray-800/50 border border-gray-700 text-gray-300 rounded-xl">
                  <Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-500" />
                  <span className="text-sm md:text-base font-medium">
                    {getModelById(settings.aiModel)?.tokenCost || 1}
                  </span>
                  <span className="hidden sm:inline text-sm text-gray-400">
                    {(getModelById(settings.aiModel)?.tokenCost || 1) === 1 ? 'token' : 'tokens'}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Combine Button with tooltip when disabled */}
                <div className="flex-1 relative group" title={(!dualImages.model.url || !dualImages.jewelry.url) ? 'Upload both images to combine' : undefined}>
                  <Button
                    className={`w-full gap-2 h-12 text-base rounded-xl relative overflow-hidden ${
                      (!dualImages.model.url || !dualImages.jewelry.url) && !combineMutation.isPending
                        ? 'bg-gradient-to-r from-blue-600/50 to-amber-600/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-amber-600 hover:from-blue-700 hover:to-amber-700'
                    }`}
                    size="lg"
                    onClick={() => combineMutation.mutate()}
                    disabled={!dualImages.model.url || !dualImages.jewelry.url || combineMutation.isPending}
                  >
                    {combineMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="hidden sm:inline">Combining...</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-amber-600/50 animate-pulse" />
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5" />
                        <span className="hidden sm:inline">Combine Images</span>
                        <span className="sm:hidden">Combine</span>
                      </>
                    )}
                  </Button>
                  {/* Mobile tooltip shown below button when disabled */}
                  {(!dualImages.model.url || !dualImages.jewelry.url) && (
                    <span className="md:hidden absolute -bottom-5 left-0 right-0 text-center text-[10px] text-gray-500">
                      Upload both images
                    </span>
                  )}
                </div>
                {/* Token cost - visible on all screen sizes */}
                <div className="flex items-center gap-1.5 px-2 md:px-3 h-12 bg-gray-800/50 border border-gray-700 text-gray-300 rounded-xl">
                  <Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-500" />
                  <span className="text-sm md:text-base font-medium">
                    {getModelById(combinationSettings.ai_model)?.tokenCost || 2}
                  </span>
                  <span className="hidden sm:inline text-sm text-gray-400">tokens</span>
                </div>
              </>
            )}
            {/* View Generations Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowGenerations(true)}
              className="gap-2 bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 h-12 rounded-xl relative px-3 md:px-4"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              {processingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse font-medium">
                  {processingCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Generations Sheet (modal) */}
      <Sheet open={showGenerations} onOpenChange={setShowGenerations}>
        <SheetContent side="right" className="w-[90vw] sm:w-[400px] md:w-[540px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Generations</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <GenerationsHistory
              onSelectGeneration={() => {}}
              onReuse={(gen) => {
                handleReuseGeneration(gen)
                setShowGenerations(false)
              }}
            />
          </div>
          {/* Footer with View All Activity link */}
          <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
            <Link
              to="/activity"
              onClick={() => setShowGenerations(false)}
              className="flex items-center justify-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              View All Activity
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Presets Sheet */}
      <Sheet open={showMobilePresets} onOpenChange={setShowMobilePresets}>
        <SheetContent side="left" className="w-[90vw] max-w-[360px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Presets & Templates</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-60px)] overflow-hidden">
            {featureMode === 'single' ? (
              <StudioPresetsSidebar
                selectedPresetId={selectedPresetId}
                selectedTemplateId={selectedTemplateId}
                onSelectPreset={(preset) => {
                  handleSelectPreset(preset)
                  setShowMobilePresets(false)
                }}
                onSelectTemplate={(template) => {
                  handleSelectTemplate(template)
                  setShowMobilePresets(false)
                }}
                onCreatePreset={() => {
                  setShowSavePresetDialog(true)
                  setShowMobilePresets(false)
                }}
              />
            ) : (
              <CombinationPresetsSidebar
                selectedPresetId={selectedCombinationPresetId}
                onSelectPreset={(preset) => {
                  handleSelectCombinationPreset(preset)
                  setShowMobilePresets(false)
                }}
                onSaveCurrentSettings={() => {
                  toast({ title: 'Coming soon', description: 'Save preset feature will be available soon' })
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Settings Sheet - Light theme for consistency */}
      <Sheet open={showMobileSettings} onOpenChange={setShowMobileSettings}>
        <SheetContent
          side="right"
          className="w-[90vw] max-w-[400px] p-0 bg-white"
        >
          <SheetHeader className="px-4 py-3 border-b border-slate-100">
            <SheetTitle>
              {studioMode === 'advanced' ? 'Advanced Settings' : 'Settings'}
            </SheetTitle>
          </SheetHeader>

          {/* Mode Toggle */}
          <div className="p-4 border-b border-slate-100">
            <StudioModeToggle
              mode={studioMode}
              onChange={setStudioMode}
            />
          </div>

          {/* Content based on mode */}
          <div className="h-[calc(100%-120px)] overflow-y-auto">
            {studioMode === 'quick' ? (
              // Quick Mode Controls
              featureMode === 'single' ? (
                <QuickControls
                  lighting={quickSettings.lighting}
                  aiModel={settings.aiModel}
                  aspectRatio={settings.composition.aspectRatio}
                  onChange={(key, value) => {
                    setQuickSettings(prev => ({ ...prev, [key]: value }))
                  }}
                  onModelChange={(model) => {
                    setSettings(prev => ({ ...prev, aiModel: model }))
                  }}
                  onAspectRatioChange={(ratio) => {
                    setSettings(prev => ({
                      ...prev,
                      composition: { ...prev.composition, aspectRatio: ratio }
                    }))
                  }}
                />
              ) : (
                <CombinationControls
                  settings={combinationSettings}
                  onChange={handleCombinationSettingsChange}
                />
              )
            ) : (
              // Advanced Mode Controls - tab-based inside sheet
              <AdvancedTabs
                settings={settings}
                onSettingsChange={setSettings}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>


      {/* Welcome Modal for First-Time Users */}
      <StudioWelcomeModal
        open={showWelcomeModal}
        onClose={handleWelcomeClose}
        onSelectPresets={handleWelcomeSelectPresets}
        onSelectTemplates={handleWelcomeSelectTemplates}
        onSelectMode={handleWelcomeSelectMode}
      />

      {/* Save Preset Dialog */}
      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Preset</DialogTitle>
            <DialogDescription>
              Save your current settings as a reusable preset in My Studios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Gold Ring Studio"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (optional)</Label>
              <Textarea
                id="preset-description"
                placeholder="Describe when to use this preset..."
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSavePresetDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => savePresetMutation.mutate()}
              disabled={!presetName.trim() || savePresetMutation.isPending}
            >
              {savePresetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preset'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Generate Confirmation Sheet */}
      <GenerateConfirmSheet
        open={showGenerateConfirm}
        onOpenChange={setShowGenerateConfirm}
        onConfirm={() => {
          setShowGenerateConfirm(false)
          generateMutation.mutate()
        }}
        onEditSettings={() => {
          setShowGenerateConfirm(false)
          setShowMobileSettings(true)
        }}
        isGenerating={generateMutation.isPending}
        imageFile={imageFile}
        imageUrl={imageUrl}
        aiModel={settings.aiModel}
        aspectRatio={settings.composition.aspectRatio}
        presetName={selectedPresetName}
        lightingIntensity={quickSettings.lighting}
      />
    </div>
  )
}
