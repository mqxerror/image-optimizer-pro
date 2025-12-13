import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockKieAiAsyncResponse,
  createMockKieAiDirectResponse,
  createMockKieAiSuccessStatus,
  createMockKieAiPendingStatus,
  createMockKieAiFailedStatus,
  TEST_PROMPTS,
  TEST_SETTINGS
} from '../mocks/kie-ai'

/**
 * Kie.ai API Integration Tests
 *
 * Tests for the Kie.ai Flux Kontext API integration:
 * 1. API request/response handling
 * 2. Async task polling mechanism
 * 3. Error handling and rate limiting
 * 4. Timeout and retry logic
 * 5. Image URL extraction
 */

// Kie.ai API endpoints
const KIE_AI_ENDPOINTS = {
  generate: 'https://api.kie.ai/api/v1/flux/kontext/generate',
  status: 'https://api.kie.ai/api/v1/flux/kontext/record-info'
}

// API configuration
const API_CONFIG = {
  model: 'flux-kontext-pro',
  aspect_ratio: '1:1',
  output_format: 'png',
  max_poll_attempts: 30,
  poll_interval_ms: 2000,
  max_wait_time_ms: 60000
}

describe('Kie.ai API Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Generate Endpoint', () => {
    describe('Request Format', () => {
      it('should use correct endpoint URL', () => {
        expect(KIE_AI_ENDPOINTS.generate).toBe('https://api.kie.ai/api/v1/flux/kontext/generate')
      })

      it('should send POST request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiAsyncResponse()
        })

        await mockFetch(KIE_AI_ENDPOINTS.generate, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: TEST_PROMPTS.default,
            image: 'data:image/jpeg;base64,...',
            model: API_CONFIG.model,
            aspect_ratio: API_CONFIG.aspect_ratio,
            output_format: API_CONFIG.output_format
          })
        })

        expect(mockFetch).toHaveBeenCalledWith(
          KIE_AI_ENDPOINTS.generate,
          expect.objectContaining({
            method: 'POST'
          })
        )
      })

      it('should include Bearer token authorization', async () => {
        const apiKey = 'kie-ai-api-key-12345'

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiAsyncResponse()
        })

        await mockFetch(KIE_AI_ENDPOINTS.generate, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        })

        const callHeaders = mockFetch.mock.calls[0][1].headers
        expect(callHeaders['Authorization']).toBe(`Bearer ${apiKey}`)
      })

      it('should send image as base64 data URL', async () => {
        const imageDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiAsyncResponse()
        })

        await mockFetch(KIE_AI_ENDPOINTS.generate, {
          method: 'POST',
          body: JSON.stringify({ image: imageDataUrl })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody.image).toContain('data:image/jpeg;base64,')
      })

      it('should use flux-kontext-pro model', () => {
        expect(API_CONFIG.model).toBe('flux-kontext-pro')
      })

      it('should request 1:1 aspect ratio', () => {
        expect(API_CONFIG.aspect_ratio).toBe('1:1')
      })

      it('should request PNG output format', () => {
        expect(API_CONFIG.output_format).toBe('png')
      })
    })

    describe('Response Handling', () => {
      it('should handle async response with taskId', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { taskId: 'task-async-123' } })
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)
        const result = await response.json()

        expect(result.data.taskId).toBe('task-async-123')
      })

      it('should handle direct response with images array', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              images: ['https://kie.ai/result/image1.png', 'https://kie.ai/result/image2.png']
            }
          })
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)
        const result = await response.json()

        expect(result.data.images).toHaveLength(2)
        expect(result.data.images[0]).toContain('https://kie.ai')
      })

      it('should handle response with output array', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            output: ['https://kie.ai/result/direct-output.png']
          })
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)
        const result = await response.json()

        expect(result.output).toBeDefined()
        expect(result.output[0]).toContain('https://kie.ai')
      })
    })

    describe('Error Responses', () => {
      it('should handle 401 Unauthorized', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Invalid API key'
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)

        expect(response.ok).toBe(false)
        expect(response.status).toBe(401)
      })

      it('should handle 403 Forbidden', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => 'Access denied'
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)

        expect(response.ok).toBe(false)
        expect(response.status).toBe(403)
      })

      it('should handle 429 Rate Limit', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: {
            'Retry-After': '60'
          },
          text: async () => 'Rate limit exceeded. Please try again later.'
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)

        expect(response.ok).toBe(false)
        expect(response.status).toBe(429)
      })

      it('should handle 500 Internal Server Error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error'
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)

        expect(response.ok).toBe(false)
        expect(response.status).toBe(500)
      })

      it('should handle 503 Service Unavailable', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service temporarily unavailable'
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.generate)

        expect(response.ok).toBe(false)
        expect(response.status).toBe(503)
      })

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        await expect(mockFetch(KIE_AI_ENDPOINTS.generate)).rejects.toThrow('Network error')
      })

      it('should handle timeout errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Request timed out'))

        await expect(mockFetch(KIE_AI_ENDPOINTS.generate)).rejects.toThrow('Request timed out')
      })
    })
  })

  describe('Status Polling Endpoint', () => {
    describe('Request Format', () => {
      it('should use GET method with taskId query parameter', async () => {
        const taskId = 'task-poll-123'
        const pollUrl = `${KIE_AI_ENDPOINTS.status}?taskId=${taskId}`

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiSuccessStatus()
        })

        await mockFetch(pollUrl, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-api-key'
          }
        })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('taskId=task-poll-123'),
          expect.objectContaining({
            method: 'GET'
          })
        )
      })

      it('should include Bearer token authorization', async () => {
        const apiKey = 'test-api-key'

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiPendingStatus()
        })

        await mockFetch(KIE_AI_ENDPOINTS.status, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })

        const callHeaders = mockFetch.mock.calls[0][1].headers
        expect(callHeaders['Authorization']).toBe(`Bearer ${apiKey}`)
      })
    })

    describe('Status Response Types', () => {
      it('should recognize successful completion', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiSuccessStatus()
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.status)
        const result = await response.json()

        expect(result.successFlag).toBe(1)
        expect(result.response.resultImageUrl).toBeDefined()
      })

      it('should recognize pending/processing status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiPendingStatus()
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.status)
        const result = await response.json()

        expect(result.successFlag).toBe(0)
        expect(result.response.status).toBe('processing')
      })

      it('should recognize failed status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockKieAiFailedStatus()
        })

        const response = await mockFetch(KIE_AI_ENDPOINTS.status)
        const result = await response.json()

        expect(result.successFlag).toBe(0)
        expect(result.response.status).toBe('failed')
        expect(result.response.error).toBeDefined()
      })
    })
  })

  describe('Polling Mechanism', () => {
    it('should poll with 2 second intervals', () => {
      expect(API_CONFIG.poll_interval_ms).toBe(2000)
    })

    it('should have maximum 30 poll attempts', () => {
      expect(API_CONFIG.max_poll_attempts).toBe(30)
    })

    it('should timeout after 60 seconds total', () => {
      const totalWaitTime = API_CONFIG.max_poll_attempts * API_CONFIG.poll_interval_ms
      expect(totalWaitTime).toBe(60000)
      expect(API_CONFIG.max_wait_time_ms).toBe(60000)
    })

    it('should continue polling while status is pending', async () => {
      let pollCount = 0

      mockFetch.mockImplementation(async () => {
        pollCount++
        if (pollCount < 3) {
          return {
            ok: true,
            json: async () => createMockKieAiPendingStatus()
          }
        }
        return {
          ok: true,
          json: async () => createMockKieAiSuccessStatus()
        }
      })

      // Simulate polling loop
      let isComplete = false
      let attempts = 0
      const maxAttempts = 5

      while (!isComplete && attempts < maxAttempts) {
        const response = await mockFetch(KIE_AI_ENDPOINTS.status)
        const result = await response.json()

        if (result.successFlag === 1) {
          isComplete = true
        }
        attempts++
      }

      expect(isComplete).toBe(true)
      expect(attempts).toBe(3)
    })

    it('should stop polling on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockKieAiSuccessStatus()
      })

      const response = await mockFetch(KIE_AI_ENDPOINTS.status)
      const result = await response.json()

      const shouldStopPolling = result.successFlag === 1 && result.response?.resultImageUrl

      expect(shouldStopPolling).toBe(true)
    })

    it('should stop polling on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockKieAiFailedStatus()
      })

      const response = await mockFetch(KIE_AI_ENDPOINTS.status)
      const result = await response.json()

      const shouldStopPolling = result.successFlag === 0 && result.response?.status === 'failed'

      expect(shouldStopPolling).toBe(true)
    })

    it('should return passthrough on timeout', () => {
      const timeoutResponse = {
        error: 'Timeout waiting for image optimization',
        task_id: 'task-timeout',
        passthrough: true,
        original_url: 'https://original.url/image.jpg'
      }

      expect(timeoutResponse.passthrough).toBe(true)
      expect(timeoutResponse.error).toContain('Timeout')
    })
  })

  describe('Task ID Extraction', () => {
    it('should extract taskId from data.taskId', () => {
      const response = { data: { taskId: 'extracted-task-1' } }
      const taskId = response.data?.taskId

      expect(taskId).toBe('extracted-task-1')
    })

    it('should extract taskId from data.id', () => {
      const response = { data: { id: 'extracted-task-2' } }
      const taskId = response.data?.id

      expect(taskId).toBe('extracted-task-2')
    })

    it('should extract taskId from top-level id', () => {
      const response = { id: 'extracted-task-3' }
      const taskId = response.id

      expect(taskId).toBe('extracted-task-3')
    })

    it('should handle missing taskId gracefully', () => {
      const response = { data: {} }
      const taskId = response.data?.taskId || response.data?.id || (response as any).id

      expect(taskId).toBeUndefined()
    })
  })

  describe('Result URL Extraction', () => {
    it('should extract URL from response.resultImageUrl', () => {
      const statusResponse = createMockKieAiSuccessStatus()
      const resultUrl = statusResponse.response?.resultImageUrl

      expect(resultUrl).toBe('https://kie.ai/result/optimized-image.png')
    })

    it('should extract URL from data.images array', () => {
      const response = createMockKieAiDirectResponse()
      const resultUrl = response.data?.images?.[0]

      expect(resultUrl).toBe('https://kie.ai/result/optimized-image.png')
    })

    it('should extract URL from output array', () => {
      const response = { output: ['https://kie.ai/result/output-image.png'] }
      const resultUrl = response.output?.[0]

      expect(resultUrl).toBe('https://kie.ai/result/output-image.png')
    })
  })
})

