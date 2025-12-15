# CloudConvert Integration Plan for RAW File Conversion

## Problem
The `process-image` edge function fails with "Memory limit exceeded" when processing RAW files (CR2, NEF, ARW, DNG, etc.) because these files are 20-50MB and exceed Supabase Edge Function memory limits (~150MB).

## Solution
Integrate CloudConvert as a preprocessing step to convert RAW files to JPG before AI processing.

---

## Architecture

```
User uploads RAW (CR2) from Google Drive
           ↓
   processing_queue (status: queued)
           ↓
   process-image detects RAW file
           ↓
   Calls CloudConvert API to convert CR2 → JPG
           ↓
   CloudConvert webhook returns converted JPG URL
           ↓
   process-image continues with AI optimization
           ↓
   Final result saved to output folder
```

---

## Implementation Steps

### Step 1: CloudConvert Account Setup
- Sign up at https://cloudconvert.com
- Get API key from https://cloudconvert.com/dashboard/api/v2/keys
- Choose pricing tier (25 minutes free, then pay-per-use)
- Enable webhook support

### Step 2: Add Environment Variables
```
CLOUDCONVERT_API_KEY=your_api_key
CLOUDCONVERT_SANDBOX=false  # true for testing
```

### Step 3: Create CloudConvert Edge Function

**File:** `supabase/functions/cloudconvert-convert/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConvertRequest {
  queue_item_id: string
  input_url: string
  file_name: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { queue_item_id, input_url, file_name }: ConvertRequest = await req.json()

    // Determine output format
    const outputFormat = 'jpg'
    const outputFileName = file_name.replace(/\.[^.]+$/, `.${outputFormat}`)

    // Build CloudConvert job
    const job = {
      tasks: {
        'import-url': {
          operation: 'import/url',
          url: input_url
        },
        'convert': {
          operation: 'convert',
          input: 'import-url',
          output_format: outputFormat,
          quality: 95, // High quality for AI processing
          strip_metadata: false // Keep EXIF data
        },
        'export-url': {
          operation: 'export/url',
          input: 'convert'
        }
      },
      webhook_url: `${supabaseUrl}/functions/v1/cloudconvert-webhook?queue_item_id=${queue_item_id}`,
      webhook_events: ['job.finished', 'job.failed']
    }

    // Submit job to CloudConvert
    const response = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(job)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`CloudConvert error: ${error}`)
    }

    const jobResult = await response.json()

    // Update queue item with conversion job ID
    await supabase
      .from('processing_queue')
      .update({
        status: 'converting',
        task_id: `cc_${jobResult.data.id}`,
        generated_prompt: 'Converting RAW to JPG...'
      })
      .eq('id', queue_item_id)

    return new Response(
      JSON.stringify({ success: true, job_id: jobResult.data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('CloudConvert error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 4: Create CloudConvert Webhook Handler

**File:** `supabase/functions/cloudconvert-webhook/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const queueItemId = url.searchParams.get('queue_item_id')
    const body = await req.json()

    if (body.event === 'job.finished') {
      // Get the export task result
      const exportTask = body.job.tasks.find(t => t.name === 'export-url')

      if (exportTask?.result?.files?.[0]?.url) {
        const convertedUrl = exportTask.result.files[0].url

        // Update queue item with converted URL and trigger AI processing
        await supabase
          .from('processing_queue')
          .update({
            file_url: convertedUrl,
            status: 'queued', // Reset to queued for AI processing
            generated_prompt: null
          })
          .eq('id', queueItemId)

        // Trigger AI processing
        await fetch(`${supabaseUrl}/functions/v1/process-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ queue_item_id: queueItemId })
        })
      }
    } else if (body.event === 'job.failed') {
      await supabase
        .from('processing_queue')
        .update({
          status: 'failed',
          error_message: 'RAW conversion failed: ' + (body.job.error?.message || 'Unknown error')
        })
        .eq('id', queueItemId)
    }

    return new Response('ok', { status: 200 })

  } catch (error) {
    console.error('CloudConvert webhook error:', error)
    return new Response('error', { status: 500 })
  }
})
```

### Step 5: Update process-image to Detect RAW and Offload

**Modify:** `supabase/functions/process-image/index.ts`

```typescript
// Add at the start of processing
const rawExtensions = ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raw', 'orf', 'rw2', 'pef', 'srw']
const inputFileExt = queueItem.file_name?.split('.').pop()?.toLowerCase() || ''

if (rawExtensions.includes(inputFileExt)) {
  // Instead of failing, offload to CloudConvert
  console.log(`[process-image] RAW file detected, offloading to CloudConvert`)

  const convertResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cloudconvert-convert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      queue_item_id: queueItemId,
      input_url: inputUrl,
      file_name: queueItem.file_name
    })
  })

  if (!convertResponse.ok) {
    throw new Error('Failed to initiate RAW conversion')
  }

  return new Response(
    JSON.stringify({
      status: 'converting',
      message: 'RAW file sent to CloudConvert for preprocessing'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### Step 6: Add Database Migration

**File:** `supabase/migrations/016_raw_conversion_support.sql`

```sql
-- Add converting status to processing_queue
-- No schema change needed since status is TEXT and flexible

-- Add index for better conversion tracking
CREATE INDEX IF NOT EXISTS idx_queue_converting
  ON processing_queue(status)
  WHERE status = 'converting';

-- Comment for documentation
COMMENT ON COLUMN processing_queue.task_id IS 'AI task ID or CloudConvert job ID (prefixed with cc_)';
```

### Step 7: Update UI to Show Conversion Status

**Modify:** `ImageQueueGrid.tsx` status config:

```typescript
if (image.status === 'converting') return {
  border: 'border-purple-400 border-2',
  bg: 'bg-purple-500',
  icon: <RefreshCw className="h-3 w-3 text-white animate-spin" />,
  label: 'Converting'
}
```

---

## Cost Estimation

| Format | Avg Size | Conversion Time | Cost (CloudConvert) |
|--------|----------|-----------------|---------------------|
| CR2    | 25 MB    | ~10 sec         | ~0.5 credits       |
| NEF    | 30 MB    | ~12 sec         | ~0.6 credits       |
| ARW    | 24 MB    | ~10 sec         | ~0.5 credits       |
| DNG    | 40 MB    | ~15 sec         | ~0.75 credits      |

**Pricing:** 500 credits = $8 (prepaid), or ~$0.02 per RAW conversion

---

## Alternative: Self-Hosted Conversion

For high-volume usage, consider a dedicated conversion server:

1. Deploy a Docker container with LibRaw/dcraw
2. Use Supabase Realtime to queue jobs
3. Push converted files to Supabase Storage
4. Trigger AI processing via webhook

This avoids per-conversion costs but requires server management.

---

## Timeline

| Phase | Task | Effort |
|-------|------|--------|
| 1 | CloudConvert account + API key | 10 min |
| 2 | Create conversion edge functions | 2 hours |
| 3 | Update process-image logic | 30 min |
| 4 | Add UI conversion status | 30 min |
| 5 | Testing with CR2/NEF files | 1 hour |

**Total: ~4 hours**

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/cloudconvert-convert/index.ts` | Submit RAW to CloudConvert |
| `supabase/functions/cloudconvert-webhook/index.ts` | Handle conversion callback |
| `supabase/migrations/016_raw_conversion_support.sql` | Add converting status index |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/process-image/index.ts` | Detect RAW, call CloudConvert instead of failing |
| `src/components/projects/modal/ImageQueueGrid.tsx` | Add "Converting" status styling |
| `.env` | Add `CLOUDCONVERT_API_KEY` |
