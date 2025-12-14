import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { FilterSidebar } from './FilterSidebar'
import { PreviewPanel } from './PreviewPanel'
import { useFilteredImages } from './hooks/useFilteredImages'
import { useTagAnalysis } from './hooks/useTagAnalysis'
import { isModelImage } from './types'
import type { FilterState, OptimizationModalProps } from './types'

export function OptimizationModal({
  open,
  onOpenChange,
  products,
  selectedProductIds,
  templates,
  onSubmit,
  isSubmitting = false
}: OptimizationModalProps) {
  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    excludeModelImages: false,
    imageType: 'all',
    includeTags: [],
    excludeTags: []
  })

  // Job configuration
  const [selectedModel, setSelectedModel] = useState('flux-kontext-pro')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')

  // Get filtered images based on current filter state
  const { images, includedImages, stats } = useFilteredImages(
    products,
    selectedProductIds,
    filters
  )

  // Get tag analysis for selected products
  const { allTags, tagCounts } = useTagAnalysis(products, selectedProductIds)

  // Count model images in selection (before any filtering)
  const modelImageCount = useMemo(() => {
    const selectedProducts = products.filter(p => selectedProductIds.has(p.id))
    let count = 0
    for (const product of selectedProducts) {
      for (const image of product.images) {
        if (isModelImage(image)) count++
      }
    }
    return count
  }, [products, selectedProductIds])

  // Handle submit
  const handleSubmit = async () => {
    await onSubmit({
      aiModel: selectedModel,
      templateId,
      customPrompt: customPrompt.trim(),
      filteredImages: includedImages,
      stats
    })
  }

  // Handle cancel/close
  const handleCancel = () => {
    onOpenChange(false)
  }

  // Reset state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to defaults when opening
      setFilters({
        excludeModelImages: false,
        imageType: 'all',
        includeTags: [],
        excludeTags: []
      })
      setSelectedModel('flux-kontext-pro')
      setTemplateId(null)
      setCustomPrompt('')
      setSidebarOpen(true)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden gap-0">
        <div className="flex h-full">
          {/* Left Sidebar - Filters */}
          <div
            className={cn(
              'border-r bg-gray-50 flex flex-col transition-all duration-200 overflow-hidden',
              sidebarOpen ? 'w-72' : 'w-0'
            )}
          >
            {sidebarOpen && (
              <FilterSidebar
                filters={filters}
                onChange={setFilters}
                allTags={allTags}
                tagCounts={tagCounts}
                stats={stats}
                modelImageCount={modelImageCount}
                onToggleSidebar={() => setSidebarOpen(false)}
              />
            )}
          </div>

          {/* Right Main Panel - Preview + Settings */}
          <PreviewPanel
            filteredImages={images}
            stats={stats}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            templateId={templateId}
            onTemplateChange={setTemplateId}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
            templates={templates}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
