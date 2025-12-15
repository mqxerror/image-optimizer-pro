import { useState } from 'react'
import {
  Filter,
  Package,
  Image as ImageIcon,
  User,
  Play,
  Loader2,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ThumbnailGrid } from './ThumbnailGrid'
import type { FilteredImage, FilterStats } from './types'
import { AI_MODELS, getQualityDots, getSpeedDots } from '@/constants/aiModels'

// Models suitable for Shopify optimization
const SHOPIFY_MODELS = AI_MODELS.filter(m => m.modes.includes('single'))

interface PreviewPanelProps {
  filteredImages: FilteredImage[]
  stats: FilterStats
  selectedModel: string
  onModelChange: (model: string) => void
  templateId: string | null
  onTemplateChange: (id: string | null) => void
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  templates: Array<{ id: string; name: string }>
  onSubmit: () => void
  isSubmitting: boolean
  onCancel: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function PreviewPanel({
  filteredImages,
  stats,
  selectedModel,
  onModelChange,
  templateId,
  onTemplateChange,
  customPrompt,
  onCustomPromptChange,
  templates,
  onSubmit,
  isSubmitting,
  onCancel,
  sidebarOpen,
  onToggleSidebar
}: PreviewPanelProps) {
  const [showModelSelector, setShowModelSelector] = useState(false)

  const selectedModelData = SHOPIFY_MODELS.find(m => m.id === selectedModel)
  const hasValidPrompt = templateId || customPrompt.trim().length > 0
  const canSubmit = stats.filteredImages > 0 && hasValidPrompt && !isSubmitting

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Header */}
      <div className="p-2 sm:p-3 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 flex-shrink-0">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{sidebarOpen ? 'Hide' : 'Show'} Filters</span>
              <span className="sm:hidden">Filters</span>
            </Button>
            <h2 className="font-semibold text-sm sm:text-base">Preview</h2>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
            {stats.filteredProducts} products
          </Badge>
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            <ImageIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
            {stats.filteredImages} images
          </Badge>
          {stats.modelImagesExcluded > 0 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs text-amber-600 border-amber-300">
              <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              {stats.modelImagesExcluded} excluded
            </Badge>
          )}
        </div>
      </div>

      {/* Thumbnail Preview Grid */}
      <div className="flex-1 min-h-0 bg-white">
        <ThumbnailGrid images={filteredImages} maxDisplay={250} />
      </div>

      {/* Settings Panel - scrollable with max height on mobile */}
      <div className="border-t bg-gray-50 p-2 sm:p-2.5 md:p-4 space-y-2 sm:space-y-3 max-h-[35vh] md:max-h-[40vh] overflow-y-auto flex-shrink-0">
        {/* AI Model Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm font-medium">AI Model</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] sm:text-xs"
              onClick={() => setShowModelSelector(!showModelSelector)}
            >
              {showModelSelector ? 'Hide' : 'Change'}
            </Button>
          </div>

          {showModelSelector ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 max-h-[100px] sm:max-h-[140px] overflow-y-auto">
              {SHOPIFY_MODELS.map(model => (
                <div
                  key={model.id}
                  className={cn(
                    'p-1.5 sm:p-2 rounded-lg border-2 cursor-pointer transition-all',
                    selectedModel === model.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => {
                    onModelChange(model.id)
                    setShowModelSelector(false)
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-xs sm:text-sm">{model.friendlyName}</span>
                    {model.recommended && (
                      <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-xs text-muted-foreground">
                    <span>★{getQualityDots(model.quality)}</span>
                    <span>⚡{getSpeedDots(model.speed)}</span>
                    <span>{model.tokenCost}t</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-white rounded-lg border">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-xs sm:text-sm">{selectedModelData?.friendlyName}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground ml-1 sm:ml-2 hidden sm:inline">
                  ({selectedModelData?.technicalName})
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                <span>{selectedModelData?.tokenCost}t</span>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Configuration */}
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Template</Label>
            <Select
              value={templateId || '__none__'}
              onValueChange={(v) => onTemplateChange(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-10 text-base sm:text-sm">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No template</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">
              Custom Prompt
              {!templateId && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder="e.g., Professional product photo, clean white background..."
              rows={2}
              className={cn(
                'resize-none text-base sm:text-sm',
                !hasValidPrompt && 'border-red-300'
              )}
            />
          </div>
        </div>

        {!hasValidPrompt && (
          <p className="text-[10px] sm:text-xs text-red-500">
            Please select a template or enter a custom prompt
          </p>
        )}
      </div>

      {/* Footer Actions - always visible */}
      <div className="p-2 sm:p-3 border-t bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-shrink-0">
        <div className="text-[10px] sm:text-sm text-muted-foreground text-center sm:text-left">
          {stats.svgImagesSkipped > 0 && (
            <span className="text-amber-600">
              {stats.svgImagesSkipped} SVG skipped
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit} className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm">
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Process {stats.filteredImages.toLocaleString()}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
