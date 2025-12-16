import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission } from '@/types/roles'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: keyof Permission
  requireOwner?: boolean
  fallbackPath?: string
}

export function RoleProtectedRoute({
  children,
  requiredPermission,
  requireOwner = false,
  fallbackPath = '/',
}: RoleProtectedRouteProps) {
  const { isInitialized, isLoading } = useAuthStore()
  const { can, isOwner, role } = usePermissions()

  // Wait for auth to initialize
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  // No role means not a member of the organization
  if (!role) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check owner requirement
  if (requireOwner && !isOwner) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check specific permission
  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
