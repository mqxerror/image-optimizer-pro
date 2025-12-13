import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OptimizeRequest {
  image_url: string
  prompt?: string
  file_id?: string
  ai_model?: string
  aspect_ratio?: string  // e.g. '1:1', '4:5', '16:9', '9:16', '3:4', '4:3'
  generation_id?: string  // For async updates
  settings?: {
    enhance_quality?: boolean
    remove_background?: boolean
    enhance_lighting?: boolean
    enhance_colors?: boolean
  }
}

// Helper to update generation record in database
async function updateGeneration(generationId: string, updates: Record<string, any>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { error } = await supabase
    .from('studio_generations')
    .update(updates)
    .eq('id', generationId)

  if (error) {
    console.error('Failed to update generation:', error)
  }
}

// Model configurations
const MODEL_CONFIGS: Record<string, {
  endpoint: string
  pollEndpoint: string
  buildRequest: (prompt: string, imageUrl: string, aspectRatio: string) => object
  extractTaskId: (response: any) => string | null
  extractResultUrl: (statusResult: any) => string | null
  checkSuccess: (statusResult: any) => boolean
  checkFailed: (statusResult: any) => boolean
}> = {
  'flux-kontext-pro': {
    endpoint: 'https://api.kie.ai/api/v1/flux/kontext/generate',
    pollEndpoint: 'https://api.kie.ai/api/v1/flux/kontext/record-info',
    buildRequest: (prompt, imageUrl, aspectRatio) => ({
      prompt,
      inputImage: imageUrl,
      model: 'flux-kontext-pro',
      aspectRatio,
      outputFormat: 'png',
    }),
    extractTaskId: (res) => res.data?.taskId || res.data?.id || res.id,
    extractResultUrl: (status) => status.data?.response?.resultImageUrl || status.response?.resultImageUrl,
    checkSuccess: (status) => (status.data?.successFlag ?? status.successFlag) === 1,
    checkFailed: (status) => [2, 3].includes(status.data?.successFlag ?? status.successFlag),
  },
  'flux-kontext-max': {
    endpoint: 'https://api.kie.ai/api/v1/flux/kontext/generate',
    pollEndpoint: 'https://api.kie.ai/api/v1/flux/kontext/record-info',
    buildRequest: (prompt, imageUrl, aspectRatio) => ({
      prompt,
      inputImage: imageUrl,
      model: 'flux-kontext-max',
      aspectRatio,
      outputFormat: 'png',
    }),
    extractTaskId: (res) => res.data?.taskId || res.data?.id || res.id,
    extractResultUrl: (status) => status.data?.response?.resultImageUrl || status.response?.resultImageUrl,
    checkSuccess: (status) => (status.data?.successFlag ?? status.successFlag) === 1,
    checkFailed: (status) => [2, 3].includes(status.data?.successFlag ?? status.successFlag),
  },
  'nano-banana': {
    endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
    pollEndpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    buildRequest: (prompt, imageUrl, aspectRatio) => ({
      model: 'google/nano-banana-edit',
      input: {
        prompt,
        image_urls: [imageUrl],
        output_format: 'png',
        image_size: aspectRatio,
      }
    }),
    extractTaskId: (res) => res.data?.taskId,
    extractResultUrl: (status) => {
      // Try resultJson first (market models return this)
      if (status.data?.resultJson) {
        try {
          const parsed = JSON.parse(status.data.resultJson)
          return parsed.resultUrls?.[0] || parsed.images?.[0]
        } catch {}
      }
      return status.data?.output?.images?.[0] || status.data?.response?.images?.[0]
    },
    checkSuccess: (status) => status.data?.state === 'success',
    checkFailed: (status) => status.data?.state === 'fail',
  },
  'nano-banana-pro': {
    endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
    pollEndpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    buildRequest: (prompt, imageUrl, aspectRatio) => ({
      model: 'nano-banana-pro',
      input: {
        prompt,
        image_input: [imageUrl],
        output_format: 'png',
        aspect_ratio: aspectRatio,
        resolution: '2K',
      }
    }),
    extractTaskId: (res) => res.data?.taskId,
    extractResultUrl: (status) => {
      // Try resultJson first (market models return this)
      if (status.data?.resultJson) {
        try {
          const parsed = JSON.parse(status.data.resultJson)
          return parsed.resultUrls?.[0] || parsed.images?.[0]
        } catch {}
      }
      return status.data?.output?.images?.[0] || status.data?.response?.images?.[0]
    },
    checkSuccess: (status) => status.data?.state === 'success',
    checkFailed: (status) => status.data?.state === 'fail',
  },
  'ghibli': {
    endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
    pollEndpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    buildRequest: (prompt, imageUrl, aspectRatio) => ({
      model: 'ghibli',
      input: {
        prompt: `Transform into Studio Ghibli anime style. ${prompt}`,
        image_input: [imageUrl],
        output_format: 'png',
        aspect_ratio: aspectRatio,
      }
    }),
    extractTaskId: (res) => res.data?.taskId,
    extractResultUrl: (status) => {
      if (status.data?.resultJson) {
        try {
          const parsed = JSON.parse(status.data.resultJson)
          return parsed.resultUrls?.[0] || parsed.images?.[0]
        } catch {}
      }
      return status.data?.output?.images?.[0] || status.data?.response?.images?.[0]
    },
    checkSuccess: (status) => status.data?.state === 'success',
    checkFailed: (status) => status.data?.state === 'fail',
  },
  // Note: Midjourney removed - no longer available on Kie.ai API
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const kieApiKey = Deno.env.get('KIE_AI_API_KEY')

    if (!kieApiKey) {
      console.error('KIE_AI_API_KEY not configured')
      return new Response(
        JSON.stringify({
          error: 'KIE_AI_API_KEY not configured',
          passthrough: true,
          message: 'Image returned without optimization - API key not set'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: OptimizeRequest = await req.json()
    const { image_url, prompt, file_id, ai_model = 'flux-kontext-pro', aspect_ratio = '1:1', settings, generation_id } = body

    if (!image_url && !file_id) {
      return new Response(
        JSON.stringify({ error: 'image_url or file_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting image optimization')
    console.log('AI Model requested:', ai_model)
    console.log('Settings:', JSON.stringify(settings))

    // Get model configuration
    const modelConfig = MODEL_CONFIGS[ai_model] || MODEL_CONFIGS['flux-kontext-pro']
    const actualModel = MODEL_CONFIGS[ai_model] ? ai_model : 'flux-kontext-pro'
    console.log('Using model config:', actualModel)
    console.log('Endpoint:', modelConfig.endpoint)

    // Build enhancement prompt
    let enhancementPrompt = prompt || 'Enhance this jewelry image for professional e-commerce presentation.'

    if (settings) {
      const enhancements: string[] = []
      if (settings.enhance_quality) enhancements.push('increase image sharpness and clarity')
      if (settings.remove_background) enhancements.push('make background pure white')
      if (settings.enhance_lighting) enhancements.push('improve lighting to highlight jewelry details and sparkle')
      if (settings.enhance_colors) enhancements.push('enhance color vibrancy while maintaining natural appearance')
      if (enhancements.length > 0) {
        enhancementPrompt = `${enhancementPrompt} ${enhancements.join(', ')}.`
      }
    }

    console.log('Enhancement prompt:', enhancementPrompt)

    // Get image URL
    let imageDataUrl = image_url

    if (file_id && !image_url) {
      const authHeader = req.headers.get('Authorization')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!

      const response = await fetch(
        `${supabaseUrl}/functions/v1/google-drive-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'download', fileId: file_id })
        }
      )

      if (!response.ok) throw new Error('Failed to download image from Google Drive')
      const data = await response.json()
      imageDataUrl = data.content
    }

    console.log('Calling Kie.ai API:', modelConfig.endpoint)
    console.log('Image URL length:', imageDataUrl?.length || 0)
    console.log('Aspect ratio:', aspect_ratio)

    // Make API request
    const requestBody = modelConfig.buildRequest(enhancementPrompt, imageDataUrl, aspect_ratio)
    console.log('Request body keys:', Object.keys(requestBody))

    const kieResponse = await fetch(modelConfig.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Kie.ai response status:', kieResponse.status)

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text()
      console.error('Kie.ai API error:', errorText)
      return new Response(
        JSON.stringify({
          error: `Kie.ai API error: ${kieResponse.status}`,
          details: errorText,
          passthrough: true,
          original_url: image_url
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const kieResult = await kieResponse.json()
    console.log('Kie.ai full response:', JSON.stringify(kieResult))

    // Check for API-level errors (Kie.ai may return 200 with error in body)
    if (kieResult.code && kieResult.code !== 200) {
      console.error('Kie.ai API returned error code:', kieResult.code, kieResult.message || kieResult.msg)
      return new Response(
        JSON.stringify({
          error: `Kie.ai API error: ${kieResult.message || kieResult.msg || 'Unknown error'}`,
          code: kieResult.code,
          passthrough: true,
          original_url: image_url
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract task ID - try multiple paths for robustness
    let taskId = modelConfig.extractTaskId(kieResult)

    // Fallback extraction if model-specific extractor fails
    if (!taskId) {
      taskId = kieResult.data?.taskId || kieResult.taskId || kieResult.data?.id || kieResult.id
      console.log('Fallback taskId extraction:', taskId)
    }

    console.log('Extracted taskId:', taskId)

    if (taskId) {
      console.log('Task ID received:', taskId)
      const maxAttempts = 45 // 90 seconds max

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`)

        // Handle both query param style and URL placeholder style
        const pollUrl = modelConfig.pollEndpoint.includes('{taskId}')
          ? modelConfig.pollEndpoint.replace('{taskId}', taskId)
          : `${modelConfig.pollEndpoint}?taskId=${taskId}`
        const statusResponse = await fetch(pollUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${kieApiKey}` },
        })

        if (statusResponse.ok) {
          const statusResult = await statusResponse.json()
          console.log('Status result:', JSON.stringify(statusResult))
          console.log('checkSuccess result:', modelConfig.checkSuccess(statusResult))

          if (modelConfig.checkSuccess(statusResult)) {
            let resultUrl = modelConfig.extractResultUrl(statusResult)
            console.log('extractResultUrl returned:', resultUrl)

            // Fallback extraction - try multiple paths if model-specific extractor fails
            if (!resultUrl) {
              console.log('Trying fallback URL extraction...')
              resultUrl = statusResult.data?.output?.images?.[0]
                || statusResult.data?.response?.images?.[0]
                || statusResult.data?.response?.resultImageUrl
                || statusResult.data?.images?.[0]
                || statusResult.data?.image_url
                || statusResult.data?.imageUrl
                || statusResult.data?.result?.images?.[0]
                || statusResult.data?.result?.image
                || statusResult.output?.images?.[0]
                || statusResult.images?.[0]
              console.log('Fallback extraction result:', resultUrl)
            }

            if (resultUrl) {
              console.log('Success! Optimized URL:', resultUrl)

              // Update database if generation_id provided (async mode)
              if (generation_id) {
                await updateGeneration(generation_id, {
                  result_url: resultUrl,
                  status: 'success',
                  task_id: taskId,
                })
              }

              return new Response(
                JSON.stringify({
                  success: true,
                  optimized_url: resultUrl,
                  task_id: taskId,
                  original_url: image_url,
                  ai_model: ai_model,
                  final_prompt: enhancementPrompt // Return the actual prompt used
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            } else {
              console.log('checkSuccess was true but no resultUrl found! Full status result:', JSON.stringify(statusResult, null, 2))
            }
          } else if (modelConfig.checkFailed(statusResult)) {
            const errorMsg = statusResult.data?.errorMessage || statusResult.data?.error || 'Unknown error'

            // Update database if generation_id provided (async mode)
            if (generation_id) {
              await updateGeneration(generation_id, {
                status: 'failed',
                error_message: errorMsg,
              })
            }

            throw new Error('Image optimization failed: ' + errorMsg)
          }
        }
      }

      // Timeout
      // Update database if generation_id provided (async mode)
      if (generation_id) {
        await updateGeneration(generation_id, {
          status: 'failed',
          error_message: 'Timeout waiting for image optimization',
          result_url: image_url, // Fall back to original
        })
      }

      return new Response(
        JSON.stringify({
          error: 'Timeout waiting for image optimization',
          task_id: taskId,
          passthrough: true,
          original_url: image_url
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Direct result (no polling needed)
    if (kieResult.data?.images || kieResult.images || kieResult.output) {
      const optimizedUrl = kieResult.data?.images?.[0] || kieResult.images?.[0] || kieResult.output?.[0]
      return new Response(
        JSON.stringify({
          success: true,
          optimized_url: optimizedUrl,
          original_url: image_url,
          ai_model: ai_model,
          final_prompt: enhancementPrompt // Return the actual prompt used
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fallback - log the issue for debugging
    console.error('No taskId found and no direct images. Response was:', JSON.stringify(kieResult))
    console.error('Model config used:', ai_model)
    return new Response(
      JSON.stringify({
        passthrough: true,
        original_url: image_url,
        message: 'No optimized image returned from Kie.ai',
        debug_response: kieResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('Optimize image error:', error)
    return new Response(
      JSON.stringify({ error: error.message, passthrough: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
