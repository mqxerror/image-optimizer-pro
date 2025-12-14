import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Model polling configurations (same as optimize-image)
const POLL_CONFIGS: Record<string, {
  pollEndpoint: string
  extractResultUrl: (statusResult: any) => string | null
  checkSuccess: (statusResult: any) => boolean
  checkFailed: (statusResult: any) => boolean
}> = {
  'flux-kontext-pro': {
    pollEndpoint: 'https://api.kie.ai/api/v1/flux/kontext/record-info',
    extractResultUrl: (status) => status.data?.response?.resultImageUrl || status.response?.resultImageUrl,
    checkSuccess: (status) => (status.data?.successFlag ?? status.successFlag) === 1,
    checkFailed: (status) => [2, 3].includes(status.data?.successFlag ?? status.successFlag),
  },
  'flux-kontext-max': {
    pollEndpoint: 'https://api.kie.ai/api/v1/flux/kontext/record-info',
    extractResultUrl: (status) => status.data?.response?.resultImageUrl || status.response?.resultImageUrl,
    checkSuccess: (status) => (status.data?.successFlag ?? status.successFlag) === 1,
    checkFailed: (status) => [2, 3].includes(status.data?.successFlag ?? status.successFlag),
  },
  'nano-banana': {
    pollEndpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
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
  'nano-banana-pro': {
    pollEndpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
    extractResultUrl: (status) => {
      console.log('nano-banana-pro check - status.data:', JSON.stringify(status.data))
      if (status.data?.resultJson) {
        try {
          const parsed = JSON.parse(status.data.resultJson)
          console.log('nano-banana-pro parsed resultJson:', JSON.stringify(parsed))
          const url = parsed.resultUrls?.[0]
            || parsed.images?.[0]
            || parsed.output?.images?.[0]
            || parsed.image_url
            || parsed.imageUrl
            || parsed.result
          if (url) return url
        } catch (e) {
          console.log('nano-banana-pro resultJson parse error:', e)
        }
      }
      return status.data?.output?.images?.[0]
        || status.data?.response?.images?.[0]
        || status.data?.images?.[0]
        || status.data?.image_url
        || status.data?.imageUrl
        || status.data?.result
    },
    checkSuccess: (status) => status.data?.state === 'success',
    checkFailed: (status) => status.data?.state === 'fail',
  },
  'ghibli': {
    pollEndpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
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

    // Get all pending_result and processing generations with a task_id
    const { data: pendingGenerations, error: fetchError } = await supabase
      .from('studio_generations')
      .select('id, task_id, ai_model, original_url, created_at')
      .in('status', ['pending_result', 'processing'])
      .not('task_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(10) // Process max 10 at a time to stay within timeout

    if (fetchError) {
      console.error('Error fetching pending generations:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingGenerations || pendingGenerations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending generations to check', checked: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingGenerations.length} pending generations to check`)

    const results: { id: string; status: string; resultUrl?: string }[] = []

    for (const gen of pendingGenerations) {
      const { id, task_id, ai_model, original_url, created_at } = gen

      // Skip if too old (more than 10 minutes - Kie.ai job probably failed)
      const createdAt = new Date(created_at)
      const ageMinutes = (Date.now() - createdAt.getTime()) / 1000 / 60
      if (ageMinutes > 10) {
        console.log(`Generation ${id} is ${ageMinutes.toFixed(1)} minutes old, marking as failed`)
        await supabase
          .from('studio_generations')
          .update({
            status: 'failed',
            error_message: 'Job timed out after 10 minutes',
          })
          .eq('id', id)
        results.push({ id, status: 'failed_timeout' })
        continue
      }

      const config = POLL_CONFIGS[ai_model] || POLL_CONFIGS['flux-kontext-pro']
      const pollUrl = `${config.pollEndpoint}?taskId=${task_id}`

      console.log(`Checking generation ${id} with taskId ${task_id}`)

      try {
        const statusResponse = await fetch(pollUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${kieApiKey}` },
        })

        if (!statusResponse.ok) {
          console.log(`Poll failed for ${id}: ${statusResponse.status}`)
          results.push({ id, status: 'poll_failed' })
          continue
        }

        const statusResult = await statusResponse.json()
        console.log(`Status for ${id}:`, JSON.stringify(statusResult))

        if (config.checkSuccess(statusResult)) {
          let resultUrl = config.extractResultUrl(statusResult)

          // Fallback extraction
          if (!resultUrl) {
            resultUrl = statusResult.data?.output?.images?.[0]
              || statusResult.data?.response?.images?.[0]
              || statusResult.data?.response?.resultImageUrl
              || statusResult.data?.images?.[0]
              || statusResult.data?.image_url
              || statusResult.data?.imageUrl
              || statusResult.data?.result?.images?.[0]
              || statusResult.output?.images?.[0]
              || statusResult.images?.[0]
          }

          if (resultUrl) {
            console.log(`SUCCESS! Generation ${id} has result: ${resultUrl}`)
            await supabase
              .from('studio_generations')
              .update({
                status: 'success',
                result_url: resultUrl,
                error_message: null,
              })
              .eq('id', id)
            results.push({ id, status: 'success', resultUrl })
          } else {
            console.log(`Generation ${id} shows success but no URL found`)
            results.push({ id, status: 'success_no_url' })
          }
        } else if (config.checkFailed(statusResult)) {
          const errorMsg = statusResult.data?.errorMessage || statusResult.data?.error || 'Job failed'
          console.log(`Generation ${id} failed: ${errorMsg}`)
          await supabase
            .from('studio_generations')
            .update({
              status: 'failed',
              error_message: errorMsg,
            })
            .eq('id', id)
          results.push({ id, status: 'failed' })
        } else {
          // Still processing
          console.log(`Generation ${id} still processing`)
          results.push({ id, status: 'still_processing' })
        }
      } catch (pollError) {
        console.error(`Error polling ${id}:`, pollError)
        results.push({ id, status: 'error' })
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${pendingGenerations.length} pending generations`,
        checked: pendingGenerations.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('Check pending generations error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
