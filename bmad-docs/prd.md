# Image Optimizer Pro - Product Requirements Document

**Document Version:** 1.0
**Created:** December 11, 2025
**Author:** John (Product Manager)
**Status:** Ready for Architecture Review

---

## 1. Product Overview

### 1.1 Vision Statement

Image Optimizer Pro transforms raw jewelry product photos into professional, e-commerce-ready images using AI—enabling jewelry sellers to achieve studio-quality results without studio costs.

### 1.2 Product Positioning

| Attribute | Value |
|-----------|-------|
| **Target Market** | Jewelry e-commerce sellers (initial niche) |
| **Problem Solved** | Raw product photos don't convert; professional photography is expensive |
| **Solution** | AI-powered image enhancement with jewelry-specific optimization |
| **Differentiation** | Specialized jewelry prompts, simple token pricing, fast turnaround |

### 1.3 Business Model

**Token-based SaaS with healthy margins:**

| Package | Tokens | Price | Cost/Token | Margin |
|---------|--------|-------|------------|--------|
| Starter | 10 | $10 | $0.14 | 86% |
| Standard | 50 | $45 | $0.14 | 84% |
| Pro | 100 | $90 | $0.14 | 84% |
| Enterprise | 1000 | $900 | $0.14 | 84% |

**Token Costs:**
- 2K optimization = 1 token ($1 value)
- 4K optimization = 2 tokens ($2 value)
- Redo = 0.5 tokens ($0.50 value)

---

## 2. Phase 1 Scope: Foundation

> **Goal:** Production-ready platform with auth, projects, templates, and storage integration. No processing yet—that's Phase 2.

### 2.1 What's IN Phase 1

| Category | Features |
|----------|----------|
| **Auth** | Register, login, password reset, session management |
| **Organization** | Create org (single owner), org settings |
| **Projects** | CRUD, link Drive folders, assign template, set resolution |
| **Templates** | System templates, custom templates, categories |
| **Storage** | Google Drive integration (abstracted for future providers) |
| **UI** | Dashboard shell, project list, template management, settings |

### 2.2 What's OUT of Phase 1

| Feature | Phase |
|---------|-------|
| Image processing pipeline | Phase 2 |
| Token billing & Stripe | Phase 2 |
| Batch processing | Phase 2 |
| Team invitations & roles | Phase 2 |
| Review workflow | Phase 2 |
| Shopify integration | Phase 3 |
| Analytics & reporting | Phase 3 |

---

## 3. Epics & User Stories

### Epic 1: User Authentication (AUTH)

**Goal:** Secure user registration & session management

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| AUTH-1 | As a new user, I can register with email/password so I can access the platform | Must | 3 |
| AUTH-2 | As a user, I can log in with my credentials so I can access my account | Must | 2 |
| AUTH-3 | As a user, I can reset my password via email so I can recover my account | Must | 3 |
| AUTH-4 | As a user, I can log out so my session is securely ended | Must | 1 |
| AUTH-5 | As a user, I stay logged in across browser sessions until I explicitly log out | Should | 2 |
| AUTH-6 | As a user, I see appropriate error messages for invalid credentials | Must | 1 |

**Acceptance Criteria - AUTH-1 (Register):**
```gherkin
Given I am on the registration page
When I enter a valid email and password (min 8 chars)
And I click "Create Account"
Then my account is created
And I am automatically logged in
And I am redirected to create my first organization
And I receive a welcome email

Given I enter an email that already exists
When I click "Create Account"
Then I see an error "Email already registered"
And the form is not submitted
```

**Acceptance Criteria - AUTH-2 (Login):**
```gherkin
Given I am on the login page
When I enter valid credentials
And I click "Log In"
Then I am logged in
And I am redirected to my dashboard

Given I enter invalid credentials
When I click "Log In"
Then I see an error "Invalid email or password"
And I am not logged in
```

**Acceptance Criteria - AUTH-3 (Password Reset):**
```gherkin
Given I click "Forgot Password"
When I enter my registered email
And I click "Send Reset Link"
Then I receive an email with a reset link
And the link expires after 1 hour

Given I click the reset link
When I enter a new password (min 8 chars)
And I click "Reset Password"
Then my password is updated
And I am redirected to login
```

---

### Epic 2: Organization Management (ORG)

