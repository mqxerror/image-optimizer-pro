import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Eraser,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Sparkles,
  FileType,
  Loader2,
  Download,
  Check,
  Wand2,
  Upload,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'

// Direct server URLs - will be called from browser
const IMAGINARY_URL = 'http://38.97.60.181:9000'
const IOPAINT_URL = 'http://38.97.60.181:8085'

interface TransformOptions {
  removeBackground: boolean
  backgroundType: 'transparent' | 'white' | 'black' | 'custom'
  customBackground: string
  resize: boolean
  resizeWidth: number
  resizeHeight: number
  resizeType: 'fit' | 'fill' | 'force'
  rotate: number
  flipH: boolean
  flipV: boolean
  blur: boolean
  blurAmount: number
  sharpen: boolean
  sharpenAmount: number
  format: 'webp' | 'png' | 'jpeg'
  quality: number
}

const defaultOptions: TransformOptions = {
  removeBackground: false,
  backgroundType: 'white',
  customBackground: '#ffffff',
  resize: false,
  resizeWidth: 2048,
  resizeHeight: 2048,
  resizeType: 'fit',
  rotate: 0,
  flipH: false,
  flipV: false,
  blur: false,
  blurAmount: 5,
  sharpen: false,
  sharpenAmount: 1,
  format: 'webp',
  quality: 90,
}

interface EditModeProps {
  imageUrl: string | null
  onImageChange?: (url: string) => void
}

