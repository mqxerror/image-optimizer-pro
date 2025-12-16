import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'
import type { AutomationRun } from '@/components/shopify/scheduling-modal/types'

export function useAutomationHistory(storeId: string, limit = 20) {
  const { session } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.automation.history(storeId, limit),
    queryFn: async (): Promise<AutomationRun[]> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-automation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list_runs',
            store_id: storeId,
            limit
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch automation history')
      }

      const data = await response.json()
      return data.runs || []
    },
    enabled: !!session && !!storeId,
    staleTime: 30000
  })
}
