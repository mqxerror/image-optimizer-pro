import { useState, useCallback } from 'react'

interface UseScreenshotReturn {
  screenshot: string | null
  isCapturing: boolean
  capture: () => Promise<string | null>
  clear: () => void
}

/**
 * Hook for capturing screenshots using html2canvas
 * Lazy-loads html2canvas only when capture() is called
 */
export function useScreenshot(): UseScreenshotReturn {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const capture = useCallback(async (): Promise<string | null> => {
    setIsCapturing(true)

    try {
      // Dynamically import html2canvas to avoid loading it until needed
      const html2canvas = (await import('html2canvas')).default

      // Capture the document body
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        allowTaint: true,
        scale: 0.5, // Reduce resolution for smaller file size
        backgroundColor: '#ffffff',
        // Ignore certain elements that might cause issues
        ignoreElements: (element) => {
          // Ignore the feedback widget itself to avoid capturing it
          return element.hasAttribute('data-feedback-widget')
        }
      })

      // Convert to JPEG with 70% quality for smaller file size
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      setScreenshot(dataUrl)
      return dataUrl
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      return null
    } finally {
      setIsCapturing(false)
    }
  }, [])

  const clear = useCallback(() => {
    setScreenshot(null)
  }, [])

  return {
    screenshot,
    isCapturing,
    capture,
    clear
  }
}
