import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface CreateJobRequest {
  action: "create"
  store_id: string
  preset_type: "template" | "studio_preset"
  preset_id: string | null
  ai_model?: string  // Optional AI model override (defaults to flux-kontext-pro)
  custom_prompt?: string  // Custom prompt when not using a template
  products: Array<{
    id: string
    title: string
    images: Array<{
      id: string
      src: string
      position: number
      width?: number
      height?: number
    }>
  }>
}

interface ListJobsRequest {
  action: "list"
  store_id?: string  // Optional - list all if not provided
  status?: string
  limit?: number
}

interface GetJobRequest {
  action: "get"
  job_id: string
}

interface UpdateJobRequest {
  action: "approve" | "cancel" | "discard" | "pause" | "resume"
  job_id: string
}

type JobRequest = CreateJobRequest | ListJobsRequest | GetJobRequest | UpdateJobRequest

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

    // Service client for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: JobRequest = await req.json()

    // ================================================
    // ACTION: CREATE JOB
    // ================================================
    if (body.action === "create") {
      const { store_id, preset_type, preset_id, ai_model, custom_prompt, products } = body as CreateJobRequest

      // Verify store belongs to user
      const { data: store, error: storeError } = await supabase
        .from("shopify_stores")
        .select("id, shop_domain")
        .eq("id", store_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (storeError || !store) {
        return new Response(
          JSON.stringify({ error: "Store not found or not active" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Validate: must have either preset_id OR custom_prompt
      if (!preset_id && !custom_prompt?.trim()) {
        return new Response(
          JSON.stringify({ error: "Either a template or custom prompt is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Validate preset exists (skip if null - using custom_prompt)
      if (preset_id) {
        const presetTable = preset_type === "template" ? "prompt_templates" : "studio_presets"
        const { data: preset } = await supabase
          .from(presetTable)
          .select("id, name")
          .eq("id", preset_id)
          .single()

        if (!preset) {
          return new Response(
            JSON.stringify({ error: `${preset_type} not found` }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }

      // Count total images
      const totalImages = products.reduce((sum, p) => sum + p.images.length, 0)

      if (totalImages === 0) {
        return new Response(
          JSON.stringify({ error: "No images selected" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Create the job
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiration

      const { data: job, error: jobError } = await supabase
        .from("shopify_sync_jobs")
        .insert({
          store_id,
          trigger_type: "manual",
          preset_type,
          preset_id: preset_id || null,
          custom_prompt: custom_prompt?.trim() || null,
          ai_model: ai_model || "flux-kontext-pro",
          status: "pending",
          product_count: products.length,
          image_count: totalImages,
          expires_at: expiresAt.toISOString()
        })
        .select("id")
        .single()

      if (jobError || !job) {
        console.error("Job creation error:", jobError)
        return new Response(
          JSON.stringify({ error: "Failed to create job" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Insert all images
      const imageRecords = products.flatMap(product =>
        product.images.map(img => ({
          job_id: job.id,
          shopify_product_id: product.id,
          shopify_image_id: img.id,
          product_title: product.title,
          image_position: img.position,
          original_url: img.src,
          original_width: img.width || null,
          original_height: img.height || null,
          status: "queued"
        }))
      )

      const { error: imagesError } = await supabase
        .from("shopify_images")
        .insert(imageRecords)

      if (imagesError) {
        console.error("Images insertion error:", imagesError)
        // Rollback job
        await supabase.from("shopify_sync_jobs").delete().eq("id", job.id)
        return new Response(
          JSON.stringify({ error: "Failed to queue images" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          product_count: products.length,
          image_count: totalImages,
          expires_at: expiresAt.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: LIST JOBS
    // ================================================
    if (body.action === "list") {
      const { store_id, status, limit = 20 } = body as ListJobsRequest

      let query = supabase
        .from("shopify_sync_jobs")
        .select(`
          *,
          shopify_stores!inner (
            id,
            user_id,
            shop_domain,
            shop_name
          )
        `)
        .eq("shopify_stores.user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (store_id) {
        query = query.eq("store_id", store_id)
      }

      if (status) {
        query = query.eq("status", status)
      }

      const { data: jobs, error: jobsError } = await query

      if (jobsError) {
        console.error("List jobs error:", jobsError)
        return new Response(
          JSON.stringify({ error: "Failed to fetch jobs" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Fetch preview images for each job (up to 4 per job)
      const jobIds = (jobs || []).map((j: any) => j.id)
      const previewImagesMap: Record<string, string[]> = {}

      if (jobIds.length > 0) {
        // Get up to 4 images per job for preview thumbnails
        // Prefer optimized_url if available, fall back to original_url
        const { data: allImages } = await supabase
          .from("shopify_images")
          .select("job_id, original_url, optimized_url, status, image_position")
          .in("job_id", jobIds)
          .order("image_position", { ascending: true })

        // Group images by job_id and take first 4
        for (const img of (allImages || [])) {
          if (!previewImagesMap[img.job_id]) {
            previewImagesMap[img.job_id] = []
          }
          if (previewImagesMap[img.job_id].length < 4) {
            // Use optimized URL if available and pushed, otherwise original
            const url = (img.status === 'pushed' || img.status === 'ready' || img.status === 'approved') && img.optimized_url
              ? img.optimized_url
              : img.original_url
            previewImagesMap[img.job_id].push(url)
          }
        }
      }

      // Transform response
      const transformedJobs = (jobs || []).map((j: any) => ({
        id: j.id,
        store_id: j.store_id,
        shop_domain: j.shopify_stores.shop_domain,
        shop_name: j.shopify_stores.shop_name,
        trigger_type: j.trigger_type,
        preset_type: j.preset_type,
        preset_id: j.preset_id,
        status: j.status,
        product_count: j.product_count,
        image_count: j.image_count,
        processed_count: j.processed_count,
        pushed_count: j.pushed_count,
        failed_count: j.failed_count,
        tokens_used: j.tokens_used,
        retry_count: j.retry_count,
        last_error: j.last_error,
        expires_at: j.expires_at,
        created_at: j.created_at,
        completed_at: j.completed_at,
        preview_images: previewImagesMap[j.id] || []
      }))

      return new Response(
        JSON.stringify({ jobs: transformedJobs }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: GET JOB DETAILS
    // ================================================
    if (body.action === "get") {
      const { job_id } = body as GetJobRequest

      // Fetch job with store info (to verify ownership)
      const { data: job, error: jobError } = await supabase
        .from("shopify_sync_jobs")
        .select(`
          *,
          shopify_stores!inner (
            id,
            user_id,
            shop_domain,
            shop_name
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

      // Fetch images for this job
      const { data: images } = await supabase
        .from("shopify_images")
        .select("*")
        .eq("job_id", job_id)
        .order("product_title")
        .order("image_position")

      // Get stats
      const stats = {
        total: images?.length || 0,
        queued: images?.filter(i => i.status === "queued").length || 0,
        processing: images?.filter(i => i.status === "processing").length || 0,
        ready: images?.filter(i => i.status === "ready").length || 0,
        approved: images?.filter(i => i.status === "approved").length || 0,
        pushing: images?.filter(i => i.status === "pushing").length || 0,
        pushed: images?.filter(i => i.status === "pushed").length || 0,
        failed: images?.filter(i => i.status === "failed").length || 0,
        skipped: images?.filter(i => i.status === "skipped").length || 0
      }

      return new Response(
        JSON.stringify({
          job: {
            id: job.id,
            store_id: job.store_id,
            shop_domain: job.shopify_stores.shop_domain,
            shop_name: job.shopify_stores.shop_name,
            trigger_type: job.trigger_type,
            preset_type: job.preset_type,
            preset_id: job.preset_id,
            status: job.status,
            product_count: job.product_count,
            image_count: job.image_count,
            tokens_used: job.tokens_used,
            last_error: job.last_error,
            expires_at: job.expires_at,
            created_at: job.created_at,
            completed_at: job.completed_at
          },
          images: images || [],
          stats
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: APPROVE JOB (mark images for pushing)
    // ================================================
    if (body.action === "approve") {
      const { job_id } = body as UpdateJobRequest

      // Verify job ownership and status
      const { data: job, error: jobError } = await supabase
        .from("shopify_sync_jobs")
        .select(`
          id,
          status,
          shopify_stores!inner (user_id)
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

      if (job.status !== "awaiting_approval") {
        return new Response(
          JSON.stringify({ error: `Cannot approve job with status: ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Update job status
      await supabase
        .from("shopify_sync_jobs")
        .update({
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .eq("id", job_id)

      // Mark ready images as approved
      await supabase
        .from("shopify_images")
        .update({ status: "approved" })
        .eq("job_id", job_id)
        .eq("status", "ready")

      return new Response(
        JSON.stringify({ success: true, message: "Job approved, ready for push" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: CANCEL JOB (stop processing, keep data)
    // ================================================
    if (body.action === "cancel") {
      const { job_id } = body as UpdateJobRequest

      // Verify ownership
      const { data: job } = await supabase
        .from("shopify_sync_jobs")
        .select(`id, status, shopify_stores!inner (user_id)`)
        .eq("id", job_id)
        .eq("shopify_stores.user_id", user.id)
        .single()

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (["completed", "cancelled"].includes(job.status)) {
        return new Response(
          JSON.stringify({ error: `Cannot cancel job with status: ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      await supabase
        .from("shopify_sync_jobs")
        .update({ status: "cancelled" })
        .eq("id", job_id)

      return new Response(
        JSON.stringify({ success: true, message: "Job cancelled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: PAUSE JOB (stop processing temporarily)
    // ================================================
    if (body.action === "pause") {
      const { job_id } = body as UpdateJobRequest

      // Verify ownership
      const { data: job } = await supabase
        .from("shopify_sync_jobs")
        .select(`id, status, shopify_stores!inner (user_id)`)
        .eq("id", job_id)
        .eq("shopify_stores.user_id", user.id)
        .single()

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Can only pause pending or processing jobs
      if (!["pending", "processing"].includes(job.status)) {
        return new Response(
          JSON.stringify({ error: `Cannot pause job with status: ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      await supabase
        .from("shopify_sync_jobs")
        .update({ status: "paused" })
        .eq("id", job_id)

      return new Response(
        JSON.stringify({ success: true, message: "Job paused" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: RESUME JOB (continue processing)
    // ================================================
    if (body.action === "resume") {
      const { job_id } = body as UpdateJobRequest

      // Verify ownership
      const { data: job } = await supabase
        .from("shopify_sync_jobs")
        .select(`id, status, processed_count, image_count, shopify_stores!inner (user_id)`)
        .eq("id", job_id)
        .eq("shopify_stores.user_id", user.id)
        .single()

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Can only resume paused jobs
      if (job.status !== "paused") {
        return new Response(
          JSON.stringify({ error: `Cannot resume job with status: ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Resume to 'processing' if there are still images to process, otherwise 'pending'
      const hasProcessedImages = job.processed_count > 0
      const newStatus = hasProcessedImages ? "processing" : "pending"

      await supabase
        .from("shopify_sync_jobs")
        .update({ status: newStatus })
        .eq("id", job_id)

      return new Response(
        JSON.stringify({ success: true, message: "Job resumed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: DISCARD JOB (delete job and temp images)
    // ================================================
    if (body.action === "discard") {
      const { job_id } = body as UpdateJobRequest

      // Verify ownership
      const { data: job } = await supabase
        .from("shopify_sync_jobs")
        .select(`id, shopify_stores!inner (user_id)`)
        .eq("id", job_id)
        .eq("shopify_stores.user_id", user.id)
        .single()

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Get images with storage paths to delete
      const { data: images } = await supabase
        .from("shopify_images")
        .select("optimized_storage_path")
        .eq("job_id", job_id)
        .not("optimized_storage_path", "is", null)

      // Delete from storage
      if (images && images.length > 0) {
        const paths = images
          .map(i => i.optimized_storage_path)
          .filter(p => p)

        if (paths.length > 0) {
          await supabase.storage
            .from("shopify-temp-images")
            .remove(paths)
        }
      }

      // Delete job (cascades to images)
      await supabase
        .from("shopify_sync_jobs")
        .delete()
        .eq("id", job_id)

      return new Response(
        JSON.stringify({ success: true, message: "Job discarded" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    const error = err as Error
    console.error("Shopify jobs error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
