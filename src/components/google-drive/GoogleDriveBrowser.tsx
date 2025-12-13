import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Folder,
  Image,
  ChevronRight,
  Loader2,
  Home,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Eye,
  ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ProxiedThumbnail } from '@/components/ui/proxied-thumbnail'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { GoogleDriveConnection, GoogleDriveFile } from '@/types/database'

// Folder preview state
interface FolderPreviewState {
  folderId: string
  folderName: string
}

interface GoogleDriveBrowserProps {
  onSelectFiles?: (files: GoogleDriveFile[]) => void
  onSelectFolder?: (folderId: string, folderName: string) => void
  selectionMode?: 'files' | 'folder' | 'both'
  maxFiles?: number
  projectId?: string // For remembering last folder per project
}

interface BreadcrumbItem {
  id: string
  name: string
}

// Storage key for last folder
const getLastFolderKey = (projectId: string) => `drive-last-folder-${projectId}`

export default function GoogleDriveBrowser({
  onSelectFiles,
  onSelectFolder,
  selectionMode = 'files',
  maxFiles = 500,
  projectId
}: GoogleDriveBrowserProps) {
  const { organization } = useAuthStore()
  const [selectedConnection, setSelectedConnection] = useState<string>('')

  // Initialize folder from localStorage if available
  const [currentFolder, setCurrentFolder] = useState<string>(() => {
    if (projectId) {
      const stored = localStorage.getItem(getLastFolderKey(projectId))
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return parsed.folderId || 'root'
        } catch {
          return 'root'
        }
      }
    }
    return 'root'
  })

  // Initialize breadcrumbs from localStorage
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(() => {
    if (projectId) {
      const stored = localStorage.getItem(getLastFolderKey(projectId))
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return parsed.breadcrumbs || [{ id: 'root', name: 'My Drive' }]
        } catch {
          return [{ id: 'root', name: 'My Drive' }]
        }
      }
    }
    return [{ id: 'root', name: 'My Drive' }]
  })

  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([])
  const [pageToken, setPageToken] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [previewFolder, setPreviewFolder] = useState<FolderPreviewState | null>(null)

  // Save folder to localStorage when it changes
  useEffect(() => {
    if (projectId && currentFolder) {
      localStorage.setItem(
        getLastFolderKey(projectId),
        JSON.stringify({ folderId: currentFolder, breadcrumbs })
      )
    }
  }, [projectId, currentFolder, breadcrumbs])

  // Fetch connections
  const { data: connections, isLoading: loadingConnections } = useQuery({
    queryKey: ['google-drive-connections', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await supabase
        .from('google_drive_connections')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)

      if (error) throw error
      return data as GoogleDriveConnection[]
    },
    enabled: !!organization
  })

  // Auto-select first connection
  useEffect(() => {
    if (connections && connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0].id)
    }
  }, [connections, selectedConnection])

  // Fetch files
  const { data: filesData, isLoading: loadingFiles, refetch } = useQuery({
    queryKey: ['google-drive-files', selectedConnection, currentFolder, pageToken],
    queryFn: async () => {
      if (!selectedConnection) return { files: [], nextPageToken: null }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list',
            connection_id: selectedConnection,
            folder_id: currentFolder,
            page_token: pageToken
          })
        }
      )

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      return result as { files: GoogleDriveFile[]; nextPageToken: string | null }
    },
    enabled: !!selectedConnection
  })

  // Fetch folder preview (contents of the previewed folder)
  const { data: previewData, isLoading: loadingPreview } = useQuery({
    queryKey: ['folder-preview', selectedConnection, previewFolder?.folderId],
    queryFn: async () => {
      if (!selectedConnection || !previewFolder) return null

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'list',
            connection_id: selectedConnection,
            folder_id: previewFolder.folderId
          })
        }
      )

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      // Filter and count images
      const allFiles = result.files as GoogleDriveFile[]
      const images = allFiles.filter(f => f.mimeType.startsWith('image/'))

      return {
        imageCount: images.length,
        totalSize: images.reduce((sum, f) => sum + (parseInt(f.size || '0') || 0), 0),
        thumbnails: images.slice(0, 6) // First 6 images for preview
      }
    },
    enabled: !!selectedConnection && !!previewFolder?.folderId && selectionMode === 'folder',
    staleTime: 60000 // Cache for 1 minute
  })

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!filesData?.files) return []
    if (!searchQuery.trim()) return filesData.files
    const query = searchQuery.toLowerCase()
    return filesData.files.filter(f => f.name.toLowerCase().includes(query))
  }, [filesData?.files, searchQuery])

  // Count images in current view
  const imageCount = useMemo(() => {
    return filteredFiles.filter(f => f.mimeType.startsWith('image/')).length
  }, [filteredFiles])

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId)
    setPageToken(null)
    setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }])
    setSelectedFiles([])
    setSearchQuery('')
    onSelectFiles?.([])
  }

  const navigateToBreadcrumb = (index: number) => {
    const item = breadcrumbs[index]
    setCurrentFolder(item.id)
    setPageToken(null)
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    setSelectedFiles([])
    setSearchQuery('')
    onSelectFiles?.([])
  }

  const toggleFileSelection = (file: GoogleDriveFile) => {
    const isSelected = selectedFiles.some(f => f.id === file.id)
    let newSelection: GoogleDriveFile[]
    if (isSelected) {
      newSelection = selectedFiles.filter(f => f.id !== file.id)
    } else if (selectedFiles.length < maxFiles) {
      newSelection = [...selectedFiles, file]
    } else {
      return
    }
    setSelectedFiles(newSelection)
    // Notify parent of selection change
    onSelectFiles?.(newSelection)
  }

  const selectAllImages = () => {
    const images = filteredFiles.filter(f => f.mimeType.startsWith('image/'))
    const newSelected = [...selectedFiles]

    for (const img of images) {
      if (!newSelected.some(f => f.id === img.id) && newSelected.length < maxFiles) {
        newSelected.push(img)
      }
    }

    setSelectedFiles(newSelected)
    onSelectFiles?.(newSelected)
  }

  const deselectAll = () => {
    setSelectedFiles([])
    onSelectFiles?.([])
  }

  const handleConfirm = () => {
    if (selectionMode === 'folder' && onSelectFolder) {
      const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1]
      onSelectFolder(currentFolder, currentBreadcrumb.name)
    } else if (onSelectFiles && selectedFiles.length > 0) {
      onSelectFiles(selectedFiles)
    }
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/')
  const isFolder = (mimeType: string) => mimeType === 'application/vnd.google-apps.folder'

  if (loadingConnections) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">No Google Drive accounts connected</p>
        <p className="text-sm text-gray-400 mt-1">
          Connect a Google Drive account in Settings first
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Selector */}
      {connections.length > 1 && (
        <Select value={selectedConnection} onValueChange={setSelectedConnection}>
          <SelectTrigger>
            <SelectValue placeholder="Select Google Drive account" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.google_email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`px-2 py-1 rounded hover:bg-gray-100 whitespace-nowrap ${
                index === breadcrumbs.length - 1 ? 'font-medium text-primary' : 'text-gray-600'
              }`}
            >
              {index === 0 ? <Home className="h-4 w-4" /> : crumb.name}
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Search & Selection Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {selectionMode !== 'folder' && imageCount > 0 && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllImages}
              disabled={selectedFiles.length >= maxFiles}
            >
              Select All ({imageCount})
            </Button>
            {selectedFiles.length > 0 && (
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* File List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        {loadingFiles ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="divide-y">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                  selectedFiles.some(f => f.id === file.id) ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  if (isFolder(file.mimeType)) {
                    navigateToFolder(file.id, file.name)
                  } else if (isImage(file.mimeType) && selectionMode !== 'folder') {
                    toggleFileSelection(file)
                  }
                }}
              >
                {/* Selection checkbox for images */}
                {isImage(file.mimeType) && selectionMode !== 'folder' && (
                  <Checkbox
                    checked={selectedFiles.some(f => f.id === file.id)}
                    onCheckedChange={() => toggleFileSelection(file)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                {/* Icon or thumbnail */}
                {isFolder(file.mimeType) ? (
                  <Folder className="h-10 w-10 text-yellow-500" />
                ) : isImage(file.mimeType) ? (
                  <ProxiedThumbnail
                    fileId={file.id}
                    alt={file.name}
                    className="h-10 w-10"
                  />
                ) : (
                  <Image className="h-10 w-10 text-gray-400" />
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {isFolder(file.mimeType)
                      ? 'Folder'
                      : file.size
                        ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB`
                        : 'Image'}
                  </p>
                </div>

                {/* Folder actions */}
                {isFolder(file.mimeType) && (
                  <div className="flex items-center gap-1">
                    {selectionMode === 'folder' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewFolder(
                            previewFolder?.folderId === file.id
                              ? null
                              : { folderId: file.id, folderName: file.name }
                          )
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 text-gray-300 mb-2" />
                <p>No files match "{searchQuery}"</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <Folder className="h-12 w-12 text-gray-300 mb-2" />
                <p>This folder is empty</p>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Folder Preview Panel */}
      {selectionMode === 'folder' && previewFolder && (
        <div className="border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-yellow-500" />
              <h4 className="font-medium text-slate-800">{previewFolder.folderName}</h4>
            </div>
            <div className="flex items-center gap-2">
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : previewData ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  {previewData.imageCount} images
                </Badge>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setPreviewFolder(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Thumbnails Grid */}
          {loadingPreview ? (
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : previewData && previewData.thumbnails.length > 0 ? (
            <div className="grid grid-cols-6 gap-2">
              {previewData.thumbnails.map((file) => (
                <div
                  key={file.id}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200"
                >
                  <ProxiedThumbnail
                    fileId={file.id}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {previewData.imageCount > 6 && (
                <div className="aspect-square rounded-lg bg-slate-200/50 flex items-center justify-center text-slate-500 text-sm font-medium">
                  +{previewData.imageCount - 6}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm">
              <Image className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No images in this folder
            </div>
          )}

          {/* Folder Stats */}
          {previewData && previewData.totalSize > 0 && (
            <p className="text-xs text-slate-500">
              Total size: {(previewData.totalSize / 1024 / 1024).toFixed(1)} MB
            </p>
          )}

          {/* Select Button */}
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => {
              if (onSelectFolder) {
                onSelectFolder(previewFolder.folderId, previewFolder.folderName)
              }
              setPreviewFolder(null)
            }}
            disabled={!previewData || previewData.imageCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Select This Folder ({previewData?.imageCount || 0} images)
          </Button>
        </div>
      )}

      {/* Load More */}
      {filesData?.nextPageToken && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setPageToken(filesData.nextPageToken)}
        >
          Load More
        </Button>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-sm text-gray-500">
          {selectionMode === 'folder' ? (
            <span>Current folder: {breadcrumbs[breadcrumbs.length - 1].name}</span>
          ) : (
            <span>{selectedFiles.length} of {maxFiles} images selected</span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={selectionMode === 'files' && selectedFiles.length === 0}
        >
          <Check className="mr-2 h-4 w-4" />
          {selectionMode === 'folder' ? 'Select This Folder' : `Import ${selectedFiles.length} Images`}
        </Button>
      </div>
    </div>
  )
}
