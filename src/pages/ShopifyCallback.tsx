import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompleteShopifyOAuth } from '@/hooks/useShopify'

export default function ShopifyCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const hasProcessed = useRef(false)

  const completeMutation = useCompleteShopifyOAuth()

  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) return

    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle Shopify OAuth errors
    if (error) {
      setStatus('error')
      setErrorMessage(errorDescription || error || 'Authorization was denied')
      return
    }

    // Validate required params
    if (!code || !shop || !state) {
      setStatus('error')
      setErrorMessage('Missing required OAuth parameters')
      return
    }

    // Mark as processed to prevent re-execution
    hasProcessed.current = true

    // Complete the OAuth flow
    completeMutation.mutate(
      { code, shop, state },
      {
        onSuccess: (data) => {
          setStatus('success')
          setStoreName(data.shop_name || data.shop_domain)
          // Redirect after 2 seconds
          setTimeout(() => {
            navigate('/shopify', { replace: true })
          }, 2000)
        },
        onError: (err) => {
          setStatus('error')
          setErrorMessage((err as Error).message)
        }
      }
    )
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            {status === 'loading' && (
              <>
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Connecting Your Store</h2>
                <p className="text-muted-foreground">
                  Please wait while we complete the connection...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="p-4 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Store Connected!</h2>
                <p className="text-muted-foreground mb-4">
                  <strong>{storeName}</strong> has been successfully connected.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your stores...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="p-4 bg-red-100 rounded-full mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
                <p className="text-muted-foreground mb-4">
                  {errorMessage || 'An error occurred while connecting your store.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/shopify')}>
                    Go Back
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
