import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const fileId = url.searchParams.get('fileId')
    const thumbnailUrl = url.searchParams.get('url')

    if (!fileId && !thumbnailUrl) {
      return new Response(
        JSON.stringify({ error: 'fileId or url parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Google token from database
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return new Response(
        JSON.stringify({ error: 'No organization found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('organization_id', orgMember.organization_id)
      .eq('provider', 'google_drive')
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Google Drive not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let accessToken = integration.access_token

    // Check if token needs refresh
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        accessToken = tokenData.access_token

        // Update token in database
        await supabase
          .from('integrations')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          })
          .eq('organization_id', orgMember.organization_id)
          .eq('provider', 'google_drive')
      }
    }

    // Fetch thumbnail from Google Drive
    let targetUrl: string

    if (fileId) {
      // Fetch thumbnail directly using Drive API
      targetUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&fields=thumbnailLink`

      // Try to get thumbnail link first
      const metaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (metaResponse.ok) {
        const meta = await metaResponse.json()
        if (meta.thumbnailLink) {
          targetUrl = meta.thumbnailLink.replace('=s220', '=s400')
        }
      }
    } else if (thumbnailUrl) {
      // Use provided thumbnail URL but add auth
      targetUrl = decodeURIComponent(thumbnailUrl)
    } else {
      return new Response(
        JSON.stringify({ error: 'No valid source' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the actual thumbnail image
    const imageResponse = await fetch(targetUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!imageResponse.ok) {
      console.error('Failed to fetch thumbnail:', imageResponse.status, await imageResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to fetch thumbnail' }),
        { status: imageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const imageData = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg'

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })

  } catch (error) {
    console.error('Thumbnail proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
