# Product Requirements Document: Image Editing Studio

## Executive Summary

Integrate **IOPaint (AI)** and **Imaginary (Fast Transforms)** as server-side image processing engines to deliver professional-grade background removal and fast image transformations. This eliminates external API costs while providing the jewelry store customer (30K products, daily studio shoots) with the complete solution they need.

---

## Business Context

### Target Customer Profile
- **Industry**: Jewelry e-commerce (Shopify)
- **Scale**: 30,000+ products
- **Workflow**: Daily studio photography sessions
- **Pain Points**:
  - Manual background removal is time-consuming
  - Inconsistent image styling across catalog
  - Slow product listing workflow
  - No automation for Shopify sync

### AppSumo Launch Timeline
- **Target**: 1-2 weeks
- **Requirements**: Working background removal, Stripe integration, user management

---

## Technical Architecture

### Processing Engines

#### 1. IOPaint (AI Engine)
**Purpose**: AI-powered image editing operations

| Capability | Description | Use Case |
|------------|-------------|----------|
| Background Removal | Segment and remove backgrounds using SAM/LaMa | Product photos |
| Object Inpainting | Fill removed areas with AI-generated content | Clean backgrounds |
| Object Removal | Remove unwanted elements from images | Jewelry enhancement |
| Image Restoration | Upscale and enhance image quality | Old catalog images |

**Integration Approach**:
```
[Frontend] → [Supabase Edge Function] → [IOPaint Server] → [Storage]
```

#### 2. Imaginary (Fast Transforms)
**Purpose**: High-performance image transformations

| Operation | Parameters | Use Case |
|-----------|------------|----------|
| `resize` | width, height, type | Product thumbnails |
| `crop` | width, height, x, y | Focus on jewelry piece |
| `rotate` | degrees (90, 180, 270) | Orientation fix |
| `flip` | direction (h, v) | Mirror images |
| `blur` | sigma | Background effects |
| `sharpen` | sigma | Jewelry detail enhancement |
| `watermark` | text, opacity, position | Brand protection |
| `convert` | format (webp, avif, png, jpg) | Optimization |
| `thumbnail` | width, height | Grid previews |
| `zoom` | factor | Detail view |
| `fit` | width, height, mode | Shopify requirements |

**Integration Approach**:
```
[Frontend] → [Supabase Edge Function] → [Imaginary Server] → [Storage]
```

---

## Feature Specifications

### F1: Background Removal (Priority: Critical)

**User Story**: As a jewelry store owner, I want to remove backgrounds from my product photos in bulk so I can maintain consistent white backgrounds across my catalog.

**Workflow**:
1. User uploads images or selects from existing queue
2. System sends to IOPaint for segmentation
3. Background is removed/replaced with solid color or transparent
4. Processed image saved to storage
5. Optional: Push to Shopify automatically

**UI Components**:
```
┌─────────────────────────────────────────────────────────┐
│ Background Removal                                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │                 │  │                 │                │
│ │   Original      │→ │   Processed     │                │
│ │                 │  │                 │                │
│ └─────────────────┘  └─────────────────┘                │
│                                                          │
│ Background: ○ Transparent  ● White  ○ Custom Color      │
│                                                          │
│ [ Apply to Selection (24 images) ]                       │
└─────────────────────────────────────────────────────────┘
```

**API Endpoint**:
```typescript
// POST /functions/v1/image-process
{
  action: 'remove_background',
  image_urls: string[],
  options: {
    background: 'transparent' | 'white' | { color: string },
    quality: 'draft' | 'standard' | 'high',
    auto_push_shopify: boolean
  }
}
```

**Token Cost**: 2 tokens per image (AI processing)

---

### F2: Fast Image Transforms (Priority: High)

**User Story**: As a store owner, I want to quickly resize, crop, and optimize my product images to meet Shopify's requirements without leaving the app.

**Available Operations**:

