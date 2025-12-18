import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Universal polling fallback for ALL AI jobs
// Checks jobs that haven't received callbacks and updates their status
// Also handles retries and timeouts

interface ModelConfig {
  id: string
  submit_endpoint: string
  status_endpoint: string
  request_template: Record<string, any>
  task_id_path: string[]
  result_url_paths: string[][]
  success_check: { path: string[]; value: any; values?: any[] }
  failure_check: { path: string[]; value?: any; values?: any[] }
  max_processing_time_sec: number
}

interface Job {
  id: string
  organization_id: string
  ai_model: string
  task_id: string
  attempt_count: number
  created_at: string
  source: string
  source_id: string
}

interface RetryJob {
  id: string
  organization_id: string
  ai_model: string
  input_url: string
  input_url_2?: string
  prompt?: string
  settings?: Record<string, any>
  attempt_count: number
  max_attempts: number
  source: string
  source_id?: string
  job_type: string
  created_by?: string
}

// Helper to extract value from nested object using path array
function getNestedValue(obj: any, path: string[]): any {
  let current = obj
  for (const key of path) {
    if (current === null || current === undefined) return null
    if (key.match(/^\d+$/)) {
      current = current[parseInt(key)]
    } else {
      current = current[key]
    }
  }
  return current
}

// Extract result URL using multiple fallback paths
function extractResultUrl(statusResult: any, paths?: string[][]): string | null {
  // Try configured paths first (if provided and not empty)
  if (paths && Array.isArray(paths) && paths.length > 0) {
    for (const path of paths) {
      let value = getNestedValue(statusResult, path)

      // Handle resultJson (stringified JSON)
      if (path.includes('resultJson') && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          const url = parsed.resultUrls?.[0]
            || parsed.images?.[0]
            || parsed.output?.images?.[0]
            || parsed.image_url
            || parsed.imageUrl
          if (url) return url
        } catch {}
      } else if (value) {
        return value
      }
    }
  }

  // Comprehensive fallback paths for all known KIE.ai response formats
  // Flux Kontext format: data.response.resultImageUrl
  // Market models format: data.resultJson (stringified) or data.output.images

  // Try Flux Kontext paths first (most common for this app)
  const fluxUrl = statusResult.data?.response?.resultImageUrl
    || statusResult.response?.resultImageUrl
    || statusResult.resultImageUrl
  if (fluxUrl) return fluxUrl

  // Try market model paths
  const marketUrl = statusResult.data?.output?.images?.[0]
    || statusResult.data?.images?.[0]
    || statusResult.data?.imageUrl
    || statusResult.data?.image_url
    || statusResult.output?.images?.[0]
    || statusResult.images?.[0]
  if (marketUrl) return marketUrl

  // Try resultJson (stringified JSON in some responses)
  const resultJson = statusResult.data?.resultJson || statusResult.resultJson
  if (resultJson) {
    try {
      const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson
      const jsonUrl = parsed.resultUrls?.[0]
        || parsed.images?.[0]
        || parsed.output?.images?.[0]
        || parsed.image_url
        || parsed.imageUrl
        || parsed.result
      if (jsonUrl) return jsonUrl
    } catch {}
  }

  return null
}

// Check if job succeeded based on model config
function checkSuccess(statusResult: any, config: ModelConfig): boolean {
  const check = config.success_check
  const value = getNestedValue(statusResult, check.path)

  if (check.values) {
    return check.values.includes(value)
  }
  return value === check.value
}

// Check if job failed based on model config
function checkFailed(statusResult: any, config: ModelConfig): boolean {
  const check = config.failure_check
  const value = getNestedValue(statusResult, check.path)

  if (check.values) {
    return check.values.includes(value)
  }
  return value === check.value
}

