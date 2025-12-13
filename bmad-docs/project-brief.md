# Image Optimizer Pro - Project Brief

**Document Version:** 1.0
**Created:** December 11, 2025
**Author:** Ana (Business Analyst)
**Status:** Draft - Awaiting Stakeholder Approval

---

## 1. Executive Summary

### 1.1 Project Overview

Image Optimizer Pro is a **SaaS platform rebuild** that transforms raw product images (primarily jewelry) into professional, e-commerce-ready visuals using AI-powered optimization. The system leverages Claude AI for intelligent prompt generation and Kie.ai for image enhancement.

### 1.2 Why This Rebuild?

The current system (n8n + NocoDB + Lovable) has reached its architectural limits:

| Limitation | Business Impact |
|------------|-----------------|
| Single-tenant only | Cannot scale to multiple customers |
| No authentication | Security risk, no user management |
| No billing system | Cannot monetize the service |
| Hardcoded workflow logic | Difficult to maintain and extend |
| Limited real-time feedback | Poor user experience during processing |

### 1.3 Target Outcome

A **production-ready, multi-tenant SaaS platform** built on Supabase with:
- User authentication and organization management
- Token-based billing with Stripe integration
- Real-time processing updates via WebSocket
- Modern React frontend with superior UX
- Direct API integrations (no n8n dependency)

---

## 2. Business Objectives

### 2.1 Primary Objectives

| ID | Objective | Success Metric |
|----|-----------|----------------|
| BO-1 | Enable multi-customer SaaS model | Support 100+ organizations |
| BO-2 | Implement monetization | Process payments via Stripe |
| BO-3 | Improve user experience | Reduce perceived wait time by 50% |
| BO-4 | Increase reliability | 99.5% uptime, <1% failed jobs |
| BO-5 | Reduce operational overhead | Eliminate n8n/NocoDB maintenance |

### 2.2 Secondary Objectives

| ID | Objective | Success Metric |
|----|-----------|----------------|
| BO-6 | Enable Shopify integration | Auto-sync optimized images |
| BO-7 | Support batch processing | Process 100+ images per batch |
| BO-8 | Provide review workflow | Before/after approval flow |
| BO-9 | Analytics and reporting | Usage dashboards per org |

---

## 3. Stakeholders

### 3.1 Primary Stakeholders

| Role | Interest | Involvement |
|------|----------|-------------|
| **Product Owner** | Feature prioritization, business value | Decision maker |
| **End Users (Jewelry Sellers)** | Fast, quality image optimization | Primary users |
| **Development Team** | Technical implementation | Builders |

### 3.2 Secondary Stakeholders

| Role | Interest | Involvement |
|------|----------|-------------|
| **Finance/Billing** | Revenue tracking, token economics | Consulted |
| **Support Team** | User issues, documentation | Informed |
| **External Partners** | API integrations (Kie.ai, Anthropic) | Dependencies |

---

## 4. Scope Definition

### 4.1 In Scope (Must Have - MVP)

#### Authentication & Authorization
- [ ] User registration and login (email/password)
- [ ] Organization creation and management
- [ ] Role-based access (owner, admin, member)
- [ ] Row-level security (data isolation)

#### Project Management
- [ ] Create, edit, delete projects
- [ ] Link Google Drive input/output folders
- [ ] Assign prompt templates to projects
- [ ] Project status tracking (draft, active, completed)

#### Image Processing Pipeline
- [ ] Queue images for processing
- [ ] Claude AI prompt generation
- [ ] Kie.ai image optimization (2K/4K)
- [ ] Real-time progress updates (WebSocket)
- [ ] Success/failure handling with retry

#### Prompt Templates
- [ ] System-provided templates
- [ ] Custom template creation
- [ ] Template categories and filtering
- [ ] Template usage analytics

#### Token System & Billing
- [ ] Token balance management
- [ ] Token deduction on processing
- [ ] Stripe checkout integration
- [ ] Transaction history
- [ ] Low balance warnings

#### Dashboard & History
- [ ] Organization dashboard with stats
- [ ] Processing queue monitor
- [ ] Processing history with pagination
- [ ] Before/after image comparison

### 4.2 In Scope (Should Have - Phase 2)

#### Batch Processing
- [ ] Multi-image selection UI
- [ ] Parallel processing (configurable)
- [ ] Batch progress tracking
- [ ] Pause/resume/cancel batch

#### Review Workflow
- [ ] Pending review state
- [ ] Approve/reject actions
- [ ] Request variations
- [ ] Bulk approval

