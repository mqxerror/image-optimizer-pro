import { useState } from 'react'
import { AlertTriangle, RefreshCw, Code2, Wand2, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useBriefBuilder } from './BriefBuilderContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface RawPromptPanelProps {
  className?: string
}

export function RawPromptPanel({ className }: RawPromptPanelProps) {
  const { state, setRawPrompt, rebuildBriefFromPrompt, setManualOverride } = useBriefBuilder()
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const { rawPrompt, syncStatus } = state

  // Handle prompt change
  const handlePromptChange = (value: string) => {
    setRawPrompt(value)
  }

  // AI Enhance prompt
  const handleAIEnhance = async () => {
    setIsGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to use AI enhance',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-prompt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_prompt: rawPrompt,
            settings: {
              background_type: 'white',
              lighting_style: 'studio',
              enhancement_level: 'high',
            },
          }),
        }
      )

      const result = await response.json()
      if (result.optimized_prompt || result.prompt) {
        const newPrompt = result.optimized_prompt || result.prompt
        setRawPrompt(newPrompt)
        setManualOverride() // Mark as manual override since AI modified it
        toast({
          title: 'Prompt enhanced',
          description: 'AI has improved your prompt',
        })
      }
    } catch (error) {
      toast({
        title: 'Enhancement failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Sync status indicator
  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: 'Synced with brief',
          color: 'text-green-600 bg-green-50',
        }
      case 'brief-ahead':
        return {
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          label: 'Updating...',
          color: 'text-blue-600 bg-blue-50',
        }
      case 'prompt-ahead':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          label: 'Manual edits',
          color: 'text-amber-600 bg-amber-50',
        }
      case 'manual-override':
        return {
          icon: <Code2 className="h-3 w-3" />,
          label: 'Advanced mode',
          color: 'text-purple-600 bg-purple-50',
        }
    }
  }

  const statusDisplay = getSyncStatusDisplay()

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Raw Prompt
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn("text-[10px] font-medium", statusDisplay.color)}
        >
          {statusDisplay.icon}
          <span className="ml-1">{statusDisplay.label}</span>
        </Badge>
      </div>

      {/* Warning for manual edits */}
      {(syncStatus === 'prompt-ahead' || syncStatus === 'manual-override') && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium">Advanced mode active</p>
            <p className="text-amber-700">
              Brief fields may not reflect manual prompt changes.
              <button
                onClick={rebuildBriefFromPrompt}
                className="ml-1 underline hover:no-underline"
              >
                Rebuild brief from prompt
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Textarea */}
      <Textarea
        value={rawPrompt}
        onChange={(e) => handlePromptChange(e.target.value)}
        placeholder="Enter your custom prompt..."
        className="min-h-[120px] text-sm font-mono resize-none bg-foreground/[0.02]"
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {rawPrompt.length} characters
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAIEnhance}
          disabled={isGenerating || !rawPrompt.trim()}
          className="h-7 text-xs gap-1.5"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Wand2 className="h-3 w-3" />
              AI Enhance
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default RawPromptPanel
