import { useState } from 'react'
import {
  Store,
  Plus,
  Clock,
  AlertCircle,
  ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useShopifyStores, useShopifyJobs } from '@/hooks/useShopify'
import { ShopifyConnectDialog } from '@/components/shopify/ShopifyConnectDialog'
import { VisualStoreCard } from '@/components/shopify/VisualStoreCard'
import { RecentActivityFeed } from '@/components/shopify/RecentActivityFeed'

export default function Shopify() {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)

  const { data: stores, isLoading: loadingStores } = useShopifyStores()
  const { data: jobs, isLoading: loadingJobs } = useShopifyJobs({ limit: 10 })

  // Calculate overview stats
  const activeJobs = jobs?.filter(j =>
    ['pending', 'processing', 'awaiting_approval', 'pushing'].includes(j.status)
  ) || []
  const awaitingApproval = jobs?.filter(j => j.status === 'awaiting_approval') || []
  const completedToday = jobs?.filter(j => {
    if (j.status !== 'completed' || !j.completed_at) return false
    const today = new Date()
    const completed = new Date(j.completed_at)
    return completed.toDateString() === today.toDateString()
  }) || []
  const totalOptimized = jobs
    ?.filter(j => j.status === 'completed')
    .reduce((acc, j) => acc + (j.pushed_count || 0), 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 shadow-sm">
            <Store className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopify Integration</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Connect your stores and optimize product images
            </p>
          </div>
        </div>
        <Button
          onClick={() => setConnectDialogOpen(true)}
          className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50 hover:ring-purple-500/60 transition-all hover:shadow-purple-500/40"
        >
          <Plus className="h-4 w-4" />
          Connect Store
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-gray-200 hover:shadow-md transition-all hover:border-gray-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <Store className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              {loadingStores ? (
                <Skeleton className="h-7 w-8" />
              ) : (
                <p className="text-xl font-bold text-gray-900">{stores?.length || 0}</p>
              )}
              <p className="text-xs font-medium text-gray-500">Connected</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 hover:shadow-md transition-all ${activeJobs.length > 0 ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 ring-1 ring-amber-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${activeJobs.length > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <Clock className={`h-4 w-4 ${activeJobs.length > 0 ? 'text-amber-600' : 'text-gray-600'}`} />
            </div>
            <div>
              {loadingJobs ? (
                <Skeleton className="h-7 w-8" />
              ) : (
                <p className={`text-xl font-bold ${activeJobs.length > 0 ? 'text-amber-700' : 'text-gray-700'}`}>{activeJobs.length}</p>
              )}
              <p className={`text-xs font-medium ${activeJobs.length > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Active Jobs</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 hover:shadow-md transition-all ${awaitingApproval.length > 0 ? 'bg-gradient-to-br from-purple-50 to-white border-purple-200 ring-1 ring-purple-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${awaitingApproval.length > 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>
              <AlertCircle className={`h-4 w-4 ${awaitingApproval.length > 0 ? 'text-purple-600' : 'text-gray-600'}`} />
            </div>
            <div>
              {loadingJobs ? (
                <Skeleton className="h-7 w-8" />
              ) : (
                <p className={`text-xl font-bold ${awaitingApproval.length > 0 ? 'text-purple-700' : 'text-gray-700'}`}>{awaitingApproval.length}</p>
              )}
              <p className={`text-xs font-medium ${awaitingApproval.length > 0 ? 'text-purple-600' : 'text-gray-500'}`}>Awaiting</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200 ring-1 ring-green-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100">
              <ImageIcon className="h-4 w-4 text-green-600" />
            </div>
            <div>
              {loadingJobs ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-xl font-bold text-green-700">
                  {totalOptimized >= 1000 ? `${(totalOptimized / 1000).toFixed(1)}k` : totalOptimized}
                </p>
              )}
              <p className="text-xs font-medium text-green-600">Optimized</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Connected Stores */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-blue-100">
            <Store className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Connected Stores</h2>
        </div>
        {loadingStores ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : stores && stores.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stores.map(store => (
              <VisualStoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 hover:border-green-300 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center mb-4 shadow-sm">
                <Store className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No stores connected</h3>
              <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
                Connect your Shopify store to start optimizing product images automatically.
              </p>
              <Button
                onClick={() => setConnectDialogOpen(true)}
                className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50 hover:ring-purple-500/60 transition-all hover:shadow-purple-500/40"
              >
                <Plus className="h-4 w-4" />
                Connect Your First Store
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent Activity */}
      <RecentActivityFeed
        jobs={jobs || []}
        isLoading={loadingJobs}
        maxItems={5}
      />

      {/* Connect Dialog */}
      <ShopifyConnectDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
      />
    </div>
  )
}