#### Advanced Features
- [ ] Custom prompt override per image
- [ ] Re-process (redo) with different settings
- [ ] Image version history
- [ ] Export to multiple formats

### 4.3 In Scope (Could Have - Phase 3)

#### Shopify Integration
- [ ] Connect Shopify store
- [ ] Import product images
- [ ] Push optimized images back
- [ ] Sync product metadata

#### Analytics & Reporting
- [ ] Usage reports per organization
- [ ] Cost analysis dashboards
- [ ] Processing time trends
- [ ] Quality metrics

#### Team Features
- [ ] Invite team members
- [ ] Activity audit log
- [ ] Notification preferences
- [ ] Webhook integrations

### 4.4 Out of Scope

| Item | Reason |
|------|--------|
| Mobile native apps | Web-first approach, responsive design sufficient |
| Video processing | Future consideration, different AI model needed |
| White-label/reseller | Complex, defer to future version |
| On-premise deployment | SaaS-only model |
| Non-jewelry verticals | Initial focus on jewelry niche |

---

## 5. Functional Requirements

### 5.1 User Management (FR-100)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-101 | Users can register with email/password | Must |
| FR-102 | Users can log in and maintain session | Must |
| FR-103 | Users can reset forgotten password | Must |
| FR-104 | Users can create organizations | Must |
| FR-105 | Org owners can invite members | Should |
| FR-106 | Org owners can assign roles | Should |
| FR-107 | Users can belong to multiple orgs | Could |

### 5.2 Project Management (FR-200)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-201 | Users can create projects with name | Must |
| FR-202 | Users can link Google Drive folders | Must |
| FR-203 | Users can assign template to project | Must |
| FR-204 | Users can set resolution (2K/4K) | Must |
| FR-205 | Users can add custom prompt | Should |
| FR-206 | Users can archive/delete projects | Must |
| FR-207 | System shows project image count | Must |
| FR-208 | System shows processed/pending count | Must |

### 5.3 Image Processing (FR-300)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-301 | Users can view images from Drive folder | Must |
| FR-302 | Users can select images for processing | Must |
| FR-303 | System queues selected images | Must |
| FR-304 | System generates AI prompt per image | Must |
| FR-305 | System sends to Kie.ai for optimization | Must |
| FR-306 | System saves result to output folder | Must |
| FR-307 | Users see real-time progress updates | Must |
| FR-308 | System handles failures with retry | Must |
| FR-309 | Users can cancel queued items | Should |
| FR-310 | Users can redo completed items | Should |

### 5.4 Token System (FR-400)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-401 | Each org has a token balance | Must |
| FR-402 | System deducts tokens on processing | Must |
| FR-403 | 2K processing costs 1 token | Must |
| FR-404 | 4K processing costs 2 tokens | Must |
| FR-405 | Users can purchase tokens via Stripe | Must |
| FR-406 | System shows transaction history | Must |
| FR-407 | System warns on low balance | Should |
| FR-408 | System prevents processing if insufficient | Must |
| FR-409 | Failed jobs refund tokens | Must |

### 5.5 Templates (FR-500)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-501 | System provides default templates | Must |
| FR-502 | Users can create custom templates | Must |
| FR-503 | Templates have category/subcategory | Must |
| FR-504 | Templates have style/background/lighting | Should |
| FR-505 | Users can edit/delete own templates | Must |
| FR-506 | System tracks template usage count | Could |

---

## 6. Non-Functional Requirements

### 6.1 Performance (NFR-100)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-101 | Page load time | < 2 seconds |
| NFR-102 | API response time | < 500ms (non-processing) |
| NFR-103 | Image processing time | < 2 minutes average |
| NFR-104 | Concurrent users | Support 500+ |
| NFR-105 | Queue throughput | 1000+ images/hour |

### 6.2 Reliability (NFR-200)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-201 | System uptime | 99.5% |
| NFR-202 | Data durability | 99.99% |
| NFR-203 | Failed job rate | < 1% |
| NFR-204 | Recovery time | < 1 hour |

### 6.3 Security (NFR-300)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-301 | Authentication | JWT with secure session |
| NFR-302 | Data isolation | Row-level security |
| NFR-303 | API security | Rate limiting, input validation |
| NFR-304 | Secrets management | Environment variables only |
| NFR-305 | HTTPS | Required for all traffic |

### 6.4 Usability (NFR-400)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-401 | Mobile responsive | Works on tablet/mobile |
| NFR-402 | Accessibility | WCAG 2.1 AA compliance |
| NFR-403 | Browser support | Chrome, Firefox, Safari, Edge |
| NFR-404 | Error messages | User-friendly, actionable |

