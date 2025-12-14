import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
  Upload,
  Play,
  ImageIcon
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useApproveShopifyJob,
  useCancelShopifyJob,
  useDiscardShopifyJob,
  usePushShopifyJob,
  useStartJobProcessing
} from '@/hooks/useShopify'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ShopifySyncJob } from '@/types/shopify'

interface VisualJobCardProps {
  job: ShopifySyncJob
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  selectionMode?: boolean
  previewImages?: string[]
}

const statusConfig: Record<string, {
  color: string
  bgColor: string
  icon: typeof Clock
  label: string
  animate?: boolean
}> = {
  pending: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: Clock,
    label: 'Queued'
  },
  processing: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Loader2,
    label: 'Processing',
    animate: true
  },
  awaiting_approval: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: AlertCircle,
    label: 'Awaiting Approval'
  },
  approved: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: CheckCircle,
    label: 'Approved'
  },
  pushing: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Upload,
    label: 'Pushing to Shopify',
    animate: true
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
    label: 'Completed'
  },
  failed: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
    label: 'Failed'
  },
  cancelled: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: XCircle,
    label: 'Cancelled'
  }
}

export function VisualJobCard({
  job,
  isSelected = false,
  onSelect,
  selectionMode = false,
  previewImages = []
}: VisualJobCardProps) {
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const { toast } = useToast()

  const approveMutation = useApproveShopifyJob()
  const cancelMutation = useCancelShopifyJob()
  const discardMutation = useDiscardShopifyJob()
  const pushMutation = usePushShopifyJob()
  const startProcessingMutation = useStartJobProcessing()

  const status = statusConfig[job.status] || statusConfig.pending
  const StatusIcon = status.icon

  const progress = job.image_count > 0
    ? Math.round((job.processed_count / job.image_count) * 100)
    : 0

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(job.id)
      toast({ title: 'Job approved', description: 'Ready to push to Shopify' })
    } catch (err) {
      toast({ title: 'Failed to approve', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handlePush = async () => {
    try {
      const result = await pushMutation.mutateAsync(job.id)
      toast({
        title: 'Push complete',
        description: `${result.pushed} images pushed, ${result.failed} failed`
      })
    } catch (err) {
      toast({ title: 'Failed to push', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(job.id)
      toast({ title: 'Job cancelled' })
    } catch (err) {
      toast({ title: 'Failed to cancel', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handleDiscard = async () => {
    try {
      await discardMutation.mutateAsync(job.id)
      toast({ title: 'Job discarded' })
      setDiscardDialogOpen(false)
    } catch (err) {
      toast({ title: 'Failed to discard', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handleStartProcessing = async () => {
    try {
      await startProcessingMutation.mutateAsync(job.id)
      toast({ title: 'Processing started', description: 'Images are now being optimized' })
    } catch (err) {
      toast({ title: 'Failed to start processing', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const isActive = ['pending', 'processing', 'pushing'].includes(job.status)
  const canStartProcessing = job.status === 'pending'
  const canApprove = job.status === 'awaiting_approval'
  const canPush = job.status === 'approved'
  const canCancel = ['pending', 'processing'].includes(job.status)
  const canDiscard = ['awaiting_approval', 'failed', 'cancelled', 'completed'].includes(job.status)

  return (
    <>
      <Card className={cn(
        'overflow-hidden transition-all',
        isActive && 'border-blue-200 bg-blue-50/30',
        isSelected && 'ring-2 ring-primary'
      )}>
        <CardContent className="p-0">
          <div className="flex">
            {/* Selection Checkbox */}
            {selectionMode && (
              <div className="flex items-center justify-center px-4 border-r bg-gray-50">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect?.(job.id, checked as boolean)}
                />
              </div>
            )}

            {/* Preview Images */}
            <div className="w-40 h-28 flex-shrink-0 bg-gray-100 grid grid-cols-2 gap-0.5 overflow-hidden">
              {previewImages.length > 0 ? (
                previewImages.slice(0, 4).map((src, idx) => (
                  <div key={idx} className="relative overflow-hidden">
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 row-span-2 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${status.bgColor} ${status.color} border-0`}>
                      <StatusIcon className={`h-3 w-3 mr-1 ${status.animate ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {job.shop_name || job.shop_domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{job.product_count} products</span>
                    <span>{job.image_count} images</span>
                    {job.tokens_used > 0 && (
                      <span>{job.tokens_used.toLocaleString()} tokens</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {canStartProcessing && (
                    <Button
                      size="sm"
                      onClick={handleStartProcessing}
                      disabled={startProcessingMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {startProcessingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  )}

                  {canApprove && (
                    <>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/shopify/jobs/${job.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Link>
                      </Button>
                    </>
                  )}

                  {canPush && (
                    <Button
                      size="sm"
                      onClick={handlePush}
                      disabled={pushMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {pushMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Push
                        </>
                      )}
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}

                  {canDiscard && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDiscardDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {job.status === 'completed' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/shopify/jobs/${job.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar for active jobs */}
              {isActive && job.image_count > 0 && (
                <div className="space-y-1.5">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{job.processed_count} / {job.image_count} processed</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              )}

              {/* Stats for completed jobs */}
              {job.status === 'completed' && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">
                    <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                    {job.pushed_count} pushed
                  </span>
                  {job.failed_count > 0 && (
                    <span className="text-red-600">
                      <XCircle className="h-3.5 w-3.5 inline mr-1" />
                      {job.failed_count} failed
                    </span>
                  )}
                </div>
              )}

              {/* Error message */}
              {job.last_error && (
                <p className="text-xs text-red-600 mt-2 truncate">
                  Error: {job.last_error}
                </p>
              )}

              {/* Footer timestamps */}
              <div className="flex items-center gap-4 mt-auto pt-2 text-xs text-muted-foreground">
                {job.expires_at && job.status === 'awaiting_approval' && (
                  <span className="text-amber-600">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Expires {formatDistanceToNow(new Date(job.expires_at), { addSuffix: true })}
                  </span>
                )}
                <span>
                  {job.completed_at
                    ? `Completed ${formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}`
                    : `Started ${formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}`
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discard Confirmation */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard this job? This will delete all temporary optimized images
              and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-red-600 hover:bg-red-700"
              disabled={discardMutation.isPending}
            >
              {discardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Discard Job'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
