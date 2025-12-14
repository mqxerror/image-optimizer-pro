import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Image,
  Layers,
  Sparkles,
  RefreshCw,
  BarChart3,
  Timer,
  Coins,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AiJobStats {
  total_jobs: number
  successful_jobs: number
  failed_jobs: number
  pending_jobs: number
  success_rate: number
  avg_processing_time_ms: number
  total_tokens_used: number
  jobs_by_model: Record<string, number>
  jobs_by_source: Record<string, number>
  jobs_by_day: Record<string, number>
}

interface ActiveJob {
  job_id: string
  job_type: string
  source: string
  source_id: string
  ai_model: string
  status: string
  input_url: string
  created_at: string
  submitted_at: string
  elapsed_seconds: number
  attempt_count: number
}

interface AiJob {
  id: string
  organization_id: string
  job_type: string
  source: string
  source_id: string | null
  provider: string
  ai_model: string
  task_id: string | null
  callback_received: boolean
  input_url: string
  input_url_2: string | null
  prompt: string | null
  status: string
  result_url: string | null
  error_message: string | null
  created_at: string
  submitted_at: string | null
  completed_at: string | null
  processing_time_ms: number | null
  tokens_used: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-600',
  submitted: 'bg-blue-500/20 text-blue-600',
  processing: 'bg-purple-500/20 text-purple-600',
  success: 'bg-green-500/20 text-green-600',
  failed: 'bg-red-500/20 text-red-600',
  timeout: 'bg-orange-500/20 text-orange-600',
  cancelled: 'bg-gray-500/20 text-gray-600',
}

const SOURCE_ICONS: Record<string, any> = {
  studio: Sparkles,
  queue: Layers,
  combination: Image,
  api: Zap,
}

export default function AiJobsDashboard() {
  const { organization } = useAuthStore()
  const [timeRange, setTimeRange] = useState('7')
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch job statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ai-job-stats', organization?.id, timeRange],
    queryFn: async () => {
      if (!organization) return null
      const { data, error } = await supabase.rpc('get_ai_job_stats', {
        p_org_id: organization.id,
        p_days: parseInt(timeRange),
      })
      if (error) throw error
      return data?.[0] as AiJobStats | null
    },
    enabled: !!organization,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch active jobs
  const { data: activeJobs, isLoading: activeLoading, refetch: refetchActive } = useQuery({
    queryKey: ['active-jobs', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await supabase.rpc('get_active_jobs', {
        p_org_id: organization.id,
      })
      if (error) throw error
      return (data || []) as ActiveJob[]
    },
    enabled: !!organization,
    refetchInterval: 5000, // Refresh every 5 seconds for active jobs
  })

  // Fetch recent jobs
  const { data: recentJobs, isLoading: recentLoading, refetch: refetchRecent } = useQuery({
    queryKey: ['recent-jobs', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data || []) as AiJob[]
    },
    enabled: !!organization,
    refetchInterval: 10000,
  })

  // Real-time subscription for job updates
  useEffect(() => {
    if (!organization) return

    const channel = supabase
      .channel('ai-jobs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_jobs',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          refetchStats()
          refetchActive()
          refetchRecent()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization, refetchStats, refetchActive, refetchRecent])

  const handleRefresh = () => {
    refetchStats()
    refetchActive()
    refetchRecent()
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Jobs Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor all AI processing jobs across Studio, Queue, and Combination features
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Jobs Banner */}
      {activeJobs && activeJobs.length > 0 && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
              {activeJobs.length} Active Job{activeJobs.length !== 1 ? 's' : ''} in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeJobs.slice(0, 5).map((job) => {
                const SourceIcon = SOURCE_ICONS[job.source] || Zap
                return (
                  <Badge key={job.job_id} variant="outline" className="gap-2 py-1">
                    <SourceIcon className="h-3 w-3" />
                    <span>{job.ai_model}</span>
                    <span className="text-muted-foreground">•</span>
                    <Timer className="h-3 w-3" />
                    <span>{job.elapsed_seconds}s</span>
                  </Badge>
                )
              })}
              {activeJobs.length > 5 && (
                <Badge variant="secondary">+{activeJobs.length - 5} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_jobs?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : `${stats?.success_rate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.successful_jobs || 0} successful / {stats?.failed_jobs || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : `${Math.round((stats?.avg_processing_time_ms || 0) / 1000)}s`}
            </div>
            <p className="text-xs text-muted-foreground">Average completion time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_tokens_used?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total consumption</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">All Jobs</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Jobs by Source */}
            <Card>
              <CardHeader>
                <CardTitle>Jobs by Source</CardTitle>
                <CardDescription>Where your AI jobs originate from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.jobs_by_source && Object.entries(stats.jobs_by_source).map(([source, count]) => {
                    const SourceIcon = SOURCE_ICONS[source] || Zap
                    const total = stats.total_jobs || 1
                    const percent = Math.round((count / total) * 100)
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <SourceIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{source}</span>
                            <span className="text-muted-foreground">{count} ({percent}%)</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(!stats?.jobs_by_source || Object.keys(stats.jobs_by_source).length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Jobs by Model */}
            <Card>
              <CardHeader>
                <CardTitle>Jobs by Model</CardTitle>
                <CardDescription>AI model usage distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.jobs_by_model && Object.entries(stats.jobs_by_model).map(([model, count]) => {
                    const total = stats.total_jobs || 1
                    const percent = Math.round((count / total) * 100)
                    return (
                      <div key={model} className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{model}</span>
                            <span className="text-muted-foreground">{count} ({percent}%)</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(!stats?.jobs_by_model || Object.keys(stats.jobs_by_model).length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>All AI jobs ordered by creation time</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : recentJobs && recentJobs.length > 0 ? (
                <div className="space-y-2">
                  {recentJobs.map((job) => {
                    const SourceIcon = SOURCE_ICONS[job.source] || Zap
                    return (
                      <div
                        key={job.id}
                        className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {job.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {job.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                          {job.status === 'timeout' && <AlertCircle className="h-5 w-5 text-orange-500" />}
                          {['pending', 'submitted', 'processing'].includes(job.status) && (
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          )}
                        </div>

                        {/* Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={STATUS_COLORS[job.status]}>
                              {job.status}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <SourceIcon className="h-3 w-3" />
                              {job.source}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{job.ai_model}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                            {job.processing_time_ms && (
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {Math.round(job.processing_time_ms / 1000)}s
                              </span>
                            )}
                            {job.tokens_used > 0 && (
                              <span className="flex items-center gap-1">
                                <Coins className="h-3 w-3" />
                                {job.tokens_used}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Result Preview */}
                        {job.result_url && (
                          <a
                            href={job.result_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                          >
                            <img
                              src={job.result_url}
                              alt="Result"
                              className="h-12 w-12 rounded object-cover border"
                            />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No jobs yet</p>
                  <p className="text-sm">Start processing images in Studio or Queue to see jobs here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance</CardTitle>
              <CardDescription>Compare performance across different AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Model analytics coming soon</p>
                <p className="text-sm">Track success rates and processing times per model</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card: Queue vs AI Jobs */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Queue vs AI Jobs - What's the difference?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Queue</strong> handles the <em>file logistics</em> pipeline:
            downloading from Google Drive → uploading to storage → submitting to AI.
          </p>
          <p>
            <strong className="text-foreground">AI Jobs</strong> tracks the <em>AI processing status</em>:
            all jobs from Studio, Queue, and Combination in one unified view.
          </p>
          <p>
            They work together: Queue manages files, AI Jobs monitors AI operations. This dashboard shows
            everything happening under the hood across all features.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
