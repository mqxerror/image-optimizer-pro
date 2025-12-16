import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Settings,
  ExternalLink,
  MoreVertical,
  Unplug,
  ShoppingBag,
  Briefcase,
  ImageIcon,
  Loader2,
  CheckCircle,
  Settings2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDisconnectStore } from '@/hooks/useShopify'
import { useStoreStats } from '@/hooks/useStoreStats'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AdvancedSchedulingModal } from '@/components/shopify/scheduling-modal'
import type { ShopifyStore } from '@/types/shopify'

interface VisualStoreCardProps {
  store: ShopifyStore
}

export function VisualStoreCard({ store }: VisualStoreCardProps) {
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [automationModalOpen, setAutomationModalOpen] = useState(false)
  const disconnectMutation = useDisconnectStore()
  const { toast } = useToast()

  // Fetch store stats
  const { data: stats, isLoading: statsLoading } = useStoreStats(store.id)

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync(store.id)
      toast({
        title: 'Store disconnected',
        description: `${store.shop_name || store.shop_domain} has been disconnected.`
      })
      setDisconnectDialogOpen(false)
    } catch (err) {
      toast({
        title: 'Failed to disconnect',
        description: (err as Error).message,
        variant: 'destructive'
      })
    }
  }

  const shopifyAdminUrl = `https://${store.shop_domain}/admin`
  const displayName = store.shop_name || store.shop_domain.split('.')[0]

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        {/* Image Preview Strip */}
        <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
          {statsLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : stats?.recentImages && stats.recentImages.length > 0 ? (
            <div className="grid grid-cols-4 h-full">
              {stats.recentImages.map((src, idx) => (
                <div key={idx} className="relative overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Hide broken images
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ))}
              {/* Fill empty slots */}
              {Array.from({ length: 4 - stats.recentImages.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className="bg-slate-100 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Store className="h-10 w-10 text-slate-300 mb-2" />
              <span className="text-xs text-slate-400">No products yet</span>
            </div>
          )}

          {/* Overlay badge for active jobs */}
          {stats && stats.activeJobCount > 0 && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-blue-500 text-white shadow-lg">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {stats.activeJobCount} active
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Store className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{displayName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5 py-0">
                    <CheckCircle className="h-3 w-3 mr-0.5" />
                    Connected
                  </Badge>
                  <span className="text-xs text-muted-foreground">{store.shop_domain}</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/shopify/${store.id}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAutomationModalOpen(true)}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Automation
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={shopifyAdminUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Shopify
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDisconnectDialogOpen(true)}
                >
                  <Unplug className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatsBox
              label="Products"
              value={statsLoading ? null : stats?.productCount || 0}
              icon={<ShoppingBag className="h-4 w-4" />}
            />
            <StatsBox
              label="Active Jobs"
              value={statsLoading ? null : stats?.activeJobCount || 0}
              icon={<Briefcase className="h-4 w-4" />}
              highlight={stats && stats.activeJobCount > 0}
            />
            <StatsBox
              label="Optimized"
              value={statsLoading ? null : stats?.totalOptimized || 0}
              icon={<ImageIcon className="h-4 w-4" />}
              formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to={`/shopify/${store.id}/products`}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Products
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/shopify/jobs?store=${store.id}`}>
                <Briefcase className="h-4 w-4 mr-2" />
                Jobs
              </Link>
            </Button>
          </div>

          {/* Last sync */}
          {store.last_sync_at && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Last synced: {new Date(store.last_sync_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect <strong>{displayName}</strong>?
              This will remove access to this store's products. Any pending optimization jobs will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700"
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advanced Automation Modal */}
      <AdvancedSchedulingModal
        open={automationModalOpen}
        onOpenChange={setAutomationModalOpen}
        storeId={store.id}
        storeName={displayName}
      />
    </>
  )
}

// Helper component for stats boxes
interface StatsBoxProps {
  label: string
  value: number | null
  icon: React.ReactNode
  highlight?: boolean
  formatValue?: (value: number) => string
}

function StatsBox({ label, value, icon, highlight, formatValue }: StatsBoxProps) {
  return (
    <div className={cn(
      'p-3 rounded-lg text-center',
      highlight ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
    )}>
      {value === null ? (
        <Skeleton className="h-6 w-12 mx-auto mb-1" />
      ) : (
        <p className={cn(
          'text-xl font-bold',
          highlight ? 'text-blue-600' : 'text-slate-900'
        )}>
          {formatValue ? formatValue(value) : value}
        </p>
      )}
      <div className={cn(
        'flex items-center justify-center gap-1 text-xs',
        highlight ? 'text-blue-600' : 'text-muted-foreground'
      )}>
        {icon}
        {label}
      </div>
    </div>
  )
}
