import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Coins, Settings2, CreditCard, Loader2, Check, Building2 } from 'lucide-react'
import { GoogleDriveConnect } from '@/components/google-drive'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  { tokens: 10, price: 10, label: '10 Tokens', description: '$1.00 per token' },
  { tokens: 50, price: 45, label: '50 Tokens', description: '$0.90 per token - 10% off' },
  { tokens: 100, price: 90, label: '100 Tokens', description: '$0.90 per token - 10% off' },
  { tokens: 1000, price: 900, label: '1000 Tokens', description: '$0.90 per token - 10% off' },
]

export default function Settings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization, setOrganization, user } = useAuthStore()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<typeof TOKEN_PACKAGES[0] | null>(null)
  const [orgName, setOrgName] = useState(organization?.name || '')
  const [defaultResolution, setDefaultResolution] = useState<string>(
    (organization?.settings as any)?.default_resolution || '2K'
  )

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

  // Update organization settings
  const updateOrgMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('No organization')

      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          settings: { default_resolution: defaultResolution }
        })
        .eq('id', organization.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setOrganization(data)
      toast({ title: 'Settings saved successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' })
    }
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your Image Optimizer Pro settings</p>
      </div>

      {/* Storage Connections */}
      <GoogleDriveConnect />

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>Manage your organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resolution">Default Resolution</Label>
            <Select value={defaultResolution} onValueChange={setDefaultResolution}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2K">2K (Standard - 1 token)</SelectItem>
                <SelectItem value="4K">4K (Premium - 2 tokens)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => updateOrgMutation.mutate()}
            disabled={updateOrgMutation.isPending}
          >
            {updateOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

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

          <Separator className="my-6" />

          <div>
            <h4 className="font-medium mb-3">Recent Transactions</h4>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No transactions yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Token Pricing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Token Pricing
          </CardTitle>
          <CardDescription>How tokens are used for image optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <p className="font-medium text-gray-900">2K Optimization</p>
              <p className="text-2xl font-bold text-primary mt-1">1 token</p>
              <p className="text-sm text-gray-500 mt-1">Standard resolution</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <p className="font-medium text-gray-900">4K Optimization</p>
              <p className="text-2xl font-bold text-primary mt-1">2 tokens</p>
              <p className="text-sm text-gray-500 mt-1">Premium resolution</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <p className="font-medium text-gray-900">Re-process</p>
              <p className="text-2xl font-bold text-primary mt-1">0.5 tokens</p>
              <p className="text-sm text-gray-500 mt-1">Retry with adjustments</p>
            </div>
          </div>
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
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPackage?.tokens === pkg.tokens
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedPackage(pkg)}
              >
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
