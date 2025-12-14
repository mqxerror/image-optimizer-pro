import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  RotateCcw,
  Users,
  Image,
  Copy,
  Check,
  ArrowLeftRight,
  Save,
  Bookmark,
  Loader2,
  Wand2,
  FolderKanban,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { formatDistanceToNow } from 'date-fns'
import { getModelById } from '@/constants/aiModels'

// Preset categories for saving
const PRESET_CATEGORIES = [
  { value: 'rings', label: 'Rings' },
  { value: 'necklaces', label: 'Necklaces' },
  { value: 'earrings', label: 'Earrings' },
  { value: 'bracelets', label: 'Bracelets' },
  { value: 'watches', label: 'Watches' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'custom', label: 'Custom' },
]

// Generation type that works for different sources
export interface GenerationDetail {
  id: string
  source: 'studio' | 'combination' | 'queue' | 'history'
  // Images
  originalUrl?: string | null
  resultUrl?: string | null
  thumbnailUrl?: string | null
  // For combinations
  modelImageUrl?: string | null
  jewelryImageUrl?: string | null
  // Prompt & settings
  prompt?: string | null
  aiModel?: string | null
  // Metadata
  fileName?: string | null
  status: string
  createdAt: string
  completedAt?: string | null
  processingTimeSec?: number | null
  tokensUsed?: number | null
  errorMessage?: string | null
  // Combination settings
  positionY?: number | null
  scale?: number | null
  rotation?: number | null
  blendIntensity?: number | null
  lightingMatch?: number | null
  // For saving as preset
  settingsSnapshot?: any | null
  // Project info
  projectName?: string | null
}

interface GenerationDetailModalProps {
  generation: GenerationDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReuse?: (generation: GenerationDetail) => void
  onDelete?: (generation: GenerationDetail) => void
}

