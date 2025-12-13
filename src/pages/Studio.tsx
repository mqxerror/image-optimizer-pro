import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wand2, Save, Coins, ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  StudioPresetsSidebar,
  CameraControls,
  LightingMixer,
  BackgroundSelector,
  JewelryEnhancements,
  CompositionControls,
  ImageUploader,
  GenerationsHistory,
  ModelSelector,
  IdeasToExplore,
  buildPromptFromSettings,
} from '@/components/studio'
import type {
  StudioSettings,
  StudioPreset,
  StudioGeneration,
} from '@/types/studio'
import { defaultStudioSettings, presetToSettings } from '@/types/studio'

export default function Studio() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { organization, user } = useAuthStore()

  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [settings, setSettings] = useState<StudioSettings>(defaultStudioSettings)
  const [customPrompt, setCustomPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    camera: true,
    lighting: true,
    background: true,
    jewelry: true,
    composition: false,
    model: false,
  })
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [studioMode, setStudioMode] = useState<'quick' | 'advanced'>('quick') // UX-014: Quick/Advanced mode

  // Generate prompt from current settings (updates live)
  const generatedPrompt = useMemo(() => {
    return buildPromptFromSettings(settings)
  }, [settings])

  // Full prompt including custom instructions
  const fullPrompt = useMemo(() => {
    return customPrompt
      ? `${customPrompt}. ${generatedPrompt}`
      : generatedPrompt
  }, [customPrompt, generatedPrompt])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: StudioPreset) => {
    setSelectedPresetId(preset.id)
    setSettings(presetToSettings(preset))
  }, [])

  // Handle image upload
  const handleImageChange = useCallback((url: string | null, file?: File) => {
    setImageUrl(url)
    setImageFile(file || null)
  }, [])

  // Handle idea selection
  const handleSelectIdea = useCallback((idea: string) => {
    setCustomPrompt(idea)
  }, [])

  // Handle generation reuse
  const handleReuseGeneration = useCallback((generation: StudioGeneration) => {
    if (generation.settings_snapshot) {
      setSettings(generation.settings_snapshot)
    }
    if (generation.custom_prompt) {
      setCustomPrompt(generation.custom_prompt)
    }
  }, [])

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!imageUrl || !organization) {
        throw new Error('Please upload an image first')
      }

      // Build the prompt
      const generatedPrompt = buildPromptFromSettings(settings)
      const finalPrompt = customPrompt
        ? `${customPrompt}. ${generatedPrompt}`
        : generatedPrompt

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

  // Section header component
  const SectionHeader = ({
    title,
    section,
    icon: Icon,
  }: {
    title: string
    section: keyof typeof expandedSections
    icon: React.ComponentType<{ className?: string }>
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="h-4 w-4 text-gray-400" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400" />
      )}
    </button>
  )

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Presets */}
      <div className="w-72 flex-shrink-0">
        <StudioPresetsSidebar
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
          onCreatePreset={() => {
            toast({ title: 'Coming soon', description: 'Custom preset creation will be available soon' })
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 overflow-hidden">
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 p-6 flex flex-col overflow-y-auto">
            <div className="max-w-xl mx-auto w-full space-y-6">
              {/* Image Upload Area */}
              <div className="w-full">
                <ImageUploader imageUrl={imageUrl} onImageChange={handleImageChange} />
              </div>

              {/* Ideas to Explore - only show when no image */}
              {!imageUrl && <IdeasToExplore onSelectIdea={handleSelectIdea} />}

              {/* Custom Prompt */}
              <div>
                <Textarea
                  placeholder="Add custom instructions (optional)..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 resize-none rounded-xl focus:ring-purple-500 focus:border-purple-500"
                  rows={2}
                />
              </div>

              {/* Generated Prompt Preview */}
              <div className="space-y-2">
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
                  {showPromptPreview ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showPromptPreview && (
                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto">
                    <p className="text-xs text-purple-400 font-medium mb-2">
                      Full prompt ({fullPrompt.length} chars):
                    </p>
                    {fullPrompt}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 h-12 text-base rounded-xl"
                  size="lg"
                  onClick={() => generateMutation.mutate()}
                  disabled={!imageUrl || generateMutation.isPending}
                >
                  <Wand2 className="h-5 w-5" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 h-12 rounded-xl"
                >
                  <Coins className="h-4 w-4" />
                  1 token
                </Button>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="w-80 bg-gray-50 border-l border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-white space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">Settings</h3>
                <p className="text-xs text-gray-500 mt-0.5">Customize your image generation</p>
              </div>

              {/* UX-014: Quick/Advanced Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setStudioMode('quick')}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    studioMode === 'quick'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Quick
                </button>
                <button
                  onClick={() => setStudioMode('advanced')}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    studioMode === 'advanced'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-65px)]">
              <div className="p-4 space-y-1">
                {/* Quick Mode Info */}
                {studioMode === 'quick' && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Quick Mode:</strong> Focus on the essentials. Switch to Advanced for fine-grained control over camera, lighting, and more.
                    </p>
                  </div>
                )}

                {/* Advanced Controls - only show in Advanced mode */}
                {studioMode === 'advanced' && (
                  <>
                    {/* Camera */}
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <SectionHeader
                    title="Camera"
                    section="camera"
                    icon={({ className }) => <span className={className}>📷</span>}
                  />
                  {expandedSections.camera && (
                    <div className="px-4 pb-4">
                      <CameraControls
                        settings={settings.camera}
                        onChange={(camera) => setSettings(s => ({ ...s, camera }))}
                      />
                    </div>
                  )}
                </div>

                {/* Lighting */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <SectionHeader
                    title="Lighting"
                    section="lighting"
                    icon={({ className }) => <span className={className}>💡</span>}
                  />
                  {expandedSections.lighting && (
                    <div className="px-4 pb-4">
                      <LightingMixer
                        settings={settings.lighting}
                        onChange={(lighting) => setSettings(s => ({ ...s, lighting }))}
                      />
                    </div>
                  )}
                </div>

                {/* Background */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <SectionHeader
                    title="Background"
                    section="background"
                    icon={({ className }) => <span className={className}>🖼️</span>}
                  />
                  {expandedSections.background && (
                    <div className="px-4 pb-4">
                      <BackgroundSelector
                        settings={settings.background}
                        onChange={(background) => setSettings(s => ({ ...s, background }))}
                      />
                    </div>
                  )}
                </div>

                {/* Jewelry */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <SectionHeader
                    title="Jewelry"
                    section="jewelry"
                    icon={({ className }) => <span className={className}>💎</span>}
                  />
                  {expandedSections.jewelry && (
                    <div className="px-4 pb-4">
                      <JewelryEnhancements
                        settings={settings.jewelry}
                        onChange={(jewelry) => setSettings(s => ({ ...s, jewelry }))}
                      />
                    </div>
                  )}
                </div>

                {/* Composition */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <SectionHeader
                    title="Composition"
                    section="composition"
                    icon={({ className }) => <span className={className}>📐</span>}
                  />
                  {expandedSections.composition && (
                    <div className="px-4 pb-4">
                      <CompositionControls
                        settings={settings.composition}
                        onChange={(composition) => setSettings(s => ({ ...s, composition }))}
                      />
                    </div>
                  )}
                </div>
                  </>
                )}

                {/* AI Model - Always visible */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <SectionHeader
                    title="AI Model"
                    section="model"
                    icon={({ className }) => <span className={className}>🤖</span>}
                  />
                  {expandedSections.model && (
                    <div className="px-4 pb-4">
                      <ModelSelector
                        model={settings.aiModel}
                        onChange={(aiModel) => setSettings(s => ({ ...s, aiModel }))}
                      />
                    </div>
                  )}
                </div>

                {/* Save Preset Button */}
                <div className="pt-3">
                  <Button
                    variant="outline"
                    className="w-full gap-2 bg-white"
                    onClick={() => setShowSavePresetDialog(true)}
                  >
                    <Save className="h-4 w-4" />
                    Save as Preset
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Generations */}
      <div className="w-48 flex-shrink-0">
        <GenerationsHistory
          onSelectGeneration={() => {}}
          onReuse={handleReuseGeneration}
        />
      </div>

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
    </div>
  )
}
