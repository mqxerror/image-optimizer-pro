# Product Requirements Document: Settings & User Management

## Executive Summary

Build a comprehensive Settings page for managing user groups, permissions, and organization settings. Critical for AppSumo launch to support team-based access and role management.

---

## Business Context

### AppSumo User Requirements
- **Team Collaboration**: Multiple users per organization
- **Access Control**: Different permission levels (admin, editor, viewer)
- **Usage Tracking**: Per-user and per-group token consumption
- **License Management**: AppSumo code redemption and tier upgrades

---

## User Roles & Permissions

### Role Hierarchy

| Role | Description | Typical User |
|------|-------------|--------------|
| **Owner** | Full access, billing, can delete org | Business owner |
| **Admin** | Manage users, settings, no billing | Store manager |
| **Editor** | Process images, manage projects | Photographer |
| **Viewer** | View only, download processed | Marketing team |

### Permission Matrix

| Permission | Owner | Admin | Editor | Viewer |
|------------|-------|-------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Projects | ✅ | ✅ | ✅ | ✅ |
| Create Projects | ✅ | ✅ | ✅ | ❌ |
| Delete Projects | ✅ | ✅ | ❌ | ❌ |
| Process Images | ✅ | ✅ | ✅ | ❌ |
| Manage Templates | ✅ | ✅ | ✅ | ❌ |
| Connect Shopify | ✅ | ✅ | ❌ | ❌ |
| Manage Automation | ✅ | ✅ | ❌ | ❌ |
| Invite Users | ✅ | ✅ | ❌ | ❌ |
| Manage Roles | ✅ | ✅ | ❌ | ❌ |
| View Billing | ✅ | ❌ | ❌ | ❌ |
| Manage Billing | ✅ | ❌ | ❌ | ❌ |
| Delete Organization | ✅ | ❌ | ❌ | ❌ |

---

## Feature Specifications

### F1: Settings Page Structure

**Navigation Structure**:
```
Settings
├── General
│   ├── Organization Name
│   ├── Logo & Branding
│   └── Default Processing Options
├── Team
│   ├── Members List
│   ├── Pending Invitations
│   └── User Groups
├── Permissions
│   ├── Role Management
│   └── Custom Permissions
├── Integrations
│   ├── Connected Shopify Stores
│   └── API Keys
├── Billing
│   ├── Current Plan
│   ├── Token Balance
│   ├── Purchase Tokens
│   └── Transaction History
└── AppSumo
    ├── Redeem Code
    ├── Stack Codes
    └── License Details
```

---

### F2: Team Management

**User Story**: As an organization owner, I want to invite team members and assign them appropriate roles so they can collaborate on image processing.

**UI Design**:
```
┌─────────────────────────────────────────────────────────┐
│ Team Members                                [+ Invite]   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 John Smith                          Owner        │ │
│ │    john@jewelry-store.com              You          │ │
│ │    Joined Dec 2024                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Sarah Johnson                       Admin    ⋮  │ │
│ │    sarah@jewelry-store.com                          │ │
│ │    Joined Dec 2024   •   450 tokens used            │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Mike Chen                           Editor   ⋮  │ │
│ │    mike@jewelry-store.com                           │ │
│ │    Joined Dec 2024   •   1,230 tokens used          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Pending Invitations (2)                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✉️ anna@agency.com         Editor    [ Resend ] [×] │ │
│ │ ✉️ tom@freelancer.com      Viewer    [ Resend ] [×] │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Invite Flow**:
```typescript
interface InviteMemberRequest {
  email: string
  role: 'admin' | 'editor' | 'viewer'
  groups?: string[]
  message?: string
}

// POST /functions/v1/team-management
{
  action: 'invite',
  ...InviteMemberRequest
}
```

---

### F3: User Groups

**User Story**: As an admin, I want to organize users into groups (e.g., "Studio Team", "Marketing") so I can manage permissions and track usage by department.

**UI Design**:
```
┌─────────────────────────────────────────────────────────┐
│ User Groups                              [+ Create Group]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 Studio Team                           3 members  │ │
│ │    Sarah, Mike, Anna                                │ │
│ │    Token limit: 5,000/month   Used: 2,340          │ │
│ │    [ Manage ]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 Marketing                             2 members  │ │
│ │    Tom, Lisa                                        │ │
│ │    Token limit: 1,000/month   Used: 450            │ │
│ │    [ Manage ]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Group Schema**:
```typescript
interface UserGroup {
  id: string
  org_id: string
  name: string
  description?: string
  token_limit_monthly?: number
  token_limit_daily?: number
  allowed_features: string[]
  member_ids: string[]
  created_at: string
  updated_at: string
}
```

---

### F4: AppSumo License Management

**User Story**: As an AppSumo customer, I want to redeem my purchase codes and stack multiple codes for higher tier benefits.

**UI Design**:
```
┌─────────────────────────────────────────────────────────┐
│ AppSumo License                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Current Plan: Tier 2 (2 codes stacked)                   │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Benefits                                            │ │
│ │ ✓ 10,000 tokens/month                               │ │
│ │ ✓ 5 team members                                    │ │
│ │ ✓ 3 Shopify stores                                  │ │
│ │ ✓ Priority processing                               │ │
│ │ ✓ Advanced automation                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Stacked Codes:                                           │
│ • XXXX-XXXX-XXXX (Redeemed Dec 10, 2024)                │
│ • XXXX-XXXX-XXXX (Redeemed Dec 12, 2024)                │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Redeem Another Code                                 │ │
│ │ [________________________] [Redeem]                 │ │
│ │                                                      │ │
│ │ Stack more codes to unlock higher tiers!            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**AppSumo Tiers**:

| Tier | Codes | Tokens/Mo | Team | Stores | Features |
|------|-------|-----------|------|--------|----------|
| 1 | 1 | 5,000 | 2 | 1 | Basic |
| 2 | 2 | 10,000 | 5 | 3 | + Priority |
| 3 | 3 | 20,000 | 10 | 5 | + Advanced Automation |
| 4 | 4+ | 50,000 | Unlimited | 10 | + White Label |

---

## Database Schema

```sql
-- User roles within organization
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
  custom_permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- User groups
