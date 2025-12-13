# Image Optimizer Pro - Technical Architecture

**Document Version:** 1.0
**Created:** December 11, 2025
**Author:** Alex (Solutions Architect)
**Status:** Ready for Development

---

## 1. Architecture Overview

### 1.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   USERS                                      │
│                         (Jewelry E-commerce Sellers)                         │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React SPA)                               │
│                         Deployed on Vercel/Netlify                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │    Auth     │ │  Dashboard  │ │  Projects   │ │     Templates       │   │
│  │    Pages    │ │             │ │             │ │                     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │ Supabase Client SDK (supabase-js) │
                    └─────────────────┬─────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                              SUPABASE PLATFORM                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                           Supabase Auth                                  │ │
│ │    • Email/Password registration    • Session management (JWT)          │ │
│ │    • Password reset flow            • OAuth (Google - for Drive)        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                        PostgreSQL Database                               │ │
│ │    • Multi-tenant with RLS          • organizations, projects           │ │
│ │    • Encrypted at rest              • templates, storage_connections    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                         Edge Functions                                   │ │
│ │    • /storage/google/oauth          • /storage/google/folders           │ │
│ │    • /storage/google/files          • (Phase 2: /process-image)         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                           Realtime                                       │ │
│ │    • WebSocket subscriptions        • processing_queue changes          │ │
│ │    • Broadcast channels             • processing_history updates        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Google Drive API  │ │   Anthropic API     │ │     Kie.ai API      │
│   (Storage)         │ │   (Phase 2)         │ │     (Phase 2)       │
│                     │ │                     │ │                     │
│ • OAuth 2.0         │ │ • Claude Sonnet     │ │ • nano-banana-pro   │
│ • List folders      │ │ • Prompt generation │ │ • Image optimization│
│ • List files        │ │                     │ │                     │
│ • Get thumbnails    │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
              │
              ▼
┌─────────────────────┐
│    Stripe API       │
│    (Phase 2)        │
│                     │
│ • Checkout sessions │
│ • Webhooks          │
│ • Token purchases   │
└─────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.x | UI framework |
| | Vite | 5.x | Build tool |
| | TypeScript | 5.x | Type safety |
| | Tailwind CSS | 3.x | Styling |
| | shadcn/ui | latest | Component library |
| | React Router | 6.x | Routing |
| | TanStack Query | 5.x | Server state |
| | Zustand | 4.x | Client state |
| **Backend** | Supabase | latest | BaaS platform |
| | PostgreSQL | 15.x | Database |
| | Deno | latest | Edge Functions runtime |
| **External** | Google Drive API | v3 | File storage |
| | Anthropic API | latest | AI prompts (Phase 2) |
| | Kie.ai API | v1 | Image processing (Phase 2) |
| | Stripe API | latest | Payments (Phase 2) |

---

## 2. Database Architecture

### 2.1 Schema Gaps Identified

The existing migration is missing critical Phase 1 components:

| Gap | Table | Issue | Fix Required |
|-----|-------|-------|--------------|
| 1 | `organizations` | Missing `owner_id`, `settings` | Add columns |
| 2 | `storage_connections` | Table doesn't exist | Create table |
| 3 | `prompt_templates` | No system template seed data | Add seed migration |
| 4 | `user_organizations` | No INSERT policy for registration | Add policy |
| 5 | `organizations` | No INSERT policy for registration | Add policy |

### 2.2 Schema Fix Migration

Create `supabase/migrations/002_phase1_fixes.sql`:

