import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Process a batch of queued Shopify images
// Calls KIE.ai directly, results come back via ai-webhook

interface ProcessRequest {
  job_id?: string      // Optional: process specific job only
  batch_size?: number  // How many images to process (default: 5)
}

interface ModelConfig {
  id: string
  provider: string
  submit_endpoint: string
  status_endpoint: string
  request_template: Record<string, any>
  task_id_path: string[]
  token_cost: number
  supports_callback: boolean
}

// Helper to extract value from nested object using path array
function getNestedValue(obj: any, path: string[]): any {
  let current = obj
  for (const key of path) {
    if (current === null || current === undefined) return null
    if (key.match(/^\d+$/)) {
      current = current[parseInt(key)]
    } else {
      current = current[key]
    }
  }
  return current
}

// Build request body based on model config
function buildRequestBody(
  config: ModelConfig,
  inputUrl: string,
  prompt: string,
  aspectRatio: string,
  callbackUrl: string
): Record<string, any> {
  const template = { ...config.request_template }
  const requestBody: Record<string, any> = {
    ...template,
    callbackUrl,
  }

  if (config.submit_endpoint.includes('/flux/kontext/')) {
    requestBody.prompt = prompt
    requestBody.inputImage = inputUrl
    requestBody.aspectRatio = aspectRatio
  } else if (config.submit_endpoint.includes('/gpt4o-image/')) {
    requestBody.prompt = prompt
    requestBody.inputImage = inputUrl
  } else if (config.submit_endpoint.includes('/jobs/createTask')) {
    const input = template.input || {}
    input.prompt = prompt
    input.image_input = [inputUrl]
    input.aspect_ratio = aspectRatio
    requestBody.input = input
  }

  return requestBody
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const kieApiKey = Deno.env.get("KIE_AI_API_KEY")

  if (!kieApiKey) {
    console.error("KIE_AI_API_KEY not set")
    return new Response(
      JSON.stringify({ error: "KIE_AI_API_KEY not configured in Supabase secrets" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  // Base callback URL - token will be added per-job for security
  const baseCallbackUrl = `${supabaseUrl}/functions/v1/ai-webhook`

  try {
    const body: ProcessRequest = req.method === "POST" ? await req.json().catch(() => ({})) : {}
    const batchSize = body.batch_size || 5

    // Find jobs that need processing
    let jobsQuery = supabase
      .from("shopify_sync_jobs")
      .select("id, store_id, preset_type, preset_id, ai_model, custom_prompt")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(10)

    if (body.job_id) {
      jobsQuery = jobsQuery.eq("id", body.job_id)
    }

    const { data: jobs, error: jobsError } = await jobsQuery

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch jobs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No jobs to process", submitted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let totalSubmitted = 0
    let totalFailed = 0
    const results: Array<{ job_id: string; submitted: number; failed: number }> = []

    for (const job of jobs) {
      // Update job status to processing
      await supabase
        .from("shopify_sync_jobs")
        .update({ status: "processing" })
        .eq("id", job.id)

      // Get AI model from job or default
      const aiModel = job.ai_model || "flux-kontext-pro"

      // Get model config from database
      const { data: modelConfig, error: configError } = await supabase
        .from("ai_model_configs")
        .select("*")
        .eq("id", aiModel)
        .eq("is_active", true)
        .single()

      if (configError || !modelConfig) {
        console.error(`Model config not found: ${aiModel}`, configError)
        await supabase
          .from("shopify_sync_jobs")
          .update({ status: "failed", last_error: `Model not found: ${aiModel}` })
          .eq("id", job.id)
        continue
      }

      // Get organization ID from store
      const { data: store } = await supabase
        .from("shopify_stores")
        .select("user_id")
        .eq("id", job.store_id)
        .single()

      let organizationId: string | null = null
      if (store?.user_id) {
        const { data: membership } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", store.user_id)
          .limit(1)
          .single()
        organizationId = membership?.organization_id
      }

      if (!organizationId) {
        console.error("Could not determine organization for store:", job.store_id)
        await supabase
          .from("shopify_sync_jobs")
          .update({ status: "failed", last_error: "Could not determine organization" })
          .eq("id", job.id)
        continue
      }

      // Get prompt for AI processing
      // Priority: custom_prompt > template/preset > default
      let promptTemplate = ""

      if (job.custom_prompt) {
        // Use custom prompt if provided
        promptTemplate = job.custom_prompt
        console.log(`[shopify-process] Using custom prompt for job ${job.id}`)
      } else if (job.preset_type === "template" && job.preset_id) {
        const { data: template } = await supabase
          .from("prompt_templates")
          .select("base_prompt, background, lighting, style")
          .eq("id", job.preset_id)
          .single()

        if (template) {
          promptTemplate = [
            template.base_prompt,
            template.background ? `Background: ${template.background}` : "",
            template.lighting ? `Lighting: ${template.lighting}` : "",
            template.style ? `Style: ${template.style}` : ""
          ].filter(Boolean).join(". ")
        }
      } else if (job.preset_type === "studio_preset" && job.preset_id) {
        const { data: preset } = await supabase
          .from("studio_presets")
          .select("*")
          .eq("id", job.preset_id)
          .single()

        if (preset) {
          promptTemplate = buildStudioPrompt(preset)
        }
      }

      // Fallback default prompt (should not reach here with proper validation)
      if (!promptTemplate) {
        promptTemplate = "Professional product photography with clean white background, soft studio lighting, high detail, commercial quality"
        console.warn(`[shopify-process] No prompt configured for job ${job.id}, using default`)
      }

      // Get queued images for this job
      const { data: images, error: imagesError } = await supabase
        .from("shopify_images")
        .select("*")
        .eq("job_id", job.id)
        .eq("status", "queued")
        .limit(batchSize)

      if (imagesError || !images || images.length === 0) {
        await checkJobCompletion(supabase, job.id)
        continue
      }

      let jobSubmitted = 0
      let jobFailed = 0

      for (const image of images) {
        // Update status to processing
        await supabase
          .from("shopify_images")
          .update({ status: "processing" })
          .eq("id", image.id)

        try {
          // Create ai_jobs record directly
          const { data: aiJob, error: aiJobError } = await supabase
            .from("ai_jobs")
            .insert({
              organization_id: organizationId,
              job_type: "optimize",
              source: "shopify",
              source_id: image.id,
              ai_model: aiModel,
              input_url: image.original_url,
              prompt: promptTemplate,
              settings: { aspect_ratio: "1:1" },
              status: "pending",
            })
            .select()
            .single()

          if (aiJobError || !aiJob) {
            throw new Error(`Failed to create ai_job: ${aiJobError?.message}`)
          }

          console.log(`[shopify-process] Created ai_job ${aiJob.id} for image ${image.id}`)

          // Update shopify_images with ai_job_id
          await supabase
            .from("shopify_images")
            .update({ ai_job_id: aiJob.id })
            .eq("id", image.id)

          // Build callback URL with security token for this specific job
          const jobCallbackUrl = `${baseCallbackUrl}?token=${aiJob.callback_token}`

          // Build request body for KIE.ai
          const requestBody = buildRequestBody(
            modelConfig as ModelConfig,
            image.original_url,
            promptTemplate,
            "1:1",
            jobCallbackUrl
          )

          console.log(`[shopify-process] Calling ${modelConfig.submit_endpoint}`)

          // Submit to KIE.ai directly
          const kieResponse = await fetch(modelConfig.submit_endpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${kieApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          })

          if (!kieResponse.ok) {
            const errorText = await kieResponse.text()
            console.error("KIE.ai API error:", kieResponse.status, errorText)

            await supabase
              .from("ai_jobs")
              .update({
                status: "failed",
                error_message: `API error: ${kieResponse.status}`,
                completed_at: new Date().toISOString(),
              })
              .eq("id", aiJob.id)

            throw new Error(`KIE.ai API error: ${kieResponse.status}`)
          }

          const kieResult = await kieResponse.json()
          console.log("[shopify-process] KIE.ai response:", JSON.stringify(kieResult))

          // Check for API-level errors
          if (kieResult.code && kieResult.code !== 200) {
            await supabase
              .from("ai_jobs")
              .update({
                status: "failed",
                error_message: kieResult.message || kieResult.msg || "Unknown error",
                error_code: String(kieResult.code),
                completed_at: new Date().toISOString(),
              })
              .eq("id", aiJob.id)

            throw new Error(kieResult.message || "KIE.ai error")
          }

          // Extract task ID
          let taskId = getNestedValue(kieResult, modelConfig.task_id_path as string[])
          if (!taskId) {
            taskId = kieResult.data?.taskId || kieResult.taskId || kieResult.data?.id || kieResult.id
          }

          console.log(`[shopify-process] Task ID: ${taskId}`)

          if (!taskId) {
            await supabase
              .from("ai_jobs")
              .update({
                status: "failed",
                error_message: "No task ID received from provider",
                completed_at: new Date().toISOString(),
              })
              .eq("id", aiJob.id)

            throw new Error("No task ID received")
          }

          // Update ai_job with task ID
          await supabase
            .from("ai_jobs")
            .update({
              task_id: taskId,
              status: "submitted",
              submitted_at: new Date().toISOString(),
              attempt_count: 1,
            })
            .eq("id", aiJob.id)

          console.log(`[shopify-process] Submitted image ${image.id}, ai_job: ${aiJob.id}, task_id: ${taskId}`)
          jobSubmitted++
          totalSubmitted++

        } catch (err) {
          const error = err as Error
          console.error(`Failed to process image ${image.id}:`, error.message)

          await supabase
            .from("shopify_images")
            .update({
              status: "failed",
              error_message: error.message
            })
            .eq("id", image.id)

          jobFailed++
          totalFailed++
        }
      }

      // Update job counts
      await supabase.rpc("update_shopify_job_counts", { p_job_id: job.id })

      results.push({ job_id: job.id, submitted: jobSubmitted, failed: jobFailed })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Images submitted to KIE.ai. Results will arrive via webhook.",
        total_submitted: totalSubmitted,
        total_failed: totalFailed,
        jobs: results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    const error = err as Error
    console.error("Process images error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

// Check if all images in a job are processed and update job status
async function checkJobCompletion(supabase: any, jobId: string) {
  const { data: stats } = await supabase
    .from("shopify_images")
    .select("status")
    .eq("job_id", jobId)

  if (!stats || stats.length === 0) return

  const queued = stats.filter((s: any) => s.status === "queued").length
  const processing = stats.filter((s: any) => s.status === "processing").length
  const ready = stats.filter((s: any) => s.status === "ready").length
  const failed = stats.filter((s: any) => s.status === "failed").length

  // If no more queued or processing images, job is ready for approval
  if (queued === 0 && processing === 0) {
    const newStatus = ready > 0 ? "awaiting_approval" : "failed"

    await supabase
      .from("shopify_sync_jobs")
      .update({
        status: newStatus,
        processed_count: ready,
        failed_count: failed
      })
      .eq("id", jobId)
  }
}

// Build prompt from studio preset
function buildStudioPrompt(preset: any): string {
  const parts: string[] = []

  if (preset.background_type === "solid" && preset.background_color) {
    parts.push(`${preset.background_color} background`)
  } else if (preset.background_type === "gradient") {
    parts.push("gradient background")
  } else if (preset.background_surface) {
    parts.push(`${preset.background_surface} surface`)
  }

  if (preset.lighting_style) {
    parts.push(`${preset.lighting_style} lighting`)
  }
  if (preset.lighting_direction) {
    parts.push(`light from ${preset.lighting_direction}`)
  }

  if (preset.camera_angle) {
    parts.push(`${preset.camera_angle} angle`)
  }
  if (preset.camera_distance) {
    parts.push(`${preset.camera_distance} shot`)
  }

  if (preset.jewelry_finish) {
    parts.push(`${preset.jewelry_finish} finish`)
  }
  if (preset.jewelry_sparkle && preset.jewelry_sparkle > 50) {
    parts.push("enhanced sparkle")
  }

  if (preset.custom_prompt) {
    parts.push(preset.custom_prompt)
  }

  if (parts.length === 0) {
    return "Professional product photography, studio lighting, high quality, commercial"
  }

  return `Professional product photo: ${parts.join(", ")}. High detail, commercial quality.`
}
