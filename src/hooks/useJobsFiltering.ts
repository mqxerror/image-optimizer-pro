import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import type { ShopifySyncJob, ShopifyJobStatus } from '@/types/shopify'
import type { JobsFilterState, JobStatusTab, JobStatusCount } from '@/components/shopify/jobs/types'

const ACTIVE_STATUSES: ShopifyJobStatus[] = ['pending', 'processing', 'awaiting_approval', 'pushing']

export function useJobsFiltering(options?: { storeId?: string }) {
  const { session } = useAuthStore()

  // Filter state
  const [filters, setFilters] = useState<JobsFilterState>({
    search: '',
    storeId: options?.storeId || null,
    statuses: [],
    dateRange: { from: null, to: null }
  })

  // Active tab
  const [activeTab, setActiveTab] = useState<JobStatusTab>('all')

  // Selected jobs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  // Fetch all jobs
  const { data: allJobs = [], isLoading, refetch } = useQuery({
    queryKey: ['shopify-jobs-all', filters.storeId],
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
            store_id: filters.storeId,
            limit: 100
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const data = await response.json()
      return (data.jobs || []) as ShopifySyncJob[]
    },
    enabled: !!session,
    refetchInterval: 5000
  })

  // Calculate counts
  const counts = useMemo<JobStatusCount>(() => {
    return {
      all: allJobs.length,
      active: allJobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length,
      awaiting_approval: allJobs.filter(j => j.status === 'awaiting_approval').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      failed: allJobs.filter(j => j.status === 'failed').length
    }
  }, [allJobs])

  // Apply filters
  const filteredJobs = useMemo(() => {
    let result = allJobs

    // Filter by tab
    if (activeTab === 'active') {
      result = result.filter(j => ACTIVE_STATUSES.includes(j.status))
    } else if (activeTab === 'awaiting_approval') {
      result = result.filter(j => j.status === 'awaiting_approval')
    } else if (activeTab === 'completed') {
      result = result.filter(j => j.status === 'completed')
    } else if (activeTab === 'failed') {
      result = result.filter(j => j.status === 'failed')
    }

    // Filter by store
    if (filters.storeId) {
      result = result.filter(j => j.store_id === filters.storeId)
    }

    // Filter by search
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase()
      result = result.filter(j =>
        (j.shop_name || '').toLowerCase().includes(query) ||
        (j.shop_domain || '').toLowerCase().includes(query) ||
        j.id.toLowerCase().includes(query)
      )
    }

    return result
  }, [allJobs, activeTab, filters.storeId, filters.search])

  // Selection handlers
  const toggleSelection = useCallback((jobId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(jobId)
      } else {
        next.delete(jobId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredJobs.map(j => j.id)))
  }, [filteredJobs])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode - clear selection
        setSelectedIds(new Set())
      }
      return !prev
    })
  }, [])

  // Get selected jobs
  const selectedJobs = useMemo(() => {
    return filteredJobs.filter(j => selectedIds.has(j.id))
  }, [filteredJobs, selectedIds])

  // Update filters
  const updateFilters = useCallback((updates: Partial<JobsFilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    // Data
    jobs: filteredJobs,
    allJobs,
    counts,
    isLoading,

    // Filters
    filters,
    updateFilters,
    activeTab,
    setActiveTab,

    // Selection
    selectionMode,
    toggleSelectionMode,
    selectedIds,
    selectedJobs,
    toggleSelection,
    selectAll,
    clearSelection,

    // Actions
    refetch
  }
}
