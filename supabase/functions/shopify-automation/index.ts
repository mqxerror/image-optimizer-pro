import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationRequest {
  action: string
  store_id: string
  config?: Record<string, unknown>
  filters?: Record<string, unknown>
  item_ids?: string[]
  product_ids?: string[]
  priority?: 'high' | 'normal' | 'low'
  reason?: string
  test_count?: number
  selected_product_ids?: string[]
  limit?: number
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: AutomationRequest = await req.json()
    const { action, store_id } = body

    if (!store_id) {
      return new Response(
        JSON.stringify({ error: 'store_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabaseClient
      .from('shopify_stores')
      .select('id')
      .eq('id', store_id)
      .eq('user_id', user.id)
      .single()

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: 'Store not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: unknown

    switch (action) {
      // ==================== CONFIG ACTIONS ====================

      case 'get_config': {
        const { data: config } = await supabaseClient
          .from('shopify_automation_configs')
          .select('*')
          .eq('store_id', store_id)
          .single()

        result = { config }
        break
      }

      case 'update_config': {
        const { config: updates } = body

        // Check if config exists
        const { data: existing } = await supabaseClient
          .from('shopify_automation_configs')
          .select('id')
          .eq('store_id', store_id)
          .single()

        if (existing) {
          // Update existing
          const { data: config, error } = await supabaseClient
            .from('shopify_automation_configs')
            .update(updates)
            .eq('store_id', store_id)
            .select()
            .single()

          if (error) throw error
          result = { config }
        } else {
          // Create new
          const { data: config, error } = await supabaseClient
            .from('shopify_automation_configs')
            .insert({
              store_id,
              user_id: user.id,
              ...updates
            })
            .select()
            .single()

          if (error) throw error
          result = { config }
        }
        break
      }

      case 'pause': {
        const { data: config, error } = await supabaseClient
          .from('shopify_automation_configs')
          .update({
            is_paused: true,
            paused_reason: 'Manual pause',
            paused_at: new Date().toISOString()
          })
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error
        result = { config }
        break
      }

      case 'resume': {
        const { data: config, error } = await supabaseClient
          .from('shopify_automation_configs')
          .update({
            is_paused: false,
            paused_reason: null,
            paused_at: null
          })
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error
        result = { config }
        break
      }

      case 'reset_config': {
        const { error } = await supabaseClient
          .from('shopify_automation_configs')
          .delete()
          .eq('store_id', store_id)

        if (error) throw error
        result = { success: true }
        break
      }

      // ==================== STATS ACTIONS ====================

      case 'get_stats': {
        // Get recent runs
        const { data: runs } = await supabaseClient
          .from('shopify_automation_runs')
          .select('*')
          .eq('store_id', store_id)
          .order('started_at', { ascending: false })
          .limit(20)

        const recentRuns = runs || []

        // Calculate aggregate stats
        const completedRuns = recentRuns.filter(r => r.status === 'completed')
        const totalProcessed = completedRuns.reduce((acc, r) => acc + r.images_processed, 0)
        const totalFailed = completedRuns.reduce((acc, r) => acc + r.images_failed, 0)

        const successRate = totalProcessed + totalFailed > 0
          ? totalProcessed / (totalProcessed + totalFailed)
          : 1.0

        // Check approval status
        const { data: config } = await supabaseClient
          .from('shopify_automation_configs')
          .select('batches_completed, approval_threshold')
          .eq('store_id', store_id)
          .single()

        const isApprovalComplete = config
          ? config.batches_completed >= config.approval_threshold
          : false

        result = {
          stats: {
            totalRuns: recentRuns.length,
            successRate,
            totalImagesProcessed: totalProcessed,
            recentRuns: recentRuns.slice(0, 10),
            isApprovalComplete
          }
        }
        break
      }

      // ==================== QUEUE ACTIONS ====================

      case 'list_queue': {
        const { filters } = body
        let query = supabaseClient
          .from('shopify_automation_queue')
          .select('*')
          .eq('store_id', store_id)
          .order('priority', { ascending: false })
          .order('added_at', { ascending: true })

        if (filters?.source) {
          query = query.eq('source', filters.source)
        }
        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.search) {
          query = query.ilike('product_title', `%${filters.search}%`)
        }

        const { data: items, error } = await query.limit(100)
        if (error) throw error

        result = { items, total: items?.length || 0 }
        break
      }

      case 'add_to_queue': {
        const { product_ids } = body

        if (!product_ids || product_ids.length === 0) {
          throw new Error('product_ids required')
        }

        // Get product details from Shopify (simplified - in real impl would fetch from Shopify API)
        const insertData = product_ids.map((pid: string) => ({
          store_id,
          user_id: user.id,
          shopify_product_id: pid,
          source: body.source || 'manual',
          priority: 'normal',
          status: 'pending'
        }))

        const { data: items, error } = await supabaseClient
          .from('shopify_automation_queue')
          .upsert(insertData, { onConflict: 'store_id,shopify_product_id' })
          .select()

        if (error) throw error
        result = { items }
        break
      }

      case 'remove_from_queue': {
        const { item_ids } = body

        if (!item_ids || item_ids.length === 0) {
          throw new Error('item_ids required')
        }

        const { error } = await supabaseClient
          .from('shopify_automation_queue')
          .delete()
          .in('id', item_ids)
          .eq('store_id', store_id)

        if (error) throw error
        result = { success: true }
        break
      }

      case 'update_priority': {
        const { item_ids, priority } = body

        if (!item_ids || item_ids.length === 0) {
          throw new Error('item_ids required')
        }
        if (!priority) {
          throw new Error('priority required')
        }

        const { error } = await supabaseClient
          .from('shopify_automation_queue')
          .update({ priority })
          .in('id', item_ids)
          .eq('store_id', store_id)

        if (error) throw error
        result = { success: true }
        break
      }

      case 'process_now': {
        const { item_ids } = body

        if (!item_ids || item_ids.length === 0) {
          throw new Error('item_ids required')
        }

        // Mark items as processing
        const { data: items, error: updateError } = await supabaseClient
          .from('shopify_automation_queue')
          .update({ status: 'processing' })
          .in('id', item_ids)
          .eq('store_id', store_id)
          .select()

        if (updateError) throw updateError

        // Create a run record
        const { data: run, error: runError } = await supabaseClient
          .from('shopify_automation_runs')
          .insert({
            store_id,
            user_id: user.id,
            trigger_type: 'manual',
            products_queued: items?.length || 0,
            images_queued: 0, // Would calculate from items
            status: 'running'
          })
          .select()
          .single()

        if (runError) throw runError

        // In a real implementation, this would trigger the actual processing
        // For now, we just return success
        result = { run, items }
        break
      }

      // ==================== EXCLUSION ACTIONS ====================

      case 'list_excluded': {
        const { data: products, error } = await supabaseClient
          .from('shopify_excluded_products')
          .select('*')
          .eq('store_id', store_id)
          .order('excluded_at', { ascending: false })

        if (error) throw error
        result = { products }
        break
      }

      case 'exclude_products': {
        const { item_ids, reason } = body

        if (!item_ids || item_ids.length === 0) {
          throw new Error('item_ids required')
        }

        // Get queue items to exclude
        const { data: queueItems, error: fetchError } = await supabaseClient
          .from('shopify_automation_queue')
          .select('*')
          .in('id', item_ids)
          .eq('store_id', store_id)

        if (fetchError) throw fetchError

        // Add to excluded
        const excludeData = (queueItems || []).map(item => ({
          store_id,
          user_id: user.id,
          shopify_product_id: item.shopify_product_id,
          product_title: item.product_title,
          product_handle: item.product_handle,
          thumbnail_url: item.thumbnail_url,
          reason
        }))

        const { error: insertError } = await supabaseClient
          .from('shopify_excluded_products')
          .upsert(excludeData, { onConflict: 'store_id,shopify_product_id' })

        if (insertError) throw insertError

        // Remove from queue
        const { error: deleteError } = await supabaseClient
          .from('shopify_automation_queue')
          .delete()
          .in('id', item_ids)
          .eq('store_id', store_id)

        if (deleteError) throw deleteError

        result = { success: true }
        break
      }

      case 'restore_excluded': {
        const { product_ids } = body

        if (!product_ids || product_ids.length === 0) {
          throw new Error('product_ids required')
        }

        // Get excluded products to restore
        const { data: excluded, error: fetchError } = await supabaseClient
          .from('shopify_excluded_products')
          .select('*')
          .in('shopify_product_id', product_ids)
          .eq('store_id', store_id)

        if (fetchError) throw fetchError

        // Add back to queue
        const queueData = (excluded || []).map(item => ({
          store_id,
          user_id: user.id,
          shopify_product_id: item.shopify_product_id,
          product_title: item.product_title,
          product_handle: item.product_handle,
          thumbnail_url: item.thumbnail_url,
          source: 'manual',
          priority: 'normal',
          status: 'pending'
        }))

        const { error: insertError } = await supabaseClient
          .from('shopify_automation_queue')
          .upsert(queueData, { onConflict: 'store_id,shopify_product_id' })

        if (insertError) throw insertError

        // Remove from excluded
        const { error: deleteError } = await supabaseClient
          .from('shopify_excluded_products')
          .delete()
          .in('shopify_product_id', product_ids)
          .eq('store_id', store_id)

        if (deleteError) throw deleteError

        result = { success: true }
        break
      }

      // ==================== HISTORY ACTIONS ====================

      case 'list_runs': {
        const limit = body.limit || 20

        const { data: runs, error } = await supabaseClient
          .from('shopify_automation_runs')
          .select('*')
          .eq('store_id', store_id)
          .order('started_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        result = { runs }
        break
      }

      // ==================== TEST RUN ACTIONS ====================

      case 'start_test': {
        const { test_count = 10, selected_product_ids } = body

        // Get store info for API access
        const { data: storeData, error: storeDataError } = await supabaseClient
          .from('shopify_stores')
          .select('shop_domain, access_token')
          .eq('id', store_id)
          .single()

        if (storeDataError || !storeData) {
          throw new Error('Store not found')
        }

        // Create a sync job for the test run
        const { data: job, error: jobError } = await supabaseClient
          .from('shopify_sync_jobs')
          .insert({
            store_id,
            trigger_type: 'test_run',
            preset_type: 'standard',
            status: 'pending',
            product_count: 0,
            image_count: test_count,
            processed_count: 0,
            pushed_count: 0,
            failed_count: 0
          })
          .select()
          .single()

        if (jobError) throw jobError

        // Create test run record
        const { data: testRun, error: testError } = await supabaseClient
          .from('shopify_test_runs')
          .insert({
            store_id,
            user_id: user.id,
            test_count,
            selected_product_ids,
            status: 'running'
          })
          .select()
          .single()

        if (testError) throw testError

        // Create automation run record
        const { data: run, error: runError } = await supabaseClient
          .from('shopify_automation_runs')
          .insert({
            store_id,
            user_id: user.id,
            trigger_type: 'test',
            images_queued: test_count,
            status: 'running'
          })
          .select()
          .single()

        if (runError) throw runError

        // Link test run to automation run
        await supabaseClient
          .from('shopify_test_runs')
          .update({ run_id: run.id })
          .eq('id', testRun.id)

        // Update job status to processing
        await supabaseClient
          .from('shopify_sync_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id)

        // Fetch products from Shopify to process
        try {
          const shopifyResponse = await fetch(
            `https://${storeData.shop_domain}/admin/api/2024-01/products.json?limit=${test_count}`,
            {
              headers: {
                'X-Shopify-Access-Token': storeData.access_token,
                'Content-Type': 'application/json'
              }
            }
          )

          if (shopifyResponse.ok) {
            const { products } = await shopifyResponse.json()

            // Count images and update job
            let totalImages = 0
            const productImages: Array<{product_id: string, image_id: string, src: string, product_title: string}> = []

            for (const product of products) {
              if (product.images && product.images.length > 0) {
                for (const image of product.images.slice(0, Math.ceil(test_count / products.length) || 1)) {
                  productImages.push({
                    product_id: String(product.id),
                    image_id: String(image.id),
                    src: image.src,
                    product_title: product.title
                  })
                  totalImages++
                  if (totalImages >= test_count) break
                }
              }
              if (totalImages >= test_count) break
            }

            // Update job with actual image count
            await supabaseClient
              .from('shopify_sync_jobs')
              .update({
                product_count: products.length,
                image_count: totalImages
              })
              .eq('id', job.id)

            // Trigger image processing via the shopify-process-images function
            const processUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-process-images`
            fetch(processUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                job_id: job.id,
                store_id,
                images: productImages
              })
            }).catch(err => console.error('Failed to trigger processing:', err))
          }
        } catch (fetchErr) {
          console.error('Failed to fetch Shopify products:', fetchErr)
        }

        result = { testRun, run, job }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in shopify-automation:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
