import { Wand2, Settings2, Loader2, Image, Sparkles, RatioIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getModelById } from '@/constants/aiModels'
import type { AspectRatio } from '@/types/studio'

interface GenerateConfirmSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onEditSettings: () => void
  isGenerating: boolean
  imageFile?: File | null
  imageUrl?: string | null
  aiModel: string
  aspectRatio: AspectRatio
  presetName?: string | null
  lightingIntensity: number
}

const aspectRatioLabels: Record<AspectRatio, { label: string; desc: string }> = {
  '1:1': { label: '1:1 Square', desc: 'Perfect for Instagram' },
  '4:5': { label: '4:5 Portrait', desc: 'Instagram feed' },
  '3:4': { label: '3:4 Portrait', desc: 'Standard portrait' },
  '16:9': { label: '16:9 Wide', desc: 'Website banners' },
  '9:16': { label: '9:16 Story', desc: 'Stories & Reels' },
  '4:3': { label: '4:3 Landscape', desc: 'Product showcase' },
}

export function GenerateConfirmSheet({
  open,
  onOpenChange,
  onConfirm,
  onEditSettings,
  isGenerating,
  imageFile,
  imageUrl,
  aiModel,
  aspectRatio,
  presetName,
  lightingIntensity,
}: GenerateConfirmSheetProps) {
  const model = getModelById(aiModel)
  const aspectInfo = aspectRatioLabels[aspectRatio] || { label: aspectRatio, desc: '' }

  // Get image info
  const imageName = imageFile?.name || 'Uploaded image'
  const imageSize = imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(1)} MB` : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
        <SheetHeader className="pb-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <SheetTitle className="text-center text-lg">Ready to Generate?</SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          {/* Image Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                <Image className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate text-sm">{imageName}</p>
              {imageSize && (
                <p className="text-xs text-gray-500">{imageSize}</p>
              )}
            </div>
          </div>

          {/* AI Model */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{model?.name || aiModel}</p>
              <p className="text-xs text-gray-500">
                {model?.description || 'AI Model'} • {model?.tokenCost || 1} token
              </p>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <RatioIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{aspectInfo.label}</p>
              <p className="text-xs text-gray-500">{aspectInfo.desc}</p>
            </div>
          </div>

          {/* Preset/Lighting Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">
                Lighting {lightingIntensity}%
              </p>
              <p className="text-xs text-gray-500">
                {presetName ? `${presetName} preset` : 'Custom settings'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={onConfirm}
            disabled={isGenerating}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-base font-medium shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Generate Now
                <span className="ml-2 text-sm opacity-70">~15 sec</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onEditSettings()
            }}
            className="w-full h-12 rounded-xl text-gray-600"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Edit Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
