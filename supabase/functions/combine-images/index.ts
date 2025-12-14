import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Thin wrapper around submit-ai-job for image combination
// Handles prompt building and delegates to the unified job submission

interface CombineRequest {
  job_id?: string // If provided, fetch settings from DB
  model_image_url?: string
  jewelry_image_url?: string
  ai_model?: string
  position_y?: number
  scale?: number
  blend_intensity?: number
  lighting_match?: number
  rotation?: number
  advanced_settings?: {
    placement?: {
      preset?: string
      fine_x?: number
      fine_y?: number
    }
    lighting?: {
      shadow_enabled?: boolean
      shadow_intensity?: number
      shadow_direction?: string
    }
    realism?: {
      skin_tone_match?: boolean
      depth_of_field_match?: boolean
      reflectivity?: number
    }
  }
}

// Build combination prompt from settings
function buildCombinationPrompt(
  settings: {
    position_y: number
    scale: number
    blend_intensity: number
    lighting_match: number
    rotation: number
    advanced_settings?: any
  }
): string {
  // Base prompt for combination
  let prompt = `Seamlessly composite the jewelry onto the model photo as if they are naturally wearing it.`

  // Position/placement based on position_y value
  const posY = settings.position_y
  if (posY < 30) {
    prompt += ` Position the jewelry higher on the model (neck/face area).`
  } else if (posY > 70) {
    prompt += ` Position the jewelry lower on the model (chest/hands area).`
  } else {
    prompt += ` Position the jewelry at a natural center position.`
  }

  // Scale
  if (settings.scale < 80) {
    prompt += ` Make the jewelry smaller than its original size.`
  } else if (settings.scale > 120) {
    prompt += ` Make the jewelry larger than its original size.`
  }

  // Rotation
  if (settings.rotation !== 0) {
    const rotationDesc = settings.rotation > 0 ? 'clockwise' : 'counter-clockwise'
    prompt += ` Rotate the jewelry ${Math.abs(settings.rotation)} degrees ${rotationDesc} to match the model's pose.`
  }

  // Lighting match
  if (settings.lighting_match > 50) {
    prompt += ` Match the lighting and shadows on the jewelry to the model's photo lighting conditions.`
  }

  // Blend intensity
  if (settings.blend_intensity > 50) {
    prompt += ` Blend the edges seamlessly so the jewelry appears to be part of the original photo.`
  }

  // Quality
  prompt += ` The final image should be photorealistic, high quality, and indistinguishable from a real photograph.`

  return prompt
}

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
      console.error('[combine-images] KIE_AI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'KIE_AI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: CombineRequest = await req.json()

    let jobId = body.job_id
    let modelImageUrl = body.model_image_url
    let jewelryImageUrl = body.jewelry_image_url
    let aiModel = body.ai_model ?? 'flux-kontext-max'
    let settings = {
      position_y: body.position_y ?? 50,
      scale: body.scale ?? 100,
      blend_intensity: body.blend_intensity ?? 70,
      lighting_match: body.lighting_match ?? 80,
      rotation: body.rotation ?? 0,
      advanced_settings: body.advanced_settings,
    }

    // If job_id provided, fetch from database
    if (jobId) {
      const { data: job, error } = await supabase
        .from('combination_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      modelImageUrl = job.model_image_url
      jewelryImageUrl = job.jewelry_image_url
      aiModel = job.ai_model || 'flux-kontext-max'
      settings = {
        position_y: job.position_y,
        scale: job.scale,
        blend_intensity: job.blend_intensity,
        lighting_match: job.lighting_match,
        rotation: job.rotation,
        advanced_settings: job.advanced_settings,
      }

      // Update status to generating
      await supabase
        .from('combination_jobs')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    if (!modelImageUrl || !jewelryImageUrl) {
      return new Response(
        JSON.stringify({ error: 'model_image_url and jewelry_image_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[combine-images] Starting combination')
    console.log('[combine-images] AI Model:', aiModel)
    console.log('[combine-images] Job ID:', jobId)

    // Build the combination prompt
    const combinationPrompt = buildCombinationPrompt(settings)
    console.log('[combine-images] Prompt:', combinationPrompt)

    // Update job with generated prompt
    if (jobId) {
      await supabase
        .from('combination_jobs')
        .update({
          generated_prompt: combinationPrompt,
          ai_model: aiModel,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    // Submit job via unified submit-ai-job function
    console.log('[combine-images] Submitting to submit-ai-job')

    const submitResponse = await fetch(
      `${supabaseUrl}/functions/v1/submit-ai-job`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader || `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_type: 'combine',
          source: 'combination',
          source_id: jobId,
          ai_model: aiModel,
          input_url: modelImageUrl,
          input_url_2: jewelryImageUrl,
          prompt: combinationPrompt,
          aspect_ratio: '1:1',
          settings: settings,
        })
      }
    )

    const submitResult = await submitResponse.json()
    console.log('[combine-images] Submit result:', JSON.stringify(submitResult))

    if (submitResult.error) {
      // Update job status on error
      if (jobId) {
        await supabase
          .from('combination_jobs')
          .update({
            status: 'failed',
            error_message: submitResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
      }

      return new Response(
        JSON.stringify({
          error: submitResult.error,
          details: submitResult.details,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update job with task info
    if (jobId && submitResult.task_id) {
      await supabase
        .from('combination_jobs')
        .update({
          task_id: submitResult.task_id,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    // Return success - webhook will handle the result
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Combination job submitted. Result will be delivered via webhook.',
        task_id: submitResult.task_id,
        job_id: submitResult.job_id,
        combination_job_id: jobId,
        ai_model: aiModel,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[combine-images] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
