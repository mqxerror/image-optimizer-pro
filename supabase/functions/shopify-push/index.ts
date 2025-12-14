import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface PushJobRequest {
  action: "push"
  job_id: string
}

interface RetryImageRequest {
  action: "retry_image"
  image_id: string
}

type PushRequest = PushJobRequest | RetryImageRequest

// Convert image URL to base64 for Shopify upload
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  let binary = ""
  const chunkSize = 32768
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}

// Push a single image to Shopify
async function pushImageToShopify(
  shopDomain: string,
  accessToken: string,
  productId: string,
  imageId: string,
  imageBase64: string,
  position: number
): Promise<{ success: boolean; error?: string }> {
  const apiVersion = "2024-01"

  try {
    // First, delete the old image
    const deleteUrl = `https://${shopDomain}/admin/api/${apiVersion}/products/${productId}/images/${imageId}.json`
    await fetch(deleteUrl, {
      method: "DELETE",
      headers: { "X-Shopify-Access-Token": accessToken }
    })
    // Ignore delete errors - image might not exist or already deleted

    // Upload new image
    const createUrl = `https://${shopDomain}/admin/api/${apiVersion}/products/${productId}/images.json`
    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: {
          position,
          attachment: imageBase64
        }
      })
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      return { success: false, error: `Shopify API error: ${errorText}` }
    }

    return { success: true }
  } catch (err) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify user
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: PushRequest = await req.json()

    // ================================================
    // ACTION: PUSH JOB - Push all approved images
    // ================================================
    if (body.action === "push") {
      const { job_id } = body as PushJobRequest

      // Get job with store info
      const { data: job, error: jobError } = await supabase
        .from("shopify_sync_jobs")
        .select(`
          *,
          shopify_stores!inner (
            id,
            user_id,
            shop_domain,
            access_token
          )
        `)
        .eq("id", job_id)
        .eq("shopify_stores.user_id", user.id)
        .single()

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (!["approved", "pushing"].includes(job.status)) {
        return new Response(
          JSON.stringify({ error: `Cannot push job with status: ${job.status}. Job must be approved first.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const shopDomain = job.shopify_stores.shop_domain
      const accessToken = job.shopify_stores.access_token

      // Update job status to pushing
      await supabase
        .from("shopify_sync_jobs")
        .update({ status: "pushing" })
        .eq("id", job_id)

      // Get approved images
      const { data: images } = await supabase
        .from("shopify_images")
        .select("*")
        .eq("job_id", job_id)
        .in("status", ["approved", "ready"])
        .not("optimized_url", "is", null)

      if (!images || images.length === 0) {
        await supabase
          .from("shopify_sync_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", job_id)

        return new Response(
          JSON.stringify({ success: true, message: "No images to push", pushed: 0, failed: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      let pushedCount = 0
      let failedCount = 0
      const errors: string[] = []

      // Process images one by one
      for (const image of images) {
        // Update status to pushing
        await supabase
          .from("shopify_images")
          .update({ status: "pushing", push_attempts: image.push_attempts + 1 })
          .eq("id", image.id)

        try {
          // Download optimized image
          const imageBase64 = await imageUrlToBase64(image.optimized_url)

          // Push to Shopify
          const result = await pushImageToShopify(
            shopDomain,
            accessToken,
            image.shopify_product_id,
            image.shopify_image_id,
            imageBase64,
            image.image_position
          )

          if (result.success) {
            await supabase
              .from("shopify_images")
              .update({
                status: "pushed",
                pushed_at: new Date().toISOString()
              })
              .eq("id", image.id)
            pushedCount++
          } else {
            await supabase
              .from("shopify_images")
              .update({
                status: "failed",
                last_push_error: result.error
              })
              .eq("id", image.id)
            failedCount++
            errors.push(`${image.product_title}: ${result.error}`)
          }
        } catch (err) {
          const error = err as Error
          await supabase
            .from("shopify_images")
            .update({
              status: "failed",
              last_push_error: error.message
            })
            .eq("id", image.id)
          failedCount++
          errors.push(`${image.product_title}: ${error.message}`)
        }
      }

      // Update job status
      const finalStatus = failedCount === 0 ? "completed" :
        pushedCount > 0 ? "completed" : "failed"

      await supabase
        .from("shopify_sync_jobs")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          last_error: errors.length > 0 ? errors.slice(0, 3).join("; ") : null
        })
        .eq("id", job_id)

      // Clean up temp images from storage if all pushed
      if (finalStatus === "completed" && failedCount === 0) {
        const paths = images
          .map(i => i.optimized_storage_path)
          .filter(p => p)

        if (paths.length > 0) {
          await supabase.storage
            .from("shopify-temp-images")
            .remove(paths)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          pushed: pushedCount,
          failed: failedCount,
          status: finalStatus,
          errors: errors.slice(0, 5)
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: RETRY SINGLE IMAGE
    // ================================================
    if (body.action === "retry_image") {
      const { image_id } = body as RetryImageRequest

      // Get image with job and store info
      const { data: image, error: imageError } = await supabase
        .from("shopify_images")
        .select(`
          *,
          shopify_sync_jobs!inner (
            id,
            status,
            shopify_stores!inner (
              user_id,
              shop_domain,
              access_token
            )
          )
        `)
        .eq("id", image_id)
        .single()

      if (imageError || !image) {
        return new Response(
          JSON.stringify({ error: "Image not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (image.shopify_sync_jobs.shopify_stores.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (image.status !== "failed") {
        return new Response(
          JSON.stringify({ error: `Cannot retry image with status: ${image.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (!image.optimized_url) {
        return new Response(
          JSON.stringify({ error: "No optimized image available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const shopDomain = image.shopify_sync_jobs.shopify_stores.shop_domain
      const accessToken = image.shopify_sync_jobs.shopify_stores.access_token

      // Update status
      await supabase
        .from("shopify_images")
        .update({ status: "pushing", push_attempts: image.push_attempts + 1 })
        .eq("id", image_id)

      try {
        const imageBase64 = await imageUrlToBase64(image.optimized_url)
        const result = await pushImageToShopify(
          shopDomain,
          accessToken,
          image.shopify_product_id,
          image.shopify_image_id,
          imageBase64,
          image.image_position
        )

        if (result.success) {
          await supabase
            .from("shopify_images")
            .update({
              status: "pushed",
              pushed_at: new Date().toISOString(),
              last_push_error: null
            })
            .eq("id", image_id)

          return new Response(
            JSON.stringify({ success: true, message: "Image pushed successfully" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        } else {
          await supabase
            .from("shopify_images")
            .update({
              status: "failed",
              last_push_error: result.error
            })
            .eq("id", image_id)

          return new Response(
            JSON.stringify({ success: false, error: result.error }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      } catch (err) {
        const error = err as Error
        await supabase
          .from("shopify_images")
          .update({
            status: "failed",
            last_push_error: error.message
          })
          .eq("id", image_id)

        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'push' or 'retry_image'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    const error = err as Error
    console.error("Shopify push error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
