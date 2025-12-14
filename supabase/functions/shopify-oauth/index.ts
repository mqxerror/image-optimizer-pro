import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

interface InitiateRequest {
  action: "initiate"
  redirect_uri: string  // Where to redirect after OAuth completes
}

interface CallbackRequest {
  action: "callback"
  code: string
  shop: string
  state: string
}

type OAuthRequest = InitiateRequest | CallbackRequest

// Shopify OAuth scopes needed
const SHOPIFY_SCOPES = [
  "read_products",
  "write_products",
  "read_product_images",
  "write_product_images",
].join(",")

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const shopifyApiKey = Deno.env.get("SHOPIFY_API_KEY")
  const shopifyApiSecret = Deno.env.get("SHOPIFY_API_SECRET")

  // Check if Shopify credentials are configured
  if (!shopifyApiKey || !shopifyApiSecret) {
    console.error("Missing Shopify credentials - SHOPIFY_API_KEY or SHOPIFY_API_SECRET not set")
    return new Response(
      JSON.stringify({ error: "Shopify integration not configured. Please set SHOPIFY_API_KEY and SHOPIFY_API_SECRET." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const body: OAuthRequest = await req.json()

    // ================================================
    // ACTION: INITIATE - Generate OAuth URL
    // ================================================
    if (body.action === "initiate") {
      const authHeader = req.headers.get("Authorization")
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Verify user is authenticated
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

      const { redirect_uri } = body as InitiateRequest

      // Create state with user info and redirect URI (base64 encoded)
      const state = btoa(JSON.stringify({
        user_id: user.id,
        redirect_uri,
        timestamp: Date.now(),
        nonce: crypto.randomUUID()
      }))

      // We need the shop domain from the user - they'll enter it in the UI
      // Return the initiation data so frontend can construct the URL with shop
      return new Response(
        JSON.stringify({
          success: true,
          state,
          api_key: shopifyApiKey,
          scopes: SHOPIFY_SCOPES,
          // Frontend will construct: https://{shop}/admin/oauth/authorize?client_id={api_key}&scope={scopes}&redirect_uri={callback_url}&state={state}
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ================================================
    // ACTION: CALLBACK - Exchange code for access token
    // ================================================
    if (body.action === "callback") {
      const { code, shop, state } = body as CallbackRequest

      if (!code || !shop || !state) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters: code, shop, state" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Decode and verify state
      let stateData: { user_id: string; redirect_uri: string; timestamp: number }
      try {
        stateData = JSON.parse(atob(state))
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid state parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Check state is not too old (1 hour max)
      if (Date.now() - stateData.timestamp > 3600000) {
        return new Response(
          JSON.stringify({ error: "OAuth session expired, please try again" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Validate shop domain format
      const shopDomain = shop.replace(/^https?:\/\//, "").replace(/\/$/, "")
      if (!shopDomain.includes(".myshopify.com")) {
        return new Response(
          JSON.stringify({ error: "Invalid shop domain" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Exchange code for access token
      const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: shopifyApiKey,
          client_secret: shopifyApiSecret,
          code
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error("Token exchange failed:", {
          status: tokenResponse.status,
          error: errorText,
          shop: shopDomain
        })
        return new Response(
          JSON.stringify({
            error: `Failed to exchange code for access token: ${errorText}`,
            details: `Status: ${tokenResponse.status}`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const tokenData = await tokenResponse.json()
      const { access_token, scope } = tokenData

      // Get shop info from Shopify
      const shopInfoResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": access_token }
      })

      let shopName = shopDomain.split(".")[0]
      if (shopInfoResponse.ok) {
        const shopInfo = await shopInfoResponse.json()
        shopName = shopInfo.shop?.name || shopName
      }

      // Save to database using service role
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Check if store already connected for this user
      const { data: existingStore } = await supabase
        .from("shopify_stores")
        .select("id")
        .eq("user_id", stateData.user_id)
        .eq("shop_domain", shopDomain)
        .single()

      let storeId: string

      if (existingStore) {
        // Update existing connection
        const { data: updated, error: updateError } = await supabase
          .from("shopify_stores")
          .update({
            access_token,
            scopes: scope.split(","),
            shop_name: shopName,
            status: "active",
            updated_at: new Date().toISOString()
          })
          .eq("id", existingStore.id)
          .select("id")
          .single()

        if (updateError) {
          console.error("Update error:", updateError)
          return new Response(
            JSON.stringify({ error: "Failed to update store connection" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        storeId = updated.id
      } else {
        // Create new connection
        const { data: newStore, error: insertError } = await supabase
          .from("shopify_stores")
          .insert({
            user_id: stateData.user_id,
            shop_domain: shopDomain,
            shop_name: shopName,
            access_token,
            scopes: scope.split(","),
            status: "active"
          })
          .select("id")
          .single()

        if (insertError) {
          console.error("Insert error:", insertError)
          return new Response(
            JSON.stringify({ error: "Failed to save store connection" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        storeId = newStore.id
      }

      return new Response(
        JSON.stringify({
          success: true,
          store_id: storeId,
          shop_domain: shopDomain,
          shop_name: shopName,
          redirect_uri: stateData.redirect_uri
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'initiate' or 'callback'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    const error = err as Error
    console.error("Shopify OAuth error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
