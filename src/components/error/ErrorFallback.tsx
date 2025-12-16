import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorFallbackProps {
  error: Error | null
  onReset?: () => void
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details (dev only) */}
          {import.meta.env.DEV && error && (
            <div className="p-3 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 overflow-auto max-h-32">
              {error.message}
            </div>
          )}

          {/* Recovery actions */}
          <div className="flex gap-3">
            {onReset && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={onReset}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleGoHome}
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
