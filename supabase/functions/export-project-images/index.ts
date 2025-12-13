import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExportRequest {
  project_id: string
  format: 'csv' | 'zip' | 'google_drive'
  include_originals?: boolean
  only_successful?: boolean
}

// Helper to refresh Google Drive access token
async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  connectionId: string,
  refreshToken: string
): Promise<string> {
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

// Helper to upload a file to Google Drive
async function uploadToGoogleDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileBlob: Blob,
  mimeType: string
): Promise<{ id: string; name: string; error?: string } | { error: string }> {
  const boundary = '-------314159265358979323846'
  const delimiter = "\r\n--" + boundary + "\r\n"
  const closeDelim = "\r\n--" + boundary + "--"

  // Add _optimized suffix to filename to avoid overwriting originals
  const nameParts = fileName.split('.')
  const ext = nameParts.pop()
  const baseName = nameParts.join('.')
  const optimizedFileName = `${baseName}_optimized.${ext}`

  const metadata = {
    name: optimizedFileName,
    parents: [folderId],
    mimeType: mimeType
  }

  // Convert blob to base64
  const arrayBuffer = await fileBlob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ""
  const chunkSize = 32768
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  const base64Data = btoa(binary)

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelim

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to upload file:', fileName, errorText)
    return { error: `Google Drive API error: ${response.status} - ${errorText}` }
  }

  const result = await response.json()
  return { id: result.id, name: result.name }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ExportRequest = await req.json()
    const { project_id, format, only_successful = true } = body

    if (!project_id || !format) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id or format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, organizations!inner(id)')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single()

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get processing history for this project
    let query = supabase
      .from('processing_history')
      .select('*')
      .eq('project_id', project_id)
      .order('completed_at', { ascending: false })

    if (only_successful) {
      query = query.eq('status', 'success')
    }

    const { data: history, error: historyError } = await query

    if (historyError) {
      throw historyError
    }

    if (!history || history.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No processed images found for this project' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different export formats
    if (format === 'csv') {
      // Generate CSV content
      const headers = [
        'File Name',
        'Status',
        'Resolution',
        'Tokens Used',
        'Processing Time (sec)',
        'AI Model',
        'Original URL',
        'Optimized URL',
        'Completed At'
      ]

      const rows = history.map(item => [
        item.file_name || '',
        item.status,
        item.resolution || '',
        item.tokens_used || 0,
        item.processing_time_sec || 0,
        item.ai_model || 'flux-kontext-pro',
        item.original_url || '',
        item.optimized_url || '',
        item.completed_at
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Return CSV as data URL
      const base64 = btoa(unescape(encodeURIComponent(csvContent)))
      const dataUrl = `data:text/csv;base64,${base64}`

      return new Response(
        JSON.stringify({
          success: true,
          download_url: dataUrl,
          exported_count: history.length,
          format: 'csv'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (format === 'zip') {
      // For ZIP, we need to check if images are stored in Supabase storage
      const imagesWithStorage = history.filter(h => h.optimized_storage_path)

      if (imagesWithStorage.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'ZIP export requires images to be stored in Supabase storage. Your processed images are currently stored in Google Drive.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate signed URLs for each image
      const signedUrls = await Promise.all(
        imagesWithStorage.map(async (item) => {
          const { data } = await supabase.storage
            .from('optimized-images')
            .createSignedUrl(item.optimized_storage_path, 3600) // 1 hour expiry
          return {
            name: item.file_name,
            url: data?.signedUrl
          }
        })
      )

      return new Response(
        JSON.stringify({
          success: true,
          images: signedUrls.filter(s => s.url),
          exported_count: signedUrls.filter(s => s.url).length,
          message: 'Download each image individually or use a browser extension to batch download',
          format: 'zip'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (format === 'google_drive') {
      // Check if project has output folder configured
      if (!project.output_folder_id) {
        return new Response(
          JSON.stringify({
            error: 'No output folder configured for this project. Set an output folder in project settings.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user's Google Drive connection
      const { data: driveConnection } = await supabase
        .from('google_drive_connections')
        .select('*')
        .eq('organization_id', project.organization_id)
        .eq('is_active', true)
        .single()

      if (!driveConnection) {
        return new Response(
          JSON.stringify({
            error: 'No active Google Drive connection found. Connect Google Drive in Settings.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get valid access token
      let accessToken = driveConnection.access_token
      const tokenExpires = new Date(driveConnection.token_expires_at)

      if (tokenExpires < new Date()) {
        console.log("Token expired, refreshing...")
        accessToken = await refreshAccessToken(supabase, driveConnection.id, driveConnection.refresh_token)
      }

      // Filter images that have optimized URLs
      const imagesToExport = history.filter((h: { optimized_url?: string }) => h.optimized_url)

      if (imagesToExport.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No optimized images found to export'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Exporting ${imagesToExport.length} images to Google Drive folder: ${project.output_folder_id}`)

      // Upload each image to Google Drive
      let uploadedCount = 0
      const errors: string[] = []

      for (const item of imagesToExport) {
        try {
          // Download the optimized image
          const imageResponse = await fetch(item.optimized_url)
          if (!imageResponse.ok) {
            errors.push(`Failed to download: ${item.file_name}`)
            continue
          }

          const imageBlob = await imageResponse.blob()
          const mimeType = imageResponse.headers.get('content-type') || 'image/png'

          // Upload to Google Drive
          const result = await uploadToGoogleDrive(
            accessToken,
            project.output_folder_id,
            item.file_name || `image_${uploadedCount + 1}.png`,
            imageBlob,
            mimeType
          )

          if ('error' in result) {
            errors.push(`${item.file_name}: ${result.error}`)
          } else {
            uploadedCount++
            console.log(`Uploaded: ${result.name}`)
          }
        } catch (err) {
          const error = err as Error
          console.error(`Error processing ${item.file_name}:`, error.message)
          errors.push(`Error: ${item.file_name} - ${error.message}`)
        }
      }

      return new Response(
        JSON.stringify({
          success: uploadedCount > 0,
          exported_count: uploadedCount,
          total_images: imagesToExport.length,
          message: `${uploadedCount} of ${imagesToExport.length} images exported to Google Drive`,
          output_folder_url: project.output_folder_url,
          errors: errors.length > 0 ? errors : undefined,
          format: 'google_drive'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid export format. Use csv, zip, or google_drive.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