```sql
-- ============================================
-- PHASE 1 SCHEMA FIXES
-- ============================================

-- 1. Add missing columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 2. Create storage_connections table
CREATE TABLE IF NOT EXISTS storage_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_drive', 'dropbox', etc.
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT, -- Google user ID
  provider_email TEXT, -- Google email
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- Index for storage connections
CREATE INDEX IF NOT EXISTS idx_storage_connections_org
  ON storage_connections(organization_id);

-- Enable RLS
ALTER TABLE storage_connections ENABLE ROW LEVEL SECURITY;

-- Storage connections policies
CREATE POLICY "Users can view org storage connections"
  ON storage_connections FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert org storage connections"
  ON storage_connections FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update org storage connections"
  ON storage_connections FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can delete org storage connections"
  ON storage_connections FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- 3. Allow users to create organizations (registration flow)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- 4. Allow users to insert themselves into user_organizations
CREATE POLICY "Users can create own membership"
  ON user_organizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Updated_at trigger for storage_connections
CREATE TRIGGER update_storage_connections_updated_at
  BEFORE UPDATE ON storage_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.3 System Templates Seed Migration

Create `supabase/migrations/003_seed_system_templates.sql`:

```sql
-- ============================================
-- SEED SYSTEM TEMPLATES
-- ============================================

