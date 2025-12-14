import { useState } from 'react'
import { Loader2, Store, ExternalLink, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useConnectShopifyStore } from '@/hooks/useShopify'

interface ShopifyConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShopifyConnectDialog({ open, onOpenChange }: ShopifyConnectDialogProps) {
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState<string | null>(null)

  const connectMutation = useConnectShopifyStore()

  const handleConnect = async () => {
    setError(null)

    // Validate domain
    let domain = shopDomain.trim().toLowerCase()

    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '')

    // Remove trailing slash
    domain = domain.replace(/\/$/, '')

    // Add .myshopify.com if not present
    if (!domain.includes('.myshopify.com')) {
      if (domain.includes('.')) {
        // They entered a custom domain, we need the myshopify one
        setError('Please enter your myshopify.com domain (e.g., your-store.myshopify.com)')
        return
      }
      domain = `${domain}.myshopify.com`
    }

    if (!domain || domain.length < 10) {
      setError('Please enter a valid Shopify store domain')
      return
    }

    try {
      // Get callback URL for this environment
      const callbackUrl = `${window.location.origin}/shopify/callback`

      const result = await connectMutation.mutateAsync({
        shopDomain: domain,
        redirectUri: callbackUrl
      })

      // Redirect to Shopify OAuth
      window.location.href = result.url
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Connect Shopify Store
          </DialogTitle>
          <DialogDescription>
            Enter your Shopify store domain to connect it to Image Optimizer Pro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="shopDomain">Store Domain</Label>
            <div className="flex">
              <Input
                id="shopDomain"
                placeholder="your-store"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="rounded-r-none"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                .myshopify.com
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your store name without the .myshopify.com part
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]">1</span>
                You'll be redirected to Shopify to authorize the connection
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]">2</span>
                We'll request access to read and update product images
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]">3</span>
                Once connected, you can browse and optimize your products
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending || !shopDomain.trim()}
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Store
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
