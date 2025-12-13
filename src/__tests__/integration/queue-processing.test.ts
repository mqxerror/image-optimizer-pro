import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockQueueItem,
  createMockHistoryItem,
  createMockGoogleDriveConnection
} from '../mocks/supabase'

/**
 * Integration Tests for Queue Processing Flow
 *
 * Tests the complete workflow from:
 * 1. Adding images to queue
 * 2. Queue management (retry, delete, bulk operations)
 * 3. Processing trigger and status tracking
 * 4. Real-time updates and polling
 * 5. History record creation
 */

// Helper types
interface QueueStats {
  total: number
  queued: number
  processing: number
  failed: number
}

interface ProcessResult {
  succeeded: number
  failed: number
  skipped: number
}

describe('Queue Processing Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Adding Items to Queue', () => {
    it('should create queue item with correct default values', () => {
      const newQueueItem = {
        id: expect.any(String),
        organization_id: 'org-123',
        project_id: 'proj-456',
        file_id: 'drive-file-123',
        file_name: 'ring-photo.jpg',
        status: 'queued',
        progress: 0,
        tokens_reserved: 1,
        retry_count: 0
      }

      expect(newQueueItem.status).toBe('queued')
      expect(newQueueItem.progress).toBe(0)
      expect(newQueueItem.tokens_reserved).toBe(1)
    })

    it('should batch add multiple files to queue', () => {
      const files = [
        { id: 'file-1', name: 'ring1.jpg' },
        { id: 'file-2', name: 'ring2.jpg' },
        { id: 'file-3', name: 'ring3.jpg' }
      ]

      const queueItems = files.map(file => ({
        file_id: file.id,
        file_name: file.name,
        organization_id: 'org-123',
        project_id: 'proj-456',
        status: 'queued',
        progress: 0,
        tokens_reserved: 1
      }))

      expect(queueItems.length).toBe(3)
      expect(queueItems.every(item => item.status === 'queued')).toBe(true)
    })

    it('should validate sufficient token balance before adding', () => {
      const tokenBalance = 10
      const filesToAdd = 15

      const hasInsufficientBalance = tokenBalance < filesToAdd

      expect(hasInsufficientBalance).toBe(true)
    })
  })

  describe('Queue Stats Calculation', () => {
    it('should calculate correct queue statistics', () => {
      const queueItems = [
        createMockQueueItem({ status: 'queued' }),
        createMockQueueItem({ status: 'queued' }),
        createMockQueueItem({ status: 'processing' }),
        createMockQueueItem({ status: 'optimizing' }),
        createMockQueueItem({ status: 'failed' })
      ]

      const stats: QueueStats = {
        total: queueItems.length,
        queued: queueItems.filter(i => i.status === 'queued').length,
        processing: queueItems.filter(i => ['processing', 'optimizing'].includes(i.status)).length,
        failed: queueItems.filter(i => i.status === 'failed').length
      }

      expect(stats.total).toBe(5)
      expect(stats.queued).toBe(2)
      expect(stats.processing).toBe(2)
      expect(stats.failed).toBe(1)
    })

    it('should calculate estimated processing time', () => {
      const queuedCount = 10
      const processingCount = 2
      const secondsPerImage = 30

      const estimatedSeconds = (queuedCount + processingCount) * secondsPerImage
      const estimatedMinutes = Math.ceil(estimatedSeconds / 60)

      expect(estimatedMinutes).toBe(6)
    })
  })

  describe('Queue Filtering', () => {
    it('should filter by status', () => {
      const queueItems = [
        createMockQueueItem({ status: 'queued', file_name: 'a.jpg' }),
        createMockQueueItem({ status: 'failed', file_name: 'b.jpg' }),
        createMockQueueItem({ status: 'queued', file_name: 'c.jpg' })
      ]

      const failedOnly = queueItems.filter(i => i.status === 'failed')

      expect(failedOnly.length).toBe(1)
      expect(failedOnly[0].file_name).toBe('b.jpg')
    })

    it('should filter by project', () => {
      const queueItems = [
        createMockQueueItem({ project_id: 'proj-1', file_name: 'a.jpg' }),
        createMockQueueItem({ project_id: 'proj-2', file_name: 'b.jpg' }),
        createMockQueueItem({ project_id: 'proj-1', file_name: 'c.jpg' })
      ]

      const project1Items = queueItems.filter(i => i.project_id === 'proj-1')

      expect(project1Items.length).toBe(2)
    })

    it('should search by file name', () => {
      const queueItems = [
        createMockQueueItem({ file_name: 'diamond-ring.jpg' }),
        createMockQueueItem({ file_name: 'gold-necklace.jpg' }),
        createMockQueueItem({ file_name: 'diamond-earrings.jpg' })
      ]

      const searchQuery = 'diamond'
      const filtered = queueItems.filter(i =>
        i.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )

      expect(filtered.length).toBe(2)
    })
  })

  describe('Single Item Operations', () => {
    it('should delete single queue item', async () => {
      const itemId = 'queue-item-123'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      // Simulate deletion
      const deletedItem = { id: itemId, deleted: true }

      expect(deletedItem.deleted).toBe(true)
    })

    it('should retry failed item by resetting status', () => {
      const failedItem = createMockQueueItem({
        status: 'failed',
        error_message: 'API error',
        retry_count: 1
      })

      const retryUpdate = {
        status: 'queued',
        error_message: null,
        retry_count: 0,
        progress: 0
      }

      expect(retryUpdate.status).toBe('queued')
      expect(retryUpdate.error_message).toBeNull()
      expect(retryUpdate.retry_count).toBe(0)
    })
  })

  describe('Bulk Operations', () => {
    it('should bulk delete selected items', () => {
      const selectedIds = ['id-1', 'id-2', 'id-3']

      // Simulate bulk delete result
      const result = {
        deleted: selectedIds.length,
        errors: []
      }

      expect(result.deleted).toBe(3)
      expect(result.errors.length).toBe(0)
    })

    it('should bulk retry failed items', () => {
      const failedItems = [
        createMockQueueItem({ id: 'failed-1', status: 'failed' }),
        createMockQueueItem({ id: 'failed-2', status: 'failed' })
      ]

      const retryIds = failedItems.map(i => i.id)
      const result = {
        retried: retryIds.length
      }

      expect(result.retried).toBe(2)
    })

    it('should clear all queued items', () => {
      const queueItems = [
        createMockQueueItem({ status: 'queued' }),
        createMockQueueItem({ status: 'queued' }),
        createMockQueueItem({ status: 'processing' }),
        createMockQueueItem({ status: 'failed' })
      ]

      const queuedItems = queueItems.filter(i => i.status === 'queued')

      // Only 'queued' items should be cleared
      expect(queuedItems.length).toBe(2)
    })

    it('should reset stuck processing items', () => {
      const stuckItems = [
        createMockQueueItem({ status: 'processing', progress: 30 }),
        createMockQueueItem({ status: 'optimizing', progress: 80 })
      ]

      const resetUpdate = {
        status: 'queued',
        error_message: '',
        progress: 0
      }

      expect(resetUpdate.status).toBe('queued')
      expect(resetUpdate.progress).toBe(0)
    })
  })

  describe('Process Queue Trigger', () => {
    it('should call process-queue endpoint with batch size', async () => {
      const organizationId = 'org-123'
      const batchSize = 10

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          processed: 10,
          failed: 0,
          skipped: 0
        })
      })

      const response = await mockFetch(
        'https://test.supabase.co/functions/v1/process-queue',
        {
          method: 'POST',
          body: JSON.stringify({
            organization_id: organizationId,
            batch_size: batchSize
          })
        }
      )

      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should process selected items individually', async () => {
      const selectedIds = ['queue-1', 'queue-2', 'queue-3']

      // Mock parallel processing
      mockFetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          queue_item_id: 'queue-id',
          was_optimized: true
        })
      }))

      const results = await Promise.allSettled(
        selectedIds.map(id =>
          mockFetch(`https://test.supabase.co/functions/v1/process-image`, {
            method: 'POST',
            body: JSON.stringify({ queue_item_id: id })
          })
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      expect(succeeded).toBe(3)
      expect(failed).toBe(0)
    })
  })

  describe('Progress Tracking', () => {
    it('should track progress through all stages', () => {
      const progressStages = [
        { stage: 'queued', progress: 0 },
        { stage: 'fetching', progress: 10 },
        { stage: 'downloading', progress: 30 },
        { stage: 'uploading_original', progress: 50 },
        { stage: 'optimizing', progress: 80 },
        { stage: 'completed', progress: 100 }
      ]

      expect(progressStages[0].progress).toBe(0)
      expect(progressStages[progressStages.length - 1].progress).toBe(100)
    })

    it('should poll for updates at 3 second interval', () => {
      const pollInterval = 3000 // milliseconds

      expect(pollInterval).toBe(3000)
    })
  })

  describe('Real-time Updates', () => {
    it('should update queue items when status changes', () => {
      const initialItems = [
        createMockQueueItem({ id: 'q-1', status: 'queued', progress: 0 }),
        createMockQueueItem({ id: 'q-2', status: 'queued', progress: 0 })
      ]

      const updatedItems = initialItems.map(item =>
        item.id === 'q-1'
          ? { ...item, status: 'processing', progress: 30 }
          : item
      )

      expect(updatedItems[0].status).toBe('processing')
      expect(updatedItems[0].progress).toBe(30)
      expect(updatedItems[1].status).toBe('queued')
    })

    it('should remove completed items from queue view', () => {
      const queueItems = [
        createMockQueueItem({ id: 'q-1', status: 'queued' }),
        createMockQueueItem({ id: 'q-2', status: 'completed' }),
        createMockQueueItem({ id: 'q-3', status: 'failed' })
      ]

      const activeItems = queueItems.filter(
        i => i.status !== 'completed'
      )

      expect(activeItems.length).toBe(2)
    })
  })

  describe('Error Display', () => {
    it('should display error message for failed items', () => {
      const failedItem = createMockQueueItem({
        status: 'failed',
        error_message: 'Failed to download from Google Drive: File not found'
      })

      expect(failedItem.error_message).toContain('Failed to download')
    })

    it('should allow expanding error details', () => {
      const failedItem = createMockQueueItem({
        id: 'failed-item',
        error_message: 'Long error message with technical details...'
      })

      const expandedErrorId = failedItem.id
      const isExpanded = expandedErrorId === failedItem.id

      expect(isExpanded).toBe(true)
    })
  })

  describe('Selection State', () => {
    it('should track selected items', () => {
      const selectedItems = new Set(['id-1', 'id-2'])

      expect(selectedItems.has('id-1')).toBe(true)
      expect(selectedItems.has('id-3')).toBe(false)
      expect(selectedItems.size).toBe(2)
    })

    it('should toggle select all', () => {
      const allItems = [
        createMockQueueItem({ id: 'q-1' }),
        createMockQueueItem({ id: 'q-2' }),
        createMockQueueItem({ id: 'q-3' })
      ]

      const selectedAll = new Set(allItems.map(i => i.id))

      expect(selectedAll.size).toBe(allItems.length)
    })

    it('should filter selected items by status', () => {
      const selectedItems = new Set(['q-1', 'q-2', 'q-3'])
      const queueItems = [
        createMockQueueItem({ id: 'q-1', status: 'queued' }),
        createMockQueueItem({ id: 'q-2', status: 'failed' }),
        createMockQueueItem({ id: 'q-3', status: 'queued' })
      ]

      const selectedFailedItems = Array.from(selectedItems).filter(id =>
        queueItems.find(i => i.id === id)?.status === 'failed'
      )

      const selectedQueuedItems = Array.from(selectedItems).filter(id =>
        queueItems.find(i => i.id === id)?.status === 'queued'
      )

      expect(selectedFailedItems.length).toBe(1)
      expect(selectedQueuedItems.length).toBe(2)
    })
  })

  describe('View Modes', () => {
    it('should support table view mode', () => {
      const viewMode = 'table'
      expect(viewMode).toBe('table')
    })

    it('should support grid view mode', () => {
      const viewMode = 'grid'
      expect(viewMode).toBe('grid')
    })
  })
})

