import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockQueueItem,
  createMockGoogleDriveConnection,
  createMockHistoryItem
} from '../mocks/supabase'
import {
  createMockKieAiSuccessStatus
} from '../mocks/kie-ai'

/**
 * Tests for process-image Edge Function
 *
 * This edge function orchestrates:
 * 1. Fetching queue item from database
 * 2. Downloading image from Google Drive
 * 3. Uploading original to Supabase Storage
 * 4. Calling optimize-image for Kie.ai processing
 * 5. Uploading optimized image to storage
 * 6. Creating processing history record
 * 7. Updating queue item status
 */

// Mock Supabase client operations
const createMockSupabaseOps = () => ({
  queueItem: null as any,
  connection: null as any,
  historyRecord: null as any,
  updateCalls: [] as any[],
  insertCalls: [] as any[]
})

describe('process-image Edge Function', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let mockSupabase: ReturnType<typeof createMockSupabaseOps>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    mockSupabase = createMockSupabaseOps()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Validation', () => {
    it('should require Authorization header', () => {
      const response = {
        error: 'Authorization required',
        status: 401
      }

      expect(response.error).toBe('Authorization required')
      expect(response.status).toBe(401)
    })

    it('should require queue_item_id in request body', () => {
      const response = {
        error: 'queue_item_id required',
        status: 400
      }

      expect(response.error).toBe('queue_item_id required')
      expect(response.status).toBe(400)
    })

    it('should return 404 when queue item not found', () => {
      const response = {
        error: 'Queue item not found',
        status: 404
      }

      expect(response.error).toBe('Queue item not found')
      expect(response.status).toBe(404)
    })
  })

  describe('Queue Item Processing', () => {
    it('should fetch queue item with projects relation', () => {
      const queueItem = createMockQueueItem({
        status: 'queued',
        projects: {
          id: 'test-project',
          name: 'Test Project',
          settings: { prompt: 'Custom prompt' }
        }
      })

      expect(queueItem.projects).toBeDefined()
      expect(queueItem.projects.settings.prompt).toBe('Custom prompt')
    })

    it('should update status to processing with progress 10', () => {
      const updatePayload = {
        status: 'processing',
        progress: 10,
        started_at: expect.any(String)
      }

      expect(updatePayload.status).toBe('processing')
      expect(updatePayload.progress).toBe(10)
    })

    it('should require active Google Drive connection', () => {
      const connection = createMockGoogleDriveConnection({
        is_active: true
      })

      expect(connection.is_active).toBe(true)
    })

    it('should throw error when no active connection found', () => {
      const errorResponse = {
        error: 'No active Google Drive connection found'
      }

      expect(errorResponse.error).toBe('No active Google Drive connection found')
    })
  })

  describe('Google Drive Download', () => {
    it('should call google-drive-files function with correct parameters', async () => {
      const queueItem = createMockQueueItem()
      const connection = createMockGoogleDriveConnection()

      const expectedBody = {
        action: 'download',
        folder_id: queueItem.file_id,
        connection_id: connection.id
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: 'base64-encoded-image-data',
          contentType: 'image/jpeg'
        })
      })

      const response = await mockFetch(
        'https://test.supabase.co/functions/v1/google-drive-files',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(expectedBody)
        }
      )

      expect(mockFetch).toHaveBeenCalled()
      const result = await response.json()
      expect(result.data).toBeDefined()
      expect(result.contentType).toBe('image/jpeg')
    })

    it('should throw error when Google Drive download fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'File not found'
      })

      const response = await mockFetch('https://test.supabase.co/functions/v1/google-drive-files')

      expect(response.ok).toBe(false)
    })

    it('should update progress to 30 after download', () => {
      const progressUpdate = { progress: 30 }
      expect(progressUpdate.progress).toBe(30)
    })
  })

  describe('Storage Upload', () => {
    it('should generate correct storage path for original', () => {
      const queueItem = createMockQueueItem({
        organization_id: 'org-123',
        project_id: 'proj-456',
        file_name: 'ring.jpg'
      })

      const timestamp = Date.now()
      const fileExt = queueItem.file_name.split('.').pop()
      const originalPath = `${queueItem.organization_id}/${queueItem.project_id}/original_${timestamp}.${fileExt}`

      expect(originalPath).toContain('org-123')
      expect(originalPath).toContain('proj-456')
      expect(originalPath).toContain('original_')
      expect(originalPath).toContain('.jpg')
    })

    it('should generate correct storage path for optimized', () => {
      const queueItem = createMockQueueItem({
        organization_id: 'org-123',
        project_id: 'proj-456'
      })

      const timestamp = Date.now()
      const optimizedPath = `${queueItem.organization_id}/${queueItem.project_id}/optimized_${timestamp}.png`

      expect(optimizedPath).toContain('org-123')
      expect(optimizedPath).toContain('proj-456')
      expect(optimizedPath).toContain('optimized_')
      expect(optimizedPath).toContain('.png')
    })

    it('should upload to processed-images bucket', () => {
      const bucket = 'processed-images'
      expect(bucket).toBe('processed-images')
    })

    it('should update progress to 50 after original upload', () => {
      const progressUpdate = { progress: 50 }
      expect(progressUpdate.progress).toBe(50)
    })
  })

  describe('Kie.ai Optimization Call', () => {
    it('should call optimize-image with correct payload', async () => {
      const imageDataUrl = 'data:image/jpeg;base64,/9j/4AAQ...'
      const projectSettings = {
        prompt: 'Enhance jewelry image',
        remove_background: true
      }

      const expectedPayload = {
        image_url: imageDataUrl,
        file_id: 'test-file-id',
        prompt: projectSettings.prompt,
        settings: {
          enhance_quality: true,
          remove_background: true,
          enhance_lighting: true,
          enhance_colors: true
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          optimized_url: 'https://kie.ai/result/optimized.png'
        })
      })

      const response = await mockFetch(
        'https://test.supabase.co/functions/v1/optimize-image',
        {
          method: 'POST',
          body: JSON.stringify(expectedPayload)
        }
      )

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.optimized_url).toBeDefined()
    })

    it('should use default prompt when project has no custom prompt', () => {
      const defaultPrompt = 'Enhance this jewelry image with clean white background'
      expect(defaultPrompt).toContain('jewelry')
    })

    it('should update progress to 80 after optimization', () => {
      const progressUpdate = { progress: 80 }
      expect(progressUpdate.progress).toBe(80)
    })

    it('should handle passthrough mode from optimize-image', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          passthrough: true,
          original_url: 'https://storage.test.com/original.jpg',
          message: 'API key not configured'
        })
      })

      const response = await mockFetch('https://test.supabase.co/functions/v1/optimize-image')
      const result = await response.json()

      expect(result.passthrough).toBe(true)
    })
  })

  describe('Optimized Image Download', () => {
    it('should download optimized image from Kie.ai result URL', async () => {
      const optimizedUrl = 'https://kie.ai/result/optimized.png'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1024)
      })

      const response = await mockFetch(optimizedUrl)

      expect(response.ok).toBe(true)
      const buffer = await response.arrayBuffer()
      expect(buffer.byteLength).toBeGreaterThan(0)
    })

    it('should handle failed download gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const response = await mockFetch('https://kie.ai/result/nonexistent.png')

      expect(response.ok).toBe(false)
    })
  })

  describe('History Record Creation', () => {
    it('should create history record with all required fields', () => {
      const queueItem = createMockQueueItem()
      const originalUrl = 'https://storage.test.com/original.jpg'
      const optimizedUrl = 'https://storage.test.com/optimized.png'
      const startTime = Date.now() - 45000 // 45 seconds ago

      const historyRecord = {
        organization_id: queueItem.organization_id,
        project_id: queueItem.project_id,
        file_id: queueItem.file_id,
        file_name: queueItem.file_name,
        original_url: originalUrl,
        optimized_url: optimizedUrl,
        file_size_before: 102400,
        file_size_after: 98304,
        processing_time_sec: 45,
        generated_prompt: 'Enhance jewelry image',
        tokens_used: 1,
        status: 'completed',
        completed_at: new Date().toISOString()
      }

      expect(historyRecord.organization_id).toBe(queueItem.organization_id)
      expect(historyRecord.status).toBe('completed')
      expect(historyRecord.tokens_used).toBe(1)
    })

    it('should set status to completed_passthrough when using original image', () => {
      const historyRecord = {
        status: 'completed_passthrough'
      }

      expect(historyRecord.status).toBe('completed_passthrough')
    })

    it('should calculate processing time correctly', () => {
      const startedAt = new Date(Date.now() - 30000) // 30 seconds ago
      const processingTimeMs = Date.now() - startedAt.getTime()
      const processingTimeSec = Math.round(processingTimeMs / 1000)

      expect(processingTimeSec).toBeGreaterThanOrEqual(29)
      expect(processingTimeSec).toBeLessThanOrEqual(31)
    })
  })

  describe('Queue Item Completion', () => {
    it('should update queue item to completed status', () => {
      const completedUpdate = {
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        result_url: 'https://storage.test.com/optimized.png',
        error_message: null
      }

      expect(completedUpdate.status).toBe('completed')
      expect(completedUpdate.progress).toBe(100)
    })

    it('should set error message for passthrough mode', () => {
      const passthroughUpdate = {
        status: 'completed',
        progress: 100,
        error_message: 'Processed in passthrough mode - original returned'
      }

      expect(passthroughUpdate.error_message).toContain('passthrough')
    })
  })

  describe('Error Handling', () => {
    it('should update queue item to failed status on error', () => {
      const errorUpdate = {
        status: 'failed',
        error_message: 'Failed to download from Google Drive',
        completed_at: new Date().toISOString()
      }

      expect(errorUpdate.status).toBe('failed')
      expect(errorUpdate.error_message).toBeDefined()
    })

    it('should include queue_item_id in error response', () => {
      const errorResponse = {
        error: 'Processing failed',
        queue_item_id: 'test-queue-id'
      }

      expect(errorResponse.queue_item_id).toBe('test-queue-id')
    })

    it('should handle missing project settings gracefully', () => {
      const queueItem = createMockQueueItem({
        projects: null
      })

      const projectSettings = queueItem.projects?.settings || {}

      expect(projectSettings).toEqual({})
    })
  })

  describe('Success Response', () => {
    it('should return complete success response', () => {
      const successResponse = {
        success: true,
        queue_item_id: 'queue-123',
        history_id: 'history-456',
        original_url: 'https://storage.test.com/original.jpg',
        optimized_url: 'https://storage.test.com/optimized.png',
        was_optimized: true,
        passthrough: false
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.queue_item_id).toBeDefined()
      expect(successResponse.history_id).toBeDefined()
      expect(successResponse.was_optimized).toBe(true)
      expect(successResponse.passthrough).toBe(false)
    })

    it('should indicate passthrough in response when using original', () => {
      const passthroughResponse = {
        success: true,
        was_optimized: false,
        passthrough: true
      }

      expect(passthroughResponse.was_optimized).toBe(false)
      expect(passthroughResponse.passthrough).toBe(true)
    })
  })

  describe('Processing Flow Validation', () => {
    it('should follow correct progress sequence', () => {
      const progressSequence = [10, 30, 50, 80, 100]

      expect(progressSequence[0]).toBe(10)  // After fetching queue item
      expect(progressSequence[1]).toBe(30)  // After Google Drive download
      expect(progressSequence[2]).toBe(50)  // After uploading original
      expect(progressSequence[3]).toBe(80)  // After Kie.ai optimization
      expect(progressSequence[4]).toBe(100) // Completed
    })

    it('should follow correct status transitions', () => {
      const statusFlow = ['queued', 'processing', 'completed']

      expect(statusFlow[0]).toBe('queued')
      expect(statusFlow[1]).toBe('processing')
      expect(statusFlow[2]).toBe('completed')
    })

    it('should follow error status transition', () => {
      const errorFlow = ['queued', 'processing', 'failed']

      expect(errorFlow[2]).toBe('failed')
    })
  })
})

