import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ImageIcon,
  Loader2,
  Building2,
  Store,
  Coins,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

const onboardingSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

const steps = [
  { id: 'organization', title: 'Create Organization', icon: Building2 },
  { id: 'shopify', title: 'Connect Shopify', icon: Store },
  { id: 'tokens', title: 'How Tokens Work', icon: Coins },
  { id: 'ready', title: 'You\'re Ready!', icon: Sparkles },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, setOrganization, fetchUserOrganizations } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgCreated, setOrgCreated] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
  })

  const progress = ((currentStep + 1) / steps.length) * 100

  const onSubmitOrg = async (data: OnboardingForm) => {
    if (!user) return

    setError(null)
    setIsLoading(true)

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.organizationName,
          owner_id: user.id,
          settings: {
            default_resolution: '2K'
          }
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Create user_organization link
      const { error: linkError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'owner'
        })

      if (linkError) throw linkError

      // Create token account with 10 free tokens
      const { error: tokenError } = await supabase
        .from('token_accounts')
        .insert({
          organization_id: org.id,
          balance: 10,
          lifetime_purchased: 0,
          lifetime_used: 0,
          low_balance_threshold: 5
        })

      if (tokenError) throw tokenError

      // Record the welcome bonus transaction
      const { data: tokenAccount } = await supabase
        .from('token_accounts')
        .select('id')
        .eq('organization_id', org.id)
        .single()

      if (tokenAccount) {
        await supabase
          .from('token_transactions')
          .insert({
            account_id: tokenAccount.id,
            type: 'bonus',
            amount: 10,
            balance_before: 0,
            balance_after: 10,
            description: 'Welcome bonus - 10 free tokens',
            created_by: user.id
          })
      }

      // Update store
      setOrganization(org)
      await fetchUserOrganizations()
      setOrgCreated(true)

      // Move to next step
      setCurrentStep(1)
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  const goToNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const finishOnboarding = () => {
    navigate('/')
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <form onSubmit={handleSubmit(onSubmitOrg)}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Welcome gift!</span> You'll receive 10 free tokens to try out our service.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationName">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Organization Name
                </Label>
                <Input
                  id="organizationName"
                  placeholder="e.g., My Jewelry Store"
                  {...register('organizationName')}
                  disabled={orgCreated}
                />
                {errors.organizationName && (
                  <p className="text-sm text-red-600">{errors.organizationName.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  This is the name of your business or project
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading || orgCreated}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {orgCreated ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Organization Created
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </CardFooter>
          </form>
        )

      case 1:
        return (
          <>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Store className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Connect Your Shopify Store</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Connect your Shopify store to automatically optimize product images
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Bulk Image Optimization</p>
                    <p className="text-xs text-muted-foreground">Process all your product images at once</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Auto-Sync</p>
                    <p className="text-xs text-muted-foreground">Optimized images are uploaded back to Shopify</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Background Removal</p>
                    <p className="text-xs text-muted-foreground">AI-powered background removal for clean product shots</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goToNext}>
                Skip for now
              </Button>
              <Button className="flex-1" onClick={() => navigate('/shopify')}>
                Connect Shopify
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )

      case 2:
        return (
          <>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <Coins className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">How Tokens Work</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Tokens are used to process your images
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-2xl font-bold text-purple-600">1</p>
                  <p className="text-sm font-medium">Token</p>
                  <p className="text-xs text-muted-foreground">= 1 Image processed</p>
                </div>
                <div className="p-4 rounded-lg border text-center bg-green-50 border-green-200">
                  <p className="text-2xl font-bold text-green-600">10</p>
                  <p className="text-sm font-medium">Free Tokens</p>
                  <p className="text-xs text-muted-foreground">Your welcome gift</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Token Costs:</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span>Standard Optimization</span>
                    <span className="font-medium">1 token</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span>Background Removal</span>
                    <span className="font-medium">2 tokens</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span>AI Enhancement</span>
                    <span className="font-medium">3 tokens</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" onClick={goToPrev}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={goToNext}>
                Got it!
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )

      case 3:
        return (
          <>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">You're All Set!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your organization is ready. Start optimizing your images!
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Open the Studio</p>
                    <p className="text-xs text-muted-foreground">Upload or drag images to get started</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Choose Your Settings</p>
                    <p className="text-xs text-muted-foreground">Select resolution and enhancement options</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Process & Download</p>
                    <p className="text-xs text-muted-foreground">Get your optimized images instantly</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={finishOnboarding}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-full transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                    !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={progress} className="h-1" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Image Optimizer Pro</span>
              </div>
            </div>
          </CardHeader>
          {renderStepContent()}
        </Card>

        {/* Skip all option */}
        {currentStep > 0 && currentStep < steps.length - 1 && orgCreated && (
          <div className="text-center mt-4">
            <Button variant="link" size="sm" onClick={finishOnboarding}>
              Skip and go to dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
