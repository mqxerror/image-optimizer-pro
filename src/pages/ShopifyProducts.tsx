import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  Package,
  Tag,
  Store,
  RefreshCw,
  Settings,
  Play,
  AlertTriangle,
  User,
  Sparkles,
  Grid,
  Edit3,
  ChevronDown,
  ArrowUpDown,
  Grid3X3,
  LayoutGrid
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useShopifyStore,
  useShopifyProductsInfinite,
  flattenShopifyProducts,
  useShopifyCollections,
  useShopifyProductTypes,
  useCreateShopifyJob
} from '@/hooks/useShopify'
import { useProcessedShopifyImages } from '@/hooks/useProcessedShopifyImages'
import { OptimizationModal, type JobConfig } from '@/components/shopify/optimization-modal'
import { useTemplates } from '@/hooks/useTemplates'
import { useToast } from '@/hooks/use-toast'
import { AI_MODELS, getQualityDots, getSpeedDots } from '@/constants/aiModels'
import type { ShopifyProduct } from '@/types/shopify'

// Get models suitable for Shopify optimization (single mode models)
const SHOPIFY_MODELS = AI_MODELS.filter(m => m.modes.includes('single'))

// Image selection modes
type ImageSelectionMode = 'all' | 'main_only' | 'manual'

// Sort options
type SortOption = 'title_asc' | 'title_desc' | 'images_desc' | 'images_asc'

// Helper to detect if an image is likely a model/lifestyle shot
function isModelImage(image: { src: string; alt: string | null }): boolean {
  const modelKeywords = ['model', 'lifestyle', 'worn', 'wearing', 'person', 'woman', 'man', 'body']
  const srcLower = image.src.toLowerCase()
  const altLower = (image.alt || '').toLowerCase()
  return modelKeywords.some(keyword => srcLower.includes(keyword) || altLower.includes(keyword))
}

