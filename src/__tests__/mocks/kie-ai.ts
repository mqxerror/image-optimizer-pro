import { vi } from 'vitest'

// Kie.ai API response types
export interface KieAiGenerateResponse {
  data?: {
    taskId?: string
    id?: string
    images?: string[]
  }
  id?: string
  images?: string[]
  output?: string[]
}

export interface KieAiStatusResponse {
  successFlag: number
  response?: {
    status?: string
    resultImageUrl?: string
    error?: string
  }
}

// Mock successful async response
export const createMockKieAiAsyncResponse = (): KieAiGenerateResponse => ({
  data: {
    taskId: 'kie-task-12345'
  }
})

// Mock successful direct response
export const createMockKieAiDirectResponse = (): KieAiGenerateResponse => ({
  data: {
    images: ['https://kie.ai/result/optimized-image.png']
  }
})

// Mock successful status polling response
export const createMockKieAiSuccessStatus = (): KieAiStatusResponse => ({
  successFlag: 1,
  response: {
    status: 'completed',
    resultImageUrl: 'https://kie.ai/result/optimized-image.png'
  }
})

// Mock pending status response
export const createMockKieAiPendingStatus = (): KieAiStatusResponse => ({
  successFlag: 0,
  response: {
    status: 'processing'
  }
})

// Mock failed status response
export const createMockKieAiFailedStatus = (): KieAiStatusResponse => ({
  successFlag: 0,
  response: {
    status: 'failed',
    error: 'Image processing failed due to invalid format'
  }
})

// Helper to create mock fetch responses
export const createKieAiFetchMock = (responses: Array<{ status: number; body: unknown }>) => {
  let callIndex = 0
  return vi.fn().mockImplementation(async (url: string) => {
    const response = responses[callIndex] || responses[responses.length - 1]
    callIndex++
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body)
    }
  })
}

// Test data for prompts
export const TEST_PROMPTS = {
  default: 'Enhance this jewelry image for professional e-commerce presentation.',
  withQuality: 'Enhance this jewelry image for professional e-commerce presentation. increase image sharpness and clarity.',
  withBackground: 'Enhance this jewelry image for professional e-commerce presentation. make background pure white.',
  withLighting: 'Enhance this jewelry image for professional e-commerce presentation. improve lighting to highlight jewelry details and sparkle.',
  withColors: 'Enhance this jewelry image for professional e-commerce presentation. enhance color vibrancy while maintaining natural appearance.',
  fullEnhancement: 'Enhance this jewelry image for professional e-commerce presentation. increase image sharpness and clarity, make background pure white, improve lighting to highlight jewelry details and sparkle, enhance color vibrancy while maintaining natural appearance.',
  custom: 'Custom enhancement prompt for product photography'
}

// Test settings combinations
export const TEST_SETTINGS = {
  none: {},
  qualityOnly: { enhance_quality: true },
  backgroundOnly: { remove_background: true },
  lightingOnly: { enhance_lighting: true },
  colorsOnly: { enhance_colors: true },
  all: {
    enhance_quality: true,
    remove_background: true,
    enhance_lighting: true,
    enhance_colors: true
  }
}
