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
  status_endpoint: string
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

            await supabase
              .from('ai_jobs')
              .update({
                status: 'success',
                result_url: resultUrl,
                error_message: null,
                callback_received: true, // Mark as received even though we polled
                completed_at: new Date().toISOString(),
              })
              .eq('id', id)

            results.push({ id, status: 'success', result_url: resultUrl })
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

    // Summary
    const summary = {
      checked: pendingJobs.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      still_processing: results.filter(r => r.status === 'still_processing').length,
    }

    console.log(`[check-ai-jobs] Summary:`, JSON.stringify(summary))

    return new Response(
      JSON.stringify({
        message: `Checked ${pendingJobs.length} pending jobs`,
        ...summary,
        results,
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
