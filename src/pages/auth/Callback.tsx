import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { fetchUserOrganizations } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      // Check URL hash for recovery flow (password reset)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')

      // If this is a password recovery flow, redirect to reset password page
      if (type === 'recovery') {
        navigate('/auth/reset-password')
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        navigate('/auth/login')
        return
      }

      if (session) {
        // Fetch user organizations
        await fetchUserOrganizations()

        // Check if user has any organizations
        const { data: userOrgs } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', session.user.id)

        if (!userOrgs || userOrgs.length === 0) {
          // New user, needs onboarding
          navigate('/onboarding')
        } else {
          // Existing user, go to dashboard
          navigate('/')
        }
      } else {
        navigate('/auth/login')
      }
    }

    handleCallback()
  }, [navigate, fetchUserOrganizations])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-slate-600">Verifying your account...</p>
      </div>
    </div>
  )
}
