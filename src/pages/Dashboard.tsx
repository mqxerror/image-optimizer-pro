import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  Coins,
  FolderKanban,
  FileText,
  Plus,
  ArrowRight,
  AlertCircle,
  Sparkles,
  HardDrive,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { ProcessQueueButton } from '@/components/processing'
import { OnboardingTour, useOnboardingTour } from '@/components/onboarding/OnboardingTour'

// Setup step component for onboarding progress
function SetupStep({ number, label, completed }: { number: number; label: string; completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
        ${completed
          ? 'bg-green-100 text-green-700'
          : 'bg-slate-100 text-slate-500'
        }
      `}>
        {completed ? <Check className="h-5 w-5" /> : number}
      </div>
      <span className={`text-xs ${completed ? 'text-green-700' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { organization } = useAuthStore()
  const { runTour, completeTour } = useOnboardingTour()

  // Fetch token balance
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

  // Fetch queue stats
  const { data: queueStats, isLoading: loadingQueue } = useQuery({
    queryKey: ['queue-stats', organization?.id],
    queryFn: async () => {
      if (!organization) return { queued: 0, processing: 0 }
      const { data } = await supabase
        .from('processing_queue')
        .select('status')
        .eq('organization_id', organization.id)

      const queued = data?.filter(item => item.status === 'queued').length || 0
      const processing = data?.filter(item => item.status && ['processing', 'optimizing'].includes(item.status)).length || 0

      return { queued, processing }
    },
    enabled: !!organization
  })

  // Fetch today's processed count
  const { data: todayStats, isLoading: loadingToday } = useQuery({
    queryKey: ['today-stats', organization?.id],
    queryFn: async () => {
      if (!organization) return { processed: 0, failed: 0 }
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('processing_history')
        .select('status')
        .eq('organization_id', organization.id)
        .gte('completed_at', today.toISOString())

      const processed = data?.filter(item => item.status === 'success').length || 0
      const failed = data?.filter(item => item.status === 'failed').length || 0

      return { processed, failed }
    },
    enabled: !!organization
  })

  // Fetch recent projects
  const { data: recentProjects, isLoading: loadingProjects } = useQuery({
    queryKey: ['recent-projects', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false })
        .limit(5)
      return data || []
    },
    enabled: !!organization
  })

  // Check if Google Drive is connected
  const { data: driveConnections } = useQuery({
    queryKey: ['google-drive-connections', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data } = await supabase
        .from('google_drive_connections')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .limit(1)
      return data || []
    },
    enabled: !!organization
  })

  const isLowBalance = tokenAccount && (tokenAccount.balance || 0) <= (tokenAccount.low_balance_threshold || 0)
  const hasGoogleDrive = (driveConnections?.length || 0) > 0
  const hasProjects = (recentProjects?.length || 0) > 0
  const hasProcessedImages = (todayStats?.processed || 0) > 0

  // Show welcome state for new users
  const isNewUser = !loadingProjects && !hasProjects

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your image optimization activity</p>
        </div>
        <Button
          onClick={() => navigate('/projects')}
          className="gap-2"
          data-tour="new-project"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Token Balance Warning */}
      {isLowBalance && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium">Low token balance</p>
            <p className="text-amber-700 text-sm">
              You have {tokenAccount?.balance || 0} tokens remaining. Purchase more to continue processing.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            Buy Tokens
          </Button>
        </div>
      )}

      {/* Welcome State for New Users */}
      {isNewUser && (
        <Card className="border-dashed border-2 border-slate-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 overflow-hidden">
          <div className="py-12 text-center relative">
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl" />
            </div>

            <div className="relative">
              {/* Icon */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-xl opacity-60 scale-150" />
                <div className="relative p-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <Sparkles className="h-10 w-10 text-blue-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-800">
                Welcome to Image Optimizer Pro!
              </h2>
              <p className="text-slate-600 mt-2 max-w-md mx-auto">
                Transform your product images with AI-powered enhancement.
                Let's get you started in 3 easy steps.
              </p>

              {/* Setup Progress */}
              <div className="flex justify-center items-center gap-8 mt-8 mb-8">
                <SetupStep
                  number={1}
                  label="Connect Drive"
                  completed={hasGoogleDrive}
                />
                <div className="w-12 h-0.5 bg-slate-200 -mt-6" />
                <SetupStep
                  number={2}
                  label="Create Project"
                  completed={hasProjects}
                />
                <div className="w-12 h-0.5 bg-slate-200 -mt-6" />
                <SetupStep
                  number={3}
                  label="Process Images"
                  completed={hasProcessedImages}
                />
              </div>

              {/* CTA Buttons */}
              <div className="flex justify-center gap-3">
                {!hasGoogleDrive ? (
                  <Button
                    size="lg"
                    onClick={() => navigate('/settings')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Connect Google Drive
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate('/projects')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/studio')}
                >
                  Try Studio
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="dashboard-stats">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Token Balance</p>
                {loadingTokens ? (
                  <Skeleton className="h-9 w-20 mt-2" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {tokenAccount?.balance || 0}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Coins className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Queue</p>
                {loadingQueue ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {queueStats?.queued || 0}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <ListTodo className="h-6 w-6" />
              </div>
            </div>
            {(queueStats?.queued || 0) > 0 && (
              <div className="mt-4">
                <ProcessQueueButton
                  queuedCount={queueStats?.queued || 0}
                  variant="default"
                  size="sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Processing</p>
                {loadingQueue ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {queueStats?.processing || 0}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Loader2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Processed Today</p>
                {loadingToday ? (
                  <Skeleton className="h-9 w-16 mt-2" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {todayStats?.processed || 0}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate('/projects')}
            >
              <FolderKanban className="h-5 w-5" />
              Create New Project
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate('/templates')}
            >
              <FileText className="h-5 w-5" />
              Browse Templates
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate('/queue')}
            >
              <ListTodo className="h-5 w-5" />
              View Processing Queue
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your latest optimization projects</CardDescription>
            </div>
            <Link to="/projects">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-3">
                {recentProjects.map(project => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/projects?id=${project.id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">
                        {project.processed_images}/{project.total_images} images
                      </p>
                    </div>
                    <Badge variant={
                      project.status === 'completed' ? 'default' :
                      project.status === 'active' ? 'secondary' :
                      'outline'
                    }>
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderKanban className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No projects yet</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => navigate('/projects')}
                >
                  Create your first project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Tour for first-time users */}
      <OnboardingTour run={runTour} onComplete={completeTour} />
    </div>
  )
}
