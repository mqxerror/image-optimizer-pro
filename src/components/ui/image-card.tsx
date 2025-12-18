import { useState, useMemo, memo } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ProxiedThumbnail } from '@/components/ui/proxied-thumbnail'
import { cn } from '@/lib/utils'

// Status configuration helper
function getStatusConfig(status: string | null | undefined) {
  const normalizedStatus = status?.toLowerCase()

  const isProcessed = normalizedStatus === 'success' || normalizedStatus === 'completed'
  const isProcessing = normalizedStatus === 'processing' || normalizedStatus === 'optimizing' || normalizedStatus === 'submitted'
  const isFailed = normalizedStatus === 'failed'
  const isQueued = normalizedStatus === 'queued' || normalizedStatus === 'pending' || !status

  if (isProcessed) return {
    border: 'border-green-400 border-2',
    bg: 'bg-green-500',
    icon: <CheckCircle className="h-3 w-3 text-white" />,
    gradient: 'from-green-900/80',
    placeholder: 'from-green-50 to-green-100',
    placeholderIcon: 'text-green-400',
    overlay: null,
    label: 'Done'
  }
  if (isProcessing) return {
    border: 'border-blue-400 border-2',
    bg: 'bg-blue-500',
    icon: <Loader2 className="h-3 w-3 text-white animate-spin" />,
    gradient: 'from-blue-900/80',
    placeholder: 'from-blue-50 to-blue-100',
    placeholderIcon: 'text-blue-400',
    overlay: 'bg-blue-500/10 animate-pulse',
    label: 'Processing'
  }
  if (isFailed) return {
    border: 'border-red-400 border-2',
    bg: 'bg-red-500',
    icon: <XCircle className="h-3 w-3 text-white" />,
    gradient: 'from-red-900/80',
    placeholder: 'from-red-50 to-red-100',
    placeholderIcon: 'text-red-400',
    overlay: null,
    label: 'Failed'
  }
  return {
    border: 'border-slate-200',
    bg: 'bg-slate-400',
    icon: <Clock className="h-3 w-3 text-white" />,
    gradient: 'from-black/60',
    placeholder: 'from-slate-50 to-slate-100',
    placeholderIcon: 'text-slate-400',
    overlay: null,
    label: 'Queued'
  }
}

export interface ImageCardProps {
  id: string
  fileId?: string | null
  fileName?: string | null
  thumbnailUrl?: string | null
  optimizedUrl?: string | null
  status?: string | null
  errorMessage?: string | null
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onClick?: (id: string) => void
  showCheckbox?: boolean
  showStatus?: boolean
  showFileName?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

export const ImageCard = memo(function ImageCard({
  id,
  fileId,
  fileName,
  thumbnailUrl,
  optimizedUrl,
  status,
  errorMessage,
  isSelected = false,
  onSelect,
  onClick,
  showCheckbox = true,
  showStatus = true,
  showFileName = true,
  size = 'md',
  className,
  children
}: ImageCardProps) {
  const [imageError, setImageError] = useState(false)

  // Determine file type for display
  const fileExt = fileName?.split('.').pop()?.toLowerCase() || ''

  // Get status configuration
  const statusConfig = useMemo(() => getStatusConfig(status), [status])

  const isFailed = status?.toLowerCase() === 'failed'
  const isProcessing = ['processing', 'optimizing', 'submitted'].includes(status?.toLowerCase() || '')

  // Handle click
  const handleClick = () => {
    if (onSelect) {
      onSelect(id, !isSelected)
    } else if (onClick) {
      onClick(id)
    }
  }

  // Render thumbnail based on source
  const renderThumbnail = () => {
    // If we have an optimized URL (from our storage), use it directly
    if (optimizedUrl && !imageError) {
      return (
        <img
          src={optimizedUrl}
          alt={fileName || 'Image'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      )
    }

    // If we have a direct thumbnail URL, use it
    if (thumbnailUrl && !fileId && !imageError) {
      return (
        <img
          src={thumbnailUrl}
          alt={fileName || 'Image'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      )
    }

    // If we have a file_id (Google Drive), use ProxiedThumbnail
    if (fileId && !imageError) {
      return (
        <ProxiedThumbnail
          fileId={fileId}
          alt={fileName || 'Image'}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full"
        />
      )
    }

    // Fallback placeholder
    return (
      <div className={cn(
        'w-full h-full flex flex-col items-center justify-center bg-gradient-to-br',
        statusConfig.placeholder
      )}>
        <ImageIcon className={cn(
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6',
          'mb-1',
          statusConfig.placeholderIcon
        )} />
        <span className="text-[9px] font-medium text-slate-600 uppercase px-1">
          {fileExt || 'img'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden group cursor-pointer transition-all',
        statusConfig.border,
        isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-primary/50',
        isFailed && 'opacity-75',
        className
      )}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      {renderThumbnail()}

      {/* Checkbox (visible on hover or when selected) */}
      {showCheckbox && onSelect && (
        <div
          className={cn(
            'absolute top-1 left-1 transition-opacity z-10',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(id, !isSelected)
          }}
        >
          <Checkbox
            checked={isSelected}
            className="bg-white/90 border-white shadow-sm"
          />
        </div>
      )}

      {/* Status Badge */}
      {showStatus && (
        <div className={cn(
          'absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-sm z-10',
          statusConfig.bg
        )}>
          {statusConfig.icon}
        </div>
      )}

      {/* Filename with status indicator gradient */}
      {showFileName && (
        <div className={cn(
          'absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t to-transparent',
          statusConfig.gradient
        )}>
          <p className={cn(
            'text-white truncate font-medium',
            size === 'sm' ? 'text-[8px]' : 'text-[10px]'
          )}>
            {fileName || 'Untitled'}
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {isFailed && errorMessage && (
        <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <div className="bg-white/95 rounded px-2 py-1 max-w-[90%] shadow-lg">
            <p className="text-[9px] text-red-600 line-clamp-2 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Processing animation overlay */}
      {isProcessing && statusConfig.overlay && (
        <div className={cn('absolute inset-0 pointer-events-none', statusConfig.overlay)} />
      )}

      {/* Custom children (for action buttons, etc.) */}
      {children}
    </div>
  )
})

// Export the status config helper for external use
export { getStatusConfig }
