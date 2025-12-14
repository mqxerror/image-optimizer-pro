import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import type {
  AutomationConfig,
  AutomationConfigForm,
  AutomationStats
} from '@/components/shopify/scheduling-modal/types'

const defaultForm: AutomationConfigForm = {
  is_enabled: false,
  webhook_enabled: false,
  schedule_enabled: false,
  schedule_frequency: 'daily',
  schedule_time: '02:00',
  schedule_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  schedule_timezone: 'America/New_York',
  require_approval: true,
  approval_threshold: 5,
  daily_limit: 500,
  auto_pause_enabled: true,
  auto_pause_threshold: 0.15,
  default_ai_model: 'flux-kontext-pro',
  default_quality: 85,
  default_format: 'webp'
}

export function useAutomationConfig(storeId: string) {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch config
  const configQuery = useQuery({
    queryKey: ['automation-config', storeId],
    queryFn: async (): Promise<AutomationConfig | null> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'get_config',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch automation config')
      }

      const data = await response.json()
      return data.config
    },
    enabled: !!session && !!storeId
  })

  // Update config
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AutomationConfigForm>) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_config',
            store_id: storeId,
            config: updates
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update config')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-config', storeId] })
    }
  })

  // Toggle pause
  const togglePauseMutation = useMutation({
    mutationFn: async (paused: boolean) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: paused ? 'pause' : 'resume',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to toggle pause')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-config', storeId] })
    }
  })

  // Reset config
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'reset_config',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to reset config')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-config', storeId] })
    }
  })

  // Convert config to form values
  const configToForm = (config: AutomationConfig | null): AutomationConfigForm => {
    if (!config) return defaultForm

    return {
      is_enabled: config.is_enabled,
      webhook_enabled: config.webhook_enabled,
      schedule_enabled: config.schedule_enabled,
      schedule_frequency: config.schedule_frequency,
      schedule_time: config.schedule_time,
      schedule_days: config.schedule_days,
      schedule_timezone: config.schedule_timezone,
      require_approval: config.require_approval,
      approval_threshold: config.approval_threshold,
      daily_limit: config.daily_limit,
      auto_pause_enabled: config.auto_pause_enabled,
      auto_pause_threshold: config.auto_pause_threshold,
      default_ai_model: config.default_ai_model,
      default_quality: config.default_quality,
      default_format: config.default_format
    }
  }

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    defaultForm,
    configToForm,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    togglePause: togglePauseMutation.mutateAsync,
    isTogglingPause: togglePauseMutation.isPending,
    resetConfig: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
    refetch: configQuery.refetch
  }
}

// Separate hook for automation stats
export function useAutomationStats(storeId: string) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: ['automation-stats', storeId],
    queryFn: async (): Promise<AutomationStats> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'get_stats',
            store_id: storeId
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch automation stats')
      }

      const data = await response.json()
      return data.stats
    },
    enabled: !!session && !!storeId,
    staleTime: 30000
  })
}

// Hook for test runs
export function useTestRun(storeId: string) {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()

  const startTestMutation = useMutation({
    mutationFn: async ({
      count,
      productIds
    }: {
      count: number
      productIds?: string[]
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
            action: 'start_test',
            store_id: storeId,
            test_count: count,
            selected_product_ids: productIds
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start test run')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-stats', storeId] })
      queryClient.invalidateQueries({ queryKey: ['automation-history', storeId] })
    }
  })

  return {
    startTest: startTestMutation.mutateAsync,
    isStarting: startTestMutation.isPending
  }
}
