import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// This webhook receives callbacks from Kie.ai when jobs complete
// No authentication required since Kie.ai calls this endpoint

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the callback payload from Kie.ai
    const payload = await req.json()
    console.log('Kie.ai webhook received:', JSON.stringify(payload))

    // Extract task ID - Kie.ai sends this in various formats
    const taskId = payload.taskId || payload.task_id || payload.id || payload.data?.taskId

    if (!taskId) {
      console.error('No taskId in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Missing taskId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing callback for taskId:', taskId)

    // Find the generation record by task_id
    const { data: generation, error: findError } = await supabase
      .from('studio_generations')
      .select('id, status')
      .eq('task_id', taskId)
      .single()

    if (findError || !generation) {
      console.error('Generation not found for taskId:', taskId, findError)
      return new Response(
        JSON.stringify({ error: 'Generation not found', taskId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already processed
    if (generation.status === 'success' || generation.status === 'failed') {
      console.log('Generation already processed:', generation.id, generation.status)
      return new Response(
        JSON.stringify({ message: 'Already processed', generationId: generation.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine success/failure from Kie.ai callback
    // Different endpoints return different formats
    const isSuccess =
      payload.state === 'success' ||
      payload.status === 'success' ||
      payload.successFlag === 1 ||
      payload.data?.state === 'success' ||
      payload.data?.successFlag === 1

    const isFailed =
      payload.state === 'fail' ||
      payload.state === 'failed' ||
      payload.status === 'failed' ||
      payload.successFlag === 2 ||
      payload.successFlag === 3 ||
      payload.data?.state === 'fail' ||
      [2, 3].includes(payload.data?.successFlag)

    if (isSuccess) {
      // Extract result URL - try multiple paths
      let resultUrl = null

      // Try resultJson first (market models)
      if (payload.resultJson || payload.data?.resultJson) {
        try {
          const resultJson = payload.resultJson || payload.data?.resultJson
          const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson
          resultUrl = parsed.resultUrls?.[0]
            || parsed.images?.[0]
            || parsed.output?.images?.[0]
            || parsed.image_url
            || parsed.imageUrl
        } catch (e) {
          console.log('Failed to parse resultJson:', e)
        }
      }

      // Try direct paths
      if (!resultUrl) {
        resultUrl = payload.resultImageUrl
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
          || payload.images?.[0]
      }

      if (resultUrl) {
        console.log('SUCCESS! Updating generation with result:', resultUrl)

        const { error: updateError } = await supabase
          .from('studio_generations')
          .update({
            status: 'success',
            result_url: resultUrl,
            error_message: null,
          })
          .eq('id', generation.id)

        if (updateError) {
          console.error('Failed to update generation:', updateError)
          return new Response(
            JSON.stringify({ error: 'Database update failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, generationId: generation.id, resultUrl }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log('Success callback but no result URL found. Full payload:', JSON.stringify(payload))
      }
    }

    if (isFailed) {
      const errorMessage = payload.errorMessage
        || payload.error
        || payload.message
        || payload.data?.errorMessage
        || payload.data?.error
        || 'Job failed'

      console.log('FAILED! Updating generation with error:', errorMessage)

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

    // Unknown state - log for debugging
    console.log('Unknown callback state. Full payload:', JSON.stringify(payload))
    return new Response(
      JSON.stringify({ message: 'Callback received but state unknown', payload }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
