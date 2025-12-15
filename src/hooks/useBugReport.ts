import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface BugReportData {
  message: string
  screenshot?: string | null
  pageUrl?: string
  metadata?: Record<string, unknown>
}

interface BugReport {
  id: string
  user_id: string
  message: string
  screenshot_url: string | null
  page_url: string | null
  user_agent: string | null
  metadata: Record<string, unknown>
  status: 'new' | 'reviewed' | 'resolved' | 'archived'
  created_at: string
}

/**
 * Hook for submitting bug reports with optional screenshots
 */
export function useBugReport() {
  const { user } = useAuthStore()

  const submitMutation = useMutation({
    mutationFn: async (data: BugReportData): Promise<BugReport> => {
      if (!user) {
        throw new Error('Must be logged in to submit bug reports')
      }

      let screenshotUrl: string | null = null

      // Upload screenshot to storage if provided
      if (data.screenshot) {
        screenshotUrl = await uploadScreenshot(data.screenshot, user.id)
      }

      // Insert bug report record
      // Note: Using 'as any' because bug_reports table may not be in generated types yet
      const { data: report, error } = await (supabase as any)
        .from('bug_reports')
        .insert({
          user_id: user.id,
          message: data.message,
          screenshot_url: screenshotUrl,
          page_url: data.pageUrl || window.location.href,
          user_agent: navigator.userAgent,
          metadata: data.metadata || {}
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return report as BugReport
    }
  })

  return {
    submit: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error,
    reset: submitMutation.reset
  }
}

/**
 * Upload a base64 screenshot to Supabase storage
 */
async function uploadScreenshot(dataUrl: string, userId: string): Promise<string> {
  // Convert base64 to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  // Generate unique filename
  const timestamp = Date.now()
  const filename = `${userId}/${timestamp}.jpg`

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from('bug-screenshots')
    .upload(filename, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600'
    })

  if (uploadError) {
    console.error('Screenshot upload failed:', uploadError)
    throw new Error('Failed to upload screenshot')
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('bug-screenshots')
    .getPublicUrl(filename)

  return urlData.publicUrl
}
