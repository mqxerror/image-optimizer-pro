import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Store,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Upload,
  RefreshCw,
  ZoomIn,
  Package,
  Pause,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useShopifyJob,
  useApproveShopifyJob,
  usePushShopifyJob,
  useRetryShopifyImage
} from '@/hooks/useShopify'
import { useToast } from '@/hooks/use-toast'
import type { ShopifyImage, ShopifyJobStatus } from '@/types/shopify'

const statusConfig: Record<ShopifyJobStatus, {
  color: string
  bgColor: string
  icon: typeof Clock
  label: string
  animate?: boolean
}> = {
  pending: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
    label: 'Pending'
  },
  processing: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Loader2,
    label: 'Processing',
    animate: true
  },
  paused: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Pause,
    label: 'Paused'
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

export default function ShopifyJobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [previewImage, setPreviewImage] = useState<ShopifyImage | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  // Data
  const { data: job, isLoading } = useShopifyJob(jobId!)
  const approveMutation = useApproveShopifyJob()
  const pushMutation = usePushShopifyJob()
  const retryMutation = useRetryShopifyImage()

  // Actions
  const handleApprove = async () => {
    if (!jobId) return
    try {
      await approveMutation.mutateAsync(jobId)
      toast({ title: 'Job approved', description: 'Ready to push to Shopify' })
    } catch (err) {
      toast({ title: 'Failed to approve', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handlePush = async () => {
    if (!jobId) return
    try {
      const result = await pushMutation.mutateAsync(jobId)
      toast({
        title: 'Push complete',
        description: `${result.pushed} images pushed, ${result.failed} failed`
      })
    } catch (err) {
      toast({ title: 'Failed to push', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handleRetryImage = async (imageId: string) => {
    try {
      await retryMutation.mutateAsync(imageId)
      toast({ title: 'Retrying image push...' })
    } catch (err) {
      toast({ title: 'Failed to retry', description: (err as Error).message, variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job not found</p>
        <Button variant="link" onClick={() => navigate('/shopify')}>
          Back to Shopify
        </Button>
      </div>
    )
  }

  const status = statusConfig[job.status]
  const StatusIcon = status.icon
  const progress = job.image_count > 0
    ? Math.round((job.processed_count / job.image_count) * 100)
    : 0

  const canApprove = job.status === 'awaiting_approval'
  const canPush = job.status === 'approved'
  const isActive = ['pending', 'processing', 'pushing'].includes(job.status)

  // Filter images by tab
  const filteredImages = job.images?.filter(img => {
    switch (activeTab) {
      case 'ready': return img.status === 'ready'
      case 'pushed': return img.status === 'pushed'
      case 'failed': return img.status === 'failed'
      default: return true
    }
  }) || []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Shopify', href: '/shopify' },
          { label: 'Jobs', href: '/shopify/jobs' },
          { label: job.shop_name || `Job #${jobId?.slice(0, 8)}` }
        ]}
      />

      {/* Job info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.bgColor}`}>
                <Store className={`h-5 w-5 ${status.color}`} />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {job.shop_name || job.shop_domain}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Started {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <Badge className={`${status.bgColor} ${status.color} border-0`}>
              <StatusIcon className={`h-3 w-3 mr-1 ${status.animate ? 'animate-spin' : ''}`} />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Package className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{job.product_count}</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <ImageIcon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{job.image_count}</div>
              <div className="text-sm text-muted-foreground">Images</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{job.pushed_count}</div>
              <div className="text-sm text-muted-foreground">Pushed</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">{job.failed_count}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Progress bar for active jobs */}
          {isActive && job.image_count > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{job.processed_count} / {job.image_count} processed</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Expiration warning */}
          {job.expires_at && job.status === 'awaiting_approval' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Approval Required</p>
                <p className="text-sm text-amber-700">
                  This job expires {formatDistanceToNow(new Date(job.expires_at), { addSuffix: true })}.
                  Approve to push images to Shopify.
                </p>
              </div>
            </div>
          )}

          {/* Error display */}
          {job.last_error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{job.last_error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {canApprove && (
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve All & Push
              </Button>
            )}
            {canPush && (
              <Button
                onClick={handlePush}
                disabled={pushMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {pushMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Push to Shopify
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Images section */}
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({job.images?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="ready">
                Ready ({job.stats?.ready || 0})
              </TabsTrigger>
              <TabsTrigger value="pushed">
                Pushed ({job.stats?.pushed || 0})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed ({job.stats?.failed || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No images in this category
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredImages.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      onPreview={() => setPreviewImage(image)}
                      onRetry={() => handleRetryImage(image.id)}
                      isRetrying={retryMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.product_title || 'Image Preview'}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Original</h4>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={previewImage.original_url}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {previewImage.original_width} x {previewImage.original_height}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Optimized</h4>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {previewImage.optimized_url ? (
                    <img
                      src={previewImage.optimized_url}
                      alt="Optimized"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Not yet processed
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Image card component
interface ImageCardProps {
  image: ShopifyImage
  onPreview: () => void
  onRetry: () => void
  isRetrying: boolean
}

function ImageCard({ image, onPreview, onRetry, isRetrying }: ImageCardProps) {
  const statusBadge = {
    queued: { color: 'bg-gray-100 text-gray-700', label: 'Queued' },
    processing: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
    ready: { color: 'bg-amber-100 text-amber-700', label: 'Ready' },
    approved: { color: 'bg-purple-100 text-purple-700', label: 'Approved' },
    pushing: { color: 'bg-blue-100 text-blue-700', label: 'Pushing' },
    pushed: { color: 'bg-green-100 text-green-700', label: 'Pushed' },
    failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
    skipped: { color: 'bg-gray-100 text-gray-500', label: 'Skipped' }
  }[image.status]

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-100 relative">
        {/* Side by side preview */}
        <div className="grid grid-cols-2 h-full">
          <div className="border-r">
            <img
              src={image.original_url}
              alt="Original"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            {image.optimized_url ? (
              <img
                src={image.optimized_url}
                alt="Optimized"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {image.status === 'processing' ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="grid grid-cols-2 text-white text-xs text-center">
            <span>Original</span>
            <span>Optimized</span>
          </div>
        </div>

        {/* Preview button */}
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 h-8 w-8 p-0"
          onClick={onPreview}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{image.product_title || 'Untitled'}</p>
            <p className="text-xs text-muted-foreground">Position {image.image_position || 1}</p>
          </div>
          <Badge className={`${statusBadge.color} border-0 ml-2`}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Error message */}
        {image.error_message && (
          <p className="text-xs text-red-600 mt-2 truncate" title={image.error_message}>
            {image.error_message}
          </p>
        )}

        {/* Retry button for failed images */}
        {image.status === 'failed' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
