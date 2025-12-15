import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Coins, CreditCard, Loader2, Check } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const TOKEN_PACKAGES = [
  { tokens: 10, price: 10, label: '10 Tokens', description: '$1.00 per token', popular: false },
  { tokens: 50, price: 45, label: '50 Tokens', description: '$0.90 per token - 10% off', popular: true },
  { tokens: 100, price: 90, label: '100 Tokens', description: '$0.90 per token - 10% off', popular: false },
  { tokens: 1000, price: 900, label: '1000 Tokens', description: '$0.90 per token - 10% off', popular: false },
]

export default function BillingSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization, user } = useAuthStore()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<typeof TOKEN_PACKAGES[0] | null>(null)

  // Fetch token account
  const { data: tokenAccount, isLoading: loadingTokens } = useQuery({
    queryKey: ['token-account', organization?.id],
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
    queryKey: ['token-transactions', tokenAccount?.id],
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

  // Purchase tokens (simulated - in real app this would go through payment gateway)
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: typeof TOKEN_PACKAGES[0]) => {
      if (!organization || !user || !tokenAccount) throw new Error('Not authenticated')

      const newBalance = tokenAccount.balance + pkg.tokens

      // Update token account
      const { error: updateError } = await supabase
        .from('token_accounts')
        .update({
          balance: newBalance,
          lifetime_purchased: tokenAccount.lifetime_purchased + pkg.tokens
        })
        .eq('id', tokenAccount.id)

      if (updateError) throw updateError

      // Record transaction
      const { error: txError } = await supabase
        .from('token_transactions')
        .insert({
          account_id: tokenAccount.id,
          type: 'purchase',
          amount: pkg.tokens,
          balance_before: tokenAccount.balance,
          balance_after: newBalance,
          description: `Purchased ${pkg.tokens} tokens ($${pkg.price})`,
          created_by: user.id
        })

      if (txError) throw txError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-account'] })
      queryClient.invalidateQueries({ queryKey: ['token-transactions'] })
      setIsPurchaseOpen(false)
      setSelectedPackage(null)
      toast({ title: 'Tokens purchased successfully!' })
    },
    onError: (error) => {
      toast({ title: 'Error purchasing tokens', description: error.message, variant: 'destructive' })
    }
  })

  return (
    <div className="space-y-6">
      {/* Token Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token Balance
          </CardTitle>
          <CardDescription>Your current token balance and purchase options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-4xl font-bold text-gray-900">
                {loadingTokens ? '...' : tokenAccount?.balance || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">tokens available</p>
            </div>
            <Button onClick={() => setIsPurchaseOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase Tokens
            </Button>
          </div>

          {tokenAccount && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Lifetime Purchased</p>
                <p className="text-lg font-semibold">{tokenAccount.lifetime_purchased || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lifetime Used</p>
                <p className="text-lg font-semibold">{tokenAccount.lifetime_used || 0}</p>
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
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Tokens</DialogTitle>
            <DialogDescription>
              Select a token package to purchase
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.tokens}
                className={`p-4 border rounded-lg cursor-pointer transition-all relative ${
                  selectedPackage?.tokens === pkg.tokens
                    ? 'border-primary bg-primary/5'
                    : pkg.popular
                    ? 'border-purple-300 bg-purple-50/50 hover:border-purple-400'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedPackage(pkg)}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-4 bg-purple-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{pkg.label}</p>
                    <p className="text-sm text-gray-500">{pkg.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">${pkg.price}</span>
                    {selectedPackage?.tokens === pkg.tokens && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPackage && purchaseMutation.mutate(selectedPackage)}
              disabled={!selectedPackage || purchaseMutation.isPending}
            >
              {purchaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Purchase {selectedPackage ? `$${selectedPackage.price}` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