INSERT INTO prompt_templates (
  name, category, subcategory, base_prompt, style, background, lighting,
  is_system, is_active
) VALUES
-- Jewelry - Rings
(
  'Jewelry Gold Premium',
  'Jewelry',
  'Rings',
  'Professional studio photography of a gold ring. Ultra-shiny premium gold finish with clean white studio background. Elegant soft shadows with bright studio lighting and crisp reflections. 85mm macro lens, f/11-f/16 deep sharpness, professional 3-point studio lighting, HDR, 8K macro detail. Keep exact design, shape, and proportions. Enhance shine, gloss, and polished metal reflections.',
  'Premium',
  'White',
  'Three-point studio',
  TRUE,
  TRUE
),
(
  'Jewelry Silver Elegant',
  'Jewelry',
  'Rings',
  'Professional studio photography of a silver ring. Polished silver finish with soft gradient studio background. Elegant lighting with gentle highlights. 85mm macro lens, f/11 sharpness, soft diffused lighting. Keep exact design and proportions. Enhance clarity and silver luster.',
  'Elegant',
  'Gradient',
  'Soft diffused',
  TRUE,
  TRUE
),
(
  'Jewelry Diamond Showcase',
  'Jewelry',
  'Rings',
  'Professional macro photography showcasing diamond ring. Brilliant diamond sparkle with clean white background. Studio lighting optimized for gemstone refraction. 100mm macro lens, f/16, HDR for diamond brilliance. Preserve exact cut and setting. Maximize sparkle and clarity.',
  'Premium',
  'White',
  'Diamond-optimized',
  TRUE,
  TRUE
),
-- Jewelry - Necklaces
(
  'Necklace Studio',
  'Jewelry',
  'Necklaces',
  'Professional product photography of necklace displayed elegantly. Clean white studio background with soft shadows. Full chain visible with pendant as focal point. 85mm lens, f/11, three-point lighting. Enhance metal shine and any gemstone brilliance.',
  'Premium',
  'White',
  'Three-point studio',
  TRUE,
  TRUE
),
-- Jewelry - Earrings
(
  'Earrings Macro',
  'Jewelry',
  'Earrings',
  'Professional macro photography of earrings. Detailed close-up showing craftsmanship. White background with subtle reflection surface. 100mm macro lens, f/16, ring light for even illumination. Enhance detail and metallic finish.',
  'Premium',
  'White',
  'Ring light',
  TRUE,
  TRUE
),
-- Jewelry - Bracelets
(
  'Bracelet Lifestyle',
  'Jewelry',
  'Bracelets',
  'Professional product photography of bracelet. Elegant display showing full design. Soft gradient background suggesting luxury. Natural lighting style with gentle shadows. 85mm lens, f/8. Enhance gold/silver richness.',
  'Lifestyle',
  'Gradient',
  'Natural soft',
  TRUE,
  TRUE
),
-- Jewelry - Watches
(
  'Watch Premium',
  'Jewelry',
  'Watches',
  'Professional studio photography of luxury watch. Clean white background with precise reflections. Focus on dial detail and case finish. 100mm macro, f/16, controlled studio lighting. Enhance metal polish and dial clarity.',
  'Premium',
  'White',
  'Controlled studio',
  TRUE,
  TRUE
),
-- General Product
(
  'General Product White',
  'Product',
  'General',
  'Professional e-commerce product photography. Clean white background, soft shadows, even lighting. Product centered and well-lit. Standard studio setup optimized for online retail. Enhance colors and details.',
  'Standard',
  'White',
  'Even studio',
  TRUE,
  TRUE
);
```

### 2.4 Complete Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                      │
│                         (Supabase Auth - managed)                            │
│─────────────────────────────────────────────────────────────────────────────│
│ id (PK)          │ UUID        │ User unique identifier                     │
│ email            │ TEXT        │ User email                                 │
│ created_at       │ TIMESTAMPTZ │ Registration timestamp                     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ 1:N
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           user_organizations                                 │
│                      (Multi-tenant membership)                               │
│─────────────────────────────────────────────────────────────────────────────│
│ user_id (PK,FK)  │ UUID        │ References auth.users                      │
│ organization_id  │ UUID        │ References organizations (PK,FK)           │
│ role             │ TEXT        │ 'owner', 'admin', 'member'                 │
│ created_at       │ TIMESTAMPTZ │ Join timestamp                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ N:1
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            organizations                                     │
│                           (Tenant/Workspace)                                 │
│─────────────────────────────────────────────────────────────────────────────│
│ id (PK)          │ UUID        │ Organization identifier                    │
│ name             │ TEXT        │ Organization name                          │
│ owner_id (FK)    │ UUID        │ References auth.users (creator)            │
│ settings         │ JSONB       │ Default resolution, template, etc.         │
│ created_at       │ TIMESTAMPTZ │                                            │
│ updated_at       │ TIMESTAMPTZ │                                            │
└───────┬─────────────────────────────────────────────────┬───────────────────┘
        │                                                 │
        │ 1:N                                             │ 1:N
        ▼                                                 ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│           projects                │     │       storage_connections         │
│      (Optimization project)       │     │    (Google Drive, Dropbox)        │
│───────────────────────────────────│     │───────────────────────────────────│
│ id (PK)                           │     │ id (PK)                           │
│ organization_id (FK)              │     │ organization_id (FK)              │
│ name                              │     │ user_id (FK)                      │
│ template_id (FK) ─────────────┐   │     │ provider                          │
│ input_folder_id               │   │     │ access_token (encrypted)          │
│ input_folder_url              │   │     │ refresh_token (encrypted)         │
│ output_folder_id              │   │     │ token_expires_at                  │
│ output_folder_url             │   │     │ provider_user_id                  │
│ custom_prompt                 │   │     │ provider_email                    │
│ status                        │   │     │ metadata                          │
│ resolution                    │   │     │ created_at                        │
│ created_at                    │   │     │ updated_at                        │
│ updated_at                    │   │     └───────────────────────────────────┘
└───────────────────────────────┼───┘
                                │
                                │ N:1
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          prompt_templates                                    │
│               (System + Organization templates)                              │
│─────────────────────────────────────────────────────────────────────────────│
│ id (PK)          │ UUID        │ Template identifier                        │
│ organization_id  │ UUID (NULL) │ NULL = system template                     │
│ name             │ TEXT        │ Template name                              │
│ category         │ TEXT        │ Jewelry, Product, etc.                     │
│ subcategory      │ TEXT        │ Rings, Necklaces, etc.                     │
│ base_prompt      │ TEXT        │ AI prompt template                         │
│ style            │ TEXT        │ Premium, Elegant, etc.                     │
│ background       │ TEXT        │ White, Gradient, etc.                      │
│ lighting         │ TEXT        │ Lighting description                       │
│ is_system        │ BOOLEAN     │ TRUE = system template                     │
│ is_active        │ BOOLEAN     │ Template availability                      │
│ usage_count      │ INTEGER     │ Times used                                 │
│ created_at       │ TIMESTAMPTZ │                                            │
│ updated_at       │ TIMESTAMPTZ │                                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2 TABLES (Preview)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ processing_queue      │ Images waiting/processing                           │
│ processing_history    │ Completed optimizations                             │
│ token_accounts        │ Organization token balance                          │
│ token_transactions    │ Token purchase/usage log                            │
│ token_pricing         │ Cost per operation                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Architecture

### 3.1 API Design Principles

1. **Supabase Client Direct** - Use `supabase-js` for CRUD operations (leverages RLS)
2. **Edge Functions** - For complex operations requiring server logic
3. **RESTful conventions** - Standard HTTP methods and status codes
4. **Type safety** - Generated types from database schema

### 3.2 Phase 1 API Specification

#### 3.2.1 Authentication (Supabase Auth - No Edge Functions needed)

```typescript
// Frontend uses Supabase client directly
const { data, error } = await supabase.auth.signUp({ email, password });
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
const { data, error } = await supabase.auth.signOut();
const { data, error } = await supabase.auth.resetPasswordForEmail(email);
const { data: { user } } = await supabase.auth.getUser();
```

#### 3.2.2 Organizations (Direct Supabase Client)

```typescript
// Create organization (after registration)
const { data, error } = await supabase
  .from('organizations')
  .insert({ name, owner_id: user.id })
  .select()
  .single();

