export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer'

export const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
}

export interface Permission {
  canManageOrganization: boolean
  canManageMembers: boolean
  canCreateContent: boolean
  canEditContent: boolean
  canDeleteContent: boolean
  canViewContent: boolean
  canProcessImages: boolean
  canAccessAdmin: boolean
}

export const ROLE_PERMISSIONS: Record<OrganizationRole, Permission> = {
  owner: {
    canManageOrganization: true,
    canManageMembers: true,
    canCreateContent: true,
    canEditContent: true,
    canDeleteContent: true,
    canViewContent: true,
    canProcessImages: true,
    canAccessAdmin: true,
  },
  admin: {
    canManageOrganization: false,
    canManageMembers: true,
    canCreateContent: true,
    canEditContent: true,
    canDeleteContent: true,
    canViewContent: true,
    canProcessImages: true,
    canAccessAdmin: false,
  },
  editor: {
    canManageOrganization: false,
    canManageMembers: false,
    canCreateContent: true,
    canEditContent: true,
    canDeleteContent: false,
    canViewContent: true,
    canProcessImages: true,
    canAccessAdmin: false,
  },
  viewer: {
    canManageOrganization: false,
    canManageMembers: false,
    canCreateContent: false,
    canEditContent: false,
    canDeleteContent: false,
    canViewContent: true,
    canProcessImages: false,
    canAccessAdmin: false,
  },
}

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: 'Full access to all features and settings',
  admin: 'Can manage members and all content',
  editor: 'Can create and edit content',
  viewer: 'Can only view content',
}