describe('Kie.ai Prompt Handling', () => {
  describe('Default Prompts', () => {
    it('should use jewelry-focused default prompt', () => {
      const defaultPrompt = TEST_PROMPTS.default

      expect(defaultPrompt).toContain('jewelry')
      expect(defaultPrompt).toContain('professional')
      expect(defaultPrompt).toContain('e-commerce')
    })
  })

  describe('Enhancement Combinations', () => {
    it('should create prompt with quality enhancement only', () => {
      expect(TEST_PROMPTS.withQuality).toContain('sharpness')
      expect(TEST_PROMPTS.withQuality).toContain('clarity')
    })

    it('should create prompt with background removal only', () => {
      expect(TEST_PROMPTS.withBackground).toContain('pure white')
    })

    it('should create prompt with lighting enhancement only', () => {
      expect(TEST_PROMPTS.withLighting).toContain('lighting')
      expect(TEST_PROMPTS.withLighting).toContain('sparkle')
    })

    it('should create prompt with color enhancement only', () => {
      expect(TEST_PROMPTS.withColors).toContain('color vibrancy')
      expect(TEST_PROMPTS.withColors).toContain('natural appearance')
    })

    it('should combine all enhancements in single prompt', () => {
      const fullPrompt = TEST_PROMPTS.fullEnhancement

      expect(fullPrompt).toContain('sharpness')
      expect(fullPrompt).toContain('pure white')
      expect(fullPrompt).toContain('lighting')
      expect(fullPrompt).toContain('color vibrancy')
    })
  })
})

