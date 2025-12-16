import { useState, useEffect } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { X, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextualHintProps {
  id: string
  children: React.ReactNode
  hint: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  showAfterMs?: number
  visible?: boolean
  onDismiss?: () => void
}

export function ContextualHint({
  children,
  hint,
  position = 'bottom',
  showAfterMs = 500,
  visible = true,
  onDismiss,
}: ContextualHintProps) {
  const [showHint, setShowHint] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (!visible || isDismissed) {
      setShowHint(false)
      return
    }

    const timer = setTimeout(() => {
      setShowHint(true)
    }, showAfterMs)

    return () => clearTimeout(timer)
  }, [visible, isDismissed, showAfterMs])

  const handleDismiss = () => {
    setIsDismissed(true)
    setShowHint(false)
    onDismiss?.()
  }

  if (!visible || isDismissed) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip open={showHint}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={position}
          className={cn(
            'max-w-xs p-3 bg-slate-900 text-white border-0',
            'animate-in fade-in-0 zoom-in-95'
          )}
          sideOffset={8}
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{hint}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-0.5 hover:bg-slate-700 rounded transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700">
            <button
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Got it, don't show again
            </button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
