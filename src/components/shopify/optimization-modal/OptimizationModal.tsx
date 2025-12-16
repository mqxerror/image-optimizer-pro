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
  // Sidebar visibility - collapsed by default on mobile for better UX
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Default to collapsed on mobile (< 768px)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768
    }
    return true
  })

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
      // Only auto-open sidebar on desktop
      setSidebarOpen(window.innerWidth >= 768)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] md:h-[85vh] p-0 overflow-hidden gap-0">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Sidebar - Filters (collapsible on mobile) */}
          <div
            className={cn(
              'border-b md:border-b-0 md:border-r bg-slate-50 flex flex-col transition-all duration-200 overflow-hidden',
              // Mobile: collapsed by default, full width when open
              // Desktop: fixed width sidebar
              sidebarOpen
                ? 'max-h-[30vh] md:max-h-none md:w-72'
                : 'max-h-0 md:max-h-none md:w-0'
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
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
