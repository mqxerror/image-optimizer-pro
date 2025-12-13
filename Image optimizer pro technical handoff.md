# Image Optimizer Pro - Complete Technical Handoff Document

## For: BMAD Agent / Claude Code / Opus 4.5 Development

**Version:** 1.0  
**Date:** December 11, 2025  
**Author:** Technical Documentation from Working System  
**Purpose:** Full system rebuild with Supabase + Direct API integration

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Database Schema (Complete)](#3-database-schema-complete)
4. [API Endpoints (All 19 Webhooks)](#4-api-endpoints-all-19-webhooks)
5. [Core Processing Pipeline](#5-core-processing-pipeline)
6. [AI Integration Details](#6-ai-integration-details)
7. [Frontend Architecture (Lovable)](#7-frontend-architecture-lovable)
8. [Challenges Encountered & Solutions](#8-challenges-encountered--solutions)
9. [Known Bugs & Limitations](#9-known-bugs--limitations)
10. [New Architecture Recommendations](#10-new-architecture-recommendations)
11. [Supabase Migration Plan](#11-supabase-migration-plan)
12. [Direct Kie.ai Integration](#12-direct-kieai-integration)
13. [Development Roadmap](#13-development-roadmap)

---

# 1. EXECUTIVE SUMMARY

## What This System Does

Image Optimizer Pro is a SaaS platform that:
1. Takes product images (primarily jewelry) from Google Drive
2. Uses AI (Claude Sonnet 4.5) to generate optimal enhancement prompts
3. Sends images to Kie.ai's Nano Banana Pro model for optimization
4. Saves enhanced images back to Google Drive
5. Tracks all processing in a queue/history system
6. Provides a web dashboard for management

## Current Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend/API | n8n (self-hosted) | Workflow automation, webhooks |
| Database | NocoDB (self-hosted) | Data persistence |
| File Storage | Google Drive | Input/output images |
| AI - Prompts | Anthropic Claude Sonnet 4.5 | Generate optimization prompts |
| AI - Images | Kie.ai Nano Banana Pro | Image enhancement |
| Frontend | Lovable (React) | User dashboard |

## Target Tech Stack (New Build)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend/API | Supabase Edge Functions | API endpoints, business logic |
| Database | Supabase PostgreSQL | Data persistence with RLS |
| Auth | Supabase Auth | User authentication |
| File Storage | Supabase Storage | OR keep Google Drive |
| AI - Prompts | Direct Anthropic API | Generate optimization prompts |
| AI - Images | Direct Kie.ai API | Image enhancement |
| Frontend | React + Vite + Tailwind | User dashboard |
| Development | Claude Code + Opus 4.5 | AI-assisted development |

---

# 2. CURRENT ARCHITECTURE OVERVIEW

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Lovable)                              │
│         https://id-preview--fd91d733-9993-4304-9f72-67849b59fca5.lovable.app │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ REST API Calls
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           n8n WORKFLOW ENGINE                                │
│                  https://automator.pixelcraftedmedia.com                    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ 19 Webhook  │  │  Processing │  │  AI Agent   │  │   Kie.ai    │       │
│  │  Endpoints  │  │   Pipeline  │  │  (Claude)   │  │ Integration │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  Workflow ID: 7QFjMa4zxRoRvO2F                                              │
│  Total Nodes: 133                                                           │
│  Version: 145                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                     │                              │
                     │ NocoDB API                   │ External APIs
                     ▼                              ▼
┌───────────────────────────────┐    ┌───────────────────────────────────────┐
│         NocoDB Database       │    │           External Services            │
│  https://base.pixelcraftedmedia.com│    │                                       │
│                               │    │  ┌─────────────┐  ┌─────────────────┐ │
│  Base ID: poab6xzj9mlvde7     │    │  │ Google Drive│  │    Kie.ai       │ │
│                               │    │  │    API      │  │ api.kie.ai      │ │
│  Tables:                      │    │  └─────────────┘  └─────────────────┘ │
│  - Projects                   │    │                                       │
│  - Processing_Queue           │    │  ┌─────────────────────────────────┐ │
│  - Processing_History         │    │  │         Anthropic API           │ │
│  - Prompt_Templates           │    │  │   (Claude Sonnet 4.5)           │ │
│  - Settings                   │    │  └─────────────────────────────────┘ │
│  - Shopify_Products           │    │                                       │
└───────────────────────────────┘    └───────────────────────────────────────┘
```

## Data Flow

```
1. USER UPLOADS IMAGES TO GOOGLE DRIVE
         │
         ▼
2. USER CREATES PROJECT (links Drive folders)
         │
         ▼
3. USER SELECTS IMAGES FOR TRIAL/PROCESSING
         │
         ▼
4. IMAGES ADDED TO PROCESSING_QUEUE (status: queued)
         │
         ▼
5. WORKFLOW PICKS UP QUEUED ITEM
         │
         ├── Update status: processing (progress: 20%)
         │
         ▼
6. CLAUDE SONNET 4.5 GENERATES PROMPT
         │
         ├── Update status: optimizing (progress: 40%)
         │
         ▼
7. KIE.AI RECEIVES IMAGE + PROMPT
         │
         ├── Create task, get taskId
         ├── Poll for completion (every 15s, max 20 attempts)
         ├── Update progress: 50% → 75%
         │
         ▼
8. KIE.AI RETURNS OPTIMIZED IMAGE URL
         │
         ├── Update progress: 80%
         │
         ▼
9. DOWNLOAD & UPLOAD TO OUTPUT FOLDER
         │
         ├── Update progress: 100%
         │
         ▼
10. MOVE TO PROCESSING_HISTORY (status: success)
          │
          ├── Delete from queue
          │
          ▼
11. FRONTEND SHOWS RESULT
```

---

# 3. DATABASE SCHEMA (COMPLETE)

## 3.1 Projects Table

**Table ID:** `mrc11wgzyikhzas`

| Field | Type | Description |
|-------|------|-------------|
| Id | ID | Primary key (auto-increment) |
| Title | SingleLineText | Project name |
| input_folder_url | URL | Full Google Drive folder URL |
| input_folder_id | SingleLineText | Extracted folder ID |
| output_folder_url | URL | Full Google Drive output folder URL |
| output_folder_id | SingleLineText | Extracted folder ID |
| custom_prompt | LongText | User's custom prompt override |
| template_id | Number | FK to Prompt_Templates |
| status | SingleLineText | draft, active, completed |
| resolution | SingleLineText | 2K or 4K |
| trial_count | Number | Number of trial images allowed |
| trial_completed | Number | Number of trials completed |
| total_images | Number | Total images in project |
| processed_images | Number | Successfully processed count |
| failed_images | Number | Failed processing count |
| total_cost | Decimal | Total cost in USD |

## 3.2 Processing_Queue Table

**Table ID:** `m3h7cyoo6ipbry5`

| Field | Type | Description |
|-------|------|-------------|
| Id | ID | Primary key |
| file_id | SingleLineText | Google Drive file ID |
| file_name | SingleLineText | Original filename |
| status | SingleSelect | queued, processing, optimizing, failed |
| started_at | DateTime | When processing started |
| last_updated | DateTime | Last status update |
| error_message | LongText | Error details if failed |
| retry_count | Number | Number of retry attempts |
| task_id | SingleLineText | Kie.ai task ID (MISSING IN SCHEMA - added dynamically) |
| progress | Number | 0-100 percentage (MISSING IN SCHEMA) |
| generated_prompt | LongText | AI-generated prompt (MISSING IN SCHEMA) |

**⚠️ SCHEMA MISMATCH:** The workflow writes to `task_id`, `progress`, and `generated_prompt` fields that don't exist in the official schema. NocoDB creates them dynamically but they should be formally added.

## 3.3 Processing_History Table

**Table ID:** `myhtac31dhyqoso`

| Field | Type | Description |
|-------|------|-------------|
| Id | ID | Primary key |
| file_id | SingleLineText | Google Drive file ID |
| file_name | SingleLineText | Original filename |
| optimized_url | URL | Google Drive view URL for result |
| optimized_drive_id | SingleLineText | Drive ID of optimized file |
| started_at | DateTime | Processing start time |
| completed_at | DateTime | Processing completion time |
| status | SingleSelect | success, failed |
| error_message | LongText | Error details if failed |
| generated_prompt | LongText | The prompt used for optimization |
| cost_usd | SingleLineText | Cost of this optimization |
| resolution | SingleLineText | 2K or 4K |
| processing_time_sec | Number | Total processing time in seconds |

## 3.4 Prompt_Templates Table

**Table ID:** `mvi5pcumvlnq4wg`

| Field | Type | Description |
|-------|------|-------------|
| Id | ID | Primary key |
| Title | SingleLineText | Template name |
| category | SingleSelect | Jewelry, Product, Fashion, Food, Other |
| subcategory | SingleLineText | Sub-category (e.g., Rings, Necklaces) |
| base_prompt | LongText | The base prompt template |
| style | SingleSelect | Premium, Elegant, Standard, Lifestyle, Minimal |
| background | SingleSelect | White, Gradient, Transparent, Natural, Custom |
| lighting | SingleLineText | Lighting description |
| is_system | Checkbox | System-provided vs user-created |
| is_active | Checkbox | Whether template is available |
| created_by | SingleLineText | user or system |
| usage_count | Number | Times this template was used |

**⚠️ BUG IDENTIFIED:** `category`, `style`, `background` are SingleSelect fields with hardcoded options. This causes errors when users try to save custom values. **SOLUTION:** Convert to SingleLineText for flexibility.

## 3.5 Settings Table

**Table ID:** `mqyeqdaynohyo9g`

| Field | Type | Description |
|-------|------|-------------|
| Id | ID | Primary key |
| setting_key | LongText | Setting name (e.g., input_folder_id) |
| setting_value | SingleLineText | Setting value |
| description | LongText | Human-readable description |

**Current Settings:**
- `input_folder_id` - Default input Google Drive folder
- `output_folder_id` - Default output Google Drive folder
- `batch_size` - Number of images to process at once
- `schedule_minutes` - Polling interval
- `resolution` - Default resolution (2K/4K)

## 3.6 Shopify_Products Table (Prepared but not connected)

**Table ID:** `m7un0pq83z4wn45`

| Field | Type | Description |
|-------|------|-------------|
| Id | ID | Primary key |
| shopify_handle | SingleLineText | Product handle/slug |
| shopify_product_id | SingleLineText | Shopify product ID |
| title | SingleLineText | Product title |
| product_type | SingleSelect | Necklace, Body Chain, etc. |
| vendor | SingleLineText | Vendor name |
| price | Currency | Product price |
| compare_at_price | Currency | Compare price |
| current_image_url | URL | Current main image |
| current_image_id | SingleLineText | Shopify image ID |
| current_description | LongText | Product description |
| all_images | LongText | JSON array of all images |
| optimized_image_url | URL | Our optimized image |
| lifestyle_image_url | URL | Lifestyle version |
| video_url | URL | Video if generated |
| load_from_shopify | Checkbox | Trigger to load data |
| optimize_image | Checkbox | Trigger optimization |
| create_lifestyle | Checkbox | Create lifestyle image |
| create_video | Checkbox | Create video |
| publish_to_shopify | Checkbox | Push back to Shopify |
| status | SingleSelect | Idle, Loading, Loaded, Optimizing, Ready, Publishing, Published, Error |
| optimization_job_id | SingleLineText | Job reference |
| last_loaded | DateTime | Last Shopify sync |
| last_optimized | DateTime | Last optimization |
| last_published | DateTime | Last push to Shopify |
| error_message | LongText | Error details |
| material | SingleSelect | Silver, 18K Gold, etc. |
| style | MultiSelect | Dainty, Chunky, etc. |
| category | SingleSelect | Necklace, Ring, etc. |
| tags | LongText | Product tags |
| style_keywords | LongText | AI-detected keywords |
| visual_features | LongText | AI-detected features |

---

# 4. API ENDPOINTS (ALL 19 WEBHOOKS)

## Base URL
```
https://automator.pixelcraftedmedia.com/webhook/image-optimizer
```

## 4.1 Dashboard & Stats

### GET /stats
Returns dashboard statistics.

**Response:**
```json
{
  "inQueue": 5,
  "currentlyProcessing": 2,
  "processedToday": 47,
  "percentChangeFromYesterday": 15,
  "totalCost": 5.64,
  "avgTimeSeconds": 42
}
```

### GET /queue
Returns current processing queue.

**Response:**
```json
{
  "queue": [
    {
      "id": 123,
      "fileId": "1abc...",
      "fileName": "ring.jpg",
      "status": "processing",
      "progress": 45,
      "startedAt": "2025-12-11T07:00:00Z",
      "lastUpdated": "2025-12-11T07:01:00Z",
      "taskId": "kie_task_xyz",
      "errorMessage": null,
      "retryCount": 0
    }
  ],
  "total": 5
}
```

### GET /history
Returns processing history with pagination.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "history": [
    {
      "id": 456,
      "fileId": "1abc...",
      "fileName": "ring.jpg",
      "status": "success",
      "resolution": "2K",
      "cost": 1.00,
      "timeSeconds": 45,
      "completedAt": "2025-12-11T07:02:00Z",
      "optimizedUrl": "https://drive.google.com/file/d/xxx/view",
      "optimizedDriveId": "xxx",
      "thumbnailUrl": "https://drive.google.com/thumbnail?id=xxx&sz=w100"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 4.2 Settings

### GET /settings
Returns all settings as key-value pairs.

**Response:**
```json
{
  "settings": {
    "input_folder_id": "1abc...",
    "output_folder_id": "2def...",
    "batch_size": "1",
    "resolution": "2K"
  },
  "detailed": [
    { "id": 1, "key": "input_folder_id", "value": "1abc...", "description": "..." }
  ]
}
```

### PUT /settings
Update settings.

**Request Body:**
```json
{
  "key": "resolution",
  "value": "4K"
}
```
OR bulk update:
```json
{
  "settings": {
    "resolution": "4K",
    "batch_size": "5"
  }
}
```

## 4.3 Projects

### GET /projects
List all projects.

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Summer Collection",
      "inputFolderUrl": "https://drive.google.com/...",
      "inputFolderId": "1abc...",
      "outputFolderUrl": "https://drive.google.com/...",
      "outputFolderId": "2def...",
      "templateId": 5,
      "customPrompt": "",
      "status": "active",
      "resolution": "2K",
      "trialCount": 5,
      "trialCompleted": 3,
      "totalImages": 147,
      "processedImages": 45,
      "failedImages": 2,
      "totalCost": 47.00
    }
  ],
  "total": 3
}
```

### POST /projects
Create new project.

**Request Body:**
```json
{
  "name": "New Collection",
  "inputFolderUrl": "https://drive.google.com/drive/folders/xxx",
  "outputFolderUrl": "https://drive.google.com/drive/folders/yyy",
  "templateId": 5,
  "customPrompt": "",
  "resolution": "2K",
  "trialCount": 5
}
```

### PUT /project-update
Update existing project.

**Request Body:**
```json
{
  "projectId": 1,
  "name": "Updated Name",
  "resolution": "4K"
}
```

### DELETE /project-delete
Delete a project.

**Request Body:**
```json
{
  "projectId": 1
}
```

## 4.4 Templates

### GET /templates
List all templates.

**Response:**
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Jewelry Gold Premium",
      "category": "Jewelry",
      "subcategory": "Rings",
      "basePrompt": "Professional studio photography...",
      "style": "Premium",
      "background": "White",
      "lighting": "Three-point studio",
      "isSystem": true,
      "isActive": true,
      "createdBy": "system",
      "usageCount": 45
    }
  ],
  "byCategory": {
    "Jewelry": [...],
    "Product": [...]
  },
  "total": 8
}
```

### POST /templates
Create new template.

**Request Body:**
```json
{
  "name": "My Custom Template",
  "category": "Jewelry",
  "subcategory": "Earrings",
  "basePrompt": "Professional macro photography...",
  "style": "Elegant",
  "background": "Gradient",
  "lighting": "Soft diffused"
}
```

### PUT /template-update
Update template.

**Request Body:**
```json
{
  "templateId": 5,
  "name": "Updated Name",
  "basePrompt": "New prompt..."
}
```

### DELETE /template-delete
Delete template.

**Request Body:**
```json
{
  "templateId": 5
}
```

## 4.5 Processing

### GET /project-images
Get images from a project's input folder with optimization status.

**Query Params:**
- `projectId` (required)

**Response:**
```json
{
  "success": true,
  "projectId": 1,
  "projectName": "Summer Collection",
  "inputFolderId": "1abc...",
  "outputFolderId": "2def...",
  "totalImages": 147,
  "optimizedCount": 45,
  "pendingCount": 102,
  "totalCost": 45.00,
  "images": [
    {
      "id": "1file...",
      "name": "ring_001.jpg",
      "mimeType": "image/jpeg",
      "thumbnailUrl": "https://drive.google.com/thumbnail?id=xxx&sz=w200",
      "fullUrl": "https://drive.google.com/file/d/xxx/view",
      "status": "optimized",
      "isOptimized": true,
      "historyId": 456,
      "optimizedUrl": "https://drive.google.com/file/d/yyy/view",
      "optimizedDriveId": "yyy",
      "resultThumbnail": "https://drive.google.com/thumbnail?id=yyy&sz=w200",
      "cost": 1.00,
      "resolution": "2K",
      "processingTime": 45,
      "completedAt": "2025-12-11T07:00:00Z",
      "prompt": "The generated prompt..."
    }
  ]
}
```

### POST /trial
Queue selected images for trial processing.

**Request Body:**
```json
{
  "projectId": 1,
  "imageIds": ["1abc...", "2def...", "3ghi..."],
  "imageNames": {
    "1abc...": "ring_001.jpg",
    "2def...": "ring_002.jpg",
    "3ghi...": "ring_003.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added 3 image(s) to queue",
  "count": 3
}
```

### POST /process
Trigger the main processing workflow (processes from Settings folders).

**Response:**
```json
{
  "success": true,
  "message": "Processing started"
}
```

### POST /trigger
Trigger workflow via n8n API (same as /process but different mechanism).

### POST /redo
Re-process an already completed image.

**Request Body:**
```json
{
  "fileId": "1abc...",
  "fileName": "ring.jpg",
  "customPrompt": "Optional custom prompt override"
}
```

### DELETE /queue-clear
Clear all queued (not processing) items from queue.

**Response:**
```json
{
  "success": true,
  "message": "Cleared 5 item(s) from queue",
  "deletedCount": 5
}
```

---

# 5. CORE PROCESSING PIPELINE

## 5.1 Main Processing Flow (133 Nodes)

### Node Sequence for Single Image

```
1. POST /process (Webhook)
      │
      ▼
2. Get Settings1 (NocoDB)
   - Fetches: input_folder_id, output_folder_id, resolution
      │
      ▼
3. Parse Settings1 (Code)
   - Converts key-value to config object
   - Validates required settings
      │
      ▼
4. List Drive Files2 (Google Drive)
   - Lists all files in input folder
      │
      ▼
5. Collect Drive Files (Code)
   - Aggregates file list with settings
      │
      ▼
6. Get Processing Queue2 (NocoDB)
   - Fetches current queue items
      │
      ▼
7. Collect Queue (Code)
   - Merges queue with drive files
      │
      ▼
8. Get Processing History2 (NocoDB)
   - Fetches history to avoid re-processing
      │
      ▼
9. Filter NEW Files2 (Code)
   - PRIORITY 1: Process queued items first
   - PRIORITY 2: Find new files not in queue/history
   - Filters by image extensions
      │
      ▼
10. Has New File?2 (If)
    - If no new files → END
    - If has files → Continue
       │
       ▼
11. From Queue? (If)
    - If from queue → Skip claim step
    - If new file → Insert to queue
       │
       ▼
12. Claim File (Insert to Queue)2 (NocoDB)
    - status: queued
    - progress: 10
       │
       ▼
13. Prepare For AI2 (Code)
    - Builds image URL: https://lh3.googleusercontent.com/d/{fileId}=s2048
    - Sets resolution, material, style, category (HARDCODED!)
       │
       ▼
14. Update Status: Processing2 (NocoDB)
    - status: processing
    - progress: 20
       │
       ▼
15. AI Prompt Generator2 (LangChain Agent)
    - Model: Claude Sonnet 4.5
    - System prompt: Jewelry prompt engineering expert
    - Generates optimization prompt
       │
       ▼
16. Combine Prompt Data2 (Code)
    - Merges AI output with file data
       │
       ▼
17. Update Status: Optimizing2 (NocoDB)
    - status: optimizing
    - progress: 40
    - generated_prompt: {prompt}
       │
       ▼
18. Kie.ai Create Task2 (HTTP Request)
    - POST https://api.kie.ai/api/v1/jobs/createTask
    - model: nano-banana-pro
    - Returns: taskId
       │
       ▼
19. Save Task ID2 (Code)
    - Stores taskId and initializes checkCount
       │
       ▼
20. Update Task ID in Queue2 (NocoDB)
    - task_id: {taskId}
    - progress: 50
       │
       ▼
21. Wait 15s2 (Wait)
    - 15 second delay
       │
       ▼
22. Check Task Status2 (HTTP Request)
    - GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
       │
       ▼
23. Is Complete?2 (If)
    - If state === 'success' → Extract result
    - If not complete → Retry loop
       │
       ├─── SUCCESS PATH ───┐
       │                    │
       ▼                    │
24. Extract Result URL2    │
    - Parses resultJson    │
    - Gets image URL       │
    - Calculates cost      │
       │                    │
       ▼                    │
25. Update Progress 80%2   │
       │                    │
       ▼                    │
26. Download Optimized2    │
    - Downloads image      │
       │                    │
       ▼                    │
27. Upload to Output2      │
    - Uploads to Drive     │
    - Name: Optimized_{original}
       │                    │
       ▼                    │
28. Prepare History Record2│
    - Builds history data  │
       │                    │
       ▼                    │
29. Create History Record2 │
    - Inserts to history   │
    - status: success      │
       │                    │
       ▼                    │
30. Delete from Queue2     │
    - Removes from queue   │
       │                    │
       ▼                    │
31. Success2 (End)         │
                           │
       ├─── RETRY PATH ────┤
       │                    │
       ▼                    │
32. Prepare Retry2         │
    - Increment checkCount │
    - Max 20 checks        │
    - Throws error if failed/timeout
       │                    │
       ▼                    │
33. Update Progress (Waiting)2
    - progress: 50 + (checkCount * 2)
       │                    │
       ▼                    │
34. Wait and Retry2        │
    - 15 second delay      │
       │                    │
       ▼                    │
35. Check For Error2 (If)  │
    - If state === 'failed' → Error handler
    - Else → Loop back to Check Task Status2
       │
       ├─── ERROR PATH ────┐
       │                    │
       ▼                    │
36. Handle Kie Error2      │
    - Extracts error msg   │
       │                    │
       ▼                    │
37. Mark as Failed2        │
    - status: failed       │
    - error_message: {msg} │
       │                    │
       ▼                    │
38. Error End2 (End)       │
```

## 5.2 Key Code Snippets

### Prepare For AI2 (Image URL Construction)
```javascript
const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}=s2048`;
const ext = (fileName || '').split('.').pop().toLowerCase();

return [{
  json: {
    fileId, fileName, queueRecordId,
    input_image_url: imageUrl,
    resolution: settings.resolution || '2K',
    material: 'Gold',      // ⚠️ HARDCODED - should be dynamic from template
    style: 'Modern',       // ⚠️ HARDCODED - should be dynamic from template
    category: 'Jewelry',   // ⚠️ HARDCODED - should be dynamic from template
    fileExtension: ext,
    settings
  }
}];
```

### Extract Result URL2 (Cost Calculation)
```javascript
const resolution = prevData.resolution || '2K';
const costUsd = resolution === '4K' ? 2.00 : 1.00;

// Note: Current system uses $1 for 2K, $2 for 4K
// Token system planned: 1 token = $1
```

### Filter NEW Files2 (Priority Logic)
```javascript
// FIRST: Process queued items
const waitingInQueue = queueFiles.filter(item => item.status === 'queued');
if (waitingInQueue.length > 0) {
  return [{ json: { ...waitingInQueue[0], fromQueue: true } }];
}

// SECOND: Look for new Drive files
const queueIds = new Set(queueFiles.map(item => item.file_id));
const historyIds = new Set(historyFiles.map(item => item.file_id));

for (const file of driveFiles) {
  if (queueIds.has(file.id) || historyIds.has(file.id)) continue;
  // ... return new file
}
```

---

# 6. AI INTEGRATION DETAILS

## 6.1 Claude Sonnet 4.5 (Prompt Generator)

### Model Configuration
```javascript
{
  model: "claude-sonnet-4-5-20250929",
  // Via n8n LangChain agent node
}
```

### System Prompt (Complete)
```
You are an expert AI Jewelry Prompt Engineer for the Kie.ai Nano Banana Pro system.

Your task is to transform raw jewelry camera images into **high-end, studio-ready e-commerce product images** for Photoshop and Shopify stores, while preserving the exact design of the piece.

### NON-NEGOTIABLE DESIGN RULES
1. Keep the jewelry's exact **shape, geometry, proportions, and structure** identical to the input image.
2. Keep the **original metal color** (gold stays gold, silver stays silver, etc.) without hue changes.
3. Do not change or add stones, engravings, or decorative features.
4. Do not alter the thickness, curvature, twist pattern, or silhouette of the piece.

### WHAT YOU *ARE* ALLOWED TO IMPROVE
Your job is to **significantly enhance** the visual quality without changing the design:
- Boost shine, gloss, and polished metal reflections.
- Improve clarity, contrast, and micro-texture detail.
- Enhance gold richness and depth while keeping the same color family.
- Add clean, realistic specular highlights for a luxury finish.
- Sharpen edges and produce high-definition material detail.
- Improve lighting, atmosphere, and exposure.
- Remove any dullness or flat lighting from the original.

### TARGET STYLE (VERY IMPORTANT)
Match the aesthetic of top-tier jewelry brands (Ana Luisa, Mejuri, Pandora):
- Ultra-shiny, premium gold finish.
- Clean white or soft-gradient studio background.
- Elegant soft shadows.
- Bright studio lighting with crisp reflections.
- 8K macro detail that feels handcrafted and high-value.

### CAMERA & LIGHTING PROFILE
Embed naturally in the prompt:
- 85mm or 100mm macro lens
- f/11–f/16 deep sharpness
- professional 3-point studio lighting
- top softbox for glossy metal highlights
- HDR, ultra crisp reflections

### FINAL OUTPUT
Produce ONE enhanced image-generation prompt that:
- Describes the jewelry accurately from the input image
- Maximizes shine and studio quality
- Prepares the image for e-commerce/Photoshop use
- Keeps the design and color intact
- Produces a polished, luxurious result ready for store listings

Return ONLY the final enhanced prompt. No explanations or formatting.
```

### User Message Template
```
Generate an optimal prompt for this Product Optimization

Product Materials: {{ material }}
Product Style: {{ style }}
Product Category: {{ category }}
Product Resolution: {{ resolution }}
```

## 6.2 Kie.ai Integration

### API Endpoints
```
Base URL: https://api.kie.ai/api/v1

POST /jobs/createTask    - Create optimization task
GET  /jobs/recordInfo    - Check task status
```

### Authentication
```
Header: Authorization: Bearer {API_KEY}
```

### Create Task Request
```json
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Generated prompt from Claude...",
    "aspect_ratio": "1:1",
    "resolution": "2K",
    "image_input": ["https://lh3.googleusercontent.com/d/{fileId}=s2048"],
    "output_format": "png"
  }
}
```

### Create Task Response
```json
{
  "code": 200,
  "msg": "Success",
  "data": {
    "taskId": "task_abc123"
  }
}
```

### Check Status Response (Success)
```json
{
  "code": 200,
  "data": {
    "state": "success",
    "costTime": 45,
    "resultJson": "{\"resultUrls\":[\"https://cdn.kie.ai/result/xxx.png\"]}"
  }
}
```

### Check Status Response (Processing)
```json
{
  "code": 200,
  "data": {
    "state": "processing"
  }
}
```

### Check Status Response (Failed)
```json
{
  "code": 200,
  "data": {
    "state": "failed",
    "failMsg": "Image processing failed: insufficient detail"
  }
}
```

### Polling Strategy
- Initial wait: 15 seconds after task creation
- Retry interval: 15 seconds
- Max retries: 20 (total ~5 minutes)
- Timeout error if not complete after 20 checks

---

# 7. FRONTEND ARCHITECTURE (LOVABLE)

## 7.1 Current Implementation

**Platform:** Lovable (React-based low-code)
**URL:** https://id-preview--fd91d733-9993-4304-9f72-67849b59fca5.lovable.app

### Key Components

1. **Dashboard (Home)**
   - Stats cards (In Queue, Processing, Processed Today, Cost)
   - Quick actions
   - Auto-refresh every 3 seconds (⚠️ Too frequent)

2. **Projects Page**
   - List of projects
   - Create/Edit/Delete projects
   - Project cards with stats

3. **Project Detail / Images**
   - Image grid from Google Drive
   - Selection checkboxes
   - "Run Trial" button
   - Before/After comparison (planned)

4. **Templates Page**
   - List of prompt templates
   - Create/Edit/Delete templates
   - Category filtering

5. **Settings Page**
   - Folder configuration
   - Resolution selection
   - (Token system planned)

6. **Queue Monitor**
   - Real-time queue status
   - Progress bars
   - Cancel/Clear actions

7. **History**
   - Completed optimizations
   - Pagination
   - Redo action

### API Service Pattern
```typescript
const API_BASE = 'https://automator.pixelcraftedmedia.com/webhook/image-optimizer';

// Example fetch
const fetchStats = async () => {
  const response = await fetch(`${API_BASE}/stats`);
  return response.json();
};

// CORS handled by n8n with Access-Control-Allow-Origin: *
```

### State Management
- React useState/useEffect
- No global state manager (Redux/Zustand)
- Each component fetches its own data

### Known Frontend Issues

1. **Auto-refresh too frequent (3s)** - Causes unnecessary API calls
2. **No optimistic updates** - UI waits for API response
3. **Image selection state lost** - On refresh, selections clear
4. **No error boundaries** - Errors crash components
5. **Category dropdown not loading custom values** - Fixed in Session 10

---

# 8. CHALLENGES ENCOUNTERED & SOLUTIONS

## 8.1 Webhook Routing Conflicts

**Problem:** Multiple webhooks with similar paths caused routing issues.

**Solution:** Renamed endpoints with unique prefixes:
- `/image-optimizer/stats`
- `/image-optimizer/queue`
- `/image-optimizer/history`

## 8.2 File ID vs File Name Tracking

**Problem:** Original system renamed files during processing, causing duplicate detection failures.

**Solution:** Track files by Google Drive `file_id` instead of filename. Files never renamed.

## 8.3 Queue Item Duplication

**Problem:** Same file could be added to queue multiple times.

**Solution:** Check both queue and history for existing `file_id` before adding.

## 8.4 CORS Issues

**Problem:** Frontend couldn't call n8n webhooks.

**Solution:** Added CORS headers to all webhook responses:
```javascript
{
  "responseHeaders": {
    "entries": [
      { "name": "Access-Control-Allow-Origin", "value": "*" }
    ]
  }
}
```

## 8.5 Kie.ai Task Timeout

**Problem:** Some tasks took longer than expected, causing premature failures.

**Solution:** 
- Increased max retries from 10 to 20
- Added progressive status updates
- Better error messages for timeouts

## 8.6 Prompt Storage Bug

**Problem:** Generated prompts weren't being saved to history.

**Solution:** Added `generated_prompt` field to both queue updates and history creation.

## 8.7 Template Category Save Bug

**Problem:** Custom category values failed to save due to SingleSelect constraints.

**Solution:** Identified that `category`, `style`, `background` fields are SingleSelect with hardcoded options. Need to convert to Text fields.

## 8.8 /redo Endpoint Workaround

**Problem:** Original `/redo` didn't support custom prompts.

**Solution:** Modified to accept `customPrompt` in request body and store in queue's `generated_prompt` field.

## 8.9 Progress Tracking Gaps

**Problem:** Users couldn't see intermediate progress states.

**Solution:** Added granular progress updates:
- 10% - Queued
- 20% - Processing (AI prompt)
- 40% - Optimizing (sent to Kie.ai)
- 50% - Waiting for result
- 50-75% - Polling (incremental)
- 80% - Downloading result
- 100% - Complete

---

# 9. KNOWN BUGS & LIMITATIONS

## Critical

| Bug | Impact | Status |
|-----|--------|--------|
| Template SingleSelect fields reject custom values | Users can't save custom categories | Identified, needs DB change |
| Processing_Queue schema missing fields | task_id, progress, generated_prompt created dynamically | Works but should be formalized |

## Medium

| Bug | Impact | Status |
|-----|--------|--------|
| Material/style/category hardcoded in AI prep | Templates not actually used for AI | Identified, needs workflow update |
| Auto-refresh every 3 seconds | Excessive API calls | Needs frontend fix |
| No batch processing UI | Must select images one project at a time | Feature gap |

## Low

| Bug | Impact | Status |
|-----|--------|--------|
| Shopify integration not connected | Table exists but no UI/workflow | Feature gap |
| No user authentication | Single-tenant only | Architecture limitation |
| History thumbnails slow to load | Google Drive throttling | Needs caching |

## Limitations

1. **Single-tenant** - No multi-user support
2. **No batch selection UI** - Can't select across projects
3. **No review/approval workflow** - AI output goes directly to "done"
4. **Google Drive dependency** - Requires Drive for file storage
5. **No version history** - Can't rollback optimizations
6. **No cost/token system** - Cost tracked but not billed

---

# 10. NEW ARCHITECTURE RECOMMENDATIONS

## 10.1 Supabase Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                    │
│                    Deployed on Vercel/Netlify                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client SDK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │    Auth     │  │  Database   │  │    Edge Functions       │ │
│  │  (Users)    │  │ (PostgreSQL)│  │  (API + Business Logic) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Storage    │  │  Realtime   │  │    Row Level Security   │ │
│  │  (Images)   │  │ (WebSocket) │  │    (Multi-tenant)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Direct API calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐│
│  │   Anthropic API     │    │         Kie.ai API              ││
│  │   (Claude 4.5)      │    │      (nano-banana-pro)          ││
│  │   Direct calls      │    │       Direct calls              ││
│  └─────────────────────┘    └─────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐│
│  │   Stripe API        │    │      Google Drive API           ││
│  │   (Payments)        │    │      (Optional, or use         ││
│  │                     │    │       Supabase Storage)         ││
│  └─────────────────────┘    └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 10.2 Benefits of New Architecture

| Feature | Current (n8n) | New (Supabase) |
|---------|---------------|----------------|
| Authentication | None | Built-in, multi-tenant |
| Real-time updates | Polling | WebSocket subscriptions |
| Database | NocoDB (external) | PostgreSQL (integrated) |
| API | Webhook-based | Edge Functions (faster) |
| File Storage | Google Drive | Supabase Storage (or Drive) |
| Scalability | Single workflow | Horizontal scaling |
| Cost | n8n hosting | Pay-per-use |
| Development | No-code limited | Full code control |

---

# 11. SUPABASE MIGRATION PLAN

## 11.1 Database Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (handled by Supabase Auth)
-- Supabase creates auth.users automatically

-- Organizations (for multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Organization Membership
CREATE TABLE user_organizations (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- owner, admin, member
  PRIMARY KEY (user_id, organization_id)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input_folder_url TEXT,
  input_folder_id TEXT,
  output_folder_url TEXT,
  output_folder_id TEXT,
  template_id UUID REFERENCES prompt_templates(id),
  custom_prompt TEXT,
  status TEXT DEFAULT 'draft', -- draft, active, completed, archived
  resolution TEXT DEFAULT '2K',
  trial_count INTEGER DEFAULT 5,
  trial_completed INTEGER DEFAULT 0,
  total_images INTEGER DEFAULT 0,
  processed_images INTEGER DEFAULT 0,
  failed_images INTEGER DEFAULT 0,
  total_tokens DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Templates
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  base_prompt TEXT,
  style TEXT,
  background TEXT,
  lighting TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing Queue
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT, -- Supabase Storage URL or Google Drive URL
  status TEXT DEFAULT 'queued', -- queued, processing, optimizing, failed
  progress INTEGER DEFAULT 0,
  task_id TEXT, -- Kie.ai task ID
  generated_prompt TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  tokens_reserved DECIMAL(10,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Processing History
CREATE TABLE processing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  original_url TEXT,
  optimized_url TEXT,
  optimized_storage_path TEXT, -- Supabase Storage path
  status TEXT DEFAULT 'success', -- success, failed
  resolution TEXT,
  tokens_used DECIMAL(10,2),
  processing_time_sec INTEGER,
  generated_prompt TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Token Accounts
CREATE TABLE token_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0,
  lifetime_purchased DECIMAL(10,2) DEFAULT 0,
  lifetime_used DECIMAL(10,2) DEFAULT 0,
  low_balance_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token Transactions
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES token_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- purchase, usage, refund, bonus, coupon, adjustment
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  description TEXT,
  reference_type TEXT, -- history, project, coupon, manual
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Token Pricing
CREATE TABLE token_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT UNIQUE NOT NULL, -- optimize_2k, optimize_4k, redo
  token_cost DECIMAL(10,2) NOT NULL,
  display_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default pricing
INSERT INTO token_pricing (operation, token_cost, display_name, description) VALUES
  ('optimize_2k', 1.0, '2K Image Optimization', 'Standard quality optimization'),
  ('optimize_4k', 2.0, '4K Image Optimization', 'Premium quality optimization'),
  ('redo', 0.5, 'Re-process Image', 'Re-optimize with different settings');

-- Row Level Security Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Example RLS Policy (users can only see their organization's data)
CREATE POLICY "Users can view own organization projects"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_history;
```

## 11.2 Edge Functions Structure

```
supabase/
├── functions/
│   ├── process-image/
│   │   └── index.ts        # Main processing orchestrator
│   ├── generate-prompt/
│   │   └── index.ts        # Claude API integration
│   ├── optimize-image/
│   │   └── index.ts        # Kie.ai API integration
│   ├── check-task-status/
│   │   └── index.ts        # Poll Kie.ai for completion
│   ├── tokens/
│   │   ├── balance.ts      # Get token balance
│   │   ├── purchase.ts     # Stripe integration
│   │   └── deduct.ts       # Deduct tokens
│   ├── projects/
│   │   └── index.ts        # CRUD operations
│   ├── templates/
│   │   └── index.ts        # CRUD operations
│   └── webhooks/
│       ├── stripe.ts       # Payment webhooks
│       └── kie-callback.ts # Kie.ai completion callback (if available)
```

---

# 12. DIRECT KIE.AI INTEGRATION

## 12.1 Edge Function: optimize-image

```typescript
// supabase/functions/optimize-image/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const KIE_API_KEY = Deno.env.get('KIE_API_KEY')
const KIE_BASE_URL = 'https://api.kie.ai/api/v1'

interface OptimizeRequest {
  queueId: string
  imageUrl: string
  prompt: string
  resolution: '2K' | '4K'
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { queueId, imageUrl, prompt, resolution }: OptimizeRequest = await req.json()

  // 1. Create Kie.ai task
  const createResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt,
        aspect_ratio: '1:1',
        resolution,
        image_input: [imageUrl],
        output_format: 'png'
      }
    })
  })

  const createData = await createResponse.json()

  if (createData.code !== 200 || !createData.data?.taskId) {
    // Update queue with error
    await supabase
      .from('processing_queue')
      .update({
        status: 'failed',
        error_message: createData.msg || 'Failed to create Kie.ai task'
      })
      .eq('id', queueId)

    return new Response(JSON.stringify({ error: 'Task creation failed' }), { status: 500 })
  }

  const taskId = createData.data.taskId

  // 2. Update queue with task ID
  await supabase
    .from('processing_queue')
    .update({
      task_id: taskId,
      status: 'optimizing',
      progress: 50
    })
    .eq('id', queueId)

  // 3. Poll for completion (or use webhook if Kie.ai supports it)
  let attempts = 0
  const maxAttempts = 20
  const pollInterval = 15000 // 15 seconds

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    attempts++

    const statusResponse = await fetch(
      `${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
      {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
      }
    )

    const statusData = await statusResponse.json()
    const state = statusData.data?.state

    // Update progress
    const progress = Math.min(50 + (attempts * 2), 75)
    await supabase
      .from('processing_queue')
      .update({ progress, last_updated: new Date().toISOString() })
      .eq('id', queueId)

    if (state === 'success') {
      const resultJson = JSON.parse(statusData.data.resultJson)
      const resultUrl = resultJson.resultUrls[0]

      return new Response(JSON.stringify({
        success: true,
        resultUrl,
        processingTime: statusData.data.costTime
      }))
    }

    if (state === 'failed') {
      await supabase
        .from('processing_queue')
        .update({
          status: 'failed',
          error_message: statusData.data.failMsg || 'Kie.ai processing failed'
        })
        .eq('id', queueId)

      return new Response(JSON.stringify({ error: 'Processing failed' }), { status: 500 })
    }
  }

  // Timeout
  await supabase
    .from('processing_queue')
    .update({
      status: 'failed',
      error_message: 'Processing timed out after 5 minutes'
    })
    .eq('id', queueId)

  return new Response(JSON.stringify({ error: 'Timeout' }), { status: 500 })
})
```

## 12.2 Edge Function: generate-prompt

```typescript
// supabase/functions/generate-prompt/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.0'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')
})

const SYSTEM_PROMPT = `You are an expert AI Jewelry Prompt Engineer...` // Full prompt from section 6.1

serve(async (req) => {
  const { material, style, category, resolution } = await req.json()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate an optimal prompt for this Product Optimization

Product Materials: ${material}
Product Style: ${style}
Product Category: ${category}
Product Resolution: ${resolution}`
      }
    ]
  })

  const generatedPrompt = message.content[0].type === 'text' 
    ? message.content[0].text 
    : ''

  return new Response(JSON.stringify({ prompt: generatedPrompt }))
})
```

---

# 13. DEVELOPMENT ROADMAP

## Phase 1: Foundation (Week 1-2)

### 1.1 Supabase Setup
- [ ] Create Supabase project
- [ ] Set up PostgreSQL schema
- [ ] Configure Row Level Security
- [ ] Set up Supabase Auth
- [ ] Configure storage buckets

### 1.2 Core Edge Functions
- [ ] `/process-image` - Main orchestrator
- [ ] `/generate-prompt` - Claude integration
- [ ] `/optimize-image` - Kie.ai integration
- [ ] Basic CRUD for projects/templates

### 1.3 Data Migration
- [ ] Export NocoDB data
- [ ] Transform to PostgreSQL format
- [ ] Import to Supabase
- [ ] Verify data integrity

## Phase 2: Frontend (Week 3-4)

### 2.1 Project Setup
- [ ] Vite + React + TypeScript
- [ ] Tailwind CSS + shadcn/ui
- [ ] Supabase client configuration
- [ ] Authentication flow

### 2.2 Core Pages
- [ ] Dashboard with real-time stats
- [ ] Projects list/create/edit
- [ ] Project detail with image grid
- [ ] Templates management
- [ ] Queue monitor with WebSocket
- [ ] Processing history

### 2.3 Key Features
- [ ] Multi-select for batch processing
- [ ] Before/after comparison view
- [ ] Progress tracking with Supabase Realtime
- [ ] Error handling and retry UI

## Phase 3: Token System (Week 5)

### 3.1 Backend
- [ ] Token account management
- [ ] Transaction logging
- [ ] Balance checking before processing
- [ ] Hold/release pattern

### 3.2 Stripe Integration
- [ ] Checkout session creation
- [ ] Webhook handling
- [ ] Token credit on payment

### 3.3 Frontend
- [ ] Token balance display
- [ ] Purchase modal
- [ ] Transaction history
- [ ] Low balance warnings

## Phase 4: Advanced Features (Week 6-8)

### 4.1 Batch Processing
- [ ] Multi-image selection UI
- [ ] Parallel processing (configurable)
- [ ] Batch progress tracking
- [ ] Pause/resume/cancel

### 4.2 Review Workflow
- [ ] Pending review state
- [ ] Approve/reject actions
- [ ] Variation generation
- [ ] Bulk approval

### 4.3 Integrations
- [ ] Shopify sync
- [ ] Multi-platform export
- [ ] Webhook notifications

## Phase 5: Polish (Week 9-10)

### 5.1 Performance
- [ ] Image caching
- [ ] Pagination optimization
- [ ] Loading states
- [ ] Error boundaries

### 5.2 UX Improvements
- [ ] Onboarding flow
- [ ] Help documentation
- [ ] Keyboard shortcuts
- [ ] Mobile responsiveness

### 5.3 Testing & Launch
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security audit
- [ ] Production deployment

---

# APPENDIX

## A. Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# External APIs
ANTHROPIC_API_KEY=sk-ant-...
KIE_API_KEY=kie_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Drive (if keeping)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REFRESH_TOKEN=xxx
```

## B. API Response Formats

All API responses should follow this format:

```typescript
// Success
{
  success: true,
  data: { ... },
  meta?: {
    pagination?: { page, limit, total, totalPages },
    timestamp: string
  }
}

// Error
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

## C. File References

- n8n Workflow ID: `7QFjMa4zxRoRvO2F`
- NocoDB Base ID: `poab6xzj9mlvde7`
- Current Frontend: Lovable project
- Google Drive OAuth: Existing credentials

## D. Contact & Resources

- n8n Instance: https://automator.pixelcraftedmedia.com
- NocoDB Instance: https://base.pixelcraftedmedia.com
- Kie.ai Docs: https://docs.kie.ai
- Anthropic Docs: https://docs.anthropic.com
- Supabase Docs: https://supabase.com/docs

---

**END OF DOCUMENT**

*This document contains everything needed to rebuild Image Optimizer Pro with modern architecture. Use Claude Code with Opus 4.5 for implementation.*
