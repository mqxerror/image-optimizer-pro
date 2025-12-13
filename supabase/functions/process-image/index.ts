import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

Deno.serve(async (req: Request) => {
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

    console.log('Processing queue item:', queueItemId)

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

    console.log('Queue item:', queueItem.file_name, 'Status:', queueItem.status)

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
        // Build prompt from template fields
        const parts = [template.base_prompt]
        if (template.style) parts.push(`Style: ${template.style}`)
        if (template.background) parts.push(`Background: ${template.background}`)
        if (template.lighting) parts.push(`Lighting: ${template.lighting}`)
        templatePrompt = parts.filter(Boolean).join('. ')
        console.log('Using template prompt:', templatePrompt)
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
        // Build prompt from studio preset using same logic as frontend PromptBuilder
        presetPrompt = buildPromptFromPreset(preset)
        console.log('Using studio preset prompt:', presetPrompt)
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

    console.log('Using Google Drive connection:', connection.id)

    // Step 1: Download image from Google Drive
    console.log('Step 1: Downloading from Google Drive, file_id:', queueItem.file_id)

    const downloadResponse = await fetch(
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
      }
    )

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text()
      throw new Error(`Failed to download from Google Drive: ${errorText}`)
    }

    const downloadResult = await downloadResponse.json()
    console.log('Download successful, content type:', downloadResult.contentType)

    // Update progress
    await supabase
      .from('processing_queue')
      .update({ progress: 30 })
      .eq('id', queueItemId)

    // The download result should have base64 encoded content
    const originalImageBase64 = downloadResult.data
    const originalImageDataUrl = `data:${downloadResult.contentType};base64,${originalImageBase64}`

    // Step 2: Upload original to Supabase Storage
    console.log('Step 2: Uploading original to storage')

    const originalBuffer = Uint8Array.from(atob(originalImageBase64), c => c.charCodeAt(0))
    const fileExt = queueItem.file_name.split('.').pop() || 'jpg'
    const originalPath = `${queueItem.organization_id}/${queueItem.project_id}/original_${Date.now()}.${fileExt}`

    const { error: originalUploadError } = await supabase.storage
      .from('processed-images')
      .upload(originalPath, originalBuffer, {
        contentType: downloadResult.contentType,
        upsert: true
      })

    if (originalUploadError) {
      console.error('Original upload error:', originalUploadError)
    }

    const { data: { publicUrl: originalPublicUrl } } = supabase.storage
      .from('processed-images')
      .getPublicUrl(originalPath)

    console.log('Original uploaded:', originalPublicUrl)

    // Update progress
    await supabase
      .from('processing_queue')
      .update({ progress: 50 })
      .eq('id', queueItemId)

    // Step 3: Call optimize-image to enhance with Kie.ai
    console.log('Step 3: Calling Kie.ai for optimization')

    // Get project settings for optimization - priority: template > preset > custom
    const projectPrompt = templatePrompt || presetPrompt || queueItem.projects?.custom_prompt || "Enhance this jewelry image with clean white background"
    const projectModel = queueItem.projects?.ai_model || 'flux-kontext-pro'

    console.log('Prompt source:', templatePrompt ? 'template' : presetPrompt ? 'studio_preset' : 'custom')

    console.log('Using AI model:', projectModel)
    console.log('Using prompt:', projectPrompt.substring(0, 100) + '...')

    // Use public URL instead of data URL - Kie.ai API requires HTTP URL
    console.log('Sending public URL to optimize-image:', originalPublicUrl)

    const optimizeResponse = await fetch(
      `${supabaseUrl}/functions/v1/optimize-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: originalPublicUrl,
          file_id: queueItem.file_id,
          ai_model: projectModel,
          prompt: projectPrompt,
          settings: {
            enhance_quality: true,
            remove_background: true,
            enhance_lighting: true,
            enhance_colors: true
          }
        })
      }
    )

    const optimizeResult = await optimizeResponse.json()
    console.log('Optimize result:', JSON.stringify(optimizeResult))
    console.log('optimizeResult.success:', optimizeResult.success)
    console.log('optimizeResult.optimized_url:', optimizeResult.optimized_url)
    console.log('optimizeResult.passthrough:', optimizeResult.passthrough)

    // Update progress
    await supabase
      .from('processing_queue')
      .update({ progress: 80 })
      .eq('id', queueItemId)

    let optimizedPublicUrl = originalPublicUrl
    let wasOptimized = false

    if (optimizeResult.success && optimizeResult.optimized_url) {
      // Step 4: Download optimized image and upload to storage
      console.log('Step 4: Downloading optimized image from:', optimizeResult.optimized_url)

      try {
        console.log('Fetching optimized image from URL:', optimizeResult.optimized_url)
        const optimizedImageResponse = await fetch(optimizeResult.optimized_url)
        console.log('Fetch response status:', optimizedImageResponse.status, optimizedImageResponse.ok)
        if (optimizedImageResponse.ok) {
          const optimizedBuffer = new Uint8Array(await optimizedImageResponse.arrayBuffer())
          const optimizedPath = `${queueItem.organization_id}/${queueItem.project_id}/optimized_${Date.now()}.png`

          const { error: optimizedUploadError } = await supabase.storage
            .from('processed-images')
            .upload(optimizedPath, optimizedBuffer, {
              contentType: 'image/png',
              upsert: true
            })

          if (!optimizedUploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('processed-images')
              .getPublicUrl(optimizedPath)

            optimizedPublicUrl = publicUrl
            wasOptimized = true
            console.log('Optimized image uploaded:', optimizedPublicUrl)
          } else {
            console.error('Optimized upload error:', optimizedUploadError)
          }
        }
      } catch (downloadError) {
        console.error('Failed to download optimized image:', downloadError)
      }
    } else if (optimizeResult.passthrough) {
      console.log('Passthrough mode:', optimizeResult.message || 'Using original image')
    }

    // Step 5: Create processing history record
    console.log('Step 5: Creating history record')

    const processingTimeMs = Date.now() - new Date(queueItem.started_at || Date.now()).getTime()

    // Use the actual prompt that was sent to Kie.ai (includes enhancement settings)
    const actualPromptUsed = optimizeResult.final_prompt || projectPrompt

    const { data: historyRecord, error: historyError } = await supabase
      .from('processing_history')
      .insert({
        organization_id: queueItem.organization_id,
        project_id: queueItem.project_id,
        file_id: queueItem.file_id,
        file_name: queueItem.file_name,
        original_url: originalPublicUrl,
        optimized_url: optimizedPublicUrl,
        optimized_storage_path: wasOptimized ? `${queueItem.organization_id}/${queueItem.project_id}/optimized_${Date.now()}.png` : null,
        processing_time_sec: Math.round(processingTimeMs / 1000),
        generated_prompt: actualPromptUsed,
        ai_model: projectModel,
        tokens_used: 1,
        status: 'success',
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (historyError) {
      console.error('History record error:', historyError)
      throw new Error(`Failed to create history record: ${historyError.message}`)
    }

    console.log('History record created:', historyRecord.id)

    // Step 6: Update project stats (using atomic RPC to prevent race conditions)
    console.log('Step 6: Updating project stats')

    // Check if this is a trial image
    const trialCount = queueItem.projects?.trial_count || 0
    const isTrialImage = trialCount > 0

    if (isTrialImage) {
      // Use atomic RPC to increment trial_completed (prevents race conditions with concurrent processing)
      const { data: newTrialCompleted, error: trialError } = await supabase.rpc('increment_trial_completed', {
        p_project_id: queueItem.project_id
      })

      if (trialError) {
        console.error('Trial increment RPC failed:', trialError.message)
      } else {
        console.log('Trial completed (atomic):', newTrialCompleted, '/', trialCount)
      }
    } else {
      // Non-trial: just increment processed_images and tokens
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          processed_images: (queueItem.projects?.processed_images || 0) + 1,
          total_tokens: (queueItem.projects?.total_tokens || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItem.project_id)

      if (updateError) {
        console.error('Project update failed:', updateError.message)
      }
    }

    // Step 7: Delete queue item (it's now in history)
    console.log('Step 7: Removing from queue')

    const { error: deleteError } = await supabase
      .from('processing_queue')
      .delete()
      .eq('id', queueItemId)

    if (deleteError) {
      console.error('Failed to delete queue item:', deleteError)
      // Non-fatal - item processed successfully, just cleanup failed
    }

    console.log('Processing complete!')

    return new Response(
      JSON.stringify({
        success: true,
        queue_item_id: queueItemId,
        history_id: historyRecord?.id,
        original_url: originalPublicUrl,
        optimized_url: optimizedPublicUrl,
        was_optimized: wasOptimized,
        passthrough: !wasOptimized
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('Process image error:', error)

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