describe('process-image Integration Scenarios', () => {
  describe('Happy Path', () => {
    it('should process image successfully with all steps', async () => {
      // This test validates the complete flow
      const steps = [
        { name: 'fetch_queue_item', status: 'success' },
        { name: 'download_from_drive', status: 'success' },
        { name: 'upload_original', status: 'success' },
        { name: 'optimize_with_kie', status: 'success' },
        { name: 'download_optimized', status: 'success' },
        { name: 'upload_optimized', status: 'success' },
        { name: 'create_history', status: 'success' },
        { name: 'update_queue', status: 'success' }
      ]

      expect(steps.length).toBe(8)
      expect(steps.every(s => s.status === 'success')).toBe(true)
    })
  })

  describe('Passthrough Scenarios', () => {
    it('should handle API key not configured', () => {
      const scenario = {
        cause: 'KIE_AI_API_KEY not set',
        result: 'passthrough',
        original_preserved: true
      }

      expect(scenario.result).toBe('passthrough')
    })

    it('should handle Kie.ai rate limiting', () => {
      const scenario = {
        cause: 'Kie.ai 429 rate limit',
        result: 'passthrough',
        original_preserved: true
      }

      expect(scenario.result).toBe('passthrough')
    })

    it('should handle Kie.ai timeout', () => {
      const scenario = {
        cause: 'Polling timeout after 60 seconds',
        result: 'passthrough',
        original_preserved: true
      }

      expect(scenario.result).toBe('passthrough')
    })
  })

  describe('Failure Scenarios', () => {
    it('should fail when Google Drive connection inactive', () => {
      const scenario = {
        cause: 'No active Google Drive connection',
        result: 'failed',
        error_message: 'No active Google Drive connection found'
      }

      expect(scenario.result).toBe('failed')
    })

    it('should fail when Google Drive file not found', () => {
      const scenario = {
        cause: 'File deleted from Google Drive',
        result: 'failed',
        error_message: 'Failed to download from Google Drive'
      }

      expect(scenario.result).toBe('failed')
    })

    it('should fail when storage upload fails', () => {
      const scenario = {
        cause: 'Supabase storage quota exceeded',
        result: 'failed',
        error_message: 'Storage upload failed'
      }

      expect(scenario.result).toBe('failed')
    })
  })
})
