import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SubmitJobRequest {
  job_type: 'optimize' | 'combine' | 'generate'
  source: 'studio' | 'queue' | 'combination' | 'api' | 'shopify'
  source_id?: string
  ai_model: string
  input_url: string
  input_url_2?: string // For combination jobs
  prompt?: string
  aspect_ratio?: string
  settings?: Record<string, any>
}

interface ModelConfig {
  id: string
  provider: string
  submit_endpoint: string
  status_endpoint: string
  request_template: Record<string, any>
  task_id_path: string[]
  token_cost: number
  supports_callback: boolean
}

// Helper to extract value from nested object using path array
function getNestedValue(obj: any, path: string[]): any {
  let current = obj
  for (const key of path) {
    if (current === null || current === undefined) return null
    // Handle array index notation
    if (key.match(/^\d+$/)) {
      current = current[parseInt(key)]
    } else {
      current = current[key]
    }
  }
  return current
}

// Build request body based on model config and job details
function buildRequestBody(
  config: ModelConfig,
  job: SubmitJobRequest,
  callbackUrl: string
): Record<string, any> {
  const template = { ...config.request_template }

  // Common fields for all models
  const requestBody: Record<string, any> = {
    ...template,
    callbackUrl,
  }

  // Handle different model types
  if (config.submit_endpoint.includes('/flux/kontext/')) {
    // Flux Kontext models
    requestBody.prompt = job.prompt || 'Enhance this jewelry image for professional e-commerce presentation.'
    requestBody.inputImage = job.input_url
    requestBody.aspectRatio = job.aspect_ratio || '1:1'
  } else if (config.submit_endpoint.includes('/gpt4o-image/')) {
    // GPT-4o Image model
    requestBody.prompt = job.prompt || 'Enhance this jewelry image.'
    requestBody.inputImage = job.input_url
  } else if (config.submit_endpoint.includes('/jobs/createTask')) {
    // Market models (nano-banana, ghibli, seedream, etc.)
    const input = template.input || {}

    if (job.ai_model === 'nano-banana') {
      input.prompt = job.prompt
      input.image_urls = [job.input_url]
      input.image_size = job.aspect_ratio || '1:1'
    } else if (job.ai_model === 'nano-banana-pro') {
      input.prompt = job.prompt
      input.image_input = [job.input_url]
      input.aspect_ratio = job.aspect_ratio || '1:1'
    } else if (job.ai_model === 'ghibli') {
      input.prompt = `Transform into Studio Ghibli anime style. ${job.prompt || ''}`
      input.image_input = [job.input_url]
      input.aspect_ratio = job.aspect_ratio || '1:1'
    } else if (job.ai_model === 'seedream-v4-edit') {
      // For combination jobs
      input.prompt = job.prompt
      input.image_input = job.input_url_2
        ? [job.input_url, job.input_url_2]
        : [job.input_url]
      input.aspect_ratio = job.aspect_ratio || '1:1'
    } else {
      // Generic market model
      input.prompt = job.prompt
      input.image_input = [job.input_url]
    }

    requestBody.input = input
  }

  return requestBody
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const kieApiKey = Deno.env.get('KIE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!kieApiKey) {
      return new Response(
        JSON.stringify({ error: 'KIE_AI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user } } = await userClient.auth.getUser()
      userId = user?.id || null
    }

    // Parse request body
    const body: SubmitJobRequest = await req.json()
    const {
      job_type,
      source,
      source_id,
      ai_model,
      input_url,
      input_url_2,
      prompt,
      aspect_ratio,
      settings
    } = body

    // Validate required fields
    if (!job_type || !source || !ai_model || !input_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: job_type, source, ai_model, input_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[submit-ai-job] ${job_type} via ${source}, model: ${ai_model}`)

    // Get organization ID from source record or auth
    let organizationId: string | null = null

    if (source_id) {
      // Get org from source table
      if (source === 'shopify') {
        // For Shopify, get org from store via image -> job -> store chain
        const { data: shopifyImage } = await supabase
          .from('shopify_images')
          .select('job_id')
          .eq('id', source_id)
          .single()

        if (shopifyImage?.job_id) {
          const { data: shopifyJob } = await supabase
            .from('shopify_sync_jobs')
            .select('store_id')
            .eq('id', shopifyImage.job_id)
            .single()

          if (shopifyJob?.store_id) {
            const { data: store } = await supabase
              .from('shopify_stores')
              .select('user_id')
              .eq('id', shopifyJob.store_id)
              .single()

            if (store?.user_id) {
              // Get org from user membership
              const { data: membership } = await supabase
                .from('user_organizations')
                .select('organization_id')
                .eq('user_id', store.user_id)
                .limit(1)
                .single()

              organizationId = membership?.organization_id
            }
          }
        }
      } else {
        const sourceTable = source === 'studio' ? 'studio_generations'
          : source === 'queue' ? 'processing_queue'
          : source === 'combination' ? 'combination_jobs'
          : null

        if (sourceTable) {
          const { data: sourceRecord } = await supabase
            .from(sourceTable)
            .select('organization_id')
            .eq('id', source_id)
            .single()

          organizationId = sourceRecord?.organization_id
        }
      }
    }

    if (!organizationId && userId) {
      // Get org from user membership
      const { data: membership } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .single()

      organizationId = membership?.organization_id
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get model configuration from database
    const { data: modelConfig, error: configError } = await supabase
      .from('ai_model_configs')
      .select('*')
      .eq('id', ai_model)
      .eq('is_active', true)
      .single()

    if (configError || !modelConfig) {
      console.error('Model config not found:', ai_model, configError)
      return new Response(
        JSON.stringify({ error: `Model not found or inactive: ${ai_model}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create ai_jobs record (triggers reserve tokens)
    const { data: job, error: jobError } = await supabase
      .from('ai_jobs')
      .insert({
        organization_id: organizationId,
        job_type,
        source,
        source_id,
        ai_model,
        input_url,
        input_url_2,
        prompt,
        settings,
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to create job record', details: jobError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[submit-ai-job] Created job ${job.id}`)

    // Build callback URL with security token
    // The token is a random UUID that verifies the callback is for this specific job
    const callbackUrl = `${supabaseUrl}/functions/v1/ai-webhook?token=${job.callback_token}`

    // Build request body using model config
    const requestBody = buildRequestBody(
      modelConfig as ModelConfig,
      { ...body, aspect_ratio },
      callbackUrl
    )

    console.log(`[submit-ai-job] Calling ${modelConfig.submit_endpoint}`)

    // Submit to Kie.ai
    const kieResponse = await fetch(modelConfig.submit_endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text()
      console.error('Kie.ai API error:', kieResponse.status, errorText)

      // Update job as failed
      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error_message: `API error: ${kieResponse.status}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({
          error: 'AI provider error',
          job_id: job.id,
          details: errorText,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const kieResult = await kieResponse.json()
    console.log('[submit-ai-job] Kie.ai response:', JSON.stringify(kieResult))

    // Check for API-level errors
    if (kieResult.code && kieResult.code !== 200) {
      console.error('Kie.ai error code:', kieResult.code)

      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error_message: kieResult.message || kieResult.msg || 'Unknown error',
          error_code: String(kieResult.code),
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({
          error: kieResult.message || 'Unknown error',
          job_id: job.id,
          code: kieResult.code,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract task ID using path from config
    let taskId = getNestedValue(kieResult, modelConfig.task_id_path as string[])

    // Fallback paths
    if (!taskId) {
      taskId = kieResult.data?.taskId || kieResult.taskId || kieResult.data?.id || kieResult.id
    }

    console.log(`[submit-ai-job] Task ID: ${taskId}`)

    if (!taskId) {
      console.error('No task ID received')

      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error_message: 'No task ID received from provider',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({
          error: 'No task ID received',
          job_id: job.id,
          response: kieResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update job with task ID and submitted status
    await supabase
      .from('ai_jobs')
      .update({
        task_id: taskId,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        attempt_count: 1,
      })
      .eq('id', job.id)

    console.log(`[submit-ai-job] Job ${job.id} submitted successfully`)

    // Return immediately - webhook will handle the result
    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        task_id: taskId,
        status: 'submitted',
        message: 'Job submitted. Result will be delivered via webhook.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[submit-ai-job] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
