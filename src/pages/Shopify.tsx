import { useState } from 'react'
import {
  Store,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shopify Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Shopify stores and optimize product images
          </p>
        </div>
        <Button onClick={() => setConnectDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Store
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          icon={<Store className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100"
          value={stores?.length || 0}
          label="Connected Stores"
          loading={loadingStores}
        />
        <StatsCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100"
          value={activeJobs.length}
          label="Active Jobs"
          loading={loadingJobs}
        />
        <StatsCard
          icon={<AlertCircle className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          value={awaitingApproval.length}
          label="Awaiting Approval"
          loading={loadingJobs}
          highlight={awaitingApproval.length > 0}
        />
        <StatsCard
          icon={<ImageIcon className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-100"
          value={totalOptimized}
          label="Images Optimized"
          loading={loadingJobs}
          formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
        />
      </div>

      {/* Connected Stores */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Connected Stores</h2>
        {loadingStores ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : stores && stores.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stores.map(store => (
              <VisualStoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Store className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-1">No stores connected</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                Connect your Shopify store to start optimizing product images automatically.
              </p>
              <Button onClick={() => setConnectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
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

// Helper component for stats cards
interface StatsCardProps {
  icon: React.ReactNode
  iconBg: string
  value: number
  label: string
  loading?: boolean
  highlight?: boolean
  formatValue?: (value: number) => string
}

function StatsCard({
  icon,
  iconBg,
  value,
  label,
  loading,
  highlight,
  formatValue
}: StatsCardProps) {
  return (
    <Card className={highlight ? 'border-purple-300 bg-purple-50/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            {icon}
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold">
                {formatValue ? formatValue(value) : value}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