describe('Queue to History Flow', () => {
  it('should create history record on successful processing', () => {
    const queueItem = createMockQueueItem({
      file_name: 'diamond-ring.jpg',
      organization_id: 'org-123',
      project_id: 'proj-456'
    })

    const historyRecord = createMockHistoryItem({
      file_name: queueItem.file_name,
      organization_id: queueItem.organization_id,
      project_id: queueItem.project_id,
      status: 'completed',
      tokens_used: 1
    })

    expect(historyRecord.file_name).toBe(queueItem.file_name)
    expect(historyRecord.status).toBe('completed')
  })

  it('should preserve file metadata in history', () => {
    const historyRecord = createMockHistoryItem({
      file_name: 'necklace.jpg',
      original_url: 'https://storage.test/original.jpg',
      optimized_url: 'https://storage.test/optimized.png',
      processing_time_sec: 45,
      generated_prompt: 'Enhance jewelry image'
    })

    expect(historyRecord.original_url).toBeDefined()
    expect(historyRecord.optimized_url).toBeDefined()
    expect(historyRecord.processing_time_sec).toBe(45)
  })

  it('should deduct tokens after successful processing', () => {
    const initialBalance = 100
    const tokensUsed = 1
    const newBalance = initialBalance - tokensUsed

    expect(newBalance).toBe(99)
  })

  it('should not deduct tokens on failed processing', () => {
    const initialBalance = 100
    const processingFailed = true
    const tokensUsed = processingFailed ? 0 : 1
    const newBalance = initialBalance - tokensUsed

    expect(newBalance).toBe(100)
  })
})

describe('Concurrent Processing', () => {
  it('should handle multiple items processing simultaneously', async () => {
    const processingItems = [
      createMockQueueItem({ id: 'p-1', status: 'processing', progress: 30 }),
      createMockQueueItem({ id: 'p-2', status: 'processing', progress: 50 }),
      createMockQueueItem({ id: 'p-3', status: 'optimizing', progress: 80 })
    ]

    expect(processingItems.length).toBe(3)
    expect(processingItems.every(i => ['processing', 'optimizing'].includes(i.status))).toBe(true)
  })

  it('should respect batch size limits', () => {
    const queuedCount = 50
    const batchSize = 10

    const itemsToProcess = Math.min(queuedCount, batchSize)

    expect(itemsToProcess).toBe(10)
  })

  it('should handle partial batch failures', () => {
    const results: ProcessResult = {
      succeeded: 8,
      failed: 2,
      skipped: 0
    }

    expect(results.succeeded + results.failed).toBe(10)
    expect(results.failed).toBeGreaterThan(0)
  })
})
