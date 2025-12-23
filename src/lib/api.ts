import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api/v1'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * Centralized API client for NestJS backend calls
 * Automatically adds auth token from Supabase session
 */
export async function api<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options

  // Get auth token from Supabase session
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  if (!token) {
    throw new Error('Not authenticated')
  }

  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `API request failed (${response.status})`)
  }

  return response.json()
}

// Convenience methods
export const apiGet = <T = unknown>(endpoint: string) =>
  api<T>(endpoint, { method: 'GET' })

export const apiPost = <T = unknown>(endpoint: string, body?: unknown) =>
  api<T>(endpoint, { method: 'POST', body })

export const apiPatch = <T = unknown>(endpoint: string, body?: unknown) =>
  api<T>(endpoint, { method: 'PATCH', body })

export const apiDelete = <T = unknown>(endpoint: string) =>
  api<T>(endpoint, { method: 'DELETE' })
