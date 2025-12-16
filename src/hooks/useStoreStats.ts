import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'
import type { ShopifySyncJob } from '@/types/shopify'

export interface StoreStats {
  productCount: number
  activeJobCount: number
  totalOptimized: number
  recentImages: string[]
}

// Get stats for a single store
export function useStoreStats(storeId: string) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.shopify.storeStats(storeId),
    queryFn: async (): Promise<StoreStats> => {
      // Fetch jobs for this store to calculate stats
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list',
            store_id: storeId,
            limit: 100
          })
        }
      )

      let jobs: ShopifySyncJob[] = []
      if (response.ok) {
        const data = await response.json()
        jobs = data.jobs || []
      }

      // Calculate active jobs
      const activeJobCount = jobs.filter(j =>
        ['pending', 'processing', 'awaiting_approval', 'pushing'].includes(j.status)
      ).length

      // Calculate total optimized images (from completed jobs)
      const totalOptimized = jobs
        .filter(j => j.status === 'completed')
        .reduce((acc, j) => acc + (j.pushed_count || 0), 0)

      // Fetch recent products for preview images
      const productsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list',
            store_id: storeId,
            limit: 4
          })
        }
      )

      let recentImages: string[] = []
      let productCount = 0
      if (productsResponse.ok) {
        const data = await productsResponse.json()
        const products = data.products || []

        // Extract first image from each product
        recentImages = products
          .filter((p: { images?: Array<{ src: string }> }) => p.images && p.images.length > 0)
          .slice(0, 4)
          .map((p: { images: Array<{ src: string }> }) => {
            // Use Shopify's thumbnail size for faster loading
            const src = p.images[0].src
            return src.includes('?') ? `${src}&width=200` : `${src}?width=200`
          })

        // Estimate product count (would need separate endpoint for exact count)
        productCount = products.length
      }

      return {
        productCount,
        activeJobCount,
        totalOptimized,
        recentImages
      }
    },
    enabled: !!session && !!storeId,
    staleTime: 30000 // Cache for 30 seconds
  })
}

// Get aggregated stats for all stores
export function useAllStoresStats() {
  const { session, user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.shopify.allStoresStats(user?.id ?? ''),
    queryFn: async () => {
      // Fetch all jobs for counts
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list',
            limit: 100
          })
        }
      )

      let jobs: ShopifySyncJob[] = []
      if (response.ok) {
        const data = await response.json()
        jobs = data.jobs || []
      }

      // Group by store
      const storeStats = new Map<string, { active: number; completed: number; optimized: number }>()

      for (const job of jobs) {
        const existing = storeStats.get(job.store_id) || { active: 0, completed: 0, optimized: 0 }

        if (['pending', 'processing', 'awaiting_approval', 'pushing'].includes(job.status)) {
          existing.active++
        }
        if (job.status === 'completed') {
          existing.completed++
          existing.optimized += job.pushed_count || 0
        }

        storeStats.set(job.store_id, existing)
      }

      return {
        totalActiveJobs: jobs.filter(j =>
          ['pending', 'processing', 'awaiting_approval', 'pushing'].includes(j.status)
        ).length,
        totalAwaitingApproval: jobs.filter(j => j.status === 'awaiting_approval').length,
        totalCompleted: jobs.filter(j => j.status === 'completed').length,
        totalOptimized: jobs
          .filter(j => j.status === 'completed')
          .reduce((acc, j) => acc + (j.pushed_count || 0), 0),
        storeStats
      }
    },
    enabled: !!session,
    staleTime: 30000
  })
}
