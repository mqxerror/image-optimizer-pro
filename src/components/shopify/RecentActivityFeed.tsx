import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  ArrowRight,
  Briefcase
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ShopifySyncJob } from '@/types/shopify'

interface RecentActivityFeedProps {
  jobs: ShopifySyncJob[]
  isLoading?: boolean
  maxItems?: number
}

const statusConfig: Record<string, {
  color: string
  bgColor: string
  icon: typeof Clock
  animate?: boolean
}> = {
  pending: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
  processing: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Loader2, animate: true },
  awaiting_approval: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: AlertCircle },
  approved: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: CheckCircle },
  pushing: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Upload, animate: true },
  completed: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  failed: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  cancelled: { color: 'text-gray-500', bgColor: 'bg-gray-100', icon: XCircle }
}

const statusLabels: Record<string, string> = {
  pending: 'Queued',
  processing: 'Processing',
  awaiting_approval: 'Needs Review',
  approved: 'Approved',
  pushing: 'Pushing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

export function RecentActivityFeed({ jobs, isLoading, maxItems = 5 }: RecentActivityFeedProps) {
  const recentJobs = jobs.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/shopify/jobs" className="flex items-center gap-1">
            View All Jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : recentJobs.length > 0 ? (
          <div className="space-y-2">
            {recentJobs.map(job => (
              <ActivityRow key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Briefcase className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Jobs will appear here when you start optimizing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRow({ job }: { job: ShopifySyncJob }) {
  const status = statusConfig[job.status] || statusConfig.pending
  const StatusIcon = status.icon
  const isActive = ['pending', 'processing', 'pushing'].includes(job.status)

  const progress = job.image_count > 0
    ? Math.round((job.processed_count / job.image_count) * 100)
    : 0

  // Determine the appropriate action button
  const getAction = () => {
    if (job.status === 'awaiting_approval') {
      return (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/shopify/jobs/${job.id}`}>Review</Link>
        </Button>
      )
    }
    if (isActive || job.status === 'completed') {
      return (
        <Button size="sm" variant="ghost" asChild>
          <Link to={`/shopify/jobs/${job.id}`}>View</Link>
        </Button>
      )
    }
    return null
  }

  return (
    <div className={cn(
      'flex items-center gap-4 p-3 rounded-lg border transition-colors',
      isActive && 'bg-blue-50/50 border-blue-200',
      !isActive && 'hover:bg-gray-50'
    )}>
      {/* Status Icon */}
      <div className={cn('p-2 rounded-lg', status.bgColor)}>
        <StatusIcon className={cn(
          'h-4 w-4',
          status.color,
          status.animate && 'animate-spin'
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className={cn(
            'text-xs px-1.5 py-0',
            status.bgColor,
            status.color
          )}>
            {statusLabels[job.status]}
          </Badge>
          <span className="text-sm font-medium truncate">
            {job.shop_name || job.shop_domain}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress for active jobs */}
          {isActive && job.image_count > 0 ? (
            <div className="flex-1 flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {job.processed_count}/{job.image_count}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {job.image_count} images
              {job.status === 'completed' && job.pushed_count > 0 && (
                <span className="text-green-600 ml-2">
                  ({job.pushed_count} pushed)
                </span>
              )}
            </span>
          )}

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {job.completed_at
              ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })
              : formatDistanceToNow(new Date(job.created_at), { addSuffix: true })
            }
          </span>
        </div>

        {/* Expiration warning */}
        {job.expires_at && job.status === 'awaiting_approval' && (
          <p className="text-xs text-amber-600 mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Expires {formatDistanceToNow(new Date(job.expires_at), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Action */}
      {getAction()}
    </div>
  )
}