**Goal:** Create and manage single-owner organizations

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| ORG-1 | As a new user, I am prompted to create an organization after registration | Must | 2 |
| ORG-2 | As an owner, I can name my organization | Must | 1 |
| ORG-3 | As an owner, I can update my organization name and settings | Should | 2 |
| ORG-4 | As an owner, I can view my organization's dashboard | Must | 3 |
| ORG-5 | As an owner, I can delete my organization (with confirmation) | Could | 2 |

**Acceptance Criteria - ORG-1 (Create Org):**
```gherkin
Given I just registered and have no organization
When I am redirected after registration
Then I see "Create Your Organization" form
And I must enter an organization name
And I cannot access other features until org is created

Given I enter an organization name
When I click "Create Organization"
Then the organization is created
And I am set as the owner
And I am redirected to the dashboard
```

**Acceptance Criteria - ORG-4 (Dashboard):**
```gherkin
Given I am logged in with an organization
When I navigate to the dashboard
Then I see:
  - Organization name
  - Quick stats (projects count, templates count)
  - Recent activity (empty state if none)
  - Quick actions (Create Project, Manage Templates)
```

---

### Epic 3: Project Management (PROJ)

**Goal:** Create and configure optimization projects

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| PROJ-1 | As a user, I can create a new project with a name | Must | 2 |
| PROJ-2 | As a user, I can link a Google Drive input folder to my project | Must | 5 |
| PROJ-3 | As a user, I can link a Google Drive output folder to my project | Must | 3 |
| PROJ-4 | As a user, I can assign a prompt template to my project | Must | 2 |
| PROJ-5 | As a user, I can set the default resolution (2K/4K) for my project | Must | 1 |
| PROJ-6 | As a user, I can add a custom prompt override to my project | Should | 2 |
| PROJ-7 | As a user, I can view a list of all my projects | Must | 2 |
| PROJ-8 | As a user, I can edit project settings | Must | 2 |
| PROJ-9 | As a user, I can delete a project (with confirmation) | Must | 2 |
| PROJ-10 | As a user, I can see project status (draft, active, completed) | Must | 1 |
| PROJ-11 | As a user, I can see image counts (total, processed, pending) on project cards | Should | 3 |

**Acceptance Criteria - PROJ-1 (Create Project):**
```gherkin
Given I am on the projects page
When I click "New Project"
Then I see a project creation form
And I must enter a project name
And I can optionally configure other settings

Given I enter a project name
When I click "Create"
Then the project is created with status "draft"
And I am redirected to project settings to complete setup
```

**Acceptance Criteria - PROJ-2 (Link Input Folder):**
```gherkin
Given I am editing a project
When I click "Connect Google Drive" for input folder
Then Google OAuth flow initiates
And I can browse my Drive folders
And I can select a folder

Given I select a Drive folder
When I confirm selection
Then the folder URL and ID are saved
And I see the folder name displayed
And I can change it later
```

**Acceptance Criteria - PROJ-7 (List Projects):**
```gherkin
Given I have projects
When I navigate to Projects page
Then I see a grid/list of project cards
And each card shows:
  - Project name
  - Status badge
  - Template name
  - Resolution setting
  - Image counts (if available)
  - Last updated date

Given I have no projects
When I navigate to Projects page
Then I see an empty state with "Create Your First Project" CTA
```

---

### Epic 4: Prompt Templates (TMPL)

**Goal:** Manage AI prompt templates for image optimization

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| TMPL-1 | As a user, I can view system-provided templates | Must | 2 |
| TMPL-2 | As a user, I can create a custom template | Must | 3 |
| TMPL-3 | As a user, I can edit my custom templates | Must | 2 |
| TMPL-4 | As a user, I can delete my custom templates | Must | 1 |
| TMPL-5 | As a user, I can filter templates by category | Should | 2 |
| TMPL-6 | As a user, I can preview template prompt text | Should | 1 |
| TMPL-7 | As a user, I can duplicate a system template to customize | Should | 2 |

**Acceptance Criteria - TMPL-1 (View System Templates):**
```gherkin
Given I navigate to Templates page
When the page loads
Then I see system templates marked with "System" badge
And system templates cannot be edited or deleted
And system templates are organized by category:
  - Jewelry > Rings, Necklaces, Earrings, Bracelets, etc.
And each template shows:
  - Name
  - Category / Subcategory
  - Style (Premium, Elegant, etc.)
  - Background type
```

