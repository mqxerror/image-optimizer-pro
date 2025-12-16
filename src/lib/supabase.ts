import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Create client only if configured, otherwise null
// This prevents the app from crashing at module load time
let supabaseClient: SupabaseClient<Database> | null = null

if (isSupabaseConfigured) {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Export the client - consumers should check isSupabaseConfigured first
// or use getSupabase() which throws a helpful error
export const supabase = supabaseClient as SupabaseClient<Database>

// Helper to get supabase with runtime check
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Missing environment variables.')
  }
  return supabaseClient
}
