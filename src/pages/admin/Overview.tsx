import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Coins, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

export default function AdminOverview() {
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

      return {
        memberCount: memberCount || 0,
        tokenBalance: tokenAccount?.balance || 0,
        projectCount: projectCount || 0,
        monthlyTokensUsed: totalMonthlyTokens,
      }
    },
    enabled: !!organization,
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Overview
          </CardTitle>
          <CardDescription>
            {organization?.name} - Created {new Date(organization?.created_at || '').toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Members</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.memberCount}</p>
                )}
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Token Balance</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.tokenBalance}</p>
                )}
              </div>
              <Coins className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Projects</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.projectCount}</p>
                )}
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">This Month</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">{stats?.monthlyTokensUsed}</p>
                    <p className="text-xs text-gray-400">tokens used</p>
                  </>
                )}
              </div>
              <Coins className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