```typescript
interface TransformOperation {
  // Resize
  resize?: { width: number; height: number; type: 'fit' | 'fill' | 'exact' }

  // Crop
  crop?: { width: number; height: number; x?: number; y?: number }

  // Orientation
  rotate?: 90 | 180 | 270
  flip?: 'horizontal' | 'vertical'

  // Effects
  blur?: { sigma: number }
  sharpen?: { sigma: number }

  // Branding
  watermark?: {
    text: string
    opacity: number
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  }

  // Output
  convert?: 'webp' | 'avif' | 'png' | 'jpg'
  quality?: number // 1-100
}
```

**Quick Actions Panel**:
```
┌─────────────────────────────────────────────────────────┐
│ Quick Transforms                                         │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 🔄 Resize │ │ ✂️ Crop   │ │ 🔃 Rotate │ │ 🪞 Flip   │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 🌫️ Blur   │ │ 🔍 Sharpen│ │ 💧 Watermark│ │ 📦 Convert │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Token Cost**: 0.5 tokens per operation (fast processing)

---

### F3: Batch Processing Pipeline

**User Story**: As a high-volume seller, I want to apply multiple transformations to hundreds of images at once.

**Pipeline Configuration**:
```typescript
interface ProcessingPipeline {
  name: string
  steps: Array<{
    engine: 'iopaint' | 'imaginary'
    operation: string
    params: Record<string, unknown>
  }>
  output: {
    format: string
    quality: number
    naming: 'original' | 'sequential' | 'custom'
  }
}

// Example: Jewelry Product Pipeline
const jewelryPipeline: ProcessingPipeline = {
  name: 'Jewelry Product Ready',
  steps: [
    { engine: 'iopaint', operation: 'remove_background', params: { background: 'white' } },
    { engine: 'imaginary', operation: 'resize', params: { width: 2048, height: 2048, type: 'fit' } },
    { engine: 'imaginary', operation: 'sharpen', params: { sigma: 0.5 } },
    { engine: 'imaginary', operation: 'convert', params: { format: 'webp', quality: 90 } }
  ],
  output: { format: 'webp', quality: 90, naming: 'original' }
}
```

---

## Server Infrastructure

### IOPaint Deployment
```yaml
# docker-compose.iopaint.yml
services:
  iopaint:
    image: cwq1913/iopaint:latest
    ports:
      - "8080:8080"
    volumes:
      - ./models:/app/models
    environment:
      - DEVICE=cuda  # or cpu
      - MODEL=lama   # or sam, sd
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Imaginary Deployment
```yaml
# docker-compose.imaginary.yml
services:
  imaginary:
    image: h2non/imaginary:latest
    ports:
      - "9000:9000"
    environment:
      - PORT=9000
      - MALLOC_ARENA_MAX=2
    command: -concurrency 20 -enable-url-source
```

### Supabase Edge Function
```typescript
// supabase/functions/image-process/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const IOPAINT_URL = Deno.env.get('IOPAINT_URL')
const IMAGINARY_URL = Deno.env.get('IMAGINARY_URL')

serve(async (req) => {
  const { action, image_urls, options } = await req.json()

  switch (action) {
    case 'remove_background':
      return handleBackgroundRemoval(image_urls, options)
    case 'transform':
      return handleTransform(image_urls, options)
    case 'pipeline':
      return handlePipeline(image_urls, options)
    default:
      return new Response('Unknown action', { status: 400 })
  }
})

async function handleBackgroundRemoval(urls: string[], options: any) {
  const results = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(`${IOPAINT_URL}/inpaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: url,
          mask: 'auto', // Auto-detect foreground
          model: 'lama'
        })
      })
      return response.json()
    })
  )
  return new Response(JSON.stringify({ results }))
}