CREATE TABLE IF NOT EXISTS user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  token_limit_monthly INTEGER,
  token_limit_daily INTEGER,
  allowed_features TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group membership
CREATE TABLE IF NOT EXISTS user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(group_id, user_id)
);

-- Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  groups UUID[] DEFAULT '{}',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AppSumo licenses
CREATE TABLE IF NOT EXISTS appsumo_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  redeemed_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Per-user token usage tracking
CREATE TABLE IF NOT EXISTS user_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used DECIMAL(10, 2) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  job_id UUID REFERENCES processing_jobs(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_user_groups_org ON user_groups(org_id);
CREATE INDEX idx_group_members_group ON user_group_members(group_id);
CREATE INDEX idx_group_members_user ON user_group_members(user_id);
CREATE INDEX idx_invitations_email ON organization_invitations(email);
CREATE INDEX idx_invitations_token ON organization_invitations(token);
CREATE INDEX idx_appsumo_org ON appsumo_licenses(org_id);
CREATE INDEX idx_token_usage_org_user ON user_token_usage(org_id, user_id);

-- RLS Policies
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appsumo_licenses ENABLE ROW LEVEL SECURITY;

-- Organization members can view their org's members
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only admins/owners can manage members
CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

---

## API Endpoints

### Team Management

```typescript
// POST /functions/v1/team-management
interface TeamManagementRequest {
  action: 'invite' | 'remove' | 'update_role' | 'resend_invite' | 'cancel_invite'
  member_id?: string
  email?: string
  role?: string
  groups?: string[]
}

// Response
interface TeamManagementResponse {
  success: boolean
  member?: OrganizationMember
  invitation?: Invitation
  error?: string
}
```

### Groups Management

```typescript
// POST /functions/v1/group-management
interface GroupManagementRequest {
  action: 'create' | 'update' | 'delete' | 'add_member' | 'remove_member'
  group_id?: string
  name?: string
  description?: string
  token_limit_monthly?: number
  token_limit_daily?: number
  allowed_features?: string[]
  user_id?: string
}
```

### AppSumo

```typescript
// POST /functions/v1/appsumo
interface AppSumoRequest {
  action: 'redeem' | 'validate' | 'get_benefits'
  code?: string
}

interface AppSumoBenefits {
  tier: number
  tokens_monthly: number
  max_team_members: number
  max_stores: number
  features: string[]
}
```

---

## UI Components

### Settings Layout Component
```tsx
// src/components/settings/SettingsLayout.tsx
interface SettingsLayoutProps {
  children: React.ReactNode
}

const settingsNav = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Link },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'appsumo', label: 'AppSumo', icon: Gift, badge: 'New' },
]
```

### Member Card Component
```tsx
// src/components/settings/MemberCard.tsx
interface MemberCardProps {
  member: OrganizationMember
  currentUserRole: Role
  onUpdateRole: (role: Role) => void
  onRemove: () => void
}
```

### Invite Modal Component
```tsx
// src/components/settings/InviteModal.tsx
interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (data: InviteData) => void
  groups: UserGroup[]
}
```

---

## Implementation Plan

### Phase 1: Database & API (Days 1-2)
- [ ] Create database migrations
- [ ] Implement RLS policies
- [ ] Build team-management edge function
- [ ] Build group-management edge function
- [ ] Build appsumo edge function

### Phase 2: Settings UI Structure (Days 3-4)
- [ ] Create SettingsLayout component
- [ ] Implement settings navigation
- [ ] Build General settings section
- [ ] Create responsive sidebar

### Phase 3: Team Management UI (Days 5-6)
- [ ] Build MemberCard component
- [ ] Implement InviteModal
- [ ] Create role selector
- [ ] Add pending invitations list
- [ ] Implement remove/update actions

### Phase 4: Groups & AppSumo (Day 7)
- [ ] Build GroupCard component
- [ ] Implement group CRUD
- [ ] Create AppSumo redemption UI
- [ ] Add license stacking display

---

## Permission Hooks

```typescript
// src/hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuthStore()
  const { data: membership } = useQuery({
    queryKey: queryKeys.user.permissions(orgId, user.id),
    queryFn: () => fetchMembership(orgId, user.id)
  })

  const can = useCallback((permission: Permission) => {
    if (!membership) return false
    return hasPermission(membership.role, permission)
  }, [membership])

  return { role: membership?.role, can }
}

// Usage
function ProjectsPage() {
  const { can } = usePermissions()

  return (
    <div>
      {can('create_project') && <CreateProjectButton />}
      {can('delete_project') && <DeleteButton />}
    </div>
  )
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Team invites sent | 50+ in first week | Database count |
| Groups created | 20+ | Database count |
| AppSumo codes redeemed | 100+ | Database count |
| Settings page engagement | 3+ min avg session | Analytics |
| Permission errors | <1% | Error logs |