// Then add user to organization
await supabase
  .from('user_organizations')
  .insert({ user_id: user.id, organization_id: data.id, role: 'owner' });

// Get user's organizations
const { data } = await supabase
  .from('organizations')
  .select('*, user_organizations!inner(role)')
  .eq('user_organizations.user_id', user.id);

// Update organization
const { data } = await supabase
  .from('organizations')
  .update({ name, settings })
  .eq('id', orgId);
```

#### 3.2.3 Projects (Direct Supabase Client)

```typescript
// List projects
const { data } = await supabase
  .from('projects')
  .select('*, prompt_templates(name)')
  .eq('organization_id', orgId)
  .order('updated_at', { ascending: false });

// Create project
const { data } = await supabase
  .from('projects')
  .insert({
    organization_id: orgId,
    name,
    resolution: '2K',
    status: 'draft'
  })
  .select()
  .single();

// Update project
const { data } = await supabase
  .from('projects')
  .update({ name, template_id, resolution, input_folder_id, output_folder_id })
  .eq('id', projectId);

// Delete project
await supabase.from('projects').delete().eq('id', projectId);
```

#### 3.2.4 Templates (Direct Supabase Client)

```typescript
// List templates (system + org)
const { data } = await supabase
  .from('prompt_templates')
  .select('*')
  .or(`is_system.eq.true,organization_id.eq.${orgId}`)
  .eq('is_active', true)
  .order('category');

// Create custom template
const { data } = await supabase
  .from('prompt_templates')
  .insert({
    organization_id: orgId,
    name,
    category,
    subcategory,
    base_prompt,
    style,
    background,
    lighting,
    is_system: false,
    created_by: user.id
  })
  .select()
  .single();

// Update template
const { data } = await supabase
  .from('prompt_templates')
  .update({ name, base_prompt, ...fields })
  .eq('id', templateId)
  .eq('is_system', false); // Can't update system templates

// Delete template
await supabase
  .from('prompt_templates')
  .delete()
  .eq('id', templateId)
  .eq('is_system', false);
```

#### 3.2.5 Storage Connections (Edge Functions Required)

Google Drive OAuth requires server-side handling for security.

**Edge Function: `storage-google-oauth`**

```typescript
// supabase/functions/storage-google-oauth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI')!

