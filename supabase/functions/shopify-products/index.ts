import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface ListProductsRequest {
  action: "list"
  store_id: string
  collection_id?: string
  product_type?: string
  vendor?: string
  tags?: string[]
  page_info?: string  // Shopify pagination cursor
  limit?: number
}

interface GetProductRequest {
  action: "get"
  store_id: string
  product_id: string
}

interface ListCollectionsRequest {
  action: "list_collections"
  store_id: string
}

interface ListTypesRequest {
  action: "list_types"
  store_id: string
}

type ProductRequest = ListProductsRequest | GetProductRequest | ListCollectionsRequest | ListTypesRequest

interface ShopifyProduct {
  id: number
  title: string
  product_type: string
  vendor: string
  tags: string
  status: string
  images: Array<{
    id: number
    src: string
    position: number
    alt: string | null
    width: number
    height: number
  }>
}

interface ShopifyCollection {
  id: number
  title: string
  handle: string
  products_count: number
}

async function getStoreAccessToken(supabase: any, storeId: string, userId: string): Promise<{ accessToken: string; shopDomain: string } | null> {
  const { data: store, error } = await supabase
    .from("shopify_stores")
    .select("access_token, shop_domain, status")
    .eq("id", storeId)
    .eq("user_id", userId)
    .single()

  if (error || !store || store.status !== "active") {
    return null
  }

  return { accessToken: store.access_token, shopDomain: store.shop_domain }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const body: ProductRequest = await req.json()
    const { store_id } = body

    if (!store_id) {
      return new Response(
        JSON.stringify({ error: "store_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get store credentials
    const storeInfo = await getStoreAccessToken(supabase, store_id, user.id)
    if (!storeInfo) {
      return new Response(
        JSON.stringify({ error: "Store not found or not active" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { accessToken, shopDomain } = storeInfo
    const apiVersion = "2024-01"
    const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}`

    // ================================================
    // ACTION: LIST COLLECTIONS
    // ================================================
    if (body.action === "list_collections") {
      const response = await fetch(
        `${baseUrl}/custom_collections.json?limit=250`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return new Response(
          JSON.stringify({ error: "Failed to fetch collections: " + errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const data = await response.json()

      // Also fetch smart collections
      const smartResponse = await fetch(
        `${baseUrl}/smart_collections.json?limit=250`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      )

      let allCollections = data.custom_collections || []
      if (smartResponse.ok) {
        const smartData = await smartResponse.json()
        allCollections = [...allCollections, ...(smartData.smart_collections || [])]
      }

      const collections: ShopifyCollection[] = allCollections.map((c: any) => ({
        id: c.id,
        title: c.title,
        handle: c.handle,
        products_count: c.products_count || 0
      }))

      return new Response(
        JSON.stringify({ collections }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: LIST PRODUCT TYPES
    // ================================================
    if (body.action === "list_types") {
      // Shopify doesn't have a direct endpoint for product types
      // We need to fetch products and extract unique types
      const response = await fetch(
        `${baseUrl}/products.json?limit=250&fields=product_type`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return new Response(
          JSON.stringify({ error: "Failed to fetch product types: " + errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const data = await response.json()
      const types = [...new Set(
        (data.products || [])
          .map((p: any) => p.product_type)
          .filter((t: string) => t && t.trim())
      )].sort()

      return new Response(
        JSON.stringify({ product_types: types }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: GET SINGLE PRODUCT
    // ================================================
    if (body.action === "get") {
      const { product_id } = body as GetProductRequest

      if (!product_id) {
        return new Response(
          JSON.stringify({ error: "product_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const response = await fetch(
        `${baseUrl}/products/${product_id}.json`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return new Response(
          JSON.stringify({ error: "Failed to fetch product: " + errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const data = await response.json()

      return new Response(
        JSON.stringify({ product: data.product }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: LIST PRODUCTS
    // ================================================
    if (body.action === "list") {
      const { collection_id, product_type, vendor, tags, page_info, limit = 50 } = body as ListProductsRequest

      let url: string
      const params = new URLSearchParams()
      params.set("limit", Math.min(limit, 250).toString())
      params.set("status", "active")

      if (page_info) {
        // Pagination - use page_info cursor
        url = `${baseUrl}/products.json?page_info=${page_info}`
      } else if (collection_id) {
        // Fetch products from specific collection
        url = `${baseUrl}/collections/${collection_id}/products.json?${params.toString()}`
      } else {
        // Regular product list with filters
        if (product_type) params.set("product_type", product_type)
        if (vendor) params.set("vendor", vendor)
        url = `${baseUrl}/products.json?${params.toString()}`
      }

      const response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": accessToken }
      })

      if (!response.ok) {
        const errorText = await response.text()
        return new Response(
          JSON.stringify({ error: "Failed to fetch products: " + errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const data = await response.json()
      let products: ShopifyProduct[] = data.products || []

      // Filter by tags client-side (Shopify API doesn't support multiple tag filter well)
      if (tags && tags.length > 0) {
        products = products.filter((p: ShopifyProduct) => {
          const productTags = p.tags.toLowerCase().split(", ")
          return tags.some(tag => productTags.includes(tag.toLowerCase()))
        })
      }

      // Extract pagination info from Link header
      const linkHeader = response.headers.get("Link")
      let nextPageInfo: string | null = null
      let prevPageInfo: string | null = null

      if (linkHeader) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/)
        const prevMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="previous"/)
        if (nextMatch) nextPageInfo = nextMatch[1]
        if (prevMatch) prevPageInfo = prevMatch[1]
      }

      // Transform to simpler format
      const transformedProducts = products.map((p: ShopifyProduct) => ({
        id: p.id.toString(),
        title: p.title,
        product_type: p.product_type,
        vendor: p.vendor,
        tags: p.tags.split(", ").filter(t => t),
        status: p.status,
        image_count: p.images?.length || 0,
        images: (p.images || []).map(img => ({
          id: img.id.toString(),
          src: img.src,
          position: img.position,
          alt: img.alt,
          width: img.width,
          height: img.height
        }))
      }))

      return new Response(
        JSON.stringify({
          products: transformedProducts,
          pagination: {
            next_page: nextPageInfo,
            prev_page: prevPageInfo,
            has_next: !!nextPageInfo,
            has_prev: !!prevPageInfo
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'list', 'get', 'list_collections', or 'list_types'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    const error = err as Error
    console.error("Shopify products error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
