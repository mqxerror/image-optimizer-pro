import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { isSupabaseConfigured } from './lib/supabase'
import { ConfigurationError } from './components/error'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

// Check if Supabase is configured before initializing auth
if (isSupabaseConfigured) {
  // Only import and initialize auth if Supabase is available
  import('./stores/auth').then(({ useAuthStore }) => {
    useAuthStore.getState().initialize()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    ) : (
      <ConfigurationError
        title="Configuration Required"
        message="Missing Supabase environment variables. The application cannot connect to the database."
        details={[
          'VITE_SUPABASE_URL - Your Supabase project URL',
          'VITE_SUPABASE_ANON_KEY - Your Supabase anonymous key'
        ]}
      />
    )}
  </React.StrictMode>,
)