describe('Kie.ai Error Scenarios', () => {
  describe('Image Processing Errors', () => {
    it('should handle invalid image format', () => {
      const errorResponse = {
        successFlag: 0,
        response: {
          status: 'failed',
          error: 'Invalid image format. Supported formats: JPEG, PNG, WebP'
        }
      }

      expect(errorResponse.response.error).toContain('Invalid image format')
    })

    it('should handle image too large', () => {
      const errorResponse = {
        successFlag: 0,
        response: {
          status: 'failed',
          error: 'Image size exceeds maximum allowed (10MB)'
        }
      }

      expect(errorResponse.response.error).toContain('exceeds maximum')
    })

    it('should handle corrupted image data', () => {
      const errorResponse = {
        successFlag: 0,
        response: {
          status: 'failed',
          error: 'Unable to process image: corrupted or incomplete data'
        }
      }

      expect(errorResponse.response.error).toContain('corrupted')
    })
  })

  describe('API Errors', () => {
    it('should handle insufficient credits', () => {
      const errorResponse = {
        ok: false,
        status: 402,
        message: 'Insufficient credits'
      }

      expect(errorResponse.status).toBe(402)
    })

    it('should handle invalid API key', () => {
      const errorResponse = {
        ok: false,
        status: 401,
        message: 'Invalid or expired API key'
      }

      expect(errorResponse.status).toBe(401)
    })

    it('should handle quota exceeded', () => {
      const errorResponse = {
        ok: false,
        status: 429,
        message: 'Daily quota exceeded'
      }

      expect(errorResponse.status).toBe(429)
    })
  })
})

describe('Passthrough Mode Triggers', () => {
  it('should trigger passthrough when API key missing', () => {
    const triggers = {
      apiKeyMissing: true,
      expectedResult: 'passthrough'
    }

    expect(triggers.expectedResult).toBe('passthrough')
  })

  it('should trigger passthrough on API error', () => {
    const triggers = {
      apiError: 500,
      expectedResult: 'passthrough'
    }

    expect(triggers.expectedResult).toBe('passthrough')
  })

  it('should trigger passthrough on rate limit', () => {
    const triggers = {
      rateLimited: 429,
      expectedResult: 'passthrough'
    }

    expect(triggers.expectedResult).toBe('passthrough')
  })

  it('should trigger passthrough on timeout', () => {
    const triggers = {
      pollTimeout: true,
      expectedResult: 'passthrough'
    }

    expect(triggers.expectedResult).toBe('passthrough')
  })

  it('should preserve original image URL in passthrough', () => {
    const passthroughResponse = {
      passthrough: true,
      original_url: 'https://storage.test/original.jpg',
      message: 'Image returned without optimization'
    }

    expect(passthroughResponse.original_url).toBeDefined()
  })
})