**Acceptance Criteria - TMPL-2 (Create Template):**
```gherkin
Given I am on Templates page
When I click "Create Template"
Then I see a template form with fields:
  - Name (required)
  - Category (dropdown)
  - Subcategory (text)
  - Base Prompt (textarea, required)
  - Style (dropdown)
  - Background (dropdown)
  - Lighting (text)

Given I fill required fields
When I click "Save Template"
Then the template is created
And it appears in my templates list
And it can be assigned to projects
```

**System Templates to Include:**

| Name | Category | Subcategory | Style |
|------|----------|-------------|-------|
| Jewelry Gold Premium | Jewelry | Rings | Premium |
| Jewelry Silver Elegant | Jewelry | Rings | Elegant |
| Jewelry Diamond Showcase | Jewelry | Rings | Premium |
| Necklace Studio | Jewelry | Necklaces | Premium |
| Earrings Macro | Jewelry | Earrings | Premium |
| Bracelet Lifestyle | Jewelry | Bracelets | Lifestyle |
| Watch Premium | Jewelry | Watches | Premium |
| General Product White | Product | General | Standard |

---

### Epic 5: Google Drive Integration (DRIVE)

**Goal:** Connect and browse Google Drive folders

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| DRIVE-1 | As a user, I can authenticate with Google Drive | Must | 5 |
| DRIVE-2 | As a user, I can browse my Drive folders | Must | 3 |
| DRIVE-3 | As a user, I can select a folder for input/output | Must | 2 |
| DRIVE-4 | As a user, I can see images in a selected input folder | Must | 3 |
| DRIVE-5 | As a user, my Drive connection persists across sessions | Must | 2 |
| DRIVE-6 | As a user, I can disconnect and reconnect Drive | Should | 2 |

**Acceptance Criteria - DRIVE-1 (Auth):**
```gherkin
Given I need to connect Google Drive
When I click "Connect Google Drive"
Then I am redirected to Google OAuth consent screen
And I grant access to Drive files

Given I complete OAuth
When I am redirected back
Then my Drive connection is saved
And I can browse folders
```

**Acceptance Criteria - DRIVE-4 (View Images):**
```gherkin
Given I have a project with linked input folder
When I view project details
Then I see thumbnails of images in the folder
And each image shows:
  - Thumbnail (from Drive API)
  - Filename
  - File type badge (JPG, PNG, etc.)
And images are paginated (20 per page)
And I can filter by file type
```

**Storage Provider Abstraction (Technical Note):**
```typescript
interface StorageProvider {
  connect(): Promise<AuthResult>;
  disconnect(): Promise<void>;
  listFolders(parentId?: string): Promise<Folder[]>;
  listFiles(folderId: string): Promise<File[]>;
  getFileUrl(fileId: string): Promise<string>;
  getThumbnailUrl(fileId: string): Promise<string>;
}

// Phase 1 implementation
class GoogleDriveProvider implements StorageProvider { ... }

// Future implementations
class DropboxProvider implements StorageProvider { ... }
class SupabaseStorageProvider implements StorageProvider { ... }
```

---

### Epic 6: Settings & Configuration (SET)

**Goal:** Manage organization and user settings

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| SET-1 | As a user, I can view and update my profile (name, email) | Should | 2 |
| SET-2 | As a user, I can change my password | Should | 2 |
| SET-3 | As an owner, I can set organization defaults (resolution, template) | Should | 2 |
| SET-4 | As a user, I can see my connected storage providers | Must | 1 |
| SET-5 | As a user, I can manage notification preferences | Could | 2 |

**Acceptance Criteria - SET-3 (Org Defaults):**
```gherkin
Given I am in organization settings
When I set default resolution to "4K"
And I set default template to "Jewelry Gold Premium"
And I save settings
Then new projects inherit these defaults
And I see confirmation "Settings saved"
```

---

### Epic 7: UI Foundation (UI)

**Goal:** Core UI components and layouts

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| UI-1 | As a user, I see a consistent navigation sidebar | Must | 3 |
| UI-2 | As a user, I see my organization name and can access settings from header | Must | 2 |
| UI-3 | As a user, I experience loading states during async operations | Must | 2 |
| UI-4 | As a user, I see toast notifications for success/error feedback | Must | 2 |
| UI-5 | As a user, I can use the app on tablet and mobile (responsive) | Should | 5 |
| UI-6 | As a user, I see empty states with helpful CTAs | Should | 2 |
| UI-7 | As a user, I can toggle between light/dark mode | Could | 3 |