serve(async (req) => {
  const url = new URL(req.url)
  const action = url.pathname.split('/').pop()

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  // Get authenticated user
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers
    })
  }

  // Action: initiate - Generate OAuth URL
  if (action === 'initiate') {
    const { organization_id } = await req.json()

    const state = btoa(JSON.stringify({
      user_id: user.id,
      organization_id,
      timestamp: Date.now()
    }))

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    return new Response(JSON.stringify({ url: authUrl.toString() }), { headers })
  }

  // Action: callback - Exchange code for tokens
  if (action === 'callback') {
    const { code, state } = await req.json()

    // Verify state
    const stateData = JSON.parse(atob(state))
    if (stateData.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Invalid state' }), {
        status: 400, headers
      })
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      return new Response(JSON.stringify({ error: tokens.error }), {
        status: 400, headers
      })
    }

    // Get Google user info
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    const googleUser = await userInfoResponse.json()

    // Store connection (upsert)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await serviceClient
      .from('storage_connections')
      .upsert({
        organization_id: stateData.organization_id,
        user_id: user.id,
        provider: 'google_drive',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        provider_user_id: googleUser.id,
        provider_email: googleUser.email
      }, { onConflict: 'organization_id,provider' })
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers
      })
    }

    return new Response(JSON.stringify({ success: true, connection: data }), { headers })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers
  })
})
```

**Edge Function: `storage-google-drive`**

```typescript
// supabase/functions/storage-google-drive/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  }

  const { organization_id } = await req.json()

  // Get storage connection
  const { data: connection } = await supabase
    .from('storage_connections')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('provider', 'google_drive')
    .single()

  if (!connection) {
    return new Response(JSON.stringify({ error: 'No Google Drive connection' }), {
      status: 404, headers
    })
  }

  // Check if token needs refresh
  let accessToken = connection.access_token
  if (new Date(connection.token_expires_at) < new Date()) {
    // Refresh token
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const newTokens = await refreshResponse.json()
    accessToken = newTokens.access_token

    // Update stored token
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await serviceClient
      .from('storage_connections')
      .update({
        access_token: newTokens.access_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      })
      .eq('id', connection.id)
  }

  // Action: list-folders
  if (action === 'list-folders') {
    const parentId = url.searchParams.get('parent_id') || 'root'

    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `q='${parentId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false` +
      `&fields=files(id,name,mimeType)` +
      `&orderBy=name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const data = await driveResponse.json()
    return new Response(JSON.stringify({ folders: data.files || [] }), { headers })
  }

  // Action: list-files (images only)
  if (action === 'list-files') {
    const folderId = url.searchParams.get('folder_id')
    const pageToken = url.searchParams.get('page_token')

    if (!folderId) {
      return new Response(JSON.stringify({ error: 'folder_id required' }), {
        status: 400, headers
      })
    }

    let apiUrl = `https://www.googleapis.com/drive/v3/files?` +
      `q='${folderId}'+in+parents+and+(mimeType+contains+'image/')+and+trashed=false` +
      `&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,size)` +
      `&pageSize=20` +
      `&orderBy=name`

    if (pageToken) {
      apiUrl += `&pageToken=${pageToken}`
    }

    const driveResponse = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    const data = await driveResponse.json()
    return new Response(JSON.stringify({
      files: data.files || [],
      nextPageToken: data.nextPageToken
    }), { headers })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers
  })
})
```

---

## 4. Frontend Architecture

### 4.1 Project Structure

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Root component with routing
├── index.css                   # Global styles (Tailwind)
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Layout.tsx          # Main app layout with sidebar
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── Header.tsx          # Top header with org selector
│   │   └── ProtectedRoute.tsx  # Auth guard component
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordForm.tsx
│   │
│   ├── organization/
│   │   ├── CreateOrgForm.tsx
│   │   ├── OrgSettings.tsx
│   │   └── OrgSelector.tsx     # Dropdown to switch orgs (Phase 2)
│   │
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectForm.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── ImageGrid.tsx       # Display folder images
│   │
│   ├── templates/
│   │   ├── TemplateList.tsx
│   │   ├── TemplateCard.tsx
│   │   ├── TemplateForm.tsx
│   │   └── TemplatePreview.tsx
│   │
│   ├── storage/
│   │   ├── GoogleDriveConnect.tsx
│   │   ├── FolderBrowser.tsx
│   │   ├── FolderSelector.tsx
│   │   └── ConnectionStatus.tsx
│   │
│   └── common/
│       ├── EmptyState.tsx
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
│
├── pages/
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   └── ResetPassword.tsx
│   │
│   ├── onboarding/
│   │   └── CreateOrganization.tsx
│   │
│   ├── Dashboard.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Templates.tsx
│   ├── Settings.tsx
│   ├── Queue.tsx               # Phase 2 placeholder
│   └── History.tsx             # Phase 2 placeholder
│
├── hooks/
│   ├── useAuth.ts              # Auth state and methods
│   ├── useOrganization.ts      # Current org context
│   ├── useProjects.ts          # Project CRUD operations
│   ├── useTemplates.ts         # Template CRUD operations
│   ├── useGoogleDrive.ts       # Drive connection and browsing
│   └── useToast.ts             # Toast notifications
│
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── api.ts                  # Edge function calls
│   └── utils.ts                # Utility functions
│
├── stores/
│   ├── authStore.ts            # Auth state (Zustand)
│   └── organizationStore.ts    # Current org state
│
├── types/
│   ├── database.ts             # Generated Supabase types
│   └── index.ts                # Additional app types
│
└── constants/
    ├── routes.ts               # Route definitions
    └── config.ts               # App configuration
```