// Before/After Image Comparison Slider Component
function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After'
}: {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
}) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }

  const handleMouseDown = () => {
    isDragging.current = true
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square rounded-lg overflow-hidden cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {/* After Image (full width behind) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before Image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Slider Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <ArrowLeftRight className="h-5 w-5 text-gray-700" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {beforeLabel}
      </div>
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {afterLabel}
      </div>
    </div>
  )
}

export function GenerationDetailModal({
  generation,
  open,
  onOpenChange,
  onReuse,
  onDelete
}: GenerationDetailModalProps) {
  const { organization, user } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [promptCopied, setPromptCopied] = useState(false)

  // Save as Preset dialog state
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetCategory, setPresetCategory] = useState('custom')
  const [presetDescription, setPresetDescription] = useState('')

  // Save as Preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async () => {
      if (!organization || !generation || !presetName.trim()) {
        throw new Error('Missing required data')
      }

      const settings = generation.settingsSnapshot
      if (!settings) {
        throw new Error('No settings snapshot available for this generation')
      }

      // Build preset data from settings_snapshot
      const presetData = {
        organization_id: organization.id,
        name: presetName.trim(),
        description: presetDescription.trim() || null,
        category: presetCategory,
        thumbnail_url: generation.resultUrl,
        is_system: false,
        is_active: true,
        usage_count: 0,
        // Camera settings
        camera_lens: settings.camera?.lens || '85mm',
        camera_aperture: settings.camera?.aperture || 'f/8',
        camera_angle: settings.camera?.angle || '45deg',
        camera_focus: settings.camera?.focus || 'sharp',
        camera_distance: settings.camera?.distance || 'medium',
        // Lighting settings
        lighting_style: settings.lighting?.style || 'studio-3point',
        lighting_key_intensity: settings.lighting?.keyIntensity || 70,
        lighting_fill_intensity: settings.lighting?.fillIntensity || 40,
        lighting_rim_intensity: settings.lighting?.rimIntensity || 50,
        lighting_direction: settings.lighting?.direction || 'top-right',
        // Background settings
        background_type: settings.background?.type || 'white',
        background_surface: settings.background?.surface || 'none',
        background_shadow: settings.background?.shadow || 'soft',
        background_reflection: settings.background?.reflection || 0,
        background_color: settings.background?.color || null,
        // Jewelry settings
        jewelry_metal: settings.jewelry?.metal || 'auto',
        jewelry_finish: settings.jewelry?.finish || 'high-polish',
        jewelry_sparkle: settings.jewelry?.sparkle || 70,
        jewelry_color_pop: settings.jewelry?.colorPop || 50,
        jewelry_detail: settings.jewelry?.detail || 80,
        // Composition settings
        composition_framing: settings.composition?.framing || 'center',
        composition_aspect_ratio: settings.composition?.aspectRatio || '1:1',
        composition_padding: settings.composition?.padding || 30,
        // AI model
        ai_model: settings.aiModel || generation.aiModel || 'flux-kontext-pro',
        created_by: user?.id,
      }

      const { error } = await (supabase as any)
        .from('studio_presets')
        .insert(presetData)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Preset saved!',
        description: `"${presetName}" has been added to your presets`,
      })
      setShowSavePresetDialog(false)
      setPresetName('')
      setPresetCategory('custom')
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

  // Get the original image for comparison
  const getOriginalUrl = (): string | null => {
    if (!generation) return null
    if (generation.source === 'combination') {
      return generation.modelImageUrl || null
    }
    return generation.originalUrl || null
  }

  const getSourceIcon = () => {
    if (!generation) return null
    switch (generation.source) {
      case 'studio':
        return <Wand2 className="h-5 w-5 text-purple-500" />
      case 'combination':
        return <Users className="h-5 w-5 text-blue-500" />
      case 'queue':
      case 'history':
        return <FolderKanban className="h-5 w-5 text-green-500" />
      default:
        return <Image className="h-5 w-5 text-gray-500" />
    }
  }

  const getSourceLabel = () => {
    if (!generation) return ''
    switch (generation.source) {
      case 'studio':
        return 'Studio Generation'
      case 'combination':
        return 'Combination'
      case 'queue':
      case 'history':
        return generation.projectName ? `Project: ${generation.projectName}` : 'Project'
      default:
        return 'Generation'
    }
  }

  const copyPrompt = () => {
    if (generation?.prompt) {
      navigator.clipboard.writeText(generation.prompt)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    }
  }

  const originalUrl = getOriginalUrl()
  const isCombination = generation?.source === 'combination'
  const isStudio = generation?.source === 'studio'

  return (
    <>
      {/* Main Detail Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getSourceIcon()}
              {getSourceLabel()}
            </DialogTitle>
            {generation?.fileName && (
              <p className="text-sm text-gray-500">{generation.fileName}</p>
            )}
          </DialogHeader>

          {generation && (
            <div className="space-y-4">
              {/* Before/After Slider or Image Display */}
              {generation.resultUrl && originalUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Drag to compare before & after</span>
                  </div>
                  <BeforeAfterSlider
                    beforeUrl={originalUrl}
                    afterUrl={generation.resultUrl}
                    beforeLabel={isCombination ? 'Model' : 'Original'}
                    afterLabel="Result"
                  />
                </div>
              ) : generation.resultUrl ? (
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={generation.resultUrl}
                    alt="Result"
                    className="w-full h-auto"
                  />
                </div>
              ) : originalUrl ? (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border relative">
                    <img
                      src={originalUrl}
                      alt={isCombination ? 'Model Image' : 'Original Image'}
                      className="w-full h-auto"
                    />
                    {/* Status overlay for failed/timeout/pending */}
                    {(generation.status === 'failed' || generation.status === 'timeout' || generation.status === 'error') && (
                      <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center">
                        <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          Generation failed
                        </div>
                      </div>
                    )}
                    {(generation.status === 'pending' || generation.status === 'processing' || generation.status === 'queued') && (
                      <div className="absolute inset-0 bg-amber-900/10 flex items-center justify-center">
                        <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {generation.status === 'pending' ? 'Pending' : generation.status === 'queued' ? 'Queued' : 'Processing...'}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {isCombination ? 'Model image' : 'Original image'} — no result available
                  </p>
                </div>
              ) : null}

              {/* Source Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  {getSourceIcon()}
                  {generation.source === 'studio' ? 'Studio' :
                   generation.source === 'combination' ? 'Combination' : 'Project'}
                </Badge>
                {generation.projectName && (
                  <Badge variant="outline">{generation.projectName}</Badge>
                )}
              </div>

              {/* Prompt Section */}
              {generation.prompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-gray-700">Prompt Used</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={copyPrompt}
                    >
                      {promptCopied ? (
                        <><Check className="h-3 w-3 mr-1 text-green-500" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 leading-relaxed max-h-32 overflow-y-auto">
                    {generation.prompt}
                  </div>
                </div>
              )}

              {/* Settings Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* AI Model */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">AI Model</p>
                  <p className="font-medium text-sm">
                    {generation.aiModel
                      ? getModelById(generation.aiModel)?.friendlyName || generation.aiModel
                      : 'Not recorded'}
                  </p>
                </div>

                {/* Processing Time */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Processing Time</p>
                  <p className="font-medium text-sm">
                    {generation.processingTimeSec
                      ? `${generation.processingTimeSec}s`
                      : 'Not recorded'}
                  </p>
                </div>

                {/* Tokens Used */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Tokens Used</p>
                  <p className="font-medium text-sm">
                    {generation.tokensUsed || 'Not recorded'}
                  </p>
                </div>

                {/* Created */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="font-medium text-sm">
                    {formatDistanceToNow(new Date(generation.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Combination-specific settings */}
              {isCombination && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Combination Settings</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 mb-0.5">Position</p>
                      <p className="font-medium text-sm">{generation.positionY ?? 50}%</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 mb-0.5">Scale</p>
                      <p className="font-medium text-sm">{generation.scale ?? 100}%</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 mb-0.5">Rotation</p>
                      <p className="font-medium text-sm">{generation.rotation ?? 0}°</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 mb-0.5">Blend</p>
                      <p className="font-medium text-sm">{generation.blendIntensity ?? 70}%</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 mb-0.5">Lighting</p>
                      <p className="font-medium text-sm">{generation.lightingMatch ?? 80}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Jewelry Image for Combination */}
              {isCombination && generation.jewelryImageUrl && originalUrl && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Jewelry Source</h4>
                  <img
                    src={generation.jewelryImageUrl}
                    alt="Jewelry"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Error Message */}
              {generation.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-600 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-700">{generation.errorMessage}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {generation.resultUrl && (
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[120px]"
                    onClick={() => window.open(generation.resultUrl!, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                {isStudio && onReuse && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 min-w-[120px]"
                      onClick={() => {
                        onReuse(generation)
                        onOpenChange(false)
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reuse
                    </Button>
                    {generation.settingsSnapshot && (
                      <Button
                        className="flex-1 min-w-[120px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        onClick={() => setShowSavePresetDialog(true)}
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save as Preset
                      </Button>
                    )}
                  </>
                )}
                {/* Delete button */}
                {onDelete && (
                  <Button
                    variant="outline"
                    className="min-w-[100px] text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => {
                      onDelete(generation)
                      onOpenChange(false)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save as Preset Dialog */}
      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-amber-500" />
              Save as Preset
            </DialogTitle>
            <DialogDescription>
              Save these successful settings as a reusable preset for future generations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview thumbnail */}
            {generation?.resultUrl && (
              <div className="flex justify-center">
                <img
                  src={generation.resultUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                />
              </div>
            )}

            {/* Preset Name */}
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name *</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Gold Ring White Background"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="preset-category">Category</Label>
              <Select value={presetCategory} onValueChange={setPresetCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (optional)</Label>
              <Input
                id="preset-description"
                placeholder="Brief description of when to use this preset"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSavePresetDialog(false)
                setPresetName('')
                setPresetCategory('custom')
                setPresetDescription('')
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={() => savePresetMutation.mutate()}
              disabled={!presetName.trim() || savePresetMutation.isPending}
            >
              {savePresetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export the BeforeAfterSlider for reuse elsewhere
export { BeforeAfterSlider }