**Navigation Structure:**
```
┌─────────────────────────────────────────────────┐
│ [Logo] Image Optimizer Pro    [Org Name ▼] [👤] │
├─────────────┬───────────────────────────────────┤
│ Dashboard   │                                   │
│ Projects    │         Main Content Area         │
│ Templates   │                                   │
│ Queue       │    (Phase 2: Processing Queue)    │
│ History     │    (Phase 2: Processing History)  │
│ ─────────── │                                   │
│ Settings    │                                   │
│ Buy Tokens  │    (Phase 2: Token Purchase)      │
└─────────────┴───────────────────────────────────┘
```

---

## 4. Data Model (Phase 1)

### 4.1 Core Entities

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │  organizations  │
│─────────────────│       │─────────────────│
│ id (PK)         │──────▶│ id (PK)         │
│ email           │       │ name            │
│ created_at      │       │ owner_id (FK)   │
│                 │       │ settings (JSON) │
│                 │       │ created_at      │
└─────────────────┘       └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
          ┌─────────────────┐            ┌─────────────────┐
          │    projects     │            │ prompt_templates│
          │─────────────────│            │─────────────────│
          │ id (PK)         │            │ id (PK)         │
          │ org_id (FK)     │            │ org_id (FK/null)│
          │ name            │───────────▶│ name            │
          │ template_id(FK) │            │ category        │
          │ input_folder_id │            │ subcategory     │
          │ output_folder_id│            │ base_prompt     │
          │ resolution      │            │ style           │
          │ custom_prompt   │            │ background      │
          │ status          │            │ lighting        │
          │ created_at      │            │ is_system       │
          └─────────────────┘            │ is_active       │
                                         └─────────────────┘

          ┌─────────────────┐
          │ storage_connections│
          │─────────────────│
          │ id (PK)         │
          │ org_id (FK)     │
          │ provider        │  (google_drive, dropbox, etc.)
          │ access_token    │  (encrypted)
          │ refresh_token   │  (encrypted)
          │ expires_at      │
          │ metadata (JSON) │
          └─────────────────┘
```

### 4.2 Phase 2 Entities (Preview)

```
processing_queue      processing_history      token_accounts
token_transactions    token_pricing
```

---

## 5. API Endpoints (Phase 1)

### 5.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new user |
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | End session |
| POST | `/auth/forgot-password` | Request reset email |
| POST | `/auth/reset-password` | Reset with token |
| GET | `/auth/me` | Get current user |

### 5.2 Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/organizations` | Create organization |
| GET | `/organizations/:id` | Get organization |
| PATCH | `/organizations/:id` | Update organization |
| DELETE | `/organizations/:id` | Delete organization |

### 5.3 Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List org projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| GET | `/projects/:id/images` | List images in input folder |

### 5.4 Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List templates (system + org) |
| POST | `/templates` | Create template |
| GET | `/templates/:id` | Get template |
| PATCH | `/templates/:id` | Update template |
| DELETE | `/templates/:id` | Delete template |

