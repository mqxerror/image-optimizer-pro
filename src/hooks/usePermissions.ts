import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth'
import { OrganizationRole, ROLE_PERMISSIONS, Permission } from '@/types/roles'

interface UsePermissionsReturn {
  role: OrganizationRole | null
  permissions: Permission | null
  isOwner: boolean
  isAdmin: boolean
  isEditor: boolean
  isViewer: boolean
  can: (permission: keyof Permission) => boolean
}

export function usePermissions(): UsePermissionsReturn {
  const { organization, userOrganizations } = useAuthStore()

  const currentOrgMembership = useMemo(() => {
    if (!organization || !userOrganizations.length) return null
    return userOrganizations.find(uo => uo.organization_id === organization.id)
  }, [organization, userOrganizations])

  const role = (currentOrgMembership?.role || null) as OrganizationRole | null
  const permissions = role ? ROLE_PERMISSIONS[role] : null

  const can = (permission: keyof Permission): boolean => {
    return permissions?.[permission] ?? false
  }

  return {
    role,
    permissions,
    isOwner: role === 'owner',
    isAdmin: role === 'admin' || role === 'owner',
    isEditor: role === 'editor' || role === 'admin' || role === 'owner',
    isViewer: role !== null,
    can,
  }
}