// Build request body for retry submission
function buildRequestBody(
  config: ModelConfig,
  job: RetryJob,
  callbackUrl: string
): Record<string, any> {
  const template = { ...(config.request_template || {}) }

  const requestBody: Record<string, any> = {
    ...template,
    callbackUrl,
  }

  // Handle different model types
  if (config.submit_endpoint.includes('/flux/kontext/')) {
    requestBody.prompt = job.prompt || 'Enhance this jewelry image for professional e-commerce presentation.'
    requestBody.inputImage = job.input_url
    requestBody.aspectRatio = (job.settings as any)?.aspect_ratio || '1:1'
  } else if (config.submit_endpoint.includes('/gpt4o-image/')) {
    requestBody.prompt = job.prompt || 'Enhance this jewelry image.'
    requestBody.inputImage = job.input_url
  } else if (config.submit_endpoint.includes('/jobs/createTask')) {
    const input = template.input || {}

    if (job.ai_model === 'nano-banana') {
      input.prompt = job.prompt
      input.image_urls = [job.input_url]
      input.image_size = (job.settings as any)?.aspect_ratio || '1:1'
    } else if (job.ai_model === 'nano-banana-pro') {
      input.prompt = job.prompt
      input.image_input = [job.input_url]
      input.aspect_ratio = (job.settings as any)?.aspect_ratio || '1:1'
    } else if (job.ai_model === 'ghibli') {
      input.prompt = `Transform into Studio Ghibli anime style. ${job.prompt || ''}`
      input.image_input = [job.input_url]
      input.aspect_ratio = (job.settings as any)?.aspect_ratio || '1:1'
    } else if (job.ai_model === 'seedream-v4-edit') {
      input.prompt = job.prompt
      input.image_input = job.input_url_2
        ? [job.input_url, job.input_url_2]
        : [job.input_url]
      input.aspect_ratio = (job.settings as any)?.aspect_ratio || '1:1'
    } else {
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

    // Get pending jobs that need checking:
    // 1. Jobs that haven't received any callback (callback_received = false)
    // 2. Jobs in 'processing' status even if they received a callback (might be stale initial callback)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('ai_jobs')
      .select('id, organization_id, ai_model, task_id, attempt_count, created_at, source, source_id')
      .in('status', ['submitted', 'processing'])
      .not('task_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(15) // Process max 15 at a time to stay within timeout

    if (fetchError) {
      console.error('[check-ai-jobs] Error fetching jobs:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs to check', checked: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[check-ai-jobs] Found ${pendingJobs.length} pending jobs to check`)

    // Get model configs for all models we need to check
    const modelIds = [...new Set(pendingJobs.map(j => j.ai_model))]
    const { data: modelConfigs } = await supabase
      .from('ai_model_configs')
      .select('id, status_endpoint, result_url_paths, success_check, failure_check, max_processing_time_sec')
      .in('id', modelIds)

    const configMap = new Map<string, ModelConfig>()
    for (const config of (modelConfigs || [])) {
      configMap.set(config.id, config)
    }

    const results: { id: string; status: string; result_url?: string; error?: string }[] = []

    for (const job of pendingJobs as Job[]) {
      const { id, ai_model, task_id, attempt_count, created_at } = job

      // Get model config
      const config = configMap.get(ai_model)
      if (!config) {
        console.log(`[check-ai-jobs] No config for model ${ai_model}, skipping job ${id}`)
        results.push({ id, status: 'no_config' })
        continue
      }

      // Check if job is too old (timeout)
      const createdAt = new Date(created_at)
      const ageSeconds = (Date.now() - createdAt.getTime()) / 1000
      const maxTime = config.max_processing_time_sec || 600 // Default 10 minutes

      if (ageSeconds > maxTime) {
        console.log(`[check-ai-jobs] Job ${id} timed out after ${ageSeconds}s (max: ${maxTime}s)`)

        await supabase
          .from('ai_jobs')
          .update({
            status: 'timeout',
            error_message: `Job timed out after ${Math.round(ageSeconds)} seconds`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', id)

        results.push({ id, status: 'timeout' })
        continue
      }

      // Poll Kie.ai for status
      const pollUrl = `${config.status_endpoint}?taskId=${task_id}`
      console.log(`[check-ai-jobs] Checking job ${id} with taskId ${task_id}`)

      try {
        const statusResponse = await fetch(pollUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${kieApiKey}` },
        })

        if (!statusResponse.ok) {
          console.log(`[check-ai-jobs] Poll failed for ${id}: ${statusResponse.status}`)
          results.push({ id, status: 'poll_failed' })
          continue
        }

        const statusResult = await statusResponse.json()
        console.log(`[check-ai-jobs] Status for ${id}:`, JSON.stringify(statusResult).substring(0, 500))

        // Check for success using config-based check OR presence of result URL
        const configSuccess = checkSuccess(statusResult, config)
        const resultUrl = extractResultUrl(statusResult, config.result_url_paths as string[][])
        const isFailed = checkFailed(statusResult, config)

        // Treat as success if config check passes OR if we have a result URL (and not explicitly failed)
        if (configSuccess || (resultUrl && !isFailed)) {
          if (resultUrl) {
            console.log(`[check-ai-jobs] SUCCESS! Job ${id} result: ${resultUrl}`)

            // Download result image from Kie.ai and re-upload to Supabase Storage
            let finalUrl = resultUrl
            try {
              console.log(`[check-ai-jobs] Downloading result image for job ${id}...`)
              const imageResponse = await fetch(resultUrl)
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob()
                const contentType = imageResponse.headers.get('content-type') || 'image/png'
                const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png'
                const fileName = `${job.organization_id}/${id}_optimized.${ext}`

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase
                  .storage
                  .from('optimized')
                  .upload(fileName, imageBlob, {
                    contentType,
                    upsert: true
                  })

                if (uploadError) {
                  console.error(`[check-ai-jobs] Upload error for job ${id}:`, uploadError)
                } else {
                  // Get public URL
                  const { data: urlData } = supabase
                    .storage
                    .from('optimized')
                    .getPublicUrl(fileName)

                  if (urlData?.publicUrl) {
                    finalUrl = urlData.publicUrl
                    console.log(`[check-ai-jobs] Uploaded to Supabase: ${finalUrl}`)
                  }
                }
              } else {
                console.error(`[check-ai-jobs] Failed to download result: ${imageResponse.status}`)
              }
            } catch (uploadErr) {
              console.error(`[check-ai-jobs] Error re-uploading result for job ${id}:`, uploadErr)
              // Continue with original URL if upload fails
            }

            await supabase
              .from('ai_jobs')
              .update({
                status: 'success',
                result_url: finalUrl, // Use Supabase URL if upload succeeded
                error_message: null,
                callback_received: true, // Mark as received even though we polled
                completed_at: new Date().toISOString(),
              })
              .eq('id', id)

            results.push({ id, status: 'success', result_url: finalUrl })
          } else {
            console.log(`[check-ai-jobs] Job ${id} shows success but no URL found`)
            console.log(`[check-ai-jobs] Full response:`, JSON.stringify(statusResult))
            results.push({ id, status: 'success_no_url' })
          }
        } else if (isFailed) {
          const errorMsg = statusResult.data?.errorMessage
            || statusResult.data?.error
            || statusResult.errorMessage
            || statusResult.error
            || 'Job failed'

          console.log(`[check-ai-jobs] Job ${id} failed: ${errorMsg}`)

          await supabase
            .from('ai_jobs')
            .update({
              status: 'failed',
              error_message: errorMsg,
              callback_received: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', id)

          results.push({ id, status: 'failed', error: errorMsg })
        } else {
          // Still processing
          console.log(`[check-ai-jobs] Job ${id} still processing`)

          // Update to processing status if currently submitted
          await supabase
            .from('ai_jobs')
            .update({ status: 'processing' })
            .eq('id', id)
            .eq('status', 'submitted')

          results.push({ id, status: 'still_processing' })
        }
      } catch (pollError) {
        console.error(`[check-ai-jobs] Error polling ${id}:`, pollError)
        results.push({ id, status: 'error' })
      }
    }

    // =========================================
    // PART 2: Process jobs that need retry
    // =========================================
    const retryResults: { id: string; status: string; task_id?: string; error?: string }[] = []

    // Get jobs ready for retry (status=pending, next_retry_at <= now, attempt_count > 0)
    const { data: retryJobs, error: retryFetchError } = await supabase
      .from('ai_jobs')
      .select('id, organization_id, ai_model, input_url, input_url_2, prompt, settings, attempt_count, max_attempts, source, source_id, job_type, created_by, callback_token')
      .eq('status', 'pending')
      .gt('attempt_count', 0) // Only jobs that are actually retrying
      .lte('next_retry_at', new Date().toISOString())
      .lt('attempt_count', 3) // Ensure we don't exceed max attempts
      .order('next_retry_at', { ascending: true })
      .limit(5) // Process max 5 retries at a time

    if (retryFetchError) {
      console.error('[check-ai-jobs] Error fetching retry jobs:', retryFetchError)
    } else if (retryJobs && retryJobs.length > 0) {
      console.log(`[check-ai-jobs] Found ${retryJobs.length} jobs ready for retry`)

      // Get model configs for retry jobs
      const retryModelIds = [...new Set(retryJobs.map(j => j.ai_model))]
      const { data: retryModelConfigs } = await supabase
        .from('ai_model_configs')
        .select('*')
        .in('id', retryModelIds)

      const retryConfigMap = new Map<string, ModelConfig>()
      for (const config of (retryModelConfigs || [])) {
        retryConfigMap.set(config.id, config)
      }

      for (const job of retryJobs as RetryJob[]) {
        const config = retryConfigMap.get(job.ai_model)
        if (!config) {
          console.log(`[check-ai-jobs] No config for retry model ${job.ai_model}`)
          retryResults.push({ id: job.id, status: 'no_config' })
          continue
        }

        console.log(`[check-ai-jobs] Retrying job ${job.id} (attempt ${job.attempt_count + 1}/${job.max_attempts})`)

        try {
          // Generate new callback token
          const callbackToken = (job as any).callback_token || crypto.randomUUID()
          const callbackUrl = `${supabaseUrl}/functions/v1/ai-webhook?token=${callbackToken}`

          // Build request body
          const requestBody = buildRequestBody(config, job, callbackUrl)

          // Submit to Kie.ai
          const kieResponse = await fetch(config.submit_endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${kieApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })

          if (!kieResponse.ok) {
            const errorText = await kieResponse.text()
            console.error(`[check-ai-jobs] Retry submit failed for ${job.id}:`, errorText)

            // Mark as failed if API call fails
            await supabase
              .from('ai_jobs')
              .update({
                status: 'failed',
                error_message: `Retry failed: API error ${kieResponse.status}`,
                completed_at: new Date().toISOString(),
              })
              .eq('id', job.id)

            retryResults.push({ id: job.id, status: 'retry_failed', error: errorText })
            continue
          }

          const kieResult = await kieResponse.json()

          // Check for API-level errors
          if (kieResult.code && kieResult.code !== 200) {
            await supabase
              .from('ai_jobs')
              .update({
                status: 'failed',
                error_message: kieResult.message || 'Retry failed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', job.id)

            retryResults.push({ id: job.id, status: 'retry_error', error: kieResult.message })
            continue
          }

          // Extract task ID
          let taskId = getNestedValue(kieResult, config.task_id_path as string[])
          if (!taskId) {
            taskId = kieResult.data?.taskId || kieResult.taskId || kieResult.data?.id
          }

          if (!taskId) {
            await supabase
              .from('ai_jobs')
              .update({
                status: 'failed',
                error_message: 'No task ID on retry',
                completed_at: new Date().toISOString(),
              })
              .eq('id', job.id)

            retryResults.push({ id: job.id, status: 'no_task_id' })
            continue
          }

          // Update job with new task ID and submitted status
          await supabase
            .from('ai_jobs')
            .update({
              task_id: taskId,
              status: 'submitted',
              submitted_at: new Date().toISOString(),
              next_retry_at: null,
              error_message: null,
            })
            .eq('id', job.id)

          console.log(`[check-ai-jobs] Retry successful for ${job.id}, new taskId: ${taskId}`)
          retryResults.push({ id: job.id, status: 'retried', task_id: taskId })

        } catch (retryError) {
          console.error(`[check-ai-jobs] Error retrying ${job.id}:`, retryError)
          retryResults.push({ id: job.id, status: 'error' })
        }
      }
    }

    // Summary
    const summary = {
      checked: pendingJobs.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      still_processing: results.filter(r => r.status === 'still_processing').length,
      retries_processed: retryResults.filter(r => r.status === 'retried').length,
      retries_failed: retryResults.filter(r => r.status.includes('fail') || r.status === 'error').length,
    }

    console.log(`[check-ai-jobs] Summary:`, JSON.stringify(summary))

    return new Response(
      JSON.stringify({
        message: `Checked ${pendingJobs.length} pending jobs, processed ${retryResults.length} retries`,
        ...summary,
        results,
        retryResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[check-ai-jobs] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
