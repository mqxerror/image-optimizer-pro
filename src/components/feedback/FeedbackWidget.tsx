import { useState, useEffect, useCallback } from 'react'
import { Bug, Camera, Loader2, X, RefreshCw, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useScreenshot } from '@/hooks/useScreenshot'
import { useBugReport } from '@/hooks/useBugReport'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { screenshot, isCapturing, capture, clear } = useScreenshot()
  const { submit, isSubmitting } = useBugReport()

  // Keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Capture screenshot when dialog opens
  useEffect(() => {
    if (isOpen && !screenshot && !isCapturing) {
      capture()
    }
  }, [isOpen, screenshot, isCapturing, capture])

  // Reset state when dialog closes
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setMessage('')
      clear()
    }
  }, [clear])

  // Handle form submission
  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please describe the issue you encountered',
        variant: 'destructive'
      })
      return
    }

    try {
      await submit({
        message: message.trim(),
        screenshot,
        pageUrl: window.location.href
      })

      toast({
        title: 'Bug report submitted',
        description: 'Thank you for your feedback!'
      })

      handleOpenChange(false)
    } catch (error) {
      toast({
        title: 'Failed to submit',
        description: (error as Error).message,
        variant: 'destructive'
      })
    }
  }

  // Retake screenshot
  const handleRetake = async () => {
    clear()
    // Small delay to ensure the dialog is visible in new screenshot
    setTimeout(() => capture(), 100)
  }

  // Don't render for non-authenticated users
  if (!user) return null

  return (
    <>
      {/* Floating Button */}
      <button
        data-feedback-widget
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-11 h-11 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:scale-110 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
        title="Report a bug (Ctrl+Shift+F)"
        aria-label="Report a bug"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          data-feedback-widget
          className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Report a Bug
            </DialogTitle>
            <DialogDescription>
              Help us improve by reporting issues you encounter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Screenshot Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Screenshot</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetake}
                  disabled={isCapturing}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn('h-3 w-3 mr-1', isCapturing && 'animate-spin')} />
                  Retake
                </Button>
              </div>

              <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
                {isCapturing ? (
                  <div className="aspect-video flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Camera className="h-8 w-8 animate-pulse" />
                      <span className="text-sm">Capturing screenshot...</span>
                    </div>
                  </div>
                ) : screenshot ? (
                  <img
                    src={screenshot}
                    alt="Screenshot preview"
                    className="w-full aspect-video object-cover object-top"
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <X className="h-8 w-8" />
                      <span className="text-sm">Screenshot failed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <Label htmlFor="bug-message" className="text-sm font-medium">
                Describe the issue <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="bug-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What went wrong? What were you trying to do?"
                rows={4}
                className="resize-none text-base"
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as possible. Include steps to reproduce if you can.
              </p>
            </div>

            {/* Page URL (read-only info) */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span className="font-medium">Page:</span>{' '}
              <span className="break-all">{window.location.pathname}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
