import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Organization, UserOrganization } from '@/types/database'

// Extended type that includes organization details
export interface UserOrganizationWithOrg extends UserOrganization {
  organizations?: Organization
}

interface AuthState {
  user: User | null
  session: Session | null
  organization: Organization | null
  userOrganizations: UserOrganizationWithOrg[]
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  setOrganization: (org: Organization) => void
  fetchUserOrganizations: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      organization: null,
      userOrganizations: [],
      isLoading: true,
      isInitialized: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            set({
              user: session.user,
              session,
              isLoading: false,
              // Don't set isInitialized yet - wait for organization fetch
            })
            // AWAIT organization fetch to prevent race condition with ProtectedRoute
            await get().fetchUserOrganizations()
            // NOW mark as initialized after organization is loaded
            set({ isInitialized: true })
          } else {
            set({
              user: null,
              session: null,
              isLoading: false,
              isInitialized: true
            })
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              set({ user: session.user, session })
              // Await to ensure organization is loaded before navigation
              await get().fetchUserOrganizations()
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                session: null,
                organization: null,
                userOrganizations: []
              })
            } else if (event === 'TOKEN_REFRESHED' && session) {
              set({ session })
            }
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ isLoading: false, isInitialized: true })
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true })
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        set({ isLoading: false })
        return { error: error as Error | null }
      },

      signUp: async (email, password) => {
        set({ isLoading: true })
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        set({ isLoading: false })

        // Check if email confirmation is required
        const needsEmailConfirmation = !error && !data.session && !!data.user

        return {
          error: error as Error | null,
          needsEmailConfirmation
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        await supabase.auth.signOut()
        set({
          user: null,
          session: null,
          organization: null,
          userOrganizations: [],
          isLoading: false
        })
      },

      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`
        })
        return { error: error as Error | null }
      },

      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password })
        return { error: error as Error | null }
      },

      setOrganization: (org) => {
        set({ organization: org })
      },

      fetchUserOrganizations: async () => {
        const { user } = get()
        if (!user) return

        // Fetch user_organizations with embedded organization details
        const { data: userOrgs } = await supabase
          .from('user_organizations')
          .select(`
            *,
            organizations (*)
          `)
          .eq('user_id', user.id)

        if (userOrgs && userOrgs.length > 0) {
          set({ userOrganizations: userOrgs as UserOrganizationWithOrg[] })

          // Set the first organization if no org is selected
          const { organization } = get()
          if (!organization && userOrgs[0].organizations) {
            set({ organization: userOrgs[0].organizations as Organization })
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist organization selection, not auth state (managed by Supabase)
        organization: state.organization
      }),
    }
  )
)
