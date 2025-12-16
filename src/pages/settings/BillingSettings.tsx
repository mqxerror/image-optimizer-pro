import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Coins, CreditCard, Loader2, Check, ExternalLink, Sparkles, Zap, Building2, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'

interface TokenPackage {
  id: string
  display_name: string
  tokens: number
  price_cents: number
  description: string
  is_popular: boolean
  stripe_price_id?: string
}

interface SubscriptionPlan {
  id: string
  display_name: string
  tokens_monthly: number
  max_team_members: number
  max_stores: number
  price_monthly_cents: number
  price_yearly_cents: number
  features: string[]
}

export default function BillingSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization, user, session } = useAuthStore()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [purchaseTab, setPurchaseTab] = useState<'tokens' | 'subscription'>('tokens')

  // Fetch token account
  const { data: tokenAccount, isLoading: loadingTokens } = useQuery({
    queryKey: queryKeys.tokens.account(organization?.id || ''),
    queryFn: async () => {
      if (!organization) return null
      const { data } = await supabase
        .from('token_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .single()
      return data
    },
    enabled: !!organization
  })

  // Fetch token transactions
  const { data: transactions } = useQuery({
    queryKey: queryKeys.tokens.transactions(organization?.id || ''),
    queryFn: async () => {
      if (!tokenAccount) return []
      const { data } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('account_id', tokenAccount.id)
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!tokenAccount
  })

  // Fetch current subscription
  // Note: Using type assertion until database types are regenerated after migration
  const { data: subscription } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      if (!organization) return null
      const { data } = await (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .single()
      return data as { plan_id: string; tokens_per_period: number } | null
    },
    enabled: !!organization
  })

  // Fetch token packages from database
  // Note: Using type assertion until database types are regenerated after migration
  const { data: packages = [] } = useQuery<TokenPackage[]>({
    queryKey: ['token-packages'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('token_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      return (data || []) as TokenPackage[]
    }
  })

  // Fetch subscription plans from database
  // Note: Using type assertion until database types are regenerated after migration
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      return (data || []) as SubscriptionPlan[]
    }
  })

  // Create Stripe checkout session
  const checkoutMutation = useMutation({
    mutationFn: async ({ type, packageId, planId }: { type: 'tokens' | 'subscription', packageId?: string, planId?: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: type === 'tokens' ? 'create_checkout' : 'create_subscription',
            package_id: packageId,
            plan_id: planId,
            billing_cycle: billingCycle,
            success_url: `${window.location.origin}/settings/billing?success=true`,
            cancel_url: `${window.location.origin}/settings/billing?canceled=true`
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    },
    onError: (error) => {
      toast({
        title: 'Checkout failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Open Stripe customer portal
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'create_portal',
            success_url: `${window.location.origin}/settings/billing`
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to open portal')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.portal_url) {
        window.open(data.portal_url, '_blank')
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to open billing portal',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handlePurchase = () => {
    if (purchaseTab === 'tokens' && selectedPackage) {
      checkoutMutation.mutate({ type: 'tokens', packageId: selectedPackage.id })
    } else if (purchaseTab === 'subscription' && selectedPlan) {
      checkoutMutation.mutate({ type: 'subscription', planId: selectedPlan.id })
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic': return <Zap className="h-5 w-5" />
      case 'pro': return <Sparkles className="h-5 w-5" />
      case 'business': return <Building2 className="h-5 w-5" />
      case 'enterprise': return <Crown className="h-5 w-5" />
      default: return <Zap className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Token Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            Token Balance
          </CardTitle>
          <CardDescription>Your current token balance and purchase options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-4xl font-bold text-gray-900">
                {loadingTokens ? '...' : tokenAccount?.balance?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">tokens available</p>
            </div>
            <Button
              onClick={() => setIsPurchaseOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase Tokens
            </Button>
          </div>

          {tokenAccount && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Lifetime Purchased</p>
                <p className="text-lg font-semibold">{(tokenAccount.lifetime_purchased || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lifetime Used</p>
                <p className="text-lg font-semibold">{(tokenAccount.lifetime_used || 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Current Subscription */}
          {subscription && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-purple-900">
                    {subscription.plan_id?.charAt(0).toUpperCase() + subscription.plan_id?.slice(1)} Plan
                  </p>
                  <p className="text-sm text-purple-700">
                    {subscription.tokens_per_period?.toLocaleString()} tokens/month
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent token transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()} at{' '}
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-4 text-center">No transactions yet</p>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Tokens</DialogTitle>
            <DialogDescription>
              Choose a token package or subscription plan
            </DialogDescription>
          </DialogHeader>

          <Tabs value={purchaseTab} onValueChange={(v) => setPurchaseTab(v as 'tokens' | 'subscription')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tokens">One-time Purchase</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
            </TabsList>

            <TabsContent value="tokens" className="mt-4">
              <div className="grid gap-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all relative ${
                      selectedPackage?.id === pkg.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20'
                        : pkg.is_popular
                        ? 'border-purple-300 bg-purple-50/50 hover:border-purple-400'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedPackage(pkg)
                      setSelectedPlan(null)
                    }}
                  >
                    {pkg.is_popular && (
                      <Badge className="absolute -top-2.5 left-4 bg-purple-600">
                        Most Popular
                      </Badge>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pkg.display_name}</p>
                        <p className="text-sm text-gray-500">
                          {pkg.tokens.toLocaleString()} tokens • {pkg.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{formatPrice(pkg.price_cents)}</span>
                        {selectedPackage?.id === pkg.id && (
                          <Check className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="mt-4">
              {/* Billing cycle toggle */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      billingCycle === 'yearly'
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setBillingCycle('yearly')}
                  >
                    Yearly <span className="text-green-600 text-xs ml-1">Save 20%</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {plans.map((plan) => {
                  const price = billingCycle === 'yearly'
                    ? plan.price_yearly_cents / 12
                    : plan.price_monthly_cents

                  return (
                    <div
                      key={plan.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedPlan(plan)
                        setSelectedPackage(null)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedPlan?.id === plan.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getPlanIcon(plan.id)}
                          </div>
                          <div>
                            <p className="font-medium">{plan.display_name}</p>
                            <p className="text-sm text-gray-500">
                              {plan.tokens_monthly.toLocaleString()} tokens/month •
                              {plan.max_team_members === -1 ? ' Unlimited' : ` ${plan.max_team_members}`} team •
                              {plan.max_stores === -1 ? ' Unlimited' : ` ${plan.max_stores}`} stores
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <span className="text-xl font-bold">{formatPrice(price)}</span>
                            <span className="text-gray-500 text-sm">/mo</span>
                            {billingCycle === 'yearly' && (
                              <p className="text-xs text-green-600">
                                {formatPrice(plan.price_yearly_cents)} billed yearly
                              </p>
                            )}
                          </div>
                          {selectedPlan?.id === plan.id && (
                            <Check className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={
                (!selectedPackage && !selectedPlan) ||
                checkoutMutation.isPending
              }
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
            >
              {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {purchaseTab === 'tokens' && selectedPackage
                ? `Purchase ${formatPrice(selectedPackage.price_cents)}`
                : purchaseTab === 'subscription' && selectedPlan
                ? `Subscribe ${formatPrice(billingCycle === 'yearly' ? selectedPlan.price_yearly_cents : selectedPlan.price_monthly_cents)}`
                : 'Select a plan'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
