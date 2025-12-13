import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOrganization?: boolean
}

export default function ProtectedRoute({
  children,
  requireOrganization = true
}: ProtectedRouteProps) {
  const location = useLocation()
  const { user, organization, isLoading, isInitialized } = useAuthStore()

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Redirect to onboarding if no organization
  if (requireOrganization && !organization) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
