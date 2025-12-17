import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { fetchUserOrganizations } = useAuthStore()
  const [status, setStatus] = useState('Verifying your account...')

  useEffect(() => {
    const handleCallback = async () => {
      // Check URL hash for auth parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      // If this is a password recovery flow
      if (type === 'recovery') {
        setStatus('Processing password reset...')

        // IMPORTANT: We need to let Supabase process the recovery tokens first
        // The tokens are in the URL hash, and Supabase will auto-detect them
        // when we call getSession() or setSession()

        if (accessToken && refreshToken) {
          // Manually set the session from the URL tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error('Failed to set recovery session:', sessionError)
            navigate('/auth/forgot-password?error=invalid_token')
            return
          }
        }

        // Now redirect to reset password page - user has a valid session
        navigate('/auth/reset-password', { replace: true })
        return
      }

      // For other auth flows (signup confirmation, OAuth), get the session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        navigate('/auth/login')
        return
      }

      if (session) {
        setStatus('Loading your workspace...')

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
        <p className="text-slate-600">{status}</p>
      </div>
    </div>
  )
}
