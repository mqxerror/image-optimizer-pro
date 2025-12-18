import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Universal webhook receiver for ALL AI job callbacks
// Handles callbacks from Kie.ai and updates ai_jobs table
// Database triggers automatically sync results to source tables
// Security: Uses callback_token for authentication (no JWT required)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract callback token from URL query parameter
    const url = new URL(req.url)
    const callbackToken = url.searchParams.get('token')

    // Parse the callback payload
    const payload = await req.json()
    console.log('[ai-webhook] Received callback:', JSON.stringify(payload))

    // Extract task ID - Kie.ai sends in various formats
    const taskId = payload.taskId
      || payload.task_id
      || payload.id
      || payload.data?.taskId
      || payload.data?.task_id
      || payload.data?.id

    if (!taskId) {
      console.error('[ai-webhook] No taskId in payload')
      return new Response(
        JSON.stringify({ error: 'Missing taskId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[ai-webhook] Processing callback for taskId: ${taskId}, token: ${callbackToken ? 'present' : 'missing'}`)

    // Find the job by task_id in ai_jobs table (include callback_token for verification)
    const { data: job, error: findError } = await supabase
      .from('ai_jobs')
      .select('id, status, ai_model, source, source_id, organization_id, callback_token')
      .eq('task_id', taskId)
      .single()

    if (findError || !job) {
      console.error('[ai-webhook] Job not found for taskId:', taskId, findError)

      // Try legacy table for backwards compatibility during transition
      const { data: legacyGen } = await supabase
        .from('studio_generations')
        .select('id, status')
        .eq('task_id', taskId)
        .single()

      if (legacyGen) {
        console.log('[ai-webhook] Found in legacy studio_generations, processing there')
        // Handle legacy callback (same logic as old kie-webhook)
        return await handleLegacyCallback(supabase, taskId, payload, legacyGen)
      }

      return new Response(
        JSON.stringify({ error: 'Job not found', taskId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify callback token for security
    // Token MUST be provided and match - no legacy fallback (secure mode)
    if (!callbackToken) {
      console.error(`[ai-webhook] Missing callback token for job ${job.id}`)
      return new Response(
        JSON.stringify({ error: 'Missing callback token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!job.callback_token) {
      console.error(`[ai-webhook] Job ${job.id} has no callback_token stored`)
      return new Response(
        JSON.stringify({ error: 'Job missing callback token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Constant-time comparison to prevent timing attacks
    const encoder = new TextEncoder()
    const a = encoder.encode(callbackToken)
    const b = encoder.encode(job.callback_token)

    // Length check + byte-by-byte XOR (constant time)
    let tokenValid = a.length === b.length
    let diff = 0
    for (let i = 0; i < a.length && i < b.length; i++) {
      diff |= a[i] ^ b[i]
    }
    tokenValid = tokenValid && diff === 0

    if (!tokenValid) {
      console.error(`[ai-webhook] Invalid token for job ${job.id}`)
      return new Response(
        JSON.stringify({ error: 'Invalid callback token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[ai-webhook] Token verified for job ${job.id}`)

    // Check if already completed
    if (['success', 'failed', 'timeout', 'cancelled'].includes(job.status)) {
      console.log(`[ai-webhook] Job ${job.id} already completed with status: ${job.status}`)
      return new Response(
        JSON.stringify({ message: 'Already processed', job_id: job.id, status: job.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine success/failure from callback payload
    // Different Kie.ai endpoints return different formats
    const isSuccess =
      payload.state === 'success' ||
      payload.status === 'success' ||
      payload.successFlag === 1 ||
      payload.data?.state === 'success' ||
      payload.data?.successFlag === 1 ||
      (payload.data?.successFlag ?? payload.successFlag) === 1

    const isFailed =
      payload.state === 'fail' ||
      payload.state === 'failed' ||
      payload.status === 'failed' ||
      payload.status === 'fail' ||
      payload.successFlag === 2 ||
      payload.successFlag === 3 ||
      payload.data?.state === 'fail' ||
      payload.data?.state === 'failed' ||
      [2, 3].includes(payload.data?.successFlag ?? payload.successFlag)

    // Extract result URL early - some endpoints send URL without explicit success flag
    const resultUrl = extractResultUrl(payload)

    // If we have a result URL, treat as success even without explicit success flag
    // (Flux Kontext and some other models send result without successFlag)
    if (isSuccess || (resultUrl && !isFailed)) {
      if (resultUrl) {
        console.log(`[ai-webhook] SUCCESS! Job ${job.id} result: ${resultUrl}`)

        // IMGPROXY DISABLED - using Kie.ai result URL directly
        // TODO: Re-enable imgproxy compression and re-upload once working
        const finalUrl = resultUrl
        console.log(`[ai-webhook] Using direct result URL (imgproxy disabled)`)

        // Update job (triggers sync to source table via database trigger)
        const { error: updateError } = await supabase
          .from('ai_jobs')
          .update({
            status: 'success',
            result_url: finalUrl,
            error_message: null,
            callback_received: true,
            callback_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        if (updateError) {
          console.error('[ai-webhook] Failed to update job:', updateError)
          return new Response(
            JSON.stringify({ error: 'Database update failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Note: We keep both compressed original and optimized result
        // Future feature: Keep originals for 3 months free, then $5/month for extended storage

        return new Response(
          JSON.stringify({
            success: true,
            job_id: job.id,
            status: 'success',
            result_url: finalUrl,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Success callback but no result URL - poll KIE.ai to get the result
        console.log('[ai-webhook] Success callback but no result URL in payload, polling for result...')
        console.log('[ai-webhook] Callback payload:', JSON.stringify(payload))

        const kieApiKey = Deno.env.get('KIE_AI_API_KEY')
        if (!kieApiKey) {
          console.error('[ai-webhook] KIE_AI_API_KEY not configured')
          // Let polling pick it up later
          await supabase
            .from('ai_jobs')
            .update({
              status: 'processing',
              callback_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          return new Response(
            JSON.stringify({ message: 'Success indicated but no result URL, queued for polling' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get model config to find status endpoint
        const { data: modelConfig } = await supabase
          .from('ai_model_configs')
          .select('status_endpoint')
          .eq('id', job.ai_model)
          .single()

        if (modelConfig?.status_endpoint) {
          const statusUrl = `${modelConfig.status_endpoint}?taskId=${taskId}`
          console.log(`[ai-webhook] Polling: ${statusUrl}`)

          try {
            const statusResponse = await fetch(statusUrl, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${kieApiKey}` },
            })

            if (statusResponse.ok) {
              const statusResult = await statusResponse.json()
              console.log('[ai-webhook] Poll result:', JSON.stringify(statusResult).substring(0, 500))

              // Extract result URL from poll response
              const polledUrl = extractResultUrl(statusResult)
              if (polledUrl) {
                console.log(`[ai-webhook] Got result from poll: ${polledUrl}`)

                await supabase
                  .from('ai_jobs')
                  .update({
                    status: 'success',
                    result_url: polledUrl,
                    error_message: null,
                    callback_received: true,
                    callback_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', job.id)

                return new Response(
                  JSON.stringify({
                    success: true,
                    job_id: job.id,
                    status: 'success',
                    result_url: polledUrl,
                    source: 'polled_after_callback'
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
              }
            }
          } catch (pollError) {
            console.error('[ai-webhook] Poll error:', pollError)
          }
        }

        // Couldn't get result, let cron polling handle it
        console.log('[ai-webhook] Could not get result from poll, leaving for cron')
        await supabase
          .from('ai_jobs')
          .update({
            status: 'processing',
            callback_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        return new Response(
          JSON.stringify({ message: 'Success indicated but result pending, queued for polling' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (isFailed) {
      const errorMessage = payload.errorMessage
        || payload.error
        || payload.message
        || payload.data?.errorMessage
        || payload.data?.error
        || payload.data?.message
        || 'Job failed'

      console.log(`[ai-webhook] FAILED! Job ${job.id} error: ${errorMessage}`)

      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          callback_received: true,
          callback_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({
          success: false,
          job_id: job.id,
          status: 'failed',
          error: errorMessage,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Unknown state - log for debugging but don't fail
    console.log('[ai-webhook] Unknown callback state. Full payload:', JSON.stringify(payload))

    // Update to processing status but DON'T mark callback_received = true
    // This allows the polling function (check-ai-jobs) to still check for completion
    await supabase
      .from('ai_jobs')
      .update({
        status: 'processing',
        // callback_received stays false so polling can pick this up
        callback_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return new Response(
      JSON.stringify({
        message: 'Callback received but state unclear, will poll for result',
        job_id: job.id,
        payload_keys: Object.keys(payload),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[ai-webhook] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Extract result URL from various payload formats
function extractResultUrl(payload: any): string | null {
  // Try resultJson first (market models return stringified JSON)
  if (payload.resultJson || payload.data?.resultJson) {
    try {
      const resultJson = payload.resultJson || payload.data?.resultJson
      const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson
      const url = parsed.resultUrls?.[0]
        || parsed.images?.[0]
        || parsed.output?.images?.[0]
        || parsed.image_url
        || parsed.imageUrl
        || parsed.result
      if (url) return url
    } catch (e) {
      console.log('[ai-webhook] Failed to parse resultJson:', e)
    }
  }

  // Try direct paths in order of likelihood
  return payload.resultImageUrl
    || payload.result_url
    || payload.imageUrl
    || payload.image_url
    || payload.output?.images?.[0]
    || payload.response?.resultImageUrl
    || payload.response?.images?.[0]
    || payload.data?.response?.resultImageUrl
    || payload.data?.output?.images?.[0]
    || payload.data?.images?.[0]
    || payload.data?.imageUrl
    || payload.data?.image_url
    || payload.data?.result
    || payload.images?.[0]
    || null
}

// Handle callbacks for legacy studio_generations records (during transition)
async function handleLegacyCallback(
  supabase: any,
  taskId: string,
  payload: any,
  generation: { id: string; status: string }
): Promise<Response> {
  if (['success', 'failed'].includes(generation.status)) {
    return new Response(
      JSON.stringify({ message: 'Already processed (legacy)', generationId: generation.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const isSuccess = payload.state === 'success'
    || payload.status === 'success'
    || payload.successFlag === 1
    || payload.data?.state === 'success'
    || payload.data?.successFlag === 1

  if (isSuccess) {
    const resultUrl = extractResultUrl(payload)
    if (resultUrl) {
      await supabase
        .from('studio_generations')
        .update({
          status: 'success',
          result_url: resultUrl,
          error_message: null,
        })
        .eq('id', generation.id)

      return new Response(
        JSON.stringify({ success: true, generationId: generation.id, resultUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  const isFailed = payload.state === 'fail'
    || payload.status === 'failed'
    || [2, 3].includes(payload.successFlag)
    || payload.data?.state === 'fail'

  if (isFailed) {
    const errorMessage = payload.errorMessage || payload.error || 'Job failed'
    await supabase
      .from('studio_generations')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', generation.id)

    return new Response(
      JSON.stringify({ success: false, generationId: generation.id, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ message: 'Legacy callback state unknown' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
