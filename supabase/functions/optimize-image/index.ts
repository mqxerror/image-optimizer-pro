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
  aspect_ratio?: string
  generation_id?: string
  settings?: {
    enhance_quality?: boolean
    remove_background?: boolean
    enhance_lighting?: boolean
    enhance_colors?: boolean
  }
}

// Thin wrapper around submit-ai-job for backward compatibility
// This function handles prompt building and delegates to the unified job submission

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')

    // Check if KIE_AI_API_KEY is configured
    if (!Deno.env.get('KIE_AI_API_KEY')) {
      console.error('[optimize-image] KIE_AI_API_KEY not configured')
      return new Response(
        JSON.stringify({
          error: 'KIE_AI_API_KEY not configured',
          passthrough: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: OptimizeRequest = await req.json()
    const {
      image_url,
      prompt,
      file_id,
      ai_model = 'flux-kontext-pro',
      aspect_ratio = '1:1',
      settings,
      generation_id
    } = body

    if (!image_url && !file_id) {
      return new Response(
        JSON.stringify({ error: 'image_url or file_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[optimize-image] Starting optimization')
    console.log('[optimize-image] AI Model:', ai_model)
    console.log('[optimize-image] Generation ID:', generation_id)

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

    // Get image URL from Google Drive if needed
    let imageDataUrl = image_url

    if (file_id && !image_url) {
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

    // Submit job via unified submit-ai-job function
    console.log('[optimize-image] Submitting to submit-ai-job')

    const submitResponse = await fetch(
      `${supabaseUrl}/functions/v1/submit-ai-job`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader || `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_type: 'optimize',
          source: 'studio',
          source_id: generation_id,
          ai_model: ai_model,
          input_url: imageDataUrl,
          prompt: enhancementPrompt,
          aspect_ratio: aspect_ratio,
          settings: settings,
        })
      }
    )

    const submitResult = await submitResponse.json()
    console.log('[optimize-image] Submit result:', JSON.stringify(submitResult))

    if (submitResult.error) {
      // Update generation if we have one
      if (generation_id) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('studio_generations')
          .update({
            status: 'failed',
            error_message: submitResult.error,
          })
          .eq('id', generation_id)
      }

      return new Response(
        JSON.stringify({
          error: submitResult.error,
          details: submitResult.details,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update generation with job info
    if (generation_id && submitResult.task_id) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase
        .from('studio_generations')
        .update({
          task_id: submitResult.task_id,
          ai_model: ai_model,
          status: 'processing',
        })
        .eq('id', generation_id)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job submitted. Result will be delivered via webhook.',
        task_id: submitResult.task_id,
        job_id: submitResult.job_id,
        generation_id: generation_id,
        ai_model: ai_model,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[optimize-image] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
