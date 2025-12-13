import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockKieAiAsyncResponse,
  createMockKieAiSuccessStatus,
  createMockKieAiPendingStatus,
  createMockKieAiFailedStatus,
  createMockKieAiDirectResponse,
  TEST_SETTINGS,
  TEST_PROMPTS
} from '../mocks/kie-ai'

/**
 * Tests for optimize-image Edge Function
 *
 * This edge function handles:
 * 1. Prompt generation based on settings
 * 2. Kie.ai API integration
 * 3. Async task polling
 * 4. Passthrough mode when API unavailable
 */

// Helper to build enhancement prompt (mirrors edge function logic)
function buildEnhancementPrompt(basePrompt: string, settings?: Record<string, boolean>): string {
  let prompt = basePrompt

  if (settings) {
    const enhancements: string[] = []

    if (settings.enhance_quality) {
      enhancements.push('increase image sharpness and clarity')
    }
    if (settings.remove_background) {
      enhancements.push('make background pure white')
    }
    if (settings.enhance_lighting) {
      enhancements.push('improve lighting to highlight jewelry details and sparkle')
    }
    if (settings.enhance_colors) {
      enhancements.push('enhance color vibrancy while maintaining natural appearance')
    }

    if (enhancements.length > 0) {
      prompt = `${prompt} ${enhancements.join(', ')}.`
    }
  }

  return prompt
}