async function handleTransform(urls: string[], options: any) {
  const { operation, params } = options
  const results = await Promise.all(
    urls.map(async (url) => {
      const queryParams = new URLSearchParams({ url, ...params })
      const response = await fetch(`${IMAGINARY_URL}/${operation}?${queryParams}`)
      // Upload result to storage and return URL
      return uploadToStorage(await response.arrayBuffer())
    })
  )
  return new Response(JSON.stringify({ results }))
}
```

---

## Database Schema Updates

```sql
-- Processing jobs table extension
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS
  pipeline_config JSONB,
  engine VARCHAR(20) DEFAULT 'imaginary',
  operations JSONB DEFAULT '[]';

-- Processing history extension
ALTER TABLE processing_history ADD COLUMN IF NOT EXISTS
  operations_applied JSONB DEFAULT '[]',
  processing_time_ms INTEGER,
  tokens_consumed DECIMAL(10, 2);

-- Saved pipelines
CREATE TABLE IF NOT EXISTS processing_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  output_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_pipelines_org ON processing_pipelines(org_id);
```

---

## UI/UX Integration

### Studio Page Enhancement
Add new tab for "Edit Mode" alongside existing Quick/Advanced modes:

```
┌─────────────────────────────────────────────────────────┐
│ Studio                                                   │
├─────────────────────────────────────────────────────────┤
│  [Quick Mode]  [Advanced Mode]  [Edit Mode] ← NEW        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │             │  │ Operations                       │  │
│  │   Preview   │  ├─────────────────────────────────┤  │
│  │             │  │ ☑ Remove Background              │  │
│  │             │  │   Background: White ▼            │  │
│  │             │  │                                  │  │
│  │             │  │ ☑ Resize                         │  │
│  │             │  │   2048 x 2048 px                │  │
│  │             │  │                                  │  │
│  │             │  │ ☐ Sharpen                        │  │
│  │             │  │ ☐ Add Watermark                  │  │
│  └─────────────┘  └─────────────────────────────────┘  │
│                                                          │
│  Estimated cost: 2.5 tokens × 24 images = 60 tokens     │
│                                                          │
│  [ Save as Pipeline ]      [ Process 24 Images ]         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Infrastructure (Days 1-2)
- [ ] Deploy IOPaint server with GPU support
- [ ] Deploy Imaginary server
- [ ] Create Supabase Edge Function for routing
- [ ] Add database schema migrations

### Phase 2: Core Operations (Days 3-4)
- [ ] Implement background removal endpoint
- [ ] Implement basic transforms (resize, crop, rotate)
- [ ] Add token consumption tracking
- [ ] Create processing job queue integration

### Phase 3: UI Integration (Days 5-6)
- [ ] Add Edit Mode tab to Studio
- [ ] Build operation selector component
- [ ] Create live preview with before/after
- [ ] Add pipeline save/load functionality

### Phase 4: Batch & Automation (Day 7)
- [ ] Enable bulk selection processing
- [ ] Add pipeline templates
- [ ] Integrate with Shopify auto-push
- [ ] Add processing progress tracking

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Background removal accuracy | >95% | Manual QA sample |
| Processing time (single) | <5 seconds | Server logs |
| Processing time (batch 100) | <5 minutes | Server logs |
| User adoption | 80% of active users | Analytics |
| Token revenue from processing | +30% | Billing data |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| GPU costs | Start with CPU, upgrade based on demand |
| Processing queue overload | Implement rate limiting, priority queues |
| Quality issues | Add manual approval step option |
| Server downtime | Auto-scaling, health checks, failover |

---

## Appendix: API Reference

### IOPaint Endpoints
```
POST /inpaint
POST /remove-background
POST /upscale
GET /health
```

### Imaginary Endpoints
```
GET /resize?url=X&width=Y&height=Z
GET /crop?url=X&width=Y&height=Z&x=A&y=B
GET /rotate?url=X&rotate=90
GET /flip?url=X&type=h
GET /blur?url=X&sigma=Y
GET /sharpen?url=X&sigma=Y
GET /watermark?url=X&text=Y&opacity=Z
GET /convert?url=X&type=webp
GET /thumbnail?url=X&width=Y&height=Z
GET /zoom?url=X&factor=Y
GET /fit?url=X&width=Y&height=Z
GET /health
```
