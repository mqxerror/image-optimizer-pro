import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Clock,
  Loader2,
  XCircle,
  CheckCircle
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FolderStats } from '@/hooks/useQueuePagination'

interface FolderGroupedViewProps {
  folders: FolderStats[]
  selectedFolder: string | null
  onFolderSelect: (folderPath: string | null) => void
  isLoading?: boolean
}

export function FolderGroupedView({
  folders,
  selectedFolder,
  onFolderSelect,
  isLoading
}: FolderGroupedViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleExpand = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const handleFolderClick = (folderPath: string) => {
    if (selectedFolder === folderPath) {
      onFolderSelect(null) // Deselect
    } else {
      onFolderSelect(folderPath)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading folders...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (folders.length === 0) {
    return null // Don't show if no folders
  }

  // Calculate totals
  const totals = folders.reduce(
    (acc, f) => ({
      total: acc.total + f.total_count,
      queued: acc.queued + f.queued_count,
      processing: acc.processing + f.processing_count,
      failed: acc.failed + f.failed_count
    }),
    { total: 0, queued: 0, processing: 0, failed: 0 }
  )

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header with All Folders option */}
        <button
          className={cn(
            'w-full flex items-center justify-between p-3 border-b hover:bg-muted/50 transition-colors',
            selectedFolder === null && 'bg-primary/5 border-l-2 border-l-primary'
          )}
          onClick={() => onFolderSelect(null)}
        >
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium text-sm">All Folders</p>
              <p className="text-xs text-muted-foreground">
                {totals.total.toLocaleString()} images across {folders.length} folders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totals.queued > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {totals.queued}
              </Badge>
            )}
            {totals.processing > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-50">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {totals.processing}
              </Badge>
            )}
            {totals.failed > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                <XCircle className="h-3 w-3 mr-1" />
                {totals.failed}
              </Badge>
            )}
          </div>
        </button>

        {/* Folder list */}
        <div className="max-h-[300px] overflow-y-auto">
          {folders.map((folder) => {
            const isSelected = selectedFolder === folder.folder_path
            const isExpanded = expandedFolders.has(folder.folder_path)
            const folderName = folder.folder_path.split('/').pop() || folder.folder_path

            return (
              <div key={folder.folder_path}>
                <button
                  className={cn(
                    'w-full flex items-center gap-2 p-3 border-b hover:bg-muted/50 transition-colors text-left',
                    isSelected && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                  onClick={() => handleFolderClick(folder.folder_path)}
                >
                  <button
                    className="p-1 hover:bg-muted rounded"
                    onClick={(e) => toggleExpand(folder.folder_path, e)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  <Folder className="h-4 w-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate" title={folder.folder_path}>
                        {folderName}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {folder.total_count.toLocaleString()} items
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <Progress
                        value={folder.completed_pct || 0}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {folder.completed_pct || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {folder.queued_count > 0 && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {folder.queued_count}
                      </Badge>
                    )}
                    {folder.processing_count > 0 && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5 bg-yellow-50">
                        <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                        {folder.processing_count}
                      </Badge>
                    )}
                    {folder.failed_count > 0 && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5 bg-red-50 text-red-700">
                        <XCircle className="h-2.5 w-2.5 mr-0.5" />
                        {folder.failed_count}
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="bg-muted/30 p-3 border-b text-xs space-y-2">
                    <p className="text-muted-foreground truncate" title={folder.folder_path}>
                      Path: {folder.folder_path}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span>Queued: {folder.queued_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 text-yellow-500" />
                        <span>Processing: {folder.processing_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span>Failed: {folder.failed_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Done: {Math.round(folder.total_count * (folder.completed_pct || 0) / 100)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
