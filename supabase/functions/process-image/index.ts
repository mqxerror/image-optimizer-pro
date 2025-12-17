import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  "https://aistudio.pixelcraftedmedia.com",
  "https://staging.pixelcraftedmedia.com",
  "http://localhost:3000",
  "http://localhost:5173"
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || ""
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true"
  }
}

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`)
    }
    throw error
  }
}

interface ProcessRequest {
  queue_item_id: string
}

// Studio preset type (matches database schema)
interface StudioPreset {
  camera_lens: string
  camera_aperture: string
  camera_angle: string
  camera_focus: string
  camera_distance: string
  lighting_style: string
  lighting_key_intensity: number
  lighting_fill_intensity: number
  lighting_rim_intensity: number
  lighting_direction: string
  background_type: string
  background_surface: string
  background_shadow: string
  background_reflection: number
  jewelry_metal: string
  jewelry_finish: string
  jewelry_sparkle: number
  jewelry_color_pop: number
  jewelry_detail: number
  composition_framing: string
  composition_aspect_ratio: string
  composition_padding: number
}

/**
 * Build prompt from studio preset - matches frontend PromptBuilder.ts exactly
 */
function buildPromptFromPreset(preset: StudioPreset): string {
  const parts: string[] = []

  // Start with base photography description
  parts.push('Professional jewelry product photography')

  // Camera settings
  const lensMap: Record<string, string> = {
    '50mm': '50mm lens for natural perspective',
    '85mm': '85mm portrait lens for flattering compression',
    '100mm': '100mm macro lens for extreme detail',
    '135mm': '135mm telephoto for beautiful bokeh',
  }
  const apertureMap: Record<string, string> = {
    'f/1.4': 'wide open at f/1.4 for creamy bokeh',
    'f/2.8': 'f/2.8 for subject isolation',
    'f/8': 'f/8 for sharp detail throughout',
    'f/16': 'f/16 for maximum depth of field',
  }
  const angleMap: Record<string, string> = {
    'top-down': 'shot from directly above (flat lay)',
    '45deg': 'shot at 45 degree angle',
    'eye-level': 'eye-level perspective',
    'low-angle': 'shot from low angle looking up',
  }
  const cameraParts = [
    lensMap[preset.camera_lens] || `${preset.camera_lens} lens`,
    apertureMap[preset.camera_aperture] || preset.camera_aperture,
    angleMap[preset.camera_angle] || preset.camera_angle,
  ]
  if (preset.camera_focus === 'shallow-dof') {
    cameraParts.push('shallow depth of field with artistic blur')
  } else if (preset.camera_focus === 'tilt-shift') {
    cameraParts.push('tilt-shift effect for miniature look')
  }
  parts.push(cameraParts.join(', '))

  // Lighting settings
  const styleMap: Record<string, string> = {
    'studio-3point': 'professional three-point studio lighting',
    'natural': 'soft natural window light',
    'dramatic': 'dramatic high-contrast lighting with deep shadows',
    'soft': 'soft diffused lighting for even illumination',
    'rim': 'rim lighting for edge definition',
    'split': 'split lighting for artistic effect',
  }
  const dirMap: Record<string, string> = {
    'top-left': 'light from upper left',
    'top': 'overhead lighting',
    'top-right': 'light from upper right',
    'left': 'side lighting from left',
    'center': 'front-facing light',
    'right': 'side lighting from right',
    'bottom-left': 'low light from left',
    'bottom': 'low accent lighting',
    'bottom-right': 'low light from right',
  }
  const lightingParts = [
    styleMap[preset.lighting_style] || preset.lighting_style,
    dirMap[preset.lighting_direction] || preset.lighting_direction,
  ]
  if (preset.lighting_key_intensity > 80) {
    lightingParts.push('bright key light')
  } else if (preset.lighting_key_intensity < 40) {
    lightingParts.push('subtle key light')
  }
  if (preset.lighting_rim_intensity > 60) {
    lightingParts.push('strong rim lighting for edge separation')
  }
  parts.push(lightingParts.join(', '))

  // Background settings
  const bgTypeMap: Record<string, string> = {
    'white': 'clean pure white background',
    'gradient': 'subtle gradient background',
    'black': 'dramatic black background',
    'transparent': 'transparent background for compositing',
    'scene': 'lifestyle scene setting',
  }
  const surfaceMap: Record<string, string> = {
    'marble': 'on luxurious marble surface',
    'velvet': 'on rich velvet fabric',
    'wood': 'on natural wood surface',
    'mirror': 'on reflective mirror surface',
    'silk': 'on elegant silk fabric',
    'concrete': 'on modern concrete surface',
  }
  const shadowMap: Record<string, string> = {
    'none': '',
    'soft': 'with soft natural shadow',
    'hard': 'with crisp defined shadow',
    'floating': 'floating with subtle shadow below',
  }
  const bgParts = [bgTypeMap[preset.background_type] || preset.background_type]
  if (preset.background_surface !== 'none' && surfaceMap[preset.background_surface]) {
    bgParts.push(surfaceMap[preset.background_surface])
  }
  if (shadowMap[preset.background_shadow]) {
    bgParts.push(shadowMap[preset.background_shadow])
  }
  if (preset.background_reflection > 30) {
    bgParts.push('with mirror-like reflection')
  } else if (preset.background_reflection > 0) {
    bgParts.push('with subtle reflection')
  }
  parts.push(bgParts.filter(Boolean).join(', '))

  // Jewelry enhancements
  const metalMap: Record<string, string> = {
    'gold': 'rich yellow gold with warm tones',
    'silver': 'brilliant silver with cool tones',
    'rose-gold': 'elegant rose gold with pink undertones',
    'platinum': 'lustrous platinum finish',
    'mixed': 'mixed metals beautifully combined',
  }
  const finishMap: Record<string, string> = {
    'high-polish': 'highly polished mirror-like finish',
    'matte': 'sophisticated matte finish',
    'brushed': 'brushed texture finish',
    'hammered': 'artisanal hammered texture',
  }
  const jewelryParts = []
  if (preset.jewelry_metal !== 'auto' && metalMap[preset.jewelry_metal]) {
    jewelryParts.push(metalMap[preset.jewelry_metal])
  }
  jewelryParts.push(finishMap[preset.jewelry_finish] || preset.jewelry_finish)
  if (preset.jewelry_sparkle > 80) {
    jewelryParts.push('brilliant sparkling highlights and light play')
  } else if (preset.jewelry_sparkle > 50) {
    jewelryParts.push('elegant sparkle and shine')
  }
  if (preset.jewelry_color_pop > 70) {
    jewelryParts.push('vibrant enhanced colors')
  }
  if (preset.jewelry_detail > 80) {
    jewelryParts.push('extreme detail showing every facet and texture')
  } else if (preset.jewelry_detail > 50) {
    jewelryParts.push('sharp detail throughout')
  }
  parts.push(jewelryParts.join(', '))

  // Composition
  const framingMap: Record<string, string> = {
    'center': 'centered composition',
    'rule-of-thirds': 'composed using rule of thirds',
    'golden-ratio': 'golden ratio composition',
  }
  const aspectMap: Record<string, string> = {
    '1:1': 'square format',
    '4:5': 'portrait format for Instagram',
    '16:9': 'widescreen format',
    '9:16': 'vertical story format',
    '3:4': 'classic portrait ratio',
    '4:3': 'classic landscape ratio',
  }
  const compParts = [
    framingMap[preset.composition_framing] || preset.composition_framing,
    aspectMap[preset.composition_aspect_ratio] || preset.composition_aspect_ratio,
  ]
  if (preset.composition_padding > 30) {
    compParts.push('generous negative space around subject')
  }
  parts.push(compParts.join(', '))

  // Add quality boosters
  parts.push('8K resolution, ultra high detail, commercial quality, ready for e-commerce')

  return parts.join('. ') + '.'
}

// FIRE-AND-FORGET PATTERN
// This function now:
// 1. Downloads image from Google Drive
// 2. Uploads to storage
// 3. Submits AI job via submit-ai-job (returns immediately)
// 4. Database triggers handle creating history when job completes

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let queueItemId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ProcessRequest = await req.json()
    queueItemId = body.queue_item_id

    if (!queueItemId) {
      return new Response(
        JSON.stringify({ error: 'queue_item_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[process-image] Processing queue item:', queueItemId)

    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('processing_queue')
      .select('*, projects(*)')
      .eq('id', queueItemId)
      .single()

    if (queueError || !queueItem) {
      return new Response(
        JSON.stringify({ error: 'Queue item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[process-image] Queue item:', queueItem.file_name, 'Status:', queueItem.status)

    // Check file type - RAW files are too large for edge function memory limits
    const fileName = queueItem.file_name?.toLowerCase() || ''
    const inputFileExt = fileName.split('.').pop() || ''
    const rawExtensions = ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raw', 'orf', 'rw2', 'pef', 'srw']

    if (rawExtensions.includes(inputFileExt)) {
      console.error('[process-image] RAW file not supported:', inputFileExt)

      // Mark as failed with helpful message
      await supabase
        .from('processing_queue')
        .update({
          status: 'failed',
          error_message: `RAW files (${inputFileExt.toUpperCase()}) are not supported. Please convert to JPG/PNG first.`,
        })
        .eq('id', queueItemId)

      return new Response(
        JSON.stringify({
          error: 'RAW files not supported',
          message: `${inputFileExt.toUpperCase()} files are too large for processing. Convert to JPG/PNG first.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status to processing
    await supabase
      .from('processing_queue')
      .update({
        status: 'processing',
        progress: 10,
        started_at: new Date().toISOString()
      })
      .eq('id', queueItemId)

    // Fetch template if template_id is set on project
    let templatePrompt: string | null = null
    if (queueItem.projects?.template_id) {
      const { data: template } = await supabase
        .from('prompt_templates')
        .select('base_prompt, style, background, lighting')
        .eq('id', queueItem.projects.template_id)
        .single()

      if (template) {
        const parts = [template.base_prompt]
        if (template.style) parts.push(`Style: ${template.style}`)
        if (template.background) parts.push(`Background: ${template.background}`)
        if (template.lighting) parts.push(`Lighting: ${template.lighting}`)
        templatePrompt = parts.filter(Boolean).join('. ')
        console.log('[process-image] Using template prompt')
      }
    }

    // Fetch studio preset if studio_preset_id is set on project
    let presetPrompt: string | null = null
    if (queueItem.projects?.studio_preset_id) {
      const { data: preset } = await supabase
        .from('studio_presets')
        .select('*')
        .eq('id', queueItem.projects.studio_preset_id)
        .single()

      if (preset) {
        presetPrompt = buildPromptFromPreset(preset)
        console.log('[process-image] Using studio preset prompt')
      }
    }

    // Get Google Drive connection for this organization
    const { data: connection, error: connectionError } = await supabase
      .from('google_drive_connections')
      .select('id')
      .eq('organization_id', queueItem.organization_id)
      .eq('is_active', true)
      .single()

    if (connectionError || !connection) {
      throw new Error('No active Google Drive connection found')
    }

    // Step 1: Download image from Google Drive
    console.log('[process-image] Step 1: Downloading from Google Drive')

    await supabase
      .from('processing_queue')
      .update({ progress: 20 })
      .eq('id', queueItemId)

    const downloadResponse = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/google-drive-files`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'download',
          folder_id: queueItem.file_id,
          connection_id: connection.id
        })
      },
      30000
    )

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text()
      throw new Error(`Failed to download from Google Drive: ${errorText}`)
    }

    const downloadResult = await downloadResponse.json()
    console.log('[process-image] Download successful')

    await supabase
      .from('processing_queue')
      .update({ progress: 40 })
      .eq('id', queueItemId)

    // Step 2: Upload original to Supabase Storage
    console.log('[process-image] Step 2: Uploading to storage')

    const originalImageBase64 = downloadResult.data
    const originalBuffer = Uint8Array.from(atob(originalImageBase64), c => c.charCodeAt(0))
    const fileExt = queueItem.file_name.split('.').pop() || 'jpg'
    const originalPath = `${queueItem.organization_id}/${queueItem.project_id}/original_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('processed-images')
      .upload(originalPath, originalBuffer, {
        contentType: downloadResult.contentType,
        upsert: true
      })

    if (uploadError) {
      console.error('[process-image] Upload error:', uploadError)
      throw new Error('Failed to upload image to storage')
    }

    const { data: { publicUrl: originalPublicUrl } } = supabase.storage
      .from('processed-images')
      .getPublicUrl(originalPath)

    console.log('[process-image] Original uploaded:', originalPublicUrl)

    await supabase
      .from('processing_queue')
      .update({ progress: 60 })
      .eq('id', queueItemId)

    // Step 3: Submit AI job (FIRE-AND-FORGET!)
    console.log('[process-image] Step 3: Submitting AI job')

    const projectPrompt = templatePrompt || presetPrompt || queueItem.projects?.custom_prompt || "Enhance this jewelry image with clean white background"
    const projectModel = queueItem.projects?.ai_model || 'flux-kontext-pro'

    // Update queue item with prompt and model info
    await supabase
      .from('processing_queue')
      .update({
        generated_prompt: projectPrompt,
        ai_model: projectModel,
        status: 'optimizing', // New status: waiting for AI
        progress: 70,
      })
      .eq('id', queueItemId)

    // Submit to unified AI job system
    const submitResponse = await fetch(
      `${supabaseUrl}/functions/v1/submit-ai-job`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_type: 'optimize',
          source: 'queue',
          source_id: queueItemId,
          ai_model: projectModel,
          input_url: originalPublicUrl,
          prompt: projectPrompt,
          aspect_ratio: '1:1',
          settings: {
            enhance_quality: true,
            remove_background: true,
            enhance_lighting: true,
            enhance_colors: true
          }
        })
      }
    )

    const submitResult = await submitResponse.json()
    console.log('[process-image] Submit result:', JSON.stringify(submitResult))

    if (submitResult.error) {
      throw new Error(submitResult.error)
    }

    // Update queue with task_id for tracking
    await supabase
      .from('processing_queue')
      .update({
        task_id: submitResult.task_id,
        progress: 80,
      })
      .eq('id', queueItemId)

    console.log('[process-image] Job submitted successfully, returning immediately')

    // Return immediately - database trigger will handle the rest when AI completes!
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job submitted. Result will be delivered via webhook.',
        queue_item_id: queueItemId,
        job_id: submitResult.job_id,
        task_id: submitResult.task_id,
        original_url: originalPublicUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[process-image] Error:', error)

    // Update queue item with error
    if (queueItemId) {
      await supabase
        .from('processing_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', queueItemId)
    }

    return new Response(
      JSON.stringify({
        error: error.message,
        queue_item_id: queueItemId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
