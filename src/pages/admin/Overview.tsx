import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Coins, Activity, ArrowRight, TrendingUp, CreditCard, UserPlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function AdminOverview() {
  const navigate = useNavigate()
  const { organization } = useAuthStore()

  // Fetch organization stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', organization?.id],
    queryFn: async () => {
      if (!organization) return null

      // Get member count
      const { count: memberCount } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)

      // Get token account
      const { data: tokenAccount } = await supabase
        .from('token_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .single()

      // Get project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)

      // Get this month's usage
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyUsage } = await supabase
        .from('processing_history')
        .select('tokens_used')
        .eq('organization_id', organization.id)
        .gte('completed_at', startOfMonth.toISOString())

      const totalMonthlyTokens = monthlyUsage?.reduce(
        (sum, item) => sum + (item.tokens_used || 0), 0
      ) || 0

      // Get last month for comparison
      const lastMonthStart = new Date()
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
      lastMonthStart.setDate(1)
      lastMonthStart.setHours(0, 0, 0, 0)

      const lastMonthEnd = new Date(startOfMonth)
      lastMonthEnd.setMilliseconds(-1)

      const { data: lastMonthUsage } = await supabase
        .from('processing_history')
        .select('tokens_used')
        .eq('organization_id', organization.id)
        .gte('completed_at', lastMonthStart.toISOString())
        .lt('completed_at', startOfMonth.toISOString())

      const lastMonthTokens = lastMonthUsage?.reduce(
        (sum, item) => sum + (item.tokens_used || 0), 0
      ) || 0

      return {
        memberCount: memberCount || 0,
        tokenBalance: tokenAccount?.balance || 0,
        lowBalanceThreshold: tokenAccount?.low_balance_threshold || 5,
        projectCount: projectCount || 0,
        monthlyTokensUsed: totalMonthlyTokens,
        lastMonthTokens: lastMonthTokens,
      }
    },
    enabled: !!organization,
  })

  const isLowBalance = stats && stats.tokenBalance <= stats.lowBalanceThreshold
  const monthlyChange = stats && stats.lastMonthTokens > 0
    ? Math.round(((stats.monthlyTokensUsed - stats.lastMonthTokens) / stats.lastMonthTokens) * 100)
    : null

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {organization?.name}
              </CardTitle>
              <CardDescription className="mt-1">
                Created {new Date(organization?.created_at || '').toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/settings/organization')}>
                Settings
              </Button>
              <Button size="sm" onClick={() => navigate('/settings/billing')}>
                <CreditCard className="h-4 w-4 mr-2" />
                Buy Tokens
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Members Card - Clickable */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate('/admin/members')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.memberCount}</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <span>Manage team</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Token Balance Card - Clickable */}
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            isLowBalance ? "border-amber-300 hover:border-amber-400" : "hover:border-primary/50"
          )}
          onClick={() => navigate('/settings/billing')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token Balance</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className={cn(
                    "text-3xl font-bold",
                    isLowBalance && "text-amber-600"
                  )}>
                    {stats?.tokenBalance}
                  </p>
                )}
              </div>
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                isLowBalance ? "bg-amber-100" : "bg-purple-100"
              )}>
                <Coins className={cn(
                  "h-6 w-6",
                  isLowBalance ? "text-amber-600" : "text-purple-600"
                )} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {isLowBalance ? (
                <span className="text-amber-600 font-medium">Low balance - Top up</span>
              ) : (
                <span className="text-muted-foreground">Buy more tokens</span>
              )}
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Projects Card - Clickable */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate('/projects')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projects</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.projectCount}</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <span>View projects</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Usage Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">{stats?.monthlyTokensUsed}</p>
                    <p className="text-xs text-muted-foreground">tokens used</p>
                  </>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            {monthlyChange !== null && !isLoading && (
              <div className="mt-4 text-sm">
                <span className={cn(
                  "font-medium",
                  monthlyChange > 0 ? "text-green-600" : monthlyChange < 0 ? "text-red-600" : "text-muted-foreground"
                )}>
                  {monthlyChange > 0 ? '+' : ''}{monthlyChange}%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate('/admin/members')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Invite Member</p>
                <p className="text-xs text-muted-foreground">Add team members</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate('/settings/billing')}
            >
              <Coins className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Buy Tokens</p>
                <p className="text-xs text-muted-foreground">Purchase more tokens</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate('/studio')}
            >
              <Activity className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Open Studio</p>
                <p className="text-xs text-muted-foreground">Process images</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate('/settings/organization')}
            >
              <Building2 className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Organization Settings</p>
                <p className="text-xs text-muted-foreground">Configure defaults</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
