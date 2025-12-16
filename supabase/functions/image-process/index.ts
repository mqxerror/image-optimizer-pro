import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Server endpoints - configurable via environment variables
const IMAGINARY_URL = Deno.env.get('IMAGINARY_URL') || 'http://38.97.60.181:9000'
const IOPAINT_URL = Deno.env.get('IOPAINT_URL') || 'http://38.97.60.181:8085'

interface ProcessRequest {
  action: 'remove_background' | 'inpaint' | 'transform' | 'batch' | 'health'
  image_url?: string
  image_urls?: string[]
  options?: TransformOptions
  mask_url?: string
  prompt?: string
}

interface TransformOptions {
  // Resize
  resize?: { width: number; height: number; type?: 'fit' | 'fill' | 'force' }
  // Crop
  crop?: { width: number; height: number; x?: number; y?: number }
  // Orientation
  rotate?: number // 90, 180, 270
  flip?: 'horizontal' | 'vertical'
  // Effects
  blur?: { sigma: number }
  sharpen?: { sigma: number }
  // Watermark
  watermark?: { text: string; opacity?: number; font?: string }
  // Output
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number
  // Background removal options
  background?: 'transparent' | 'white' | 'black' | string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let organizationId: string | null = null

    if (authHeader) {
      try {
        // Extract token from header
        const token = authHeader.replace('Bearer ', '')

        // Verify the JWT and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError) {
          console.error('[image-process] Auth error:', authError.message)
        } else {
          userId = user?.id || null
        }

        if (userId) {
          const { data: membership } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', userId)
            .limit(1)
            .single()
          organizationId = membership?.organization_id
        }
      } catch (authErr) {
        console.error('[image-process] Auth exception:', authErr)
      }
    }

    const body: ProcessRequest = await req.json()
    const { action } = body

    console.log(`[image-process] Action: ${action}`)

    switch (action) {
      case 'health': {
        // Check health of both services
        console.log(`[image-process] Health check - Imaginary: ${IMAGINARY_URL}, IOPaint: ${IOPAINT_URL}`)

        const [imaginaryHealth, iopaintHealth] = await Promise.allSettled([
          fetch(`${IMAGINARY_URL}/health`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
          fetch(`${IOPAINT_URL}/api/v1/model`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok)
        ])

        console.log(`[image-process] Imaginary result:`, imaginaryHealth)
        console.log(`[image-process] IOPaint result:`, iopaintHealth)

        return new Response(JSON.stringify({
          imaginary: {
            url: IMAGINARY_URL,
            status: imaginaryHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            data: imaginaryHealth.status === 'fulfilled' ? imaginaryHealth.value : null,
            error: imaginaryHealth.status === 'rejected' ? String(imaginaryHealth.reason) : null
          },
          iopaint: {
            url: IOPAINT_URL,
            status: iopaintHealth.status === 'fulfilled' && iopaintHealth.value ? 'healthy' : 'unhealthy',
            error: iopaintHealth.status === 'rejected' ? String(iopaintHealth.reason) : null
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'remove_background': {
        const { image_url, options = {} } = body

        if (!image_url) {
          return new Response(
            JSON.stringify({ error: 'image_url is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[image-process] Removing background from: ${image_url}`)

        // Fetch the image first
        const imageResponse = await fetch(image_url)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`)
        }
        const imageBlob = await imageResponse.blob()

        // Create form data for IOPaint
        const formData = new FormData()
        formData.append('image', imageBlob, 'image.png')

        // Use IOPaint's remove background endpoint (via inpainting with auto mask)
        // IOPaint API: POST /api/v1/remove_bg
        const iopaintResponse = await fetch(`${IOPAINT_URL}/api/v1/remove_bg`, {
          method: 'POST',
          body: formData,
        })

        if (!iopaintResponse.ok) {
          const errorText = await iopaintResponse.text()
          console.error(`[image-process] IOPaint error: ${errorText}`)
          throw new Error(`IOPaint error: ${iopaintResponse.status}`)
        }

        // Get the result image
        const resultBlob = await iopaintResponse.blob()

        // If background color is specified, apply it using Imaginary
        if (options.background && options.background !== 'transparent') {
          // For now, return the transparent result
          // In production, you'd composite with a background color
        }

        // Upload to Supabase Storage
        const fileName = `processed/${organizationId || 'public'}/${Date.now()}_bg_removed.png`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, resultBlob, {
            contentType: 'image/png',
            upsert: true
          })

        if (uploadError) {
          console.error('[image-process] Upload error:', uploadError)
          throw new Error('Failed to upload processed image')
        }

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        // Deduct tokens if authenticated
        if (organizationId) {
          await deductTokens(supabase, organizationId, 2, 'Background removal')
        }

        return new Response(JSON.stringify({
          success: true,
          result_url: publicUrl,
          operation: 'remove_background'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'inpaint': {
        const { image_url, mask_url, prompt } = body

        if (!image_url || !mask_url) {
          return new Response(
            JSON.stringify({ error: 'image_url and mask_url are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[image-process] Inpainting: ${image_url}`)

        // Fetch both images
        const [imageBlob, maskBlob] = await Promise.all([
          fetch(image_url).then(r => r.blob()),
          fetch(mask_url).then(r => r.blob())
        ])

        // Create form data for IOPaint
        const formData = new FormData()
        formData.append('image', imageBlob, 'image.png')
        formData.append('mask', maskBlob, 'mask.png')
        if (prompt) {
          formData.append('prompt', prompt)
        }

        // IOPaint API: POST /api/v1/inpaint
        const iopaintResponse = await fetch(`${IOPAINT_URL}/api/v1/inpaint`, {
          method: 'POST',
          body: formData,
        })

        if (!iopaintResponse.ok) {
          const errorText = await iopaintResponse.text()
          console.error(`[image-process] IOPaint inpaint error: ${errorText}`)
          throw new Error(`IOPaint error: ${iopaintResponse.status}`)
        }

        const resultBlob = await iopaintResponse.blob()

        // Upload to storage
        const fileName = `processed/${organizationId || 'public'}/${Date.now()}_inpainted.png`
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, resultBlob, {
            contentType: 'image/png',
            upsert: true
          })

        if (uploadError) {
          throw new Error('Failed to upload processed image')
        }

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        if (organizationId) {
          await deductTokens(supabase, organizationId, 3, 'AI inpainting')
        }

        return new Response(JSON.stringify({
          success: true,
          result_url: publicUrl,
          operation: 'inpaint'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'transform': {
        const { image_url, options = {} } = body

        if (!image_url) {
          return new Response(
            JSON.stringify({ error: 'image_url is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[image-process] Transforming: ${image_url}`)

        // Build Imaginary URL with operations
        let resultUrl = image_url
        const operations: string[] = []

        // Chain operations through Imaginary
        if (options.resize) {
          const { width, height, type = 'fit' } = options.resize
          const op = type === 'force' ? 'resize' : type === 'fill' ? 'enlarge' : 'fit'
          const params = new URLSearchParams({
            url: resultUrl,
            width: width.toString(),
            height: height.toString()
          })
          resultUrl = `${IMAGINARY_URL}/${op}?${params}`
          operations.push(`resize:${width}x${height}`)
        }

        if (options.crop) {
          const { width, height, x = 0, y = 0 } = options.crop
          const params = new URLSearchParams({
            url: resultUrl,
            width: width.toString(),
            height: height.toString(),
            ...(x && { x: x.toString() }),
            ...(y && { y: y.toString() })
          })
          resultUrl = `${IMAGINARY_URL}/crop?${params}`
          operations.push(`crop:${width}x${height}`)
        }

        if (options.rotate) {
          const params = new URLSearchParams({
            url: resultUrl,
            rotate: options.rotate.toString()
          })
          resultUrl = `${IMAGINARY_URL}/rotate?${params}`
          operations.push(`rotate:${options.rotate}`)
        }

        if (options.flip) {
          const params = new URLSearchParams({ url: resultUrl })
          const endpoint = options.flip === 'horizontal' ? 'flip' : 'flop'
          resultUrl = `${IMAGINARY_URL}/${endpoint}?${params}`
          operations.push(`flip:${options.flip}`)
        }

        if (options.blur) {
          const params = new URLSearchParams({
            url: resultUrl,
            sigma: options.blur.sigma.toString()
          })
          resultUrl = `${IMAGINARY_URL}/blur?${params}`
          operations.push(`blur:${options.blur.sigma}`)
        }

        if (options.sharpen) {
          const params = new URLSearchParams({
            url: resultUrl,
            sigma: options.sharpen.sigma.toString()
          })
          resultUrl = `${IMAGINARY_URL}/sharpen?${params}`
          operations.push(`sharpen:${options.sharpen.sigma}`)
        }

        if (options.watermark) {
          const params = new URLSearchParams({
            url: resultUrl,
            text: options.watermark.text,
            opacity: (options.watermark.opacity || 0.5).toString(),
            font: options.watermark.font || 'sans bold 14'
          })
          resultUrl = `${IMAGINARY_URL}/watermark?${params}`
          operations.push(`watermark:${options.watermark.text}`)
        }

        // Convert format if specified
        if (options.format || options.quality) {
          const params = new URLSearchParams({
            url: resultUrl,
            type: options.format || 'webp',
            ...(options.quality && { quality: options.quality.toString() })
          })
          resultUrl = `${IMAGINARY_URL}/convert?${params}`
          operations.push(`convert:${options.format || 'webp'}`)
        }

        // Fetch the processed image
        const response = await fetch(resultUrl)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[image-process] Imaginary error: ${errorText}`)
          throw new Error(`Imaginary error: ${response.status}`)
        }

        const resultBlob = await response.blob()

        // Determine content type
        const format = options.format || 'webp'
        const contentType = `image/${format}`
        const extension = format === 'jpeg' ? 'jpg' : format

        // Upload to storage
        const fileName = `processed/${organizationId || 'public'}/${Date.now()}_transformed.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, resultBlob, {
            contentType,
            upsert: true
          })

        if (uploadError) {
          throw new Error('Failed to upload processed image')
        }

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        // Charge 0.5 tokens per operation
        if (organizationId) {
          const tokenCost = Math.ceil(operations.length * 0.5)
          await deductTokens(supabase, organizationId, tokenCost, `Transform: ${operations.join(', ')}`)
        }

        return new Response(JSON.stringify({
          success: true,
          result_url: publicUrl,
          operations,
          operation: 'transform'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'batch': {
        const { image_urls = [], options = {} } = body

        if (image_urls.length === 0) {
          return new Response(
            JSON.stringify({ error: 'image_urls array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[image-process] Batch processing ${image_urls.length} images`)

        // Process images in parallel with concurrency limit
        const CONCURRENCY = 5
        const results: Array<{ url: string; result_url?: string; error?: string }> = []

        for (let i = 0; i < image_urls.length; i += CONCURRENCY) {
          const batch = image_urls.slice(i, i + CONCURRENCY)
          const batchResults = await Promise.allSettled(
            batch.map(async (url: string) => {
              // Apply transforms using Imaginary
              let resultUrl = url

              if (options.resize) {
                const { width, height, type = 'fit' } = options.resize
                const op = type === 'force' ? 'resize' : type === 'fill' ? 'enlarge' : 'fit'
                const params = new URLSearchParams({
                  url: resultUrl,
                  width: width.toString(),
                  height: height.toString()
                })
                resultUrl = `${IMAGINARY_URL}/${op}?${params}`
              }

              if (options.format || options.quality) {
                const params = new URLSearchParams({
                  url: resultUrl,
                  type: options.format || 'webp',
                  ...(options.quality && { quality: options.quality.toString() })
                })
                resultUrl = `${IMAGINARY_URL}/convert?${params}`
              }

              const response = await fetch(resultUrl)
              if (!response.ok) {
                throw new Error(`Failed: ${response.status}`)
              }

              const blob = await response.blob()
              const format = options.format || 'webp'
              const extension = format === 'jpeg' ? 'jpg' : format
              const fileName = `processed/${organizationId || 'public'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`

              const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, blob, {
                  contentType: `image/${format}`,
                  upsert: true
                })

              if (uploadError) {
                throw new Error('Upload failed')
              }

              const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName)

              return { url, result_url: publicUrl }
            })
          )

          batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              results.push(result.value)
            } else {
              results.push({ url: batch[index], error: result.reason.message })
            }
          })
        }

        // Charge tokens
        if (organizationId) {
          const successCount = results.filter(r => r.result_url).length
          const tokenCost = Math.ceil(successCount * 0.5)
          if (tokenCost > 0) {
            await deductTokens(supabase, organizationId, tokenCost, `Batch transform: ${successCount} images`)
          }
        }

        return new Response(JSON.stringify({
          success: true,
          results,
          processed: results.filter(r => r.result_url).length,
          failed: results.filter(r => r.error).length,
          operation: 'batch'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (err) {
    const error = err as Error
    console.error('[image-process] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper to deduct tokens
async function deductTokens(supabase: any, orgId: string, amount: number, description: string) {
  try {
    const { data: account } = await supabase
      .from('token_accounts')
      .select('id, balance')
      .eq('organization_id', orgId)
      .single()

    if (!account || account.balance < amount) {
      console.warn(`[image-process] Insufficient tokens for org ${orgId}`)
      return false
    }

    const newBalance = account.balance - amount

    await supabase
      .from('token_accounts')
      .update({
        balance: newBalance,
        lifetime_used: supabase.sql`lifetime_used + ${amount}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id)

    await supabase.from('token_transactions').insert({
      account_id: account.id,
      type: 'usage',
      amount: -amount,
      balance_before: account.balance,
      balance_after: newBalance,
      description
    })

    console.log(`[image-process] Deducted ${amount} tokens from org ${orgId}`)
    return true
  } catch (error) {
    console.error('[image-process] Token deduction error:', error)
    return false
  }
}
