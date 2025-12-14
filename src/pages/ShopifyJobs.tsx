import { useSearchParams, Link } from 'react-router-dom'
import {
  RefreshCw,
  ArrowLeft,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  JobStatusTabs,
  JobsToolbar,
  VisualJobCard,
  BulkActionsDropdown
} from '@/components/shopify/jobs'
import { useShopifyStores } from '@/hooks/useShopify'
import { useJobsFiltering } from '@/hooks/useJobsFiltering'

export default function ShopifyJobs() {
  const [searchParams] = useSearchParams()
  const initialStoreId = searchParams.get('store') || undefined

  const { data: stores = [] } = useShopifyStores()

  const {
    jobs,
    counts,
    isLoading,
    filters,
    updateFilters,
    activeTab,
    setActiveTab,
    selectionMode,
    toggleSelectionMode,
    selectedIds,
    selectedJobs,
    toggleSelection,
    clearSelection,
    refetch
  } = useJobsFiltering({ storeId: initialStoreId })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/shopify">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Optimization Jobs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and monitor your image optimization jobs
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Toolbar */}
      <JobsToolbar
        filters={filters}
        onFiltersChange={updateFilters}
        stores={stores}
        selectionMode={selectionMode}
        selectedCount={selectedIds.size}
        onToggleSelectionMode={toggleSelectionMode}
        onClearSelection={clearSelection}
      />

      {/* Status Tabs + Bulk Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <JobStatusTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />

        {selectionMode && selectedJobs.length > 0 && (
          <BulkActionsDropdown
            selectedJobs={selectedJobs}
            onClearSelection={clearSelection}
          />
        )}
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map(job => (
            <VisualJobCard
              key={job.id}
              job={job}
              isSelected={selectedIds.has(job.id)}
              onSelect={toggleSelection}
              selectionMode={selectionMode}
              previewImages={job.preview_images || []}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Briefcase className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-1">No jobs found</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              {filters.search || filters.storeId
                ? 'Try adjusting your filters to find jobs.'
                : 'Start optimizing product images from your connected stores.'
              }
            </p>
            {(filters.search || filters.storeId) && (
              <Button
                variant="outline"
                onClick={() => updateFilters({ search: '', storeId: null })}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