### 5.5 Storage

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/storage/connections` | List connected providers |
| POST | `/storage/connect/google` | Initiate Google OAuth |
| GET | `/storage/callback/google` | OAuth callback |
| DELETE | `/storage/connections/:id` | Disconnect provider |
| GET | `/storage/folders` | Browse folders |
| GET | `/storage/files/:folderId` | List files in folder |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Page load (initial) | < 2s |
| Page navigation | < 500ms |
| API response | < 300ms |
| Drive folder list | < 2s |
| Image thumbnails | Lazy load, < 1s visible |

### 6.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth (JWT) |
| Data isolation | Row Level Security (RLS) |
| Token storage | HTTP-only cookies |
| Drive credentials | Encrypted at rest |
| API rate limiting | 100 req/min per user |

### 6.3 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

---

## 7. MoSCoW Prioritization

### Must Have (Phase 1 MVP)

| Epic | Stories |
|------|---------|
| AUTH | AUTH-1, AUTH-2, AUTH-3, AUTH-4, AUTH-6 |
| ORG | ORG-1, ORG-2, ORG-4 |
| PROJ | PROJ-1, PROJ-2, PROJ-3, PROJ-4, PROJ-5, PROJ-7, PROJ-8, PROJ-9, PROJ-10 |
| TMPL | TMPL-1, TMPL-2, TMPL-3, TMPL-4 |
| DRIVE | DRIVE-1, DRIVE-2, DRIVE-3, DRIVE-4, DRIVE-5 |
| SET | SET-4 |
| UI | UI-1, UI-2, UI-3, UI-4 |

**Total Must Have Points:** ~55

### Should Have

| Epic | Stories |
|------|---------|
| AUTH | AUTH-5 |
| ORG | ORG-3 |
| PROJ | PROJ-6, PROJ-11 |
| TMPL | TMPL-5, TMPL-6, TMPL-7 |
| DRIVE | DRIVE-6 |
| SET | SET-1, SET-2, SET-3 |
| UI | UI-5, UI-6 |

**Total Should Have Points:** ~25

### Could Have

| Epic | Stories |
|------|---------|
| ORG | ORG-5 |
| SET | SET-5 |
| UI | UI-7 |

**Total Could Have Points:** ~7

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google OAuth complexity | High | Medium | Use Supabase Auth providers, start early |
| Drive API rate limits | Medium | Medium | Implement caching, pagination |
| Scope creep into Phase 2 | Medium | High | Strict story acceptance, no processing |
| RLS policy errors | Medium | High | Thorough testing, security audit |

---

## 9. Success Metrics (Phase 1)

| Metric | Target |
|--------|--------|
| User can register → create org → create project | < 3 minutes |
| User can connect Drive and see images | < 2 minutes |
| Zero data leaks between organizations | 100% isolation |
| All Must Have stories complete | 100% |
| No critical/high severity bugs | 0 at launch |

---

## 10. Phase 2 Preview

After Phase 1 foundation is solid, Phase 2 adds:

| Feature | Business Value |
|---------|----------------|
| **Processing Pipeline** | Core product functionality |
| **Token Billing** | Revenue generation |
| **Batch Processing** | Power user efficiency |
| **Review Workflow** | Quality control |
| **Team Management** | Enterprise readiness |

---

## Appendix A: UI Wireframe References

### A.1 Dashboard
```
┌────────────────────────────────────────────────────────────┐
│  Dashboard                                                  │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Projects │  │ Templates│  │ In Queue │  │ Processed│   │
│  │    5     │  │    12    │  │    --    │  │    --    │   │
│  │          │  │          │  │ Phase 2  │  │ Phase 2  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                            │
│  Quick Actions                                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ + New Project   │  │ Manage Templates│                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                            │
│  Recent Projects                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Summer Collection │ Active │ Jewelry Gold │ 147 imgs │ │
│  │ Fall Catalog     │ Draft  │ --           │ --       │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### A.2 Project Detail
```
┌────────────────────────────────────────────────────────────┐
│  ← Back    Summer Collection                    [Edit] [⋮] │
├────────────────────────────────────────────────────────────┤
│  Status: Active    Template: Jewelry Gold    Resolution: 2K│
│                                                            │
│  Input Folder: /Jewelry/Summer 2025                        │
│  Output Folder: /Optimized/Summer 2025                     │
│                                                            │
│  Images (147)                          [Select All] [Filter]│
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ □  │ │ □  │ │ □  │ │ □  │ │ □  │ │ □  │ │ □  │ │ □  │ │
│  │IMG1│ │IMG2│ │IMG3│ │IMG4│ │IMG5│ │IMG6│ │IMG7│ │IMG8│ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│                                                            │
│  ─────────────────────────────────────────────────────────│
│  Selected: 0                     [Run Trial] - Phase 2     │
└────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Organization** | A tenant/workspace containing projects and settings |
| **Project** | A collection of images from a Drive folder with assigned template |
| **Template** | AI prompt configuration for image optimization |
| **Token** | Currency unit for image processing ($1 = 1 token) |
| **RLS** | Row Level Security - PostgreSQL feature for data isolation |

---

**Document Status:** Ready for Architecture Review

**Next Steps:**
1. `/bmad:architect` - Technical architecture design
2. Database schema with RLS policies
3. Edge function specifications
4. Frontend component hierarchy

