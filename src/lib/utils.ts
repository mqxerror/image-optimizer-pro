import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a proxied thumbnail URL for Google Drive files
 * Google Drive thumbnails require authentication, so we proxy through our Edge Function
 */
export function getThumbnailProxyUrl(fileId: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const params = new URLSearchParams({ fileId })
  return `${baseUrl}/functions/v1/thumbnail-proxy?${params.toString()}`
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
