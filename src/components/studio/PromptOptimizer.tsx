import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface PromptOptimizerProps {
  currentPrompt: string
  onOptimizedPrompt: (prompt: string) => void
  disabled?: boolean
}

export function PromptOptimizer({
  currentPrompt,
  onOptimizedPrompt,
  disabled
}: PromptOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const { toast } = useToast()

  const handleOptimize = async () => {
    if (!currentPrompt.trim()) {
      toast({
        title: 'No prompt to optimize',
        description: 'Enter a prompt first, then click Optimize.',
        variant: 'destructive'
      })
      return
    }

    setIsOptimizing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-prompt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            current_prompt: currentPrompt,
            use_ai: true,
            optimization_goal: 'professional'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Optimization failed')
      }

      const data = await response.json()
      if (data.optimized_prompt) {
        setOptimizedPrompt(data.optimized_prompt)
        setShowComparison(true)
      } else {
        throw new Error('No optimized prompt returned')
      }
    } catch (error) {
      toast({
        title: 'Optimization failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleAccept = () => {
    if (optimizedPrompt) {
      onOptimizedPrompt(optimizedPrompt)
      setShowComparison(false)
      setOptimizedPrompt(null)
      toast({
        title: 'Prompt optimized',
        description: 'Your prompt has been enhanced for better results.'
      })
    }
  }

  const handleReject = () => {
    setShowComparison(false)
    setOptimizedPrompt(null)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOptimize}
        disabled={disabled || isOptimizing || !currentPrompt.trim()}
        className="gap-2 bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">Optimizing...</span>
            <span className="sm:hidden">...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Optimize Prompt</span>
            <span className="sm:hidden">Optimize</span>
          </>
        )}
      </Button>

      {/* Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Optimized Prompt</DialogTitle>
            <DialogDescription>
              AI has enhanced your prompt for better image generation results.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Original</p>
              <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-700 max-h-24 overflow-y-auto">
                {currentPrompt}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-green-600 mb-2">Optimized</p>
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
                {optimizedPrompt}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleReject}>
              Keep Original
            </Button>
            <Button onClick={handleAccept} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Use Optimized
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
