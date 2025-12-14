import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Settings,
  ExternalLink,
  MoreVertical,
  Unplug,
  ShoppingBag,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useToast } from '@/hooks/use-toast'
import type { ShopifyStore } from '@/types/shopify'

interface ShopifyStoreCardProps {
  store: ShopifyStore
}

const optimizationModeLabels: Record<string, string> = {
  manual: 'Manual Only',
  preview: 'Preview First',
  auto: 'Auto-Optimize',
  scheduled: 'Scheduled'
}

export function ShopifyStoreCard({ store }: ShopifyStoreCardProps) {
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const disconnectMutation = useDisconnectStore()
  const { toast } = useToast()

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

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Store className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">{store.shop_name || store.shop_domain.split('.')[0]}</h3>
                <p className="text-xs text-muted-foreground">{store.shop_domain}</p>
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

          {/* Status badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
            <Badge variant="outline" className="text-xs">
              {optimizationModeLabels[store.settings.optimization_mode] || 'Manual'}
            </Badge>
          </div>

          {/* Last sync info */}
          {store.last_sync_at && (
            <p className="text-xs text-muted-foreground mb-4">
              Last synced: {new Date(store.last_sync_at).toLocaleDateString()}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button asChild className="flex-1" variant="default">
              <Link to={`/shopify/${store.id}/products`}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Products
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect <strong>{store.shop_name || store.shop_domain}</strong>?
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
    </>
  )
}
