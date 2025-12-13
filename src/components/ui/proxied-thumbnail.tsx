import { useState, useEffect } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ProxiedThumbnailProps {
  fileId: string
  alt?: string
  className?: string
  fallbackClassName?: string
}

export function ProxiedThumbnail({
  fileId,
  alt = 'Thumbnail',
  className,
  fallbackClassName
}: ProxiedThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchThumbnail() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) return

        const baseUrl = import.meta.env.VITE_SUPABASE_URL
        const url = `${baseUrl}/functions/v1/thumbnail-proxy?fileId=${encodeURIComponent(fileId)}`

        // Fetch with auth header
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok || cancelled) {
          throw new Error('Failed to load thumbnail')
        }

        // Convert to blob URL for display
        const blob = await response.blob()
        if (cancelled) return

        const blobUrl = URL.createObjectURL(blob)
        setThumbnailUrl(blobUrl)
        setIsLoading(false)
      } catch (error) {
        if (!cancelled) {
          console.error('Thumbnail load error:', error)
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    fetchThumbnail()

    return () => {
      cancelled = true
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl)
      }
    }
  }, [fileId])

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-gray-100 rounded',
        fallbackClassName || className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (hasError || !thumbnailUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-gray-100 rounded',
        fallbackClassName || className
      )}>
        <ImageIcon className="h-5 w-5 text-gray-400" />
      </div>
    )
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={cn('object-cover rounded', className)}
      onError={() => setHasError(true)}
    />
  )
}
