import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Fetches all processed Shopify images for a store
 * Returns a Set of image IDs that have been AI-processed (pushed status)
 */
export function useProcessedShopifyImages(storeId: string | undefined) {
  return useQuery({
    queryKey: ['shopify-processed-images', storeId],
    queryFn: async () => {
      if (!storeId) return { processedImageIds: new Set<string>(), processingImageIds: new Set<string>(), allImages: [] }

      // Join shopify_images with shopify_sync_jobs to get images for this store
      // Include job status to filter out cancelled/failed jobs
      const { data, error } = await supabase
        .from('shopify_images')
        .select(`
          shopify_image_id,
          shopify_product_id,
          status,
          pushed_at,
          optimized_url,
          job:shopify_sync_jobs!inner(store_id, status)
        `)
        .eq('job.store_id', storeId)

      if (error) {
        console.error('Error fetching processed images:', error)
        throw error
      }

      // Build sets for quick lookup
      const processedImageIds = new Set<string>()
      const processingImageIds = new Set<string>()

      for (const row of (data || [])) {
        const img = row as unknown as { shopify_image_id: string; status: string; job: { status: string } }
        const jobStatus = img.job?.status

        if (img.status === 'pushed') {
          // Image has been AI-processed and pushed back to Shopify
          processedImageIds.add(img.shopify_image_id)
        } else if (
          (img.status === 'queued' || img.status === 'processing') &&
          // Only show as processing if job is still active
          ['pending', 'processing', 'pushing'].includes(jobStatus)
        ) {
          processingImageIds.add(img.shopify_image_id)
        }
      }

      return {
        processedImageIds,
        processingImageIds,
        allImages: data || []
      }
    },
    enabled: !!storeId,
    staleTime: 30000, // Cache for 30 seconds
  })
}

/**
 * Returns info about whether a specific image has been processed
 */
export function getImageProcessingStatus(
  imageId: string,
  processedIds: Set<string>,
  processingIds: Set<string>
): 'processed' | 'processing' | 'none' {
  if (processedIds.has(imageId)) return 'processed'
  if (processingIds.has(imageId)) return 'processing'
  return 'none'
}
