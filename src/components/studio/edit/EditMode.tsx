import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Eraser,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Droplets,
  Sparkles,
  FileType,
  Loader2,
  Download,
  Check,
  AlertCircle,
  Wand2,
  Upload,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      {/* Preview Panel */}
      <Card className="lg:sticky lg:top-4 h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Preview</CardTitle>
            {isHealthy ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <Check className="w-3 h-3 mr-1" />
                Servers Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                <AlertCircle className="w-3 h-3 mr-1" />
                Checking...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentImage ? (
            <div className="relative aspect-square bg-[url('/checkerboard.png')] bg-repeat rounded-lg overflow-hidden">
              <img
                src={currentImage}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              {processMutation.isPending && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Processing...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg transition-colors ${isUploading ? 'cursor-wait bg-gray-50' : 'cursor-pointer hover:border-purple-400 hover:bg-purple-50/50'}`}>
              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-purple-500 mb-3 animate-spin" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-sm text-gray-600">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</span>
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

          {previewUrl && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(previewUrl, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls Panel */}
      <div className="space-y-4">
        {/* Background Removal */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eraser className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-base">Background Removal</CardTitle>
              </div>
              <Switch
                checked={options.removeBackground}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, removeBackground: checked })
                }
              />
            </div>
            <CardDescription>AI-powered background removal</CardDescription>
          </CardHeader>
          {options.removeBackground && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Background</Label>
                  <Select
                    value={options.backgroundType}
                    onValueChange={(v) =>
                      setOptions({ ...options, backgroundType: v as any })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">Transparent</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="custom">Custom Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {options.backgroundType === 'custom' && (
                  <div>
                    <Label className="text-sm">Custom Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={options.customBackground}
                        onChange={(e) =>
                          setOptions({ ...options, customBackground: e.target.value })
                        }
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        value={options.customBackground}
                        onChange={(e) =>
                          setOptions({ ...options, customBackground: e.target.value })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Resize */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Resize</CardTitle>
              </div>
              <Switch
                checked={options.resize}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resize: checked })
                }
              />
            </div>
          </CardHeader>
          {options.resize && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Width</Label>
                  <Input
                    type="number"
                    value={options.resizeWidth}
                    onChange={(e) =>
                      setOptions({ ...options, resizeWidth: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Height</Label>
                  <Input
                    type="number"
                    value={options.resizeHeight}
                    onChange={(e) =>
                      setOptions({ ...options, resizeHeight: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-sm">Resize Mode</Label>
                <Select
                  value={options.resizeType}
                  onValueChange={(v) =>
                    setOptions({ ...options, resizeType: v as any })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit (maintain aspect)</SelectItem>
                    <SelectItem value="fill">Fill (crop to fit)</SelectItem>
                    <SelectItem value="force">Force (stretch)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Orientation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">Orientation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Rotate</Label>
                <Select
                  value={options.rotate.toString()}
                  onValueChange={(v) =>
                    setOptions({ ...options, rotate: parseInt(v) })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No rotation</SelectItem>
                    <SelectItem value="90">90° clockwise</SelectItem>
                    <SelectItem value="180">180°</SelectItem>
                    <SelectItem value="270">270° clockwise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button
                  variant={options.flipH ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOptions({ ...options, flipH: !options.flipH, flipV: false })}
                  className="flex-1"
                >
                  <FlipHorizontal className="w-4 h-4 mr-2" />
                  Flip H
                </Button>
                <Button
                  variant={options.flipV ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOptions({ ...options, flipV: !options.flipV, flipH: false })}
                  className="flex-1"
                >
                  <FlipVertical className="w-4 h-4 mr-2" />
                  Flip V
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Effects */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-base">Effects</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Blur</Label>
                <Switch
                  checked={options.blur}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, blur: checked })
                  }
                />
              </div>
              {options.blur && (
                <Slider
                  value={[options.blurAmount]}
                  onValueChange={([v]) => setOptions({ ...options, blurAmount: v })}
                  min={1}
                  max={20}
                  step={1}
                />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Sharpen</Label>
                <Switch
                  checked={options.sharpen}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, sharpen: checked })
                  }
                />
              </div>
              {options.sharpen && (
                <Slider
                  value={[options.sharpenAmount]}
                  onValueChange={([v]) => setOptions({ ...options, sharpenAmount: v })}
                  min={0.1}
                  max={3}
                  step={0.1}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Output Format */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileType className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base">Output Format</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Format</Label>
                <Select
                  value={options.format}
                  onValueChange={(v) =>
                    setOptions({ ...options, format: v as any })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webp">WebP (recommended)</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Quality: {options.quality}%</Label>
                <Slider
                  value={[options.quality]}
                  onValueChange={([v]) => setOptions({ ...options, quality: v })}
                  min={50}
                  max={100}
                  step={5}
                  className="mt-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Button */}
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Estimated Cost</p>
                <p className="text-sm text-gray-600">
                  {estimatedTokens} token{estimatedTokens !== 1 ? 's' : ''}
                </p>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                <Wand2 className="w-3 h-3 mr-1" />
                AI Processing
              </Badge>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              size="lg"
              onClick={() => processMutation.mutate()}
              disabled={!currentImage || processMutation.isPending}
            >
              {processMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Process Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