### 4.2 Component Hierarchy

```
<App>
├── <BrowserRouter>
│   ├── <Routes>
│   │   │
│   │   ├── /login → <Login>
│   │   │            └── <LoginForm>
│   │   │
│   │   ├── /register → <Register>
│   │   │               └── <RegisterForm>
│   │   │
│   │   ├── /forgot-password → <ForgotPassword>
│   │   │                      └── <ForgotPasswordForm>
│   │   │
│   │   ├── /reset-password → <ResetPassword>
│   │   │                     └── <ResetPasswordForm>
│   │   │
│   │   ├── /onboarding/create-org → <CreateOrganization>
│   │   │                            └── <CreateOrgForm>
│   │   │
│   │   └── /* (Protected Routes) → <ProtectedRoute>
│   │                                └── <Layout>
│   │                                    ├── <Sidebar>
│   │                                    ├── <Header>
│   │                                    │   └── <OrgSelector>
│   │                                    │
│   │                                    └── <Outlet> (Page Content)
│   │                                        │
│   │                                        ├── / → <Dashboard>
│   │                                        │       ├── <StatsCards>
│   │                                        │       ├── <QuickActions>
│   │                                        │       └── <RecentProjects>
│   │                                        │
│   │                                        ├── /projects → <Projects>
│   │                                        │               ├── <ProjectList>
│   │                                        │               │   └── <ProjectCard>[]
│   │                                        │               └── <ProjectForm> (modal)
│   │                                        │
│   │                                        ├── /projects/:id → <ProjectDetail>
│   │                                        │                   ├── <ProjectHeader>
│   │                                        │                   ├── <FolderSelector>
│   │                                        │                   └── <ImageGrid>
│   │                                        │
│   │                                        ├── /templates → <Templates>
│   │                                        │                ├── <TemplateList>
│   │                                        │                │   └── <TemplateCard>[]
│   │                                        │                └── <TemplateForm> (modal)
│   │                                        │
│   │                                        └── /settings → <Settings>
│   │                                                        ├── <ProfileSettings>
│   │                                                        ├── <OrgSettings>
│   │                                                        └── <ConnectionStatus>
│   │
│   └── <Toaster> (Global toast notifications)
```

### 4.3 State Management

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'auth-storage' }
  )
)

// stores/organizationStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

interface OrganizationState {
  currentOrg: Organization | null
  setCurrentOrg: (org: Organization | null) => void
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      currentOrg: null,
      setCurrentOrg: (currentOrg) => set({ currentOrg }),
    }),
    { name: 'org-storage' }
  )
)
```

### 4.4 Data Fetching with TanStack Query

```typescript
// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganizationStore } from '@/stores/organizationStore'

export function useProjects() {
  const { currentOrg } = useOrganizationStore()
  const queryClient = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return []
      const { data, error } = await supabase
        .from('projects')
        .select('*, prompt_templates(name)')
        .eq('organization_id', currentOrg.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!currentOrg,
  })

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          organization_id: currentOrg!.id,
          name,
          status: 'draft',
          resolution: '2K'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    createProject,
  }
}
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │  Supabase Auth  │     │    PostgreSQL   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. signUp(email,pw)  │                       │
         │──────────────────────>│                       │
         │                       │  2. Create user       │
         │                       │──────────────────────>│
         │                       │                       │
         │  3. Return session    │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  4. Create org        │                       │
         │  (with JWT in header) │                       │
         │─────────────────────────────────────────────>│
         │                       │                       │
         │                       │  5. RLS validates JWT │
         │                       │  and allows INSERT    │
         │                       │                       │
         │  6. Org created       │                       │
         │<─────────────────────────────────────────────│
         │                       │                       │
