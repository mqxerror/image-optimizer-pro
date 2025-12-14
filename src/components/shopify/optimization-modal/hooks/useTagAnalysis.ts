import { useMemo } from 'react'
import type { ShopifyProduct } from '@/types/shopify'

interface TagAnalysis {
  allTags: string[]
  tagCounts: Map<string, number>
  totalProducts: number
}

export function useTagAnalysis(
  products: ShopifyProduct[],
  selectedProductIds?: Set<string>
): TagAnalysis {
  return useMemo(() => {
    const counts = new Map<string, number>()

    // Filter to selected products if provided
    const productsToAnalyze = selectedProductIds
      ? products.filter(p => selectedProductIds.has(p.id))
      : products

    for (const product of productsToAnalyze) {
      if (!product.tags) continue

      for (const tag of product.tags) {
        const normalizedTag = tag.trim()
        if (normalizedTag) {
          counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1)
        }
      }
    }

    // Sort by frequency descending, then alphabetically
    const sorted = Array.from(counts.entries())
      .sort((a, b) => {
        const countDiff = b[1] - a[1]
        if (countDiff !== 0) return countDiff
        return a[0].localeCompare(b[0])
      })
      .map(([tag]) => tag)

    return {
      allTags: sorted,
      tagCounts: counts,
      totalProducts: productsToAnalyze.length
    }
  }, [products, selectedProductIds])
}
