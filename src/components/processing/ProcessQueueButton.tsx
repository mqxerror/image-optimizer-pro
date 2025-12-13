import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface ProcessQueueButtonProps {
  queuedCount?: number
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
}

interface ProcessResult {
  success: boolean
  total: number
  successCount: number
  failed: number
  skipped: number
}

export default function ProcessQueueButton({
  queuedCount = 0,
  variant = 'default',
  size = 'default'
}: ProcessQueueButtonProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<ProcessResult | null>(null)

  const processMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('No organization')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-queue`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organization_id: organization.id,
            batch_size: 10
          })
        }
      )

      const result = await response.json()
      if (result.error) throw new Error(result.error)
      return result as ProcessResult
    },
    onSuccess: (data) => {
      setResults(data)
      setShowResults(true)
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['token-account'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })

      if (data.total === 0) {
        toast({ title: 'Queue is empty', description: 'No images to process' })
      } else if (data.failed === 0) {
        toast({
          title: 'Processing complete!',
          description: `Successfully processed ${data.successCount} images`
        })
      } else {
        toast({
          title: 'Processing complete with errors',
          description: `${data.successCount} succeeded, ${data.failed} failed`,
          variant: 'destructive'
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Processing failed',
        description: error.message,
        variant: 'destructive'
      })
    },
    onSettled: () => {
      setIsProcessing(false)
    }
  })

  const handleProcess = () => {
    setIsProcessing(true)
    processMutation.mutate()
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleProcess}
        disabled={isProcessing || queuedCount === 0}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Process Queue {queuedCount > 0 && `(${queuedCount})`}
          </>
        )}
      </Button>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processing Results</DialogTitle>
            <DialogDescription>
              Summary of the queue processing
            </DialogDescription>
          </DialogHeader>

          {results && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-green-50">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{results.successCount}</p>
                  <p className="text-sm text-green-600">Successful</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50">
                  <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{results.failed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold text-gray-700 mt-6">{results.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped</p>
                </div>
              </div>

              {results.total > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Success Rate</p>
                  <Progress
                    value={(results.successCount / results.total) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round((results.successCount / results.total) * 100)}%
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResults(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
