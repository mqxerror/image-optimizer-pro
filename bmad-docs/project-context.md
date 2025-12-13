# Image Optimizer Pro - Project Context

## Project Overview
**Name:** Image Optimizer Pro
**Type:** SaaS Platform
**Domain:** AI-powered image optimization for e-commerce
**Primary Use Case:** Jewelry product photography enhancement

## Business Goals
1. Provide automated, AI-driven image optimization for e-commerce sellers
2. Reduce time and cost of professional product photography
3. Deliver consistent, high-quality results matching premium brand aesthetics
4. Enable scalable batch processing with transparent pricing

## Target Users
- **Primary:** E-commerce store owners (jewelry, fashion, products)
- **Secondary:** Marketing teams, product photographers
- **Tertiary:** Agencies managing multiple brands

## Current System (Being Replaced)
| Component | Technology |
|-----------|------------|
| Backend | n8n (self-hosted workflows) |
| Database | NocoDB |
| File Storage | Google Drive |
| AI Prompts | Claude Sonnet 4.5 |
| AI Images | Kie.ai Nano Banana Pro |
| Frontend | Lovable (React) |

## Target Architecture
| Component | Technology |
|-----------|------------|
| Backend | Supabase Edge Functions |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth |
| Storage | Supabase Storage (or Google Drive) |
| AI Prompts | Direct Anthropic API |
| AI Images | Direct Kie.ai API |
| Payments | Stripe |
| Frontend | React + Vite + Tailwind + shadcn/ui |

## Core Features
1. **Project Management** - Organize images into projects with custom settings
2. **Template System** - Reusable prompt templates for different product types
3. **Queue Processing** - Async image processing with real-time progress
4. **AI Enhancement** - Claude-generated prompts + Kie.ai image processing
5. **Before/After Comparison** - Visual review of optimizations
6. **Token System** - Credit-based usage billing
7. **History & Analytics** - Track all processing with cost analysis

## Data Model (Key Entities)
- **Organizations** - Multi-tenant support
- **Projects** - Image collections with settings
- **Processing Queue** - Pending/in-progress items
- **Processing History** - Completed items
- **Prompt Templates** - Reusable AI prompts
- **Token Accounts** - User credits
- **Token Transactions** - Usage/purchase history

## API Endpoints (19 webhooks to replicate)
See `Image optimizer pro technical handoff.md` Section 4 for complete API documentation.

## Known Issues to Fix
1. Template SingleSelect fields reject custom values
2. Material/style/category hardcoded in AI prep (should use templates)
3. Frontend auto-refresh too frequent (3s → should be longer or WebSocket)
4. No multi-tenant support (adding via Supabase Auth + RLS)
5. No batch processing UI

## Development Phases
1. **Foundation** - Supabase setup, schema, core Edge Functions
2. **Frontend** - React app with all core pages
3. **Token System** - Billing with Stripe
4. **Advanced Features** - Batch processing, review workflow
5. **Polish** - Performance, UX, testing, launch

## Environment Variables Required
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
KIE_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

## Success Metrics
- Processing time < 60 seconds per image
- 99.5% uptime
- < 2% failure rate on optimizations
- User satisfaction with image quality

---
*This document serves as the single source of truth for project context.*
