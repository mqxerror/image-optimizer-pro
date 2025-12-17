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

interface DriveRequest {
  action: "list" | "download"
  connection_id: string
  folder_id?: string
  page_token?: string
}

async function refreshAccessToken(supabase: any, connectionId: string, refreshToken: string): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  })

  const data = await response.json()

  if (data.error) {
    throw new Error("Token refresh failed: " + data.error_description)
  }

  await supabase
    .from("google_drive_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    })
    .eq("id", connectionId)

  return data.access_token
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify user from JWT token
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const body: DriveRequest = await req.json()
    const { action, connection_id, folder_id, page_token } = body

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: "connection_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: connection, error: connError } = await supabase
      .from("google_drive_connections")
      .select("*")
      .eq("id", connection_id)
      .single()

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // SECURITY: Verify user has access to this connection's organization
    const { data: membership, error: membershipError } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", connection.organization_id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Access denied: You don't have permission to access this connection" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let accessToken = connection.access_token
    const tokenExpires = new Date(connection.token_expires_at)

    if (tokenExpires < new Date()) {
      console.log("Token expired, refreshing...")
      accessToken = await refreshAccessToken(supabase, connection_id, connection.refresh_token)
    }

    if (action === "download") {
      const fileId = folder_id
      if (!fileId) {
        return new Response(
          JSON.stringify({ error: "folder_id (file ID) required for download" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      console.log("Download action - file_id:", fileId)

      const metaUrl = "https://www.googleapis.com/drive/v3/files/" + fileId + "?fields=name,mimeType,size"
      const metaResponse = await fetch(metaUrl, {
        headers: { "Authorization": "Bearer " + accessToken }
      })

      if (!metaResponse.ok) {
        const errorText = await metaResponse.text()
        return new Response(
          JSON.stringify({ error: "Failed to get file metadata: " + errorText }),
          { status: metaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const metadata = await metaResponse.json()
      console.log("File metadata:", metadata.name, metadata.mimeType)

      const downloadUrl = "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media"
      const response = await fetch(downloadUrl, {
        headers: { "Authorization": "Bearer " + accessToken }
      })

      if (!response.ok) {
        const errorText = await response.text()
        return new Response(
          JSON.stringify({ error: "Failed to download file: " + errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      let binary = ""
      const chunkSize = 32768
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, chunk as unknown as number[])
      }
      const base64 = btoa(binary)

      console.log("Download successful, size:", uint8Array.length)

      return new Response(
        JSON.stringify({
          success: true,
          data: base64,
          contentType: metadata.mimeType,
          fileName: metadata.name,
          fileSize: uint8Array.length
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const folderId = folder_id || "root"
    const sq = String.fromCharCode(39)
    const folderCondition = sq + folderId + sq + " in parents"
    const mimeCondition = "(mimeType = " + sq + "application/vnd.google-apps.folder" + sq + " or mimeType contains " + sq + "image/" + sq + ")"
    const query = folderCondition + " and trashed = false and " + mimeCondition

    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink,createdTime,modifiedTime)",
      pageSize: "50",
      orderBy: "folder,name"
    })

    if (page_token) {
      params.append("pageToken", page_token)
    }

    const listUrl = "https://www.googleapis.com/drive/v3/files?" + params.toString()

    const response = await fetch(listUrl, {
      headers: { "Authorization": "Bearer " + accessToken }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({ error: "Failed to list files: " + errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({
        files: data.files || [],
        nextPageToken: data.nextPageToken || null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    const error = err as Error
    console.error("Drive files error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
