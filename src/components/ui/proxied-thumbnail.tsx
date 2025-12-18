import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

// Simple in-memory cache for thumbnail URLs
const thumbnailCache = new Map<string, string>()

// Total timeout for loading a thumbnail
const TOTAL_TIMEOUT = 8000

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
  const { isInitialized } = useAuthStore()
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    // Check cache first
    return thumbnailCache.get(fileId) || null
  })
  const [isLoading, setIsLoading] = useState(!thumbnailCache.has(fileId))
  const [hasError, setHasError] = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxRetries = 2

  useEffect(() => {
    let cancelled = false

    // If already cached, skip fetching
    if (thumbnailCache.has(fileId)) {
      setThumbnailUrl(thumbnailCache.get(fileId)!)
      setIsLoading(false)
      return
    }

    // Don't start fetching until auth is initialized
    if (!isInitialized) {
      return
    }

    // Set up total timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!cancelled && isLoading) {
        console.warn('Thumbnail load timed out for', fileId)
        setHasError(true)
        setIsLoading(false)
      }
    }, TOTAL_TIMEOUT)

    async function fetchThumbnail() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) {
          // Wait for auth to be ready and retry
          if (!session && retryCountRef.current < maxRetries) {
            retryCountRef.current++
            setTimeout(fetchThumbnail, 500 * retryCountRef.current)
            return
          }
          throw new Error('No session')
        }

        const baseUrl = import.meta.env.VITE_SUPABASE_URL
        const url = `${baseUrl}/functions/v1/thumbnail-proxy?fileId=${encodeURIComponent(fileId)}`

        // Fetch with auth header
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok || cancelled) {
          // Retry on server errors
          if (response.status >= 500 && retryCountRef.current < maxRetries) {
            retryCountRef.current++
            setTimeout(fetchThumbnail, 1000 * retryCountRef.current)
            return
          }
          throw new Error(`Failed to load thumbnail: ${response.status}`)
        }

        // Convert to blob URL for display
        const blob = await response.blob()
        if (cancelled) return

        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl

        // Cache the blob URL
        thumbnailCache.set(fileId, blobUrl)

        setThumbnailUrl(blobUrl)
        setIsLoading(false)

        // Clear timeout on success
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      } catch (error) {
        if (!cancelled) {
          // Retry on network errors
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++
            setTimeout(fetchThumbnail, 1000 * retryCountRef.current)
            return
          }
          console.error('Thumbnail load error:', error)
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    fetchThumbnail()

    return () => {
      cancelled = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Don't revoke cached URLs - they're shared
    }
  }, [fileId, isInitialized, isLoading])

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-slate-100 rounded',
        fallbackClassName || className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    )
  }

  if (hasError || !thumbnailUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-slate-100 rounded',
        fallbackClassName || className
      )}>
        <ImageIcon className="h-5 w-5 text-slate-400" />
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