---

## 7. Technical Architecture Summary

### 7.1 Target Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + Vite + TypeScript | Modern SPA |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system |
| Backend | Supabase Edge Functions | Serverless API |
| Database | Supabase PostgreSQL | Relational data with RLS |
| Auth | Supabase Auth | User management |
| Realtime | Supabase Realtime | WebSocket updates |
| Storage | Supabase Storage / Google Drive | File management |
| Payments | Stripe | Token purchases |
| AI - Prompts | Anthropic Claude API | Direct integration |
| AI - Images | Kie.ai API | Direct integration |

### 7.2 Key Integrations

```
┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│    Supabase     │
└─────────────────┘     │  (Auth, DB, RT) │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  Anthropic API  │ │    Kie.ai API   │ │   Stripe API    │
    │   (Prompts)     │ │   (Images)      │ │   (Payments)    │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
              │                  │
              ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐
    │  Google Drive   │ │ Supabase Storage│
    │  (Input/Output) │ │   (Optional)    │
    └─────────────────┘ └─────────────────┘
```

---

## 8. Constraints & Assumptions

### 8.1 Constraints

| ID | Constraint | Impact |
|----|------------|--------|
| C-1 | Kie.ai API rate limits unknown | May need throttling |
| C-2 | Claude API costs per request | Token pricing must cover |
| C-3 | Google Drive API quotas | May limit throughput |
| C-4 | Supabase free tier limits | Need paid plan for production |
| C-5 | Edge Function 50s timeout | Long polls need workaround |

### 8.2 Assumptions

| ID | Assumption | Risk if False |
|----|------------|---------------|
| A-1 | Kie.ai API remains available | Core feature blocked |
| A-2 | Users have Google Drive access | Need alternative storage |
| A-3 | Claude quality is sufficient | May need model tuning |
| A-4 | Token model is viable | Revenue model fails |
| A-5 | Jewelry is primary use case | UI/prompts need rework |

---

## 9. Risks & Mitigations

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R-1 | Kie.ai API changes/unavailable | Medium | Critical | Abstract integration, have fallback |
| R-2 | Processing costs exceed revenue | Medium | High | Careful token pricing, usage limits |
| R-3 | Google Drive auth complexity | High | Medium | Consider Supabase Storage alternative |
| R-4 | Real-time updates unreliable | Low | Medium | Fallback to polling |
| R-5 | Stripe integration delays | Low | Medium | Start integration early |
| R-6 | Performance issues at scale | Medium | High | Load testing, optimize early |

---

## 10. Success Criteria

### 10.1 MVP Launch Criteria

| Criteria | Measurement |
|----------|-------------|
| Core processing works end-to-end | 100 images processed successfully |
| Multi-tenant isolation verified | 3+ test organizations with no data leak |
| Payment flow complete | Successful test purchases via Stripe |
| Real-time updates functional | Progress visible within 2 seconds |
| Error handling robust | Graceful failure and retry for all edge cases |

### 10.2 Post-Launch Success Metrics

| Metric | Target (30 days) | Target (90 days) |
|--------|------------------|------------------|
| Active organizations | 10 | 50 |
| Images processed | 1,000 | 10,000 |
| Revenue (tokens sold) | $500 | $5,000 |
| Customer satisfaction | 4.0/5.0 | 4.5/5.0 |
| System uptime | 99% | 99.5% |

---

## 11. Project Phases

> **Strategy: Technical Foundation First**
>
> Rationale: Business model already validated with n8n/NocoDB demo.
> Current clients testing the system. Need scalable, production-grade
> architecture to support growth from day one.

### Phase 1: Foundation + Full Multi-Tenancy
**Focus:** Scalable architecture with complete auth & team support

**Infrastructure:**
- [ ] Supabase project setup (PostgreSQL, Auth, Edge Functions)
- [ ] Complete database schema with RLS policies
- [ ] Multi-tenant data isolation
- [ ] Real-time subscriptions setup

**Authentication & Teams:**
- [ ] User registration/login (email + OAuth options)
- [ ] Organization creation and management
- [ ] Role-based access (owner, admin, member)
- [ ] Team member invitations
- [ ] Organization switching

**Core Features:**
- [ ] Project CRUD with org association
- [ ] Prompt template management
- [ ] Google Drive folder linking
- [ ] Settings per organization

**Frontend Foundation:**
- [ ] React + Vite + TypeScript setup
- [ ] Tailwind + shadcn/ui design system
- [ ] Auth flows (login, register, forgot password)
- [ ] Organization selector/switcher
- [ ] Responsive layout structure