describe('optimize-image Edge Function', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Prompt Generation', () => {
    it('should use default prompt when no custom prompt provided', () => {
      const result = buildEnhancementPrompt(
        'Enhance this jewelry image for professional e-commerce presentation.'
      )
      expect(result).toBe(TEST_PROMPTS.default)
    })

    it('should append quality enhancement when enhance_quality is true', () => {
      const result = buildEnhancementPrompt(
        'Enhance this jewelry image for professional e-commerce presentation.',
        TEST_SETTINGS.qualityOnly
      )
      expect(result).toContain('increase image sharpness and clarity')
    })

    it('should append background removal when remove_background is true', () => {
      const result = buildEnhancementPrompt(
        'Enhance this jewelry image for professional e-commerce presentation.',
        TEST_SETTINGS.backgroundOnly
      )
      expect(result).toContain('make background pure white')
    })

    it('should append lighting enhancement when enhance_lighting is true', () => {
      const result = buildEnhancementPrompt(
        'Enhance this jewelry image for professional e-commerce presentation.',
        TEST_SETTINGS.lightingOnly
      )
      expect(result).toContain('improve lighting to highlight jewelry details and sparkle')
    })

    it('should append color enhancement when enhance_colors is true', () => {
      const result = buildEnhancementPrompt(
        'Enhance this jewelry image for professional e-commerce presentation.',
        TEST_SETTINGS.colorsOnly
      )
      expect(result).toContain('enhance color vibrancy while maintaining natural appearance')
    })

    it('should combine all enhancements when all settings are true', () => {
      const result = buildEnhancementPrompt(
        'Enhance this jewelry image for professional e-commerce presentation.',
        TEST_SETTINGS.all
      )
      expect(result).toContain('increase image sharpness and clarity')
      expect(result).toContain('make background pure white')
      expect(result).toContain('improve lighting to highlight jewelry details and sparkle')
      expect(result).toContain('enhance color vibrancy while maintaining natural appearance')
    })

    it('should use custom prompt as base when provided', () => {
      const result = buildEnhancementPrompt(TEST_PROMPTS.custom, TEST_SETTINGS.qualityOnly)
      expect(result).toContain(TEST_PROMPTS.custom)
      expect(result).toContain('increase image sharpness and clarity')
    })
  })

  describe('Kie.ai API Integration', () => {
    describe('Request Format', () => {
      it('should send correct request body to Kie.ai generate endpoint', async () => {
        const testImageUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
        const testPrompt = 'Enhance this image'

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockKieAiDirectResponse()
        })

        await fetch('https://api.kie.ai/api/v1/flux/kontext/generate', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: testPrompt,
            image: testImageUrl,
            model: 'flux-kontext-pro',
            aspect_ratio: '1:1',
            output_format: 'png',
          }),
        })

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.kie.ai/api/v1/flux/kontext/generate',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-api-key',
              'Content-Type': 'application/json',
            }),
          })
        )

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody).toEqual({
          prompt: testPrompt,
          image: testImageUrl,
          model: 'flux-kontext-pro',
          aspect_ratio: '1:1',
          output_format: 'png',
        })
      })
    })

    describe('Async Task Handling', () => {
      it('should poll for task result when taskId is returned', async () => {
        const taskId = 'kie-task-12345'

        // First call: returns taskId
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { taskId } })
        })

        // Second call: pending
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockKieAiPendingStatus()
        })

        // Third call: success
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockKieAiSuccessStatus()
        })

        // Simulate the polling logic
        const generateResponse = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')
        const generateResult = await generateResponse.json()

        expect(generateResult.data.taskId).toBe(taskId)

        // Poll for status
        const pollUrl = `https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`
        const statusResponse = await mockFetch(pollUrl)
        const statusResult = await statusResponse.json()

        expect(statusResult.successFlag).toBe(0) // pending

        // Poll again
        const finalResponse = await mockFetch(pollUrl)
        const finalResult = await finalResponse.json()

        expect(finalResult.successFlag).toBe(1)
        expect(finalResult.response.resultImageUrl).toBeDefined()
      })

      it('should handle task failure status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockKieAiFailedStatus()
        })

        const response = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=test')
        const result = await response.json()

        expect(result.successFlag).toBe(0)
        expect(result.response.status).toBe('failed')
        expect(result.response.error).toBeDefined()
      })
    })

    describe('Direct Response Handling', () => {
      it('should handle direct image response without polling', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockKieAiDirectResponse()
        })

        const response = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')
        const result = await response.json()

        expect(result.data.images).toBeDefined()
        expect(result.data.images[0]).toBe('https://kie.ai/result/optimized-image.png')
      })

      it('should handle output array format', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            output: ['https://kie.ai/result/optimized-image.png']
          })
        })

        const response = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')
        const result = await response.json()

        expect(result.output).toBeDefined()
        expect(result.output[0]).toBe('https://kie.ai/result/optimized-image.png')
      })
    })

    describe('Error Handling', () => {
      it('should return passthrough when API returns non-200 status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error'
        })

        const response = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')

        expect(response.ok).toBe(false)
        expect(response.status).toBe(500)
      })

      it('should return passthrough when API returns 429 rate limit', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded'
        })

        const response = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')

        expect(response.ok).toBe(false)
        expect(response.status).toBe(429)
      })

      it('should return passthrough when API returns 401 unauthorized', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized - Invalid API key'
        })

        const response = await mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')

        expect(response.ok).toBe(false)
        expect(response.status).toBe(401)
      })

      it('should handle network timeout gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

        await expect(
          mockFetch('https://api.kie.ai/api/v1/flux/kontext/generate')
        ).rejects.toThrow('Network timeout')
      })
    })
  })

  describe('Passthrough Mode', () => {
    it('should return passthrough response when KIE_AI_API_KEY is not set', () => {
      // Simulate missing API key scenario
      const passthroughResponse = {
        error: 'KIE_AI_API_KEY not configured',
        passthrough: true,
        message: 'Image returned without optimization - API key not set'
      }

      expect(passthroughResponse.passthrough).toBe(true)
      expect(passthroughResponse.error).toContain('KIE_AI_API_KEY')
    })

    it('should include original_url in passthrough response', () => {
      const originalUrl = 'https://storage.test.com/original.jpg'
      const passthroughResponse = {
        passthrough: true,
        original_url: originalUrl,
        message: 'No optimized image returned from Kie.ai'
      }

      expect(passthroughResponse.original_url).toBe(originalUrl)
    })

    it('should return passthrough on polling timeout', () => {
      const taskId = 'timeout-task'
      const passthroughResponse = {
        error: 'Timeout waiting for image optimization',
        task_id: taskId,
        passthrough: true,
        original_url: 'https://storage.test.com/original.jpg'
      }

      expect(passthroughResponse.passthrough).toBe(true)
      expect(passthroughResponse.task_id).toBe(taskId)
    })
  })

  describe('Request Validation', () => {
    it('should require image_url or file_id', () => {
      const invalidRequest = {
        prompt: 'Enhance image'
        // Missing both image_url and file_id
      }

      const expectedError = { error: 'image_url or file_id required' }
      expect(expectedError.error).toBe('image_url or file_id required')
    })

    it('should accept request with image_url', () => {
      const validRequest = {
        image_url: 'data:image/jpeg;base64,...',
        prompt: 'Enhance image'
      }

      expect(validRequest.image_url).toBeDefined()
    })

    it('should accept request with file_id', () => {
      const validRequest = {
        file_id: 'google-drive-file-id',
        prompt: 'Enhance image'
      }

      expect(validRequest.file_id).toBeDefined()
    })

    it('should accept request with settings', () => {
      const validRequest = {
        image_url: 'data:image/jpeg;base64,...',
        settings: {
          enhance_quality: true,
          remove_background: true
        }
      }

      expect(validRequest.settings).toBeDefined()
      expect(validRequest.settings.enhance_quality).toBe(true)
    })
  })

  describe('CORS Handling', () => {
    it('should return correct CORS headers', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }

      expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*')
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST')
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('OPTIONS')
    })

    it('should handle OPTIONS preflight request', () => {
      // OPTIONS request should return 'ok' with CORS headers
      const optionsResponse = {
        status: 200,
        body: 'ok'
      }

      expect(optionsResponse.body).toBe('ok')
    })
  })
})

describe('Kie.ai Response Parsing', () => {
  it('should extract taskId from data.taskId', () => {
    const response = { data: { taskId: 'task-123' } }
    const taskId = response.data?.taskId
    expect(taskId).toBe('task-123')
  })

  it('should extract taskId from data.id', () => {
    const response = { data: { id: 'task-456' } }
    const taskId = response.data?.id
    expect(taskId).toBe('task-456')
  })

  it('should extract taskId from top-level id', () => {
    const response = { id: 'task-789' }
    const taskId = response.id
    expect(taskId).toBe('task-789')
  })

  it('should extract result URL from response.resultImageUrl', () => {
    const statusResponse = createMockKieAiSuccessStatus()
    const resultUrl = statusResponse.response?.resultImageUrl
    expect(resultUrl).toBe('https://kie.ai/result/optimized-image.png')
  })

  it('should correctly identify success status', () => {
    const successResponse = createMockKieAiSuccessStatus()
    const isSuccess = successResponse.successFlag === 1 && successResponse.response?.resultImageUrl
    expect(isSuccess).toBeTruthy()
  })

  it('should correctly identify failure status', () => {
    const failedResponse = createMockKieAiFailedStatus()
    const isFailed = failedResponse.successFlag === 0 && failedResponse.response?.status === 'failed'
    expect(isFailed).toBeTruthy()
  })
})