```

### 5.2 Row Level Security Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `organizations` | User is member | Authenticated | User is member | User is owner |
| `user_organizations` | Own membership | Own membership | - | - |
| `projects` | Org member | Org member | Org member | Org member |
| `prompt_templates` | System OR Org | Org member | Org (non-system) | Org (non-system) |
| `storage_connections` | Org member | Org member | Org member | Org member |
| `processing_queue` | Org member | Org member | Org member | Org member |
| `processing_history` | Org member | Org member | - | - |
| `token_accounts` | Org member | - | - | - |
| `token_transactions` | Org member | - | - | - |

### 5.3 API Security

| Measure | Implementation |
|---------|----------------|
| Authentication | JWT via Supabase Auth |
| Authorization | RLS policies on all tables |
| Rate limiting | Supabase default + Edge Function limits |
| Input validation | Zod schemas on frontend + DB constraints |
| XSS prevention | React's built-in escaping |
| CSRF protection | SameSite cookies |
| Secrets | Environment variables only |

---

## 6. Deployment Architecture

### 6.1 Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION                                      │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  ┌─────────────────────┐          ┌─────────────────────────────────────┐  │
│  │   Vercel / Netlify  │          │           Supabase Cloud            │  │
│  │   ───────────────   │          │   ─────────────────────────────     │  │
│  │                     │          │                                     │  │
│  │   React SPA         │  ──────> │   Auth    │ Database │ Functions   │  │
│  │   Static hosting    │  HTTPS   │   ────    │ ──────── │ ─────────   │  │
│  │   CDN delivery      │          │           │          │             │  │
│  │                     │          │   JWT     │ Postgres │ Deno        │  │
│  │   Environment:      │          │   OAuth   │ RLS      │ Edge        │  │
│  │   - VITE_SUPABASE_* │          │           │          │             │  │
│  │                     │          │   Secrets stored in Supabase       │  │
│  └─────────────────────┘          │   vault (GOOGLE_*, etc.)           │  │
│                                   └─────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Environment Variables

**Frontend (.env)**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_URL=https://app.imageoptimizerpro.com
```

**Supabase Secrets (via Dashboard or CLI)**
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://xxx.supabase.co/functions/v1/storage-google-oauth/callback

# Phase 2
ANTHROPIC_API_KEY=sk-ant-...
KIE_API_KEY=kie_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 7. Architecture Decision Records (ADRs)

### ADR-001: Supabase as Backend Platform

**Status:** Accepted

**Context:** Need a backend platform that provides auth, database, real-time, and serverless functions with minimal operational overhead.

**Decision:** Use Supabase as the primary backend platform.

**Consequences:**
- (+) Integrated auth, database, realtime, storage
- (+) Row Level Security for multi-tenancy
- (+) Generated TypeScript types
- (+) Generous free tier for development
- (-) Vendor lock-in for some features
- (-) Edge Function limitations (50s timeout)

### ADR-002: Direct Supabase Client vs REST API

**Status:** Accepted

**Context:** Choose between using `supabase-js` client directly or building a REST API layer.

**Decision:** Use `supabase-js` directly for CRUD operations, Edge Functions only for complex logic.

**Consequences:**
- (+) Simpler architecture, less code
- (+) Automatic RLS enforcement
- (+) Real-time subscriptions built-in
- (-) Business logic scattered between frontend and Edge Functions
- (-) Harder to test without Supabase running

### ADR-003: Google Drive OAuth via Edge Functions

**Status:** Accepted

**Context:** Google Drive OAuth requires server-side token exchange for security.

**Decision:** Handle OAuth flow in Edge Functions, store tokens encrypted in database.

**Consequences:**
- (+) Secure token handling
- (+) Automatic token refresh
- (-) Additional Edge Functions to maintain
- (-) Google OAuth complexity

### ADR-004: Zustand + TanStack Query for State

**Status:** Accepted

**Context:** Need state management for auth/org state and server data caching.

**Decision:** Zustand for client state (auth, current org), TanStack Query for server state.