export function EditMode({ imageUrl, onImageChange }: EditModeProps) {
  const { toast } = useToast()
  const { session, organization } = useAuthStore()
  const [options, setOptions] = useState<TransformOptions>(defaultOptions)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(imageUrl)

  // Check server health - direct call to servers
  const { data: health } = useQuery({
    queryKey: queryKeys.imageProcessing.health(),
    queryFn: async () => {
      const [imaginaryRes, iopaintRes] = await Promise.allSettled([
        fetch(`${IMAGINARY_URL}/health`).then(r => r.json()),
        fetch(`${IOPAINT_URL}/api/v1/model`).then(r => r.json())
      ])

      return {
        imaginary: {
          status: imaginaryRes.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          data: imaginaryRes.status === 'fulfilled' ? imaginaryRes.value : null
        },
        iopaint: {
          status: iopaintRes.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          data: iopaintRes.status === 'fulfilled' ? iopaintRes.value : null
        }
      }
    },
    staleTime: 60000,
    retry: 1,
  })

  const isHealthy = health?.imaginary?.status === 'healthy' && health?.iopaint?.status === 'healthy'

  // Process image mutation - calls servers directly from browser
  const processMutation = useMutation({
    mutationFn: async () => {
      const sourceUrl = uploadedImage || imageUrl
      if (!sourceUrl) throw new Error('No image selected')

      let currentImageUrl = sourceUrl
      const operations: string[] = []

      // Step 1: Background removal (IOPaint)
      if (options.removeBackground) {
        toast({ title: 'Removing background...', description: 'This may take a moment' })

        // Fetch the source image
        const imageResponse = await fetch(sourceUrl)
        if (!imageResponse.ok) throw new Error('Failed to fetch source image')
        const imageBlob = await imageResponse.blob()

        // Call IOPaint directly
        const formData = new FormData()
        formData.append('image', imageBlob, 'image.png')

        const iopaintResponse = await fetch(`${IOPAINT_URL}/api/v1/remove_bg`, {
          method: 'POST',
          body: formData,
        })

        if (!iopaintResponse.ok) {
          const errorText = await iopaintResponse.text()
          throw new Error(`Background removal failed: ${errorText}`)
        }

        // Get result and upload to Supabase
        const resultBlob = await iopaintResponse.blob()
        const bgRemovedPath = `${organization?.id}/edit/${Date.now()}_bg_removed.png`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(bgRemovedPath, resultBlob, { contentType: 'image/png', upsert: true })

        if (uploadError) throw new Error('Failed to save background-removed image')

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(bgRemovedPath)

        currentImageUrl = publicUrl
        operations.push('background_removed')
      }

      // Step 2: Apply transforms (Imaginary)
      const hasTransforms = options.resize || options.rotate !== 0 || options.flipH || options.flipV || options.blur || options.sharpen

      if (hasTransforms || options.format !== 'webp' || options.quality !== 90) {
        let transformUrl = currentImageUrl

        // Chain Imaginary operations
        if (options.resize) {
          const op = options.resizeType === 'force' ? 'resize' : options.resizeType === 'fill' ? 'enlarge' : 'fit'
          const params = new URLSearchParams({
            url: transformUrl,
            width: options.resizeWidth.toString(),
            height: options.resizeHeight.toString()
          })
          transformUrl = `${IMAGINARY_URL}/${op}?${params}`
          operations.push(`resize:${options.resizeWidth}x${options.resizeHeight}`)
        }

        if (options.rotate !== 0) {
          const params = new URLSearchParams({ url: transformUrl, rotate: options.rotate.toString() })
          transformUrl = `${IMAGINARY_URL}/rotate?${params}`
          operations.push(`rotate:${options.rotate}`)
        }

        if (options.flipH) {
          const params = new URLSearchParams({ url: transformUrl })
          transformUrl = `${IMAGINARY_URL}/flip?${params}`
          operations.push('flip:horizontal')
        } else if (options.flipV) {
          const params = new URLSearchParams({ url: transformUrl })
          transformUrl = `${IMAGINARY_URL}/flop?${params}`
          operations.push('flip:vertical')
        }

        if (options.blur) {
          const params = new URLSearchParams({ url: transformUrl, sigma: options.blurAmount.toString() })
          transformUrl = `${IMAGINARY_URL}/blur?${params}`
          operations.push(`blur:${options.blurAmount}`)
        }

        if (options.sharpen) {
          const params = new URLSearchParams({ url: transformUrl, sigma: options.sharpenAmount.toString() })
          transformUrl = `${IMAGINARY_URL}/sharpen?${params}`
          operations.push(`sharpen:${options.sharpenAmount}`)
        }

        // Format conversion
        const params = new URLSearchParams({
          url: transformUrl,
          type: options.format,
          quality: options.quality.toString()
        })
        transformUrl = `${IMAGINARY_URL}/convert?${params}`
        operations.push(`convert:${options.format}`)

        // Fetch transformed image
        const transformResponse = await fetch(transformUrl)
        if (!transformResponse.ok) {
          throw new Error(`Transform failed: ${transformResponse.status}`)
        }

        const transformedBlob = await transformResponse.blob()
        const ext = options.format === 'jpeg' ? 'jpg' : options.format
        const transformedPath = `${organization?.id}/edit/${Date.now()}_transformed.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(transformedPath, transformedBlob, {
            contentType: `image/${options.format}`,
            upsert: true
          })

        if (uploadError) throw new Error('Failed to save transformed image')

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(transformedPath)

        currentImageUrl = publicUrl
      }

      return { success: true, result_url: currentImageUrl, operations }
    },
    onSuccess: (data) => {
      setPreviewUrl(data.result_url)
      onImageChange?.(data.result_url)
      toast({
        title: 'Image processed successfully',
        description: `Operations applied: ${data.operations?.join(', ') || 'Background removal'}`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Processing failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Calculate estimated token cost
  const estimatedTokens = (() => {
    let cost = 0
    if (options.removeBackground) cost += 2
    if (options.resize) cost += 0.5
    if (options.rotate !== 0) cost += 0.5
    if (options.flipH || options.flipV) cost += 0.5
    if (options.blur) cost += 0.5
    if (options.sharpen) cost += 0.5
    if (options.format !== 'webp') cost += 0.5
    return Math.ceil(cost) || 1
  })()

  const [isUploading, setIsUploading] = useState(false)

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !organization) return

    setIsUploading(true)
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'png'
      const filename = `edit-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${organization.id}/edit/${filename}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(path)

      setUploadedImage(publicUrl)
      setPreviewUrl(null)
      toast({ title: 'Image uploaded', description: 'Ready for processing' })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }, [organization, toast])

  const currentImage = previewUrl || uploadedImage || imageUrl

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    background: true,
    resize: false,
    orientation: false,
    effects: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left Panel - Upload & Preview */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {currentImage ? 'Preview' : 'Step 1: Upload Image'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isHealthy && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Ready
                </span>
              )}
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-600"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>

          {/* Preview/Upload Area */}
          <div className="flex-1 p-4">
            {currentImage ? (
              <div className="relative h-full min-h-[280px] bg-slate-50 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-[url('/checkerboard.png')] bg-repeat bg-[length:12px_12px] opacity-50" />
                <img
                  src={currentImage}
                  alt="Preview"
                  className="relative w-full h-full object-contain"
                />
                {processMutation.isPending && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700">Processing image...</p>
                    </div>
                  </div>
                )}
                {/* Change image button */}
                <label className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-white transition-colors shadow-sm">
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-full min-h-[280px] rounded-lg border-2 border-dashed transition-all cursor-pointer
                ${isUploading
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50/50'}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                    <span className="text-sm font-medium text-purple-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
                      <Upload className="w-6 h-6 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Upload an image</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG, WebP</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Settings & Actions */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Adjustments Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Adjustments</span>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Background Removal */}
            <div className="px-4 py-3">
              <button
                onClick={() => toggleSection('background')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eraser className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Background Removal</p>
                    <p className="text-xs text-slate-400">AI-powered, 2 tokens</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={options.removeBackground}
                    onCheckedChange={(checked) => {
                      setOptions({ ...options, removeBackground: checked })
                      if (checked) setExpandedSections(prev => ({ ...prev, background: true }))
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {expandedSections.background ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {expandedSections.background && options.removeBackground && (
                <div className="mt-3 ml-11 grid grid-cols-4 gap-2">
                  {[
                    { value: 'transparent', label: 'None', bg: "bg-[url('/checkerboard.png')] bg-[length:4px_4px]" },
                    { value: 'white', label: 'White', bg: 'bg-white' },
                    { value: 'black', label: 'Black', bg: 'bg-slate-900' },
                    { value: 'custom', label: 'Custom', bg: '' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setOptions({ ...options, backgroundType: item.value as any })}
                      className={`p-2 rounded-lg border text-center transition-all
                        ${options.backgroundType === item.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div
                        className={`w-5 h-5 rounded mx-auto mb-1 border border-slate-200 ${item.bg}`}
                        style={item.value === 'custom' ? { backgroundColor: options.customBackground } : {}}
                      />
                      <span className="text-[10px] text-slate-600">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Resize */}
            <div className="px-4 py-3">
              <button
                onClick={() => toggleSection('resize')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Maximize2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Resize</p>
                    <p className="text-xs text-slate-400">Change dimensions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={options.resize}
                    onCheckedChange={(checked) => {
                      setOptions({ ...options, resize: checked })
                      if (checked) setExpandedSections(prev => ({ ...prev, resize: true }))
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {expandedSections.resize ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {expandedSections.resize && options.resize && (
                <div className="mt-3 ml-11 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1">Width</Label>
                      <Input
                        type="number"
                        value={options.resizeWidth}
                        onChange={(e) => setOptions({ ...options, resizeWidth: parseInt(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1">Height</Label>
                      <Input
                        type="number"
                        value={options.resizeHeight}
                        onChange={(e) => setOptions({ ...options, resizeHeight: parseInt(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {['fit', 'fill', 'force'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setOptions({ ...options, resizeType: type as any })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-all capitalize
                          ${options.resizeType === type
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Orientation */}
            <div className="px-4 py-3">
              <button
                onClick={() => toggleSection('orientation')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <RotateCw className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Orientation</p>
                    <p className="text-xs text-slate-400">Rotate & flip</p>
                  </div>
                </div>
                {expandedSections.orientation ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSections.orientation && (
                <div className="mt-3 ml-11 space-y-2">
                  <div className="flex gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => setOptions({ ...options, rotate: deg })}
                        className={`flex-1 py-2 text-xs font-medium rounded transition-all
                          ${options.rotate === deg
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-600'}`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setOptions({ ...options, flipH: !options.flipH, flipV: false })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded transition-all
                        ${options.flipH ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Horizontal</span>
                    </button>
                    <button
                      onClick={() => setOptions({ ...options, flipV: !options.flipV, flipH: false })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded transition-all
                        ${options.flipV ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Vertical</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Effects */}
            <div className="px-4 py-3">
              <button
                onClick={() => toggleSection('effects')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Effects</p>
                    <p className="text-xs text-slate-400">Blur & sharpen</p>
                  </div>
                </div>
                {expandedSections.effects ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSections.effects && (
                <div className="mt-3 ml-11 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Blur</span>
                    <div className="flex items-center gap-3">
                      {options.blur && (
                        <div className="w-24">
                          <Slider
                            value={[options.blurAmount]}
                            onValueChange={([v]) => setOptions({ ...options, blurAmount: v })}
                            min={1}
                            max={20}
                            step={1}
                          />
                        </div>
                      )}
                      <Switch
                        checked={options.blur}
                        onCheckedChange={(checked) => setOptions({ ...options, blur: checked })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Sharpen</span>
                    <div className="flex items-center gap-3">
                      {options.sharpen && (
                        <div className="w-24">
                          <Slider
                            value={[options.sharpenAmount]}
                            onValueChange={([v]) => setOptions({ ...options, sharpenAmount: v })}
                            min={0.1}
                            max={3}
                            step={0.1}
                          />
                        </div>
                      )}
                      <Switch
                        checked={options.sharpen}
                        onCheckedChange={(checked) => setOptions({ ...options, sharpen: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Output Format */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FileType className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Output</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                {['webp', 'png', 'jpeg'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOptions({ ...options, format: fmt as any })}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all uppercase
                      ${options.format === fmt
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 w-32">
                <Slider
                  value={[options.quality]}
                  onValueChange={([v]) => setOptions({ ...options, quality: v })}
                  min={50}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs text-slate-600 w-7">{options.quality}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div className="mt-auto">
          <Button
            className={`w-full h-12 rounded-xl font-semibold text-base transition-all
              ${currentImage
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            onClick={() => processMutation.mutate()}
            disabled={!currentImage || processMutation.isPending}
          >
            {processMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : currentImage ? (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Process Image
                <span className="ml-2 text-purple-200 text-sm font-normal">({estimatedTokens} tokens)</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload an image to start
              </>
            )}
          </Button>
          {previewUrl && (
            <div className="flex items-center justify-center gap-2 mt-2 text-emerald-600">
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Image processed successfully</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
