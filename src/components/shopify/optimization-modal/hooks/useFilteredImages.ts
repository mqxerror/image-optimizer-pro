import { useMemo } from 'react'
import type { ShopifyProduct } from '@/types/shopify'
import type { FilterState, FilterStats, FilteredImage } from '../types'
import { isModelImage, isSvgImage } from '../types'

interface UseFilteredImagesResult {
  images: FilteredImage[]
  includedImages: FilteredImage[]
  stats: FilterStats
}

export function useFilteredImages(
  products: ShopifyProduct[],
  selectedProductIds: Set<string>,
  filters: FilterState
): UseFilteredImagesResult {
  return useMemo(() => {
    const result: FilteredImage[] = []
    let modelExcluded = 0
    let svgSkipped = 0

    // Get only selected products
    const selectedProducts = products.filter(p => selectedProductIds.has(p.id))

    for (const product of selectedProducts) {
      // Check tag filters at product level
      const hasIncludeTag =
        filters.includeTags.length === 0 ||
        filters.includeTags.some(tag =>
          product.tags.some(pt => pt.toLowerCase() === tag.toLowerCase())
        )

      const hasExcludeTag = filters.excludeTags.some(tag =>
        product.tags.some(pt => pt.toLowerCase() === tag.toLowerCase())
      )

      // Skip product if it doesn't match tag filters
      if (!hasIncludeTag || hasExcludeTag) continue

      for (const image of product.images) {
        const isModel = isModelImage(image)
        const isSvg = isSvgImage(image.src)

        // Apply image type/position filter
        const positionMatch =
          filters.imageType === 'all' ||
          (filters.imageType === 'main_only' && image.position === 1) ||
          (filters.imageType === 'variants_only' && image.position > 1)

        if (!positionMatch) continue

        // Determine exclusion status
        const excludedByModel = filters.excludeModelImages && isModel
        const excludedBySvg = isSvg
        const isExcluded = excludedByModel || excludedBySvg

        // Track exclusion counts
        if (excludedByModel) modelExcluded++
        if (excludedBySvg) svgSkipped++

        result.push({
          productId: product.id,
          productTitle: product.title,
          image,
          isModel,
          isSvg,
          isExcluded,
          excludeReason: excludedByModel ? 'model' : excludedBySvg ? 'svg' : undefined
        })
      }
    }

    const includedImages = result.filter(r => !r.isExcluded)
    const uniqueProductIds = new Set(includedImages.map(i => i.productId))

    return {
      images: result,
      includedImages,
      stats: {
        totalProducts: selectedProducts.length,
        filteredProducts: uniqueProductIds.size,
        totalImages: result.length,
        filteredImages: includedImages.length,
        modelImagesExcluded: modelExcluded,
        svgImagesSkipped: svgSkipped
      }
    }
  }, [products, selectedProductIds, filters])
}