**Consequences:**
- (+) Clear separation of client vs server state
- (+) Automatic caching and refetching
- (+) Lightweight bundle size
- (-) Two libraries to learn

### ADR-005: No Teams in Phase 1

**Status:** Accepted

**Context:** PRD specified teams in Phase 1, but BA/PM analysis determined not needed for MVP.

**Decision:** Remove team management from Phase 1, single owner per organization.

**Consequences:**
- (+) Faster Phase 1 delivery
- (+) Simpler RLS policies
- (-) Manual migration when adding teams later

---

## 8. Phase 2 Preview

### 8.1 Processing Pipeline Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2: PROCESSING FLOW                            │
└───────────────────────────────────────────────────────────────────────────┘

User selects images → Frontend
         │
         ▼
┌─────────────────────┐
│ Check token balance │ → Insufficient? → Show purchase modal
└─────────┬───────────┘
         │ Sufficient
         ▼
┌─────────────────────┐
│  Reserve tokens     │ → Insert into processing_queue
│  (optimistic)       │    status: 'queued'
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Edge Function:     │     │  Supabase Realtime  │
│  process-image      │────>│  Broadcast updates  │──> Frontend
│  (triggered by DB)  │     │  progress: 20%...   │    updates UI
└─────────┬───────────┘     └─────────────────────┘
         │
         ├── 1. Generate prompt (Claude API)
         │      status: 'processing', progress: 30%
         │
         ├── 2. Create Kie.ai task
         │      status: 'optimizing', progress: 50%
         │
         ├── 3. Poll for completion
         │      progress: 60%, 70%, 80%
         │
         ├── 4. Download result, upload to Drive
         │      progress: 90%
         │
         └── 5. Move to history, deduct tokens
                status: 'success', progress: 100%
```

### 8.2 Stripe Integration Flow

```
User clicks "Buy Tokens"
         │
         ▼
┌─────────────────────┐
│ Edge Function:      │
│ create-checkout     │ → Stripe Checkout Session
└─────────┬───────────┘
         │
         ▼
User completes payment on Stripe
         │
         ▼
┌─────────────────────┐
│ Stripe Webhook      │
│ → Edge Function     │ → payment_intent.succeeded
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ Credit tokens       │
│ Log transaction     │
└─────────────────────┘
```

---

## 9. Implementation Checklist

### Phase 1 Tasks

- [ ] **Database**
  - [ ] Apply migration 002 (schema fixes)
  - [ ] Apply migration 003 (system templates seed)
  - [ ] Verify RLS policies with test queries
  - [ ] Generate updated TypeScript types

- [ ] **Edge Functions**
  - [ ] `storage-google-oauth` - OAuth initiate/callback
  - [ ] `storage-google-drive` - List folders/files

- [ ] **Frontend - Auth**
  - [ ] Login page and form
  - [ ] Register page and form
  - [ ] Forgot password flow
  - [ ] Reset password flow
  - [ ] Auth state management

- [ ] **Frontend - Onboarding**
  - [ ] Create organization flow
  - [ ] Redirect logic for new users

- [ ] **Frontend - Layout**
  - [ ] Sidebar navigation
  - [ ] Header with org selector placeholder
  - [ ] Protected route wrapper

- [ ] **Frontend - Dashboard**
  - [ ] Stats cards (projects, templates count)
  - [ ] Quick actions
  - [ ] Recent projects list

- [ ] **Frontend - Projects**
  - [ ] Project list page
  - [ ] Project card component
  - [ ] Create project modal
  - [ ] Edit project page
  - [ ] Delete project with confirmation
  - [ ] Google Drive folder selector
  - [ ] Image grid for input folder

- [ ] **Frontend - Templates**
  - [ ] Template list page
  - [ ] Template card component
  - [ ] System template display
  - [ ] Create custom template
  - [ ] Edit/delete custom templates
  - [ ] Category filtering

- [ ] **Frontend - Settings**
  - [ ] Connected storage display
  - [ ] Org settings form

---

**Document Status:** Ready for Development

**Next Step:** Begin implementation with database migrations, then Edge Functions, then frontend.