export default function ShopifyProducts() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('flux-kontext-pro')
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false)
  const [optimizationModalOpen, setOptimizationModalOpen] = useState(false)

  // Image selection mode and per-image selection
  const [imageSelectionMode, setImageSelectionMode] = useState<ImageSelectionMode>('all')
  const [selectedImages, setSelectedImages] = useState<Map<string, Set<string>>>(new Map()) // productId -> Set of imageIds

  // Per-product image selection modal
  const [imageModalProduct, setImageModalProduct] = useState<ShopifyProduct | null>(null)

  // Grid size & sort preferences (with localStorage persistence)
  const [gridSize, setGridSize] = useState<'compact' | 'comfortable'>(() =>
    (localStorage.getItem('shopifyGridSize') as 'compact' | 'comfortable') || 'comfortable'
  )
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    (localStorage.getItem('shopifySortBy') as SortOption) || 'title_asc'
  )

  // Persist preferences to localStorage
  useEffect(() => {
    localStorage.setItem('shopifyGridSize', gridSize)
  }, [gridSize])

  useEffect(() => {
    localStorage.setItem('shopifySortBy', sortBy)
  }, [sortBy])

  // Data fetching
  const { data: store, isLoading: storeLoading } = useShopifyStore(storeId!)
  const {
    data: productsData,
    isLoading: productsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchProducts
  } = useShopifyProductsInfinite(storeId!, {
    collectionId: selectedCollection || undefined,
    productType: selectedType || undefined,
    limit: 50
  })

  // Flatten all pages into a single array
  const allProducts = flattenShopifyProducts(productsData?.pages)
  const { data: collectionsResponse } = useShopifyCollections(storeId!)
  const { data: productTypesResponse } = useShopifyProductTypes(storeId!)
  const collections = collectionsResponse?.collections || []
  const productTypes = productTypesResponse?.product_types || []
  const { data: templates } = useTemplates()
  const createJobMutation = useCreateShopifyJob()

  // Fetch processed images for this store
  const { data: processedData } = useProcessedShopifyImages(storeId)
  const processedImageIds = processedData?.processedImageIds || new Set<string>()
  const processingImageIds = processedData?.processingImageIds || new Set<string>()

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts]

    // Client-side search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(product =>
        product.title.toLowerCase().includes(query) ||
        product.vendor?.toLowerCase().includes(query) ||
        product.product_type?.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title_asc': return a.title.localeCompare(b.title)
        case 'title_desc': return b.title.localeCompare(a.title)
        case 'images_desc': return b.images.length - a.images.length
        case 'images_asc': return a.images.length - b.images.length
        default: return 0
      }
    })

    return result
  }, [allProducts, searchQuery, sortBy])

  // Product stats
  const productStats = useMemo(() => {
    const totalImages = allProducts.reduce((sum, p) => sum + p.images.length, 0)
    const filteredImages = filteredProducts.reduce((sum, p) => sum + p.images.length, 0)
    return {
      totalProducts: allProducts.length,
      totalImages,
      filteredProducts: filteredProducts.length,
      filteredImages,
      isFiltered: searchQuery.trim() !== '' || selectedCollection !== '' || selectedType !== ''
    }
  }, [allProducts, filteredProducts, searchQuery, selectedCollection, selectedType])

  // Selection helpers
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
      // Also clear image selection for this product
      const newImageSelection = new Map(selectedImages)
      newImageSelection.delete(productId)
      setSelectedImages(newImageSelection)
    } else {
      newSelected.add(productId)
      // If in manual mode, initialize with all images selected
      if (imageSelectionMode === 'manual') {
        const product = allProducts.find(p => p.id === productId)
        if (product) {
          const newImageSelection = new Map(selectedImages)
          newImageSelection.set(productId, new Set(product.images.map(img => img.id)))
          setSelectedImages(newImageSelection)
        }
      }
    }
    setSelectedProducts(newSelected)
  }

  const toggleImage = (productId: string, imageId: string) => {
    const newImageSelection = new Map(selectedImages)
    const productImages = newImageSelection.get(productId) || new Set()

    if (productImages.has(imageId)) {
      productImages.delete(imageId)
    } else {
      productImages.add(imageId)
    }

    newImageSelection.set(productId, productImages)
    setSelectedImages(newImageSelection)
  }

  const selectAll = () => {
    const allIds = new Set(filteredProducts.map(p => p.id))
    setSelectedProducts(allIds)
    // In manual mode, select all images for all products
    if (imageSelectionMode === 'manual') {
      const newImageSelection = new Map<string, Set<string>>()
      filteredProducts.forEach(p => {
        newImageSelection.set(p.id, new Set(p.images.map(img => img.id)))
      })
      setSelectedImages(newImageSelection)
    }
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
    setSelectedImages(new Map())
  }

  // Open image selection modal for a product
  const openImageModal = (product: ShopifyProduct) => {
    // Auto-select product if not selected
    if (!selectedProducts.has(product.id)) {
      const newSelected = new Set(selectedProducts)
      newSelected.add(product.id)
      setSelectedProducts(newSelected)
      // Initialize with all images selected
      const newImageSelection = new Map(selectedImages)
      newImageSelection.set(product.id, new Set(product.images.map(img => img.id)))
      setSelectedImages(newImageSelection)
    }
    // Switch to manual mode when opening modal
    if (imageSelectionMode !== 'manual') {
      setImageSelectionMode('manual')
    }
    setImageModalProduct(product)
  }

  // Select all images for a product
  const selectAllImagesForProduct = (productId: string) => {
    const product = allProducts.find(p => p.id === productId)
    if (product) {
      const newImageSelection = new Map(selectedImages)
      newImageSelection.set(productId, new Set(product.images.map(img => img.id)))
      setSelectedImages(newImageSelection)
    }
  }

  // Deselect all images for a product
  const deselectAllImagesForProduct = (productId: string) => {
    const newImageSelection = new Map(selectedImages)
    newImageSelection.set(productId, new Set())
    setSelectedImages(newImageSelection)
  }

  // Select only product images (exclude model/lifestyle shots)
  const selectProductOnlyImages = (productId: string) => {
    const product = allProducts.find(p => p.id === productId)
    if (product) {
      const productOnlyIds = product.images
        .filter(img => !isModelImage(img) && !img.src.toLowerCase().includes('.svg'))
        .map(img => img.id)
      const newImageSelection = new Map(selectedImages)
      newImageSelection.set(productId, new Set(productOnlyIds))
      setSelectedImages(newImageSelection)
    }
  }

  // Calculate total selected images based on mode
  const totalSelectedImages = useMemo(() => {
    const selectedProductsList = filteredProducts.filter(p => selectedProducts.has(p.id))

    if (imageSelectionMode === 'main_only') {
      // Only count main image (position 1) per product
      return selectedProductsList.length
    } else if (imageSelectionMode === 'manual') {
      // Count manually selected images
      return selectedProductsList.reduce((sum, p) => {
        const productImageIds = selectedImages.get(p.id)
        return sum + (productImageIds?.size || 0)
      }, 0)
    } else {
      // All images
      return selectedProductsList.reduce((sum, p) => sum + p.images.length, 0)
    }
  }, [filteredProducts, selectedProducts, imageSelectionMode, selectedImages])

  // Check for SVG images in selection (respects selection mode)
  const svgImageCount = useMemo(() => {
    const selectedProductsList = filteredProducts.filter(p => selectedProducts.has(p.id))

    if (imageSelectionMode === 'main_only') {
      return selectedProductsList.filter(p =>
        p.images[0]?.src.toLowerCase().includes('.svg')
      ).length
    } else if (imageSelectionMode === 'manual') {
      return selectedProductsList.reduce((sum, p) => {
        const productImageIds = selectedImages.get(p.id)
        if (!productImageIds) return sum
        return sum + p.images.filter(img =>
          productImageIds.has(img.id) && img.src.toLowerCase().includes('.svg')
        ).length
      }, 0)
    } else {
      return selectedProductsList.reduce((sum, p) =>
        sum + p.images.filter(img => img.src.toLowerCase().includes('.svg')).length
      , 0)
    }
  }, [filteredProducts, selectedProducts, imageSelectionMode, selectedImages])

  // Count model images in selection
  const modelImageCount = useMemo(() => {
    const selectedProductsList = filteredProducts.filter(p => selectedProducts.has(p.id))

    if (imageSelectionMode === 'main_only') {
      return selectedProductsList.filter(p => isModelImage(p.images[0])).length
    } else if (imageSelectionMode === 'manual') {
      return selectedProductsList.reduce((sum, p) => {
        const productImageIds = selectedImages.get(p.id)
        if (!productImageIds) return sum
        return sum + p.images.filter(img =>
          productImageIds.has(img.id) && isModelImage(img)
        ).length
      }, 0)
    } else {
      return selectedProductsList.reduce((sum, p) =>
        sum + p.images.filter(img => isModelImage(img)).length
      , 0)
    }
  }, [filteredProducts, selectedProducts, imageSelectionMode, selectedImages])

  // Validation: need either template OR custom prompt
  const hasValidPromptConfig = selectedTemplate || customPrompt.trim().length > 0

  // Create job
  const handleCreateJob = async () => {
    if (!storeId || selectedProducts.size === 0) return
    if (!hasValidPromptConfig) {
      toast({
        title: 'Prompt required',
        description: 'Please select a template or enter a custom prompt',
        variant: 'destructive'
      })
      return
    }

    try {
      // Build the full products list with images based on selection mode
      const selectedProductsData = allProducts
        .filter(p => selectedProducts.has(p.id))
        .map(p => {
          let imagesToInclude = p.images

          // Apply selection mode filter
          if (imageSelectionMode === 'main_only') {
            // Only include the first image (main product image)
            imagesToInclude = p.images.slice(0, 1)
          } else if (imageSelectionMode === 'manual') {
            // Only include manually selected images
            const productImageIds = selectedImages.get(p.id)
            if (productImageIds) {
              imagesToInclude = p.images.filter(img => productImageIds.has(img.id))
            }
          }

          return {
            id: p.id,
            title: p.title,
            images: imagesToInclude
              .filter(img => !img.src.toLowerCase().includes('.svg')) // Skip SVG
              .map(img => ({
                id: img.id,
                src: img.src,
                position: img.position,
                width: img.width,
                height: img.height
              }))
          }
        })
        .filter(p => p.images.length > 0) // Only include products with valid images

      if (selectedProductsData.length === 0) {
        toast({
          title: 'No valid images',
          description: 'All selected images are SVG format which is not supported. Please select products with PNG, JPG, or WEBP images.',
          variant: 'destructive'
        })
        return
      }

      await createJobMutation.mutateAsync({
        store_id: storeId,
        preset_type: 'template',
        preset_id: selectedTemplate || null,
        ai_model: selectedModel,
        custom_prompt: customPrompt.trim() || undefined,
        products: selectedProductsData
      })

      toast({
        title: 'Optimization job created',
        description: `Processing ${selectedProductsData.length} products with ${totalSelectedImages} images`
      })

      setShowCreateJobDialog(false)
      setSelectedProducts(new Set())
      navigate('/shopify')
    } catch (err) {
      toast({
        title: 'Failed to create job',
        description: (err as Error).message,
        variant: 'destructive'
      })
    }
  }

  // Enhanced modal job creation handler
  const handleEnhancedCreateJob = async (config: JobConfig) => {
    if (!storeId) return

    try {
      // Group filtered images by product
      const productMap = new Map<string, typeof config.filteredImages>()
      for (const img of config.filteredImages) {
        if (!productMap.has(img.productId)) {
          productMap.set(img.productId, [])
        }
        productMap.get(img.productId)!.push(img)
      }

      // Build products data for API
      const productsData = Array.from(productMap.entries()).map(([productId, images]) => ({
        id: productId,
        title: images[0].productTitle,
        images: images.map(img => ({
          id: img.image.id,
          src: img.image.src,
          position: img.image.position,
          width: img.image.width,
          height: img.image.height
        }))
      }))

      if (productsData.length === 0) {
        toast({
          title: 'No valid images',
          description: 'No images to process after applying filters.',
          variant: 'destructive'
        })
        return
      }

      await createJobMutation.mutateAsync({
        store_id: storeId,
        preset_type: 'template',
        preset_id: config.templateId,
        ai_model: config.aiModel,
        custom_prompt: config.customPrompt || undefined,
        products: productsData
      })

      toast({
        title: 'Optimization job created',
        description: `Processing ${config.stats.filteredProducts} products with ${config.stats.filteredImages} images`
      })

      setOptimizationModalOpen(false)
      setSelectedProducts(new Set())
      navigate('/shopify')
    } catch (err) {
      toast({
        title: 'Failed to create job',
        description: (err as Error).message,
        variant: 'destructive'
      })
    }
  }

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Store not found</p>
        <Button variant="link" onClick={() => navigate('/shopify')}>
          Back to Shopify
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/shopify')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6" />
              {store.shop_name || store.shop_domain}
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and select products to optimize
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/shopify/${storeId}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchProducts()}
            disabled={productsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Product Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="text-sm py-1 px-3">
          <Package className="h-4 w-4 mr-1.5" />
          {productStats.totalProducts} products loaded
        </Badge>
        <Badge variant="secondary" className="text-sm py-1 px-3">
          <ImageIcon className="h-4 w-4 mr-1.5" />
          {productStats.totalImages} images
        </Badge>
        {productStats.isFiltered && productStats.filteredProducts !== productStats.totalProducts && (
          <Badge variant="outline" className="text-sm py-1 px-3">
            Showing {productStats.filteredProducts} of {productStats.totalProducts}
          </Badge>
        )}
        {hasNextPage && (
          <Badge variant="outline" className="text-sm py-1 px-3 border-blue-300 text-blue-600 bg-blue-50">
            <ChevronDown className="h-3 w-3 mr-1" />
            More products available
          </Badge>
        )}
        {!hasNextPage && allProducts.length > 0 && (
          <Badge variant="outline" className="text-sm py-1 px-3 border-green-300 text-green-600 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            All loaded
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCollection || "__all__"} onValueChange={(v) => setSelectedCollection(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Collections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Collections</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={String(collection.id)}>
                {collection.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType || "__all__"} onValueChange={(v) => setSelectedType(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {productTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title_asc">Title (A-Z)</SelectItem>
            <SelectItem value="title_desc">Title (Z-A)</SelectItem>
            <SelectItem value="images_desc">Most Images</SelectItem>
            <SelectItem value="images_asc">Fewest Images</SelectItem>
          </SelectContent>
        </Select>

        {/* Grid Size Toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 ${gridSize === 'compact' ? 'bg-gray-100' : ''}`}
            onClick={() => setGridSize('compact')}
            title="Compact grid - Show more products per row"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 ${gridSize === 'comfortable' ? 'bg-gray-100' : ''}`}
            onClick={() => setGridSize('comfortable')}
            title="Comfortable grid - Larger product cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Floating Bulk Actions Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 border-0">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-white/20">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span className="font-medium">
                    {selectedProducts.size} products ({totalSelectedImages} images)
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={selectAll}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    Select All Loaded
                  </Button>
                  <Button
                    size="sm"
                    onClick={clearSelection}
                    variant="ghost"
                    className="text-white/90 hover:text-white hover:bg-white/10"
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setOptimizationModalOpen(true)}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Optimization
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products grid */}
      {productsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No products found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Try adjusting your search or filters' : 'This store has no products yet'}
          </p>
        </div>
      ) : (
        <>
          {/* Select all bar */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) selectAll()
                  else clearSelection()
                }}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredProducts.length} products)
              </span>
            </div>
          </div>

          <div className={`grid gap-4 ${
            gridSize === 'compact'
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedProducts.has(product.id)}
                onToggle={() => toggleProduct(product.id)}
                onEditImages={() => openImageModal(product)}
                selectedImageCount={selectedImages.get(product.id)?.size}
                showSelectedCount={imageSelectionMode === 'manual' && selectedProducts.has(product.id)}
                processedImageIds={processedImageIds}
                processingImageIds={processingImageIds}
              />
            ))}
          </div>

          {/* Load More Section */}
          <div className="py-6">
            {hasNextPage ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load 50 More Products
                  </>
                )}
              </Button>
            ) : allProducts.length > 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                All {allProducts.length} products loaded
              </p>
            ) : null}
          </div>
        </>
      )}

      {/* Create job dialog */}
      <AlertDialog open={showCreateJobDialog} onOpenChange={setShowCreateJobDialog}>
        <AlertDialogContent className="max-h-[90vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Start Optimization Job</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to optimize {selectedProducts.size} products with {totalSelectedImages} images.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            {/* AI Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Model</label>
              <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
                {SHOPIFY_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className={`relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                      selectedModel === model.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {selectedModel === model.id && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {model.friendlyName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({model.technicalName})
                        </span>
                        {model.recommended && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {model.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span title="Quality">★ {getQualityDots(model.quality)}</span>
                        <span title="Speed">⚡ {getSpeedDots(model.speed)}</span>
                        <span>🪙 {model.tokenCost} tokens</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Selection Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Image Selection</label>
              <Select
                value={imageSelectionMode}
                onValueChange={(v) => setImageSelectionMode(v as ImageSelectionMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      <span>All images</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="main_only">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Main image only (position 1)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Choose per product</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {imageSelectionMode === 'all' && 'All product images will be optimized'}
                {imageSelectionMode === 'main_only' && 'Only the main product image (first image) will be optimized'}
                {imageSelectionMode === 'manual' && 'Click products below to expand and select specific images'}
              </p>
            </div>

            {/* Manual image selection preview */}
            {imageSelectionMode === 'manual' && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                {filteredProducts.filter(p => selectedProducts.has(p.id)).map((product) => {
                  const productImageIds = selectedImages.get(product.id) || new Set()
                  const productProcessedCount = product.images.filter(img => processedImageIds.has(img.id)).length
                  return (
                    <div key={product.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{product.title}</span>
                        {productProcessedCount > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                            {productProcessedCount} AI done
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.images.map((img, idx) => {
                          const isSelected = productImageIds.has(img.id)
                          const isModel = isModelImage(img)
                          const isSvg = img.src.toLowerCase().includes('.svg')
                          const isProcessed = processedImageIds.has(img.id)
                          const isProcessing = processingImageIds.has(img.id)
                          return (
                            <div
                              key={img.id}
                              className={`relative w-12 h-12 rounded border-2 overflow-hidden ${
                                isProcessed
                                  ? 'border-green-400 cursor-not-allowed'
                                  : isSelected
                                    ? 'border-primary cursor-pointer'
                                    : 'border-gray-200 cursor-pointer'
                              } ${isSvg || isProcessed ? 'opacity-60' : ''}`}
                              onClick={() => !isSvg && !isProcessed && toggleImage(product.id, img.id)}
                              title={
                                isProcessed ? 'Already AI processed'
                                : isProcessing ? 'Currently processing'
                                : isSvg ? 'SVG not supported'
                                : isModel ? 'Model/lifestyle image'
                                : `Image ${idx + 1}`
                              }
                            >
                              <img src={img.src} alt="" className="w-full h-full object-cover" />
                              {isProcessed && (
                                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                  <Sparkles className="h-4 w-4 text-green-600" />
                                </div>
                              )}
                              {isProcessing && !isProcessed && (
                                <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                </div>
                              )}
                              {isSelected && !isProcessed && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              {isModel && !isSvg && !isProcessed && (
                                <div className="absolute top-0 right-0 bg-amber-500 rounded-bl p-0.5">
                                  <User className="h-2 w-2 text-white" />
                                </div>
                              )}
                              {isSvg && (
                                <div className="absolute inset-0 bg-gray-500/50 flex items-center justify-center">
                                  <span className="text-white text-xs">SVG</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Prompt Configuration - Required */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Prompt Settings <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Choose a template OR enter a custom prompt (at least one required)
              </p>

              {/* Template Selection */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Template</label>
                <Select
                  value={selectedTemplate || "__none__"}
                  onValueChange={(v) => setSelectedTemplate(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No template</SelectItem>
                    {(templates || []).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Custom Prompt {!selectedTemplate && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  placeholder="e.g., Professional product photography with clean white background, soft studio lighting, high detail..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className={!hasValidPromptConfig ? 'border-red-300' : ''}
                />
              </div>

              {!hasValidPromptConfig && (
                <p className="text-xs text-red-500">
                  Please select a template or enter a custom prompt
                </p>
              )}
            </div>

            {/* SVG Warning */}
            {svgImageCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">
                    {svgImageCount} SVG image{svgImageCount > 1 ? 's' : ''} will be skipped
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    AI models don't support SVG format. Only PNG, JPG, and WEBP images will be processed.
                  </p>
                </div>
              </div>
            )}

            {/* Model Images Info */}
            {modelImageCount > 0 && imageSelectionMode !== 'manual' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
                <User className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-purple-800 font-medium">
                    {modelImageCount} model/lifestyle image{modelImageCount > 1 ? 's' : ''} detected
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    To exclude model photos, switch to "Choose per product" mode and deselect them.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Images will be processed and you'll review them before
                any changes are pushed to Shopify.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomPrompt('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateJob}
              disabled={createJobMutation.isPending || !hasValidPromptConfig}
            >
              {createJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Per-product image selection modal */}
      <ImageSelectionModal
        product={imageModalProduct}
        open={imageModalProduct !== null}
        onOpenChange={(open) => {
          if (!open) setImageModalProduct(null)
        }}
        selectedImageIds={imageModalProduct ? (selectedImages.get(imageModalProduct.id) || new Set()) : new Set()}
        onToggleImage={(imageId) => {
          if (imageModalProduct) {
            toggleImage(imageModalProduct.id, imageId)
          }
        }}
        onSelectAll={() => {
          if (imageModalProduct) {
            selectAllImagesForProduct(imageModalProduct.id)
          }
        }}
        onDeselectAll={() => {
          if (imageModalProduct) {
            deselectAllImagesForProduct(imageModalProduct.id)
          }
        }}
        onProductOnly={() => {
          if (imageModalProduct) {
            selectProductOnlyImages(imageModalProduct.id)
          }
        }}
        processedImageIds={processedImageIds}
        processingImageIds={processingImageIds}
      />

      {/* Enhanced Optimization Modal */}
      <OptimizationModal
        open={optimizationModalOpen}
        onOpenChange={setOptimizationModalOpen}
        products={allProducts}
        selectedProductIds={selectedProducts}
        templates={(templates || []).map(t => ({ id: t.id, name: t.name }))}
        onSubmit={handleEnhancedCreateJob}
        isSubmitting={createJobMutation.isPending}
      />
    </div>
  )
}

// Image selection modal component
interface ImageSelectionModalProps {
  product: ShopifyProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedImageIds: Set<string>
  onToggleImage: (imageId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onProductOnly: () => void
  processedImageIds: Set<string>
  processingImageIds: Set<string>
}

function ImageSelectionModal({
  product,
  open,
  onOpenChange,
  selectedImageIds,
  onToggleImage,
  onSelectAll,
  onDeselectAll,
  onProductOnly,
  processedImageIds,
  processingImageIds
}: ImageSelectionModalProps) {
  if (!product) return null

  const totalImages = product.images.length
  const selectedCount = selectedImageIds.size
  const modelCount = product.images.filter(img => isModelImage(img)).length
  const svgCount = product.images.filter(img => img.src.toLowerCase().includes('.svg')).length
  const processedCount = product.images.filter(img => processedImageIds.has(img.id)).length
  const processingCount = product.images.filter(img => processingImageIds.has(img.id)).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            <span className="line-clamp-1">{product.title}</span>
            <Badge variant="outline" className="ml-2">
              {totalImages} images
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {product.images.map((img, idx) => {
              const isSelected = selectedImageIds.has(img.id)
              const isModel = isModelImage(img)
              const isSvg = img.src.toLowerCase().includes('.svg')
              const isProcessed = processedImageIds.has(img.id)
              const isProcessing = processingImageIds.has(img.id)
              const label = idx === 0 ? 'Main' : `Variant ${idx}`

              return (
                <div
                  key={img.id}
                  className={`relative group cursor-pointer ${isSvg || isProcessed ? 'cursor-not-allowed' : ''}`}
                  onClick={() => !isSvg && !isProcessed && onToggleImage(img.id)}
                  title={isProcessed ? 'Already AI processed' : isProcessing ? 'Currently processing' : undefined}
                >
                  <div
                    className={`aspect-square rounded-lg overflow-hidden border-3 transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : isProcessed
                          ? 'border-green-400 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-gray-400'
                    } ${isSvg || isProcessed ? 'opacity-60' : ''}`}
                  >
                    <img
                      src={img.src}
                      alt={img.alt || `Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* AI Processed overlay */}
                    {isProcessed && (
                      <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                        <div className="bg-green-600 rounded-full p-1.5">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Processing overlay */}
                    {isProcessing && !isProcessed && (
                      <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                        <div className="bg-blue-600 rounded-full p-1.5">
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        </div>
                      </div>
                    )}

                    {/* Selected overlay */}
                    {isSelected && !isSvg && !isProcessed && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary rounded-full p-1">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Model badge */}
                    {isModel && !isSvg && !isProcessed && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white rounded px-1.5 py-0.5 text-xs flex items-center gap-0.5">
                        <User className="h-3 w-3" />
                        <span>Model</span>
                      </div>
                    )}

                    {/* SVG overlay */}
                    {isSvg && (
                      <div className="absolute inset-0 bg-gray-600/60 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">SVG</span>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <p className={`text-xs text-center mt-1 truncate ${isProcessed ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                    {isProcessed ? 'AI Done' : label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected count and warnings */}
        <div className="py-2 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Selected: {selectedCount} of {totalImages - processedCount} available
            </span>
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              {processedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <Sparkles className="h-3 w-3" />
                  {processedCount} AI done
                </span>
              )}
              {processingCount > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {processingCount} processing
                </span>
              )}
              {modelCount > 0 && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-amber-500" />
                  {modelCount} model
                </span>
              )}
              {svgCount > 0 && (
                <span className="flex items-center gap-1 text-gray-500">
                  {svgCount} SVG (skipped)
                </span>
              )}
            </div>
          </div>

          {processedCount === totalImages && (
            <div className="bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 text-sm text-green-800">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>All images in this product have been AI processed!</span>
            </div>
          )}

          {selectedCount === 0 && processedCount < totalImages && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>No images selected. Select at least one image to optimize.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <div className="flex gap-2 flex-1">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              Deselect All
            </Button>
            {modelCount > 0 && (
              <Button variant="outline" size="sm" onClick={onProductOnly} title="Select only product images, exclude model shots">
                <Sparkles className="h-3 w-3 mr-1" />
                Product Only
              </Button>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Product card component
interface ProductCardProps {
  product: ShopifyProduct
  selected: boolean
  onToggle: () => void
  onEditImages: () => void
  selectedImageCount?: number
  showSelectedCount?: boolean
  processedImageIds: Set<string>
  processingImageIds: Set<string>
}

function ProductCard({ product, selected, onToggle, onEditImages, selectedImageCount, showSelectedCount, processedImageIds, processingImageIds }: ProductCardProps) {
  const mainImage = product.images[0]
  const hasMultipleImages = product.images.length > 1

  // Count how many images have been AI-processed
  const processedCount = product.images.filter(img => processedImageIds.has(img.id)).length
  const processingCount = product.images.filter(img => processingImageIds.has(img.id)).length
  const allProcessed = processedCount === product.images.length && product.images.length > 0
  const someProcessed = processedCount > 0 && processedCount < product.images.length
  const mainImageProcessed = mainImage ? processedImageIds.has(mainImage.id) : false
  const mainImageProcessing = mainImage ? processingImageIds.has(mainImage.id) : false

  // SVG detection
  const svgCount = product.images.filter(img => img.src.toLowerCase().includes('.svg')).length
  const allSvg = svgCount === product.images.length && product.images.length > 0
  const mainImageSvg = mainImage ? mainImage.src.toLowerCase().includes('.svg') : false

  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
      } ${allProcessed ? 'opacity-75' : ''}`}
      onClick={onToggle}
    >
      <CardContent className="p-3">
        <div className="relative">
          {/* Checkbox */}
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggle()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Edit Images button - only show for products with multiple images */}
          {hasMultipleImages && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 bg-white/90 hover:bg-white shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditImages()
                }}
                title="Select images"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                <span className="text-xs">Edit</span>
              </Button>
            </div>
          )}

          {/* Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
            {mainImage ? (
              <>
                <img
                  src={mainImage.src}
                  alt={mainImage.alt || product.title}
                  className={`w-full h-full object-cover ${mainImageSvg ? 'opacity-50 grayscale' : ''}`}
                />
                {/* SVG overlay - not supported */}
                {mainImageSvg && (
                  <div className="absolute inset-0 bg-gray-500/30 flex items-center justify-center" title="SVG images are not supported for AI optimization">
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-gray-600 text-white text-[10px] px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        SVG - Not Supported
                      </Badge>
                    </div>
                  </div>
                )}
                {/* AI Processed overlay for main image */}
                {mainImageProcessed && !mainImageSvg && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0.5">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Done
                      </Badge>
                    </div>
                  </div>
                )}
                {/* Processing indicator */}
                {mainImageProcessing && !mainImageProcessed && !mainImageSvg && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-gray-300" />
              </div>
            )}
          </div>
        </div>

        {/* Product info */}
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h3>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <ImageIcon className="h-3 w-3 mr-1" />
            {showSelectedCount && selectedImageCount !== undefined ? (
              <span>{selectedImageCount}/{product.images.length} selected</span>
            ) : (
              <span>{product.images.length} images</span>
            )}
          </Badge>
          {/* AI processed indicator badge */}
          {allProcessed && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              All AI Done
            </Badge>
          )}
          {someProcessed && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {processedCount}/{product.images.length} Done
            </Badge>
          )}
          {processingCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {processingCount} Processing
            </Badge>
          )}
          {allSvg && (
            <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs" title="All images are SVG format which is not supported for AI optimization">
              <AlertTriangle className="h-3 w-3 mr-1" />
              All SVG
            </Badge>
          )}
          {svgCount > 0 && !allSvg && (
            <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs" title={`${svgCount} SVG image${svgCount > 1 ? 's' : ''} will be skipped`}>
              {svgCount} SVG
            </Badge>
          )}
          {product.product_type && (
            <Badge variant="outline" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {product.product_type}
            </Badge>
          )}
        </div>

        {product.vendor && (
          <p className="text-xs text-muted-foreground mt-2">{product.vendor}</p>
        )}
      </CardContent>
    </Card>
  )
}
