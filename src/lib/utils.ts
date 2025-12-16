import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Design System Utilities
 * Consistent patterns for interactive states
 */

// Selected state styles for option buttons/cards
export const selectedStyles = {
  // Primary selected state (purple)
  brand: {
    selected: "bg-purple-50 ring-1 ring-purple-400 border-purple-200",
    unselected: "bg-slate-50 hover:bg-slate-100 border border-slate-200",
    selectedText: "text-purple-700",
    unselectedText: "text-slate-700",
    selectedIcon: "text-purple-500",
    unselectedIcon: "text-slate-400",
  },
  // Info selected state (blue)
  info: {
    selected: "bg-blue-50 ring-1 ring-blue-400 border-blue-200",
    unselected: "bg-slate-50 hover:bg-slate-100 border border-slate-200",
    selectedText: "text-blue-700",
    unselectedText: "text-slate-700",
    selectedIcon: "text-blue-500",
    unselectedIcon: "text-slate-400",
  },
} as const

// Helper to get selected/unselected classes
export function getSelectionClasses(
  isSelected: boolean,
  variant: keyof typeof selectedStyles = "brand"
) {
  const styles = selectedStyles[variant]
  return {
    container: isSelected ? styles.selected : styles.unselected,
    text: isSelected ? styles.selectedText : styles.unselectedText,
    icon: isSelected ? styles.selectedIcon : styles.unselectedIcon,
  }
}

// Interactive card base styles
export const cardStyles = {
  base: "rounded-lg border transition-all",
  hover: "hover:shadow-sm hover:border-slate-300",
  active: "active:scale-[0.99]",
  clickable: "cursor-pointer",
} as const

// Badge/chip styles
export const chipStyles = {
  brand: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  info: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  success: "bg-green-100 text-green-700 hover:bg-green-200",
  warning: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  error: "bg-red-100 text-red-700 hover:bg-red-200",
  neutral: "bg-slate-100 text-slate-700 hover:bg-slate-200",
} as const

// Status indicator colors
export const statusColors = {
  queued: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  processing: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  completed: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  failed: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
} as const

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
