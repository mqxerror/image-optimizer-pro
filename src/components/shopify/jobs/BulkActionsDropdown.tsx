import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Trash2,
  Download,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  useDiscardShopifyJob
} from '@/hooks/useShopify'
import { useToast } from '@/hooks/use-toast'
import type { ShopifySyncJob } from '@/types/shopify'

interface BulkActionsDropdownProps {
  selectedJobs: ShopifySyncJob[]
  onClearSelection: () => void
}

export function BulkActionsDropdown({ selectedJobs, onClearSelection }: BulkActionsDropdownProps) {
  const [confirmAction, setConfirmAction] = useState<'approve' | 'cancel' | 'discard' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const approveMutation = useApproveShopifyJob()
  const cancelMutation = useCancelShopifyJob()
  const discardMutation = useDiscardShopifyJob()

  // Count jobs that can receive each action
  const canApprove = selectedJobs.filter(j => j.status === 'awaiting_approval')
  const canCancel = selectedJobs.filter(j => ['pending', 'processing'].includes(j.status))
  const canDiscard = selectedJobs.filter(j => ['awaiting_approval', 'failed', 'cancelled', 'completed'].includes(j.status))

  const handleBulkApprove = async () => {
    setIsProcessing(true)
    let success = 0
    let failed = 0

    for (const job of canApprove) {
      try {
        await approveMutation.mutateAsync(job.id)
        success++
      } catch {
        failed++
      }
    }

    setIsProcessing(false)
    setConfirmAction(null)
    onClearSelection()

    toast({
      title: 'Bulk approve complete',
      description: `${success} approved, ${failed} failed`
    })
  }

  const handleBulkCancel = async () => {
    setIsProcessing(true)
    let success = 0
    let failed = 0

    for (const job of canCancel) {
      try {
        await cancelMutation.mutateAsync(job.id)
        success++
      } catch {
        failed++
      }
    }

    setIsProcessing(false)
    setConfirmAction(null)
    onClearSelection()

    toast({
      title: 'Bulk cancel complete',
      description: `${success} cancelled, ${failed} failed`
    })
  }

  const handleBulkDiscard = async () => {
    setIsProcessing(true)
    let success = 0
    let failed = 0

    for (const job of canDiscard) {
      try {
        await discardMutation.mutateAsync(job.id)
        success++
      } catch {
        failed++
      }
    }

    setIsProcessing(false)
    setConfirmAction(null)
    onClearSelection()

    toast({
      title: 'Bulk discard complete',
      description: `${success} discarded, ${failed} failed`
    })
  }

  const handleExport = () => {
    // Create CSV data
    const headers = ['Job ID', 'Store', 'Status', 'Products', 'Images', 'Pushed', 'Failed', 'Created']
    const rows = selectedJobs.map(job => [
      job.id,
      job.shop_name || job.shop_domain || '',
      job.status,
      job.product_count,
      job.image_count,
      job.pushed_count,
      job.failed_count,
      job.created_at
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shopify-jobs-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({ title: 'Export complete', description: `${selectedJobs.length} jobs exported` })
  }

  if (selectedJobs.length === 0) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Bulk Actions
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={() => setConfirmAction('approve')}
            disabled={canApprove.length === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Approve ({canApprove.length})
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction('cancel')}
            disabled={canCancel.length === 0}
          >
            <XCircle className="h-4 w-4 mr-2 text-amber-600" />
            Cancel ({canCancel.length})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmAction('discard')}
            disabled={canDiscard.length === 0}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Discard ({canDiscard.length})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmAction === 'approve'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {canApprove.length} Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve {canApprove.length} jobs for pushing to Shopify.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkApprove}
              className="bg-green-600 hover:bg-green-700"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'cancel'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {canCancel.length} Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel {canCancel.length} jobs. Processing will stop and
              any pending images will be skipped. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkCancel}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Jobs'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'discard'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard {canDiscard.length} Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {canDiscard.length} jobs and all associated
              optimized images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDiscard}
              className="bg-red-600 hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Discard All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
