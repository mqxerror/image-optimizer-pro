import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HardDrive, Plus, Trash2, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { GoogleDriveConnection } from '@/types/database'

export default function GoogleDriveConnect() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization, user } = useAuthStore()
  const [isConnecting, setIsConnecting] = useState(false)
  const [deleteConnection, setDeleteConnection] = useState<GoogleDriveConnection | null>(null)

  // Check for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')
    const email = params.get('email')

    if (success === 'true') {
      toast({
        title: 'Google Drive connected!',
        description: `Connected to ${email}`
      })
      queryClient.invalidateQueries({ queryKey: ['google-drive-connections'] })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error) {
      toast({
        title: 'Connection failed',
        description: decodeURIComponent(error),
        variant: 'destructive'
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Fetch connections
  const { data: connections, isLoading } = useQuery({
    queryKey: ['google-drive-connections', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await supabase
        .from('google_drive_connections')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as GoogleDriveConnection[]
    },
    enabled: !!organization
  })

  // Start OAuth flow
  const connectDrive = async () => {
    if (!organization || !user) return

    setIsConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth-url`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organization_id: organization.id,
            redirect_uri: window.location.origin + window.location.pathname
          })
        }
      )

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Redirect to Google OAuth
      window.location.href = result.url
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to start connection',
        variant: 'destructive'
      })
      setIsConnecting(false)
    }
  }

  // Delete connection
  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('google_drive_connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive-connections'] })
      setDeleteConnection(null)
      toast({ title: 'Connection removed' })
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove connection',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const hasGoogleConfig = import.meta.env.VITE_SUPABASE_URL

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Google Drive
        </CardTitle>
        <CardDescription>
          Connect your Google Drive to import images for optimization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasGoogleConfig && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Google Drive integration requires configuration. Contact support to enable this feature.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : connections && connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{connection.google_email}</p>
                    <p className="text-sm text-gray-500">
                      Connected {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={connection.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {connection.is_active ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConnection(connection)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <HardDrive className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No Google Drive accounts connected</p>
            <p className="text-sm mt-1">Connect your Drive to start importing images</p>
          </div>
        )}

        <Button
          onClick={connectDrive}
          disabled={isConnecting || !hasGoogleConfig}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Connect Google Drive
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          We request access to read your files and save optimized images.
          <a href="https://support.google.com/drive" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
            Learn more <ExternalLink className="inline h-3 w-3" />
          </a>
        </p>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConnection} onOpenChange={() => setDeleteConnection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect {deleteConnection?.google_email}?
              You'll need to reconnect to access files from this account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConnection(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConnection && deleteMutation.mutate(deleteConnection.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