### Phase 2: Complete Processing + Billing
**Focus:** Full workflow with monetization

**Processing Pipeline:**
- [ ] Image queue system
- [ ] Claude AI prompt generation (direct API)
- [ ] Kie.ai optimization (direct API)
- [ ] Real-time progress (WebSocket)
- [ ] Success/failure handling
- [ ] Retry logic with backoff

**Batch Processing:**
- [ ] Multi-image selection UI
- [ ] Parallel processing (configurable concurrency)
- [ ] Batch progress tracking
- [ ] Pause/resume/cancel batch

**Review Workflow:**
- [ ] Pending review state
- [ ] Before/after comparison view
- [ ] Approve/reject actions
- [ ] Request variations
- [ ] Bulk approval

**Token System & Billing:**
- [ ] Token account per organization
- [ ] Balance checking before processing
- [ ] Token deduction on completion
- [ ] Stripe Checkout integration
- [ ] Webhook handling for payments
- [ ] Transaction history
- [ ] Low balance warnings
- [ ] Token packages: 10/$10, 50/$45, 100/$90, 1000/$900

### Phase 3: Integrations + Growth
**Focus:** Expand capabilities and market reach

**Shopify Integration:**
- [ ] Connect Shopify store (OAuth)
- [ ] Import products and images
- [ ] Push optimized images back
- [ ] Sync product metadata
- [ ] Bulk operations

**Additional Storage Options:**
- [ ] Supabase Storage (with compression)
- [ ] Dropbox integration
- [ ] Direct upload option

**Analytics & Reporting:**
- [ ] Organization usage dashboard
- [ ] Processing statistics
- [ ] Cost analysis
- [ ] Export reports

**Advanced Features:**
- [ ] Activity audit log
- [ ] Webhook notifications
- [ ] API access for power users
- [ ] White-label considerations

---

## 12. Decisions Made

### 12.1 Token Pricing (DECIDED)

| Package | Tokens | Price | Discount |
|---------|--------|-------|----------|
| Starter | 10 | $10 | - |
| Standard | 50 | $45 | 10% |
| Pro | 100 | $90 | 10% |
| Enterprise | 1000 | $900 | 10% |

**Token Costs:**
- 2K optimization = 1 token
- 4K optimization = 2 tokens
- Redo = 0.5 tokens (TBD)

### 12.2 Storage Strategy (DECIDED)

**Phase 1:** Google Drive integration only
- Users already familiar with Drive
- No additional storage costs
- Proven working in current system

**Future Phases:** Add alternatives
- Supabase Storage (with image compression before upload)
- Dropbox integration
- Direct upload option

**Note:** Image compression strategy needed before Supabase Storage to manage costs.

### 12.3 Processing Time Target

Based on current system analysis:
- Current average: ~45 seconds
- Kie.ai processing: 30-60 seconds (external dependency)
- Claude prompt generation: 2-5 seconds

**Recommended Target:**
- Average: < 60 seconds
- Maximum: < 120 seconds (with timeout)
- User expectation: Real-time progress updates every 5 seconds

### 12.4 Phase Strategy (DECIDED)

**Selected: Option D - Technical Foundation First**

Rationale:
- Business model already validated with n8n/NocoDB demo
- Current clients actively testing the system
- Need scalable architecture to support growth
- Don't want to rebuild infrastructure later

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| 1 | Foundation + Multi-Tenancy | Auth, Teams, Orgs, Core UI |
| 2 | Processing + Billing | Full pipeline, Batch, Tokens, Stripe |
| 3 | Integrations + Growth | Shopify, Storage options, Analytics |

## 13. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | ~~Token packages~~ | ~~Product Owner~~ | DECIDED |
| 2 | ~~Storage strategy~~ | ~~Architect~~ | DECIDED |
| 3 | Shopify-specific requirements? | Product Owner | Before Phase 3 |
| 4 | Analytics priorities? | Product Owner | Before Phase 3 |
| 5 | ~~Phase ordering~~ | ~~Product Owner~~ | DECIDED |

---

## 13. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Business Analyst | Ana | Dec 11, 2025 | Prepared |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Token** | Unit of currency for image processing (1 token = $1 value) |
| **Prompt Template** | Predefined AI instructions for image enhancement |
| **Kie.ai** | Third-party AI image processing service |
| **RLS** | Row Level Security - PostgreSQL feature for data isolation |
| **Edge Function** | Serverless function running on Supabase infrastructure |

---

**Next Steps:**
1. Review and approve this brief
2. Proceed to `/bmad/pm` for PRD creation
3. Then `/bmad/architect` for technical design

