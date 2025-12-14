import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import type { QueueItem, QueueFilters, ExcludedProduct } from '@/components/shopify/scheduling-modal/types'

export function usePendingQueue(storeId: string, filters: QueueFilters = {}) {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch queue items
  const queueQuery = useQuery({
    queryKey: ['automation-queue', storeId, filters],
    queryFn: async (): Promise<{ items: QueueItem[]; total: number }> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list_queue',
            store_id: storeId,
            filters
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch queue')
      }

      const data = await response.json()
      return { items: data.items || [], total: data.total || 0 }
    },
    enabled: !!session && !!storeId
  })

  // Add items to queue
  const addMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'add_to_queue',
            store_id: storeId,
            product_ids: productIds,
            source: 'manual'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to add to queue')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-queue', storeId] })
    }
  })

  // Remove items from queue
  const removeMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'remove_from_queue',
            store_id: storeId,
            item_ids: itemIds
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to remove from queue')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-queue', storeId] })
    }
  })

  // Update priority
  const priorityMutation = useMutation({
    mutationFn: async ({
      itemIds,
      priority
    }: {
      itemIds: string[]
      priority: 'high' | 'normal' | 'low'
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_priority',
            store_id: storeId,
            item_ids: itemIds,
            priority
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update priority')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-queue', storeId] })
    }
  })

  // Exclude items
  const excludeMutation = useMutation({
    mutationFn: async ({
      itemIds,
      reason
    }: {
      itemIds: string[]
      reason?: string
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'exclude_products',
            store_id: storeId,
            item_ids: itemIds,
            reason
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to exclude products')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-queue', storeId] })
      queryClient.invalidateQueries({ queryKey: ['excluded-products', storeId] })
    }
  })

  // Process selected items now
  const processMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'process_now',
            store_id: storeId,
            item_ids: itemIds
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to process items')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-queue', storeId] })
      queryClient.invalidateQueries({ queryKey: ['automation-history', storeId] })
    }
  })

  return {
    items: queueQuery.data?.items || [],
    total: queueQuery.data?.total || 0,
    isLoading: queueQuery.isLoading,
    error: queueQuery.error,
    refetch: queueQuery.refetch,
    addToQueue: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    removeFromQueue: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    updatePriority: priorityMutation.mutateAsync,
    isUpdatingPriority: priorityMutation.isPending,
    excludeProducts: excludeMutation.mutateAsync,
    isExcluding: excludeMutation.isPending,
    processNow: processMutation.mutateAsync,
    isProcessing: processMutation.isPending
  }
}

// Hook for excluded products
export function useExcludedProducts(storeId: string) {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  const excludedQuery = useQuery({
    queryKey: ['excluded-products', storeId],
    queryFn: async (): Promise<ExcludedProduct[]> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list_excluded',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch excluded products')
      }

      const data = await response.json()
      return data.products || []
    },
    enabled: !!session && !!storeId
  })

  // Restore (un-exclude) products
  const restoreMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'restore_excluded',
            store_id: storeId,
            product_ids: productIds
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to restore products')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded-products', storeId] })
    }
  })

  return {
    products: excludedQuery.data || [],
    isLoading: excludedQuery.isLoading,
    error: excludedQuery.error,
    refetch: excludedQuery.refetch,
    restoreProducts: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending
  }
}
