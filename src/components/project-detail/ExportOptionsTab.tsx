import { useState, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Download,
  FileSpreadsheet,
  HardDrive,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface ExportOptionsTabProps {
  projectId: string
  projectName: string
}

interface ExportOptions {
  includeOriginals: boolean
  onlySuccessful: boolean
}

export function ExportOptionsTab({ projectId, projectName }: ExportOptionsTabProps) {
  const { toast } = useToast()
  const { organization } = useAuthStore()
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeOriginals: false,
    onlySuccessful: true,
  })
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [downloadStatus, setDownloadStatus] = useState<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if Google Drive is connected
  const { data: driveConnections } = useQuery({
    queryKey: ['google-drive-connections', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await supabase
        .from('google_drive_connections')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)

      if (error) throw error
      return data || []
    },
    enabled: !!organization,
  })

  const hasGoogleDrive = driveConnections && driveConnections.length > 0

  // ZIP Export Mutation - downloads images from public URLs with progress
  const zipExportMutation = useMutation({
    mutationFn: async () => {
      // Reset progress state
      setDownloadProgress(0)
      setDownloadStatus('Fetching image list...')

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      // First get the processing history with optimized URLs
      const { data: history, error: historyError } = await supabase
        .from('processing_history')
        .select('file_name, optimized_url, original_url')
        .eq('project_id', projectId)
        .eq('status', 'success')

      if (historyError) throw historyError
      if (!history || history.length === 0) {
        throw new Error('No processed images found for this project')
      }

      setDownloadStatus(`Downloading ${history.length} images...`)

      // Download all images and create a zip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const folder = zip.folder(projectName) || zip
      const failed: string[] = []
      const noUrl: string[] = []

      // Download each image and add to zip with progress
      for (let i = 0; i < history.length; i++) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Download cancelled')
        }

        const item = history[i]
        const imageUrl = item.optimized_url || item.original_url

        // Update progress (80% allocated to downloading)
        const progress = Math.round((i / history.length) * 80)
        setDownloadProgress(progress)
        setDownloadStatus(`Downloading ${i + 1} of ${history.length}...`)

        if (!imageUrl) {
          noUrl.push(item.file_name || 'unknown')
          continue
        }

        try {
          const response = await fetch(imageUrl, {
            signal: abortControllerRef.current?.signal
          })
          if (response.ok) {
            const blob = await response.blob()
            const fileName = item.file_name || `image_${i}.png`
            folder.file(fileName, blob)
          } else {
            failed.push(item.file_name || 'unknown')
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            throw new Error('Download cancelled')
          }
          console.error('Failed to download image:', item.file_name, err)
          failed.push(item.file_name || 'unknown')
        }
      }

      // Generate zip with progress
      setDownloadProgress(85)
      setDownloadStatus('Creating ZIP file...')

      const zipBlob = await zip.generateAsync(
        { type: 'blob' },
        (metadata) => {
          // Progress from 85% to 100% during ZIP generation
          const zipProgress = 85 + Math.round((metadata.percent / 100) * 15)
          setDownloadProgress(zipProgress)
        }
      )

      setDownloadProgress(100)
      setDownloadStatus('Download ready!')

      return {
        zipBlob,
        count: Object.keys(folder.files || zip.files).length,
        total: history.length,
        failed,
        noUrl
      }
    },
    onSuccess: (data) => {
      if (data.zipBlob) {
        // Create download link
        const url = URL.createObjectURL(data.zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${projectName}-images.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // Show appropriate toast based on results
        if (data.count === data.total) {
          toast({
            title: 'Download complete!',
            description: `${data.count} images downloaded as ZIP`,
          })
        } else {
          const missing = data.total - data.count
          toast({
            title: 'Download complete (partial)',
            description: `${data.count} of ${data.total} images downloaded. ${missing} images had missing URLs or failed to download.`,
            variant: 'destructive',
          })
        }
      }
      // Reset progress after a short delay
      setTimeout(() => {
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
    },
    onError: (error) => {
      setDownloadProgress(0)
      setDownloadStatus('')
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // CSV Export Mutation
  const csvExportMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-project-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            format: 'csv',
            only_successful: exportOptions.onlySuccessful,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.download_url) {
        const a = document.createElement('a')
        a.href = data.download_url
        a.download = `${projectName}-report.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        toast({
          title: 'Report ready',
          description: 'Your CSV report is downloading',
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // Google Drive Export Mutation
  const driveExportMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-project-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            format: 'google_drive',
            include_originals: exportOptions.includeOriginals,
            only_successful: exportOptions.onlySuccessful,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Check if there were errors
      if (data.errors && data.errors.length > 0) {
        console.error('Export errors:', data.errors)
        toast({
          title: data.exported_count > 0 ? 'Export partially complete' : 'Export failed',
          description: `${data.exported_count} of ${data.total_images} images exported. ${data.errors.length} failed.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Export complete',
          description: data.message || `${data.exported_count} images exported to Google Drive`,
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const isExporting = zipExportMutation.isPending || csvExportMutation.isPending || driveExportMutation.isPending

  return (
    <div className="space-y-6 py-2">
      {/* Export Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Export Options</CardTitle>
          <CardDescription>Configure what to include in your export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="onlySuccessful"
              checked={exportOptions.onlySuccessful}
              onCheckedChange={(checked) =>
                setExportOptions(prev => ({ ...prev, onlySuccessful: checked === true }))
              }
            />
            <Label htmlFor="onlySuccessful" className="text-sm font-normal">
              Only successful images
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeOriginals"
              checked={exportOptions.includeOriginals}
              onCheckedChange={(checked) =>
                setExportOptions(prev => ({ ...prev, includeOriginals: checked === true }))
              }
            />
            <Label htmlFor="includeOriginals" className="text-sm font-normal">
              Include original images (larger download)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Download as ZIP */}
      <Card className="bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download All Images
          </CardTitle>
          <CardDescription>
            Download all processed images as a ZIP file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress indicator */}
          {zipExportMutation.isPending && downloadProgress > 0 && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">{downloadStatus}</span>
                <span className="text-blue-600">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}

          <Button
            onClick={() => zipExportMutation.mutate()}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {zipExportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {downloadProgress > 0 ? `${downloadProgress}%` : 'Preparing...'}
              </>
            ) : zipExportMutation.isSuccess && downloadProgress === 100 ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download All Images
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export to Google Drive */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Export to Google Drive
          </CardTitle>
          <CardDescription>
            {hasGoogleDrive
              ? 'Export images directly to your connected Google Drive'
              : 'Connect Google Drive in Settings to enable this feature'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasGoogleDrive ? (
            <Button
              onClick={() => driveExportMutation.mutate()}
              disabled={isExporting}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {driveExportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : driveExportMutation.isSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Exported
                </>
              ) : (
                <>
                  <HardDrive className="h-4 w-4 mr-2" />
                  Export to Drive
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Google Drive not connected
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Report */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Download CSV Report
          </CardTitle>
          <CardDescription>
            Generate a spreadsheet with processing statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => csvExportMutation.mutate()}
            disabled={isExporting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {csvExportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : csvExportMutation.isSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Downloaded
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
