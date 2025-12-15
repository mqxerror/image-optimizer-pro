import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, Store, Shield, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCompleteShopifyOAuth } from '@/hooks/useShopify'

type OAuthStep = 'verifying' | 'connecting' | 'syncing' | 'complete' | 'error'

const OAUTH_STEPS = [
  { id: 'verifying', label: 'Verifying', description: 'Confirming authorization' },
  { id: 'connecting', label: 'Connecting', description: 'Establishing connection' },
  { id: 'syncing', label: 'Syncing', description: 'Importing store data' },
  { id: 'complete', label: 'Complete', description: 'Ready to use' },
]

export default function ShopifyCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [currentStep, setCurrentStep] = useState<OAuthStep>('verifying')
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

    // Progress through steps with visual delay
    const progressSteps = async () => {
      // Step 1: Verifying
      setCurrentStep('verifying')
      await new Promise(r => setTimeout(r, 500))

      // Step 2: Connecting
      setCurrentStep('connecting')

      try {
        const data = await completeMutation.mutateAsync({ code, shop, state })

        // Step 3: Syncing
        setCurrentStep('syncing')
        await new Promise(r => setTimeout(r, 800))

        // Step 4: Complete
        setCurrentStep('complete')
        setStatus('success')
        setStoreName(data.shop_name || data.shop_domain)

        // Redirect after viewing success
        setTimeout(() => {
          navigate('/shopify', { replace: true })
        }, 2000)
      } catch (err) {
        setCurrentStep('error')
        setStatus('error')
        setErrorMessage((err as Error).message)
      }
    }

    progressSteps()
  }, [searchParams, navigate])

  // Get current step index for progress indicator
  const currentStepIndex = OAUTH_STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="pt-8 pb-6">
          {/* Header Icon */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className={cn(
              'p-4 rounded-full mb-4 transition-all duration-300',
              status === 'error' ? 'bg-red-100' :
              status === 'success' ? 'bg-green-100' : 'bg-purple-100'
            )}>
              {status === 'error' ? (
                <XCircle className="h-10 w-10 text-red-600" />
              ) : status === 'success' ? (
                <Sparkles className="h-10 w-10 text-green-600" />
              ) : (
                <Store className="h-10 w-10 text-purple-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {status === 'error' ? 'Connection Failed' :
               status === 'success' ? 'Store Connected!' : 'Connecting Store'}
            </h2>
            <p className="text-muted-foreground">
              {status === 'error' ? (errorMessage || 'An error occurred') :
               status === 'success' ? <><strong>{storeName}</strong> is ready to optimize</> :
               'Setting up your Shopify integration'}
            </p>
          </div>

          {/* Progress Steps */}
          {status !== 'error' && (
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-10" />
                <div
                  className="absolute top-4 left-6 h-0.5 bg-purple-500 transition-all duration-500 -z-10"
                  style={{
                    width: `${Math.min(100, (currentStepIndex / (OAUTH_STEPS.length - 1)) * 100)}%`,
                    maxWidth: 'calc(100% - 48px)'
                  }}
                />

                {OAUTH_STEPS.map((step, index) => {
                  const isActive = index === currentStepIndex
                  const isComplete = index < currentStepIndex
                  const isPending = index > currentStepIndex

                  return (
                    <div key={step.id} className="flex flex-col items-center z-10">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                        isComplete ? 'bg-purple-500 border-purple-500' :
                        isActive ? 'bg-white border-purple-500 shadow-md' :
                        'bg-gray-100 border-gray-200'
                      )}>
                        {isComplete ? (
                          <CheckCircle className="h-4 w-4 text-white" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                        ) : (
                          <span className="text-xs text-gray-400">{index + 1}</span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <p className={cn(
                          'text-xs font-medium',
                          isActive ? 'text-purple-600' :
                          isComplete ? 'text-gray-700' : 'text-gray-400'
                        )}>
                          {step.label}
                        </p>
                        <p className={cn(
                          'text-[10px]',
                          isActive ? 'text-purple-500' : 'text-gray-400'
                        )}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Secure connection established</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Redirecting you to your stores in a moment...
              </p>
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/shopify')}>
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
