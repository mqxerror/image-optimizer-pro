import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type {
  ShopifyStore,
  ShopifyStoreSettings,
  ShopifySyncJob,
  ShopifyJobWithImages,
  CreateJobRequest,
  CreateJobResponse,
  ShopifyProductsResponse,
  ShopifyCollectionsResponse,
  ShopifyProductTypesResponse
} from '@/types/shopify'

// ============================================
// STORE HOOKS
// ============================================

// Get all connected stores for current user
export function useShopifyStores() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-stores', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as ShopifyStore[]
    },
    enabled: !!user
  })
}

// Get a single store
export function useShopifyStore(storeId: string | null) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-store', storeId],
    queryFn: async () => {
      if (!storeId || !user) return null

      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('id', storeId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data as unknown as ShopifyStore
    },
    enabled: !!storeId && !!user
  })
}

// Initiate OAuth connection
export function useConnectShopifyStore() {
  const { session } = useAuthStore()

  return useMutation({
    mutationFn: async (params: { shopDomain: string; redirectUri: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-oauth`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'initiate',
            redirect_uri: params.redirectUri
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initiate OAuth')
      }

      const data = await response.json()

      // Construct Shopify OAuth URL
      const shopDomain = params.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const oauthUrl = `https://${shopDomain}/admin/oauth/authorize?` +
        `client_id=${data.api_key}&` +
        `scope=${data.scopes}&` +
        `redirect_uri=${encodeURIComponent(params.redirectUri)}&` +
        `state=${data.state}`

      return { url: oauthUrl, state: data.state }
    }
  })
}

// Complete OAuth callback
export function useCompleteShopifyOAuth() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { code: string; shop: string; state: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-oauth`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'callback',
            ...params
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete OAuth')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-stores'] })
    }
  })
}

// Update store settings
export function useUpdateStoreSettings() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { storeId: string; settings: Partial<ShopifyStoreSettings> }) => {
      const { data, error } = await supabase
        .from('shopify_stores')
        .update({ settings: params.settings })
        .eq('id', params.storeId)
        .eq('user_id', user?.id || '')
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-store', variables.storeId] })
      queryClient.invalidateQueries({ queryKey: ['shopify-stores'] })
    }
  })
}

// Disconnect store
export function useDisconnectStore() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase
        .from('shopify_stores')
        .update({ status: 'disconnected' })
        .eq('id', storeId)
        .eq('user_id', user?.id || '')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-stores'] })
    }
  })
}

// ============================================
// PRODUCT HOOKS
// ============================================

// Get products from a store
export function useShopifyProducts(storeId: string | null, options?: {
  collectionId?: string
  productType?: string
  tags?: string[]
  pageInfo?: string
  limit?: number
}) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-products', storeId, options],
    queryFn: async (): Promise<ShopifyProductsResponse> => {
      if (!storeId) return { products: [], pagination: { next_page: null, prev_page: null, has_next: false, has_prev: false } }

      const response = await fetch(
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
            collection_id: options?.collectionId,
            product_type: options?.productType,
            tags: options?.tags,
            page_info: options?.pageInfo,
            limit: options?.limit || 50
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch products')
      }

      return response.json()
    },
    enabled: !!storeId && !!session
  })
}

// Get products from a store with infinite pagination (Load More)
export function useShopifyProductsInfinite(storeId: string | null, options?: {
  collectionId?: string
  productType?: string
  tags?: string[]
  limit?: number
}) {
  const { session } = useAuthStore()

  return useInfiniteQuery({
    queryKey: ['shopify-products-infinite', storeId, options],
    queryFn: async ({ pageParam }): Promise<ShopifyProductsResponse> => {
      if (!storeId) return { products: [], pagination: { next_page: null, prev_page: null, has_next: false, has_prev: false } }

      const response = await fetch(
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
            collection_id: options?.collectionId,
            product_type: options?.productType,
            tags: options?.tags,
            page_info: pageParam, // Cursor from previous page
            limit: options?.limit || 50
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch products')
      }

      return response.json()
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.next_page || undefined,
    enabled: !!storeId && !!session
  })
}

// Helper to flatten pages from useInfiniteQuery into a single array
export function flattenShopifyProducts(pages: ShopifyProductsResponse[] | undefined) {
  if (!pages) return []
  return pages.flatMap(page => page.products)
}

// Get collections from a store
export function useShopifyCollections(storeId: string | null) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-collections', storeId],
    queryFn: async (): Promise<ShopifyCollectionsResponse> => {
      if (!storeId) return { collections: [] }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list_collections',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch collections')
      }

      return response.json()
    },
    enabled: !!storeId && !!session
  })
}

// Get product types from a store
export function useShopifyProductTypes(storeId: string | null) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-product-types', storeId],
    queryFn: async (): Promise<ShopifyProductTypesResponse> => {
      if (!storeId) return { product_types: [] }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list_types',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch product types')
      }

      return response.json()
    },
    enabled: !!storeId && !!session
  })
}

// ============================================
// JOB HOOKS
// ============================================

// Get all jobs (optionally filtered by store)
export function useShopifyJobs(options?: {
  storeId?: string
  status?: string
  limit?: number
}) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-jobs', options],
    queryFn: async () => {
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
            store_id: options?.storeId,
            status: options?.status,
            limit: options?.limit || 20
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch jobs')
      }

      const data = await response.json()
      return data.jobs as ShopifySyncJob[]
    },
    enabled: !!session,
    refetchInterval: 5000 // Poll every 5 seconds
  })
}

// Get a single job with images
export function useShopifyJob(jobId: string | null) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: ['shopify-job', jobId],
    queryFn: async (): Promise<ShopifyJobWithImages | null> => {
      if (!jobId) return null

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'get',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch job')
      }

      const data = await response.json()
      return {
        ...data.job,
        images: data.images,
        stats: data.stats
      }
    },
    enabled: !!jobId && !!session,
    refetchInterval: 3000 // Poll every 3 seconds for active jobs
  })
}

// Create a new optimization job (queued, not auto-processed)
export function useCreateShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateJobRequest): Promise<CreateJobResponse> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'create',
            ...request
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create job')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      // Auto-trigger processing after job creation
      if (data.job_id && session?.access_token) {
        triggerJobProcessing(data.job_id, session.access_token)
      }
    }
  })
}

// Manually start processing a queued job
export function useStartJobProcessing() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-process-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            job_id: jobId,
            batch_size: 10
          })
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to start processing' }))
        throw new Error(error.error || 'Failed to start processing')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
    }
  })
}

// Trigger background image processing for a job
async function triggerJobProcessing(jobId: string, accessToken?: string) {
  try {
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-process-images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_id: jobId,
          batch_size: 10
        })
      }
    )
  } catch (err) {
    // Silent fail - processing will happen via cron if this fails
    console.warn('Failed to trigger job processing:', err)
  }
}

// Approve a job
export function useApproveShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'approve',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve job')
      }

      return response.json()
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-job', jobId] })
    }
  })
}

// Cancel a job
export function useCancelShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'cancel',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel job')
      }

      return response.json()
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-job', jobId] })
    }
  })
}

// Pause a job
export function usePauseShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'pause',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to pause job')
      }

      return response.json()
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-job', jobId] })
    }
  })
}

// Resume a paused job
export function useResumeShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'resume',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resume job')
      }

      return response.json()
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-job', jobId] })
    }
  })
}

// Discard a job (delete)
export function useDiscardShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'discard',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to discard job')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
    }
  })
}

// Push approved images to Shopify
export function usePushShopifyJob() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-push`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'push',
            job_id: jobId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to push images')
      }

      return response.json()
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-job', jobId] })
    }
  })
}

// Retry a single failed image
export function useRetryShopifyImage() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-push`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'retry_image',
            image_id: imageId
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to retry image')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-job'] })
    }
  })
}
